import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationError, type StreamerRepository } from '@navi/database';
import { createStreamerService } from '../apps/web/src/lib/streamer-service';
import { AppError } from '../apps/web/src/lib/errors';
vi.mock('server-only', () => ({}));
const runtime = vi.hoisted(() => ({ streamers: undefined as unknown }));
vi.mock('../apps/web/src/lib/runtime', () => ({
  getRuntime: () => ({
    streamers: runtime.streamers,
    environment: { WEB_ORIGIN: 'http://localhost:3000' },
  }),
}));
import { GET, POST } from '../apps/web/src/app/api/guilds/[guildId]/streamers/route';
import { POST as RESOLVE } from '../apps/web/src/app/api/guilds/[guildId]/streamers/resolve/route';
import {
  PATCH,
  DELETE,
} from '../apps/web/src/app/api/guilds/[guildId]/streamers/[subscriptionId]/route';
const guildId = '111111111111111111',
  subscriptionId = 'a'.repeat(8) + '-aaaa-aaaa-aaaa-' + 'a'.repeat(12);
const account = {
  provider: 'youtube' as const,
  externalId: 'UC' + 'a'.repeat(22),
  displayName: 'Channel',
  canonicalUrl: 'https://youtube.com/channel/UC' + 'a'.repeat(22),
  userIdentifier: '@handle',
};
let now: number, denial: number, actor: string;
let service: ReturnType<typeof createStreamerService>;
const authorize = vi.fn(async (_headers: Headers, id: string) => {
  if (denial) throw new AppError(denial, denial === 401 ? 'login_required' : 'guild_forbidden');
  return { id, name: 'Guild', icon: null };
});
const resolve = vi.fn(async () => account);
const repository = {
  prune: vi.fn(async () => {}),
  list: vi.fn(async () => []),
  add: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  setEnabled: vi.fn(async () => {}),
} satisfies StreamerRepository;
const headers = new Headers();
const context = { params: Promise.resolve({ guildId, subscriptionId }) };
const request = (method: string, data?: unknown, origin = 'http://localhost:3000') =>
  new Request(origin + '/api/guilds/' + guildId + '/streamers', {
    method,
    headers: { origin, 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
beforeEach(() => {
  now = 1000;
  denial = 0;
  actor = '222222222222222222';
  vi.clearAllMocks();
  service = createStreamerService({
    guilds: { authorize, identity: async () => ({ id: actor, name: 'Tester', image: null }) },
    repository,
    resolve,
    secret: 'test-secret-for-confirmations-12345678',
    now: () => now,
  });
  runtime.streamers = service;
});
describe('registration authorization and confirmation boundary', () => {
  it('requires server-produced confirmation before persistence and never trusts submitted account details', async () => {
    const confirmation = await service.resolve(headers, guildId, 'youtube', '@handle');
    await service.add(headers, guildId, confirmation.confirmation);
    expect(repository.add).toHaveBeenCalledWith(guildId, account);
    expect(authorize).toHaveBeenCalledTimes(2);
    await expect(service.add(headers, guildId, account)).rejects.toMatchObject({
      code: 'invalid_confirmation',
    });
    await expect(
      service.add(headers, guildId, confirmation.confirmation.replace(/^./, 'x')),
    ).rejects.toMatchObject({ code: 'invalid_confirmation' });
  });
  it('binds confirmation to actor, guild and expiry and rechecks revoked permissions', async () => {
    const { confirmation } = await service.resolve(headers, guildId, 'youtube', '@handle');
    await expect(service.add(headers, '333333333333333333', confirmation)).rejects.toMatchObject({
      code: 'confirmation_expired',
    });
    actor = '444444444444444444';
    await expect(service.add(headers, guildId, confirmation)).rejects.toMatchObject({
      code: 'confirmation_expired',
    });
    actor = '222222222222222222';
    now += 600001;
    await expect(service.add(headers, guildId, confirmation)).rejects.toMatchObject({
      code: 'confirmation_expired',
    });
    denial = 403;
    await expect(service.add(headers, guildId, confirmation)).rejects.toMatchObject({
      status: 403,
    });
    expect(repository.add).not.toHaveBeenCalled();
  });
  it.each([401, 403])(
    'fails closed before any provider or persistence call for denied access %s',
    async (status) => {
      denial = status;
      for (const operation of [
        () => service.list(headers, guildId),
        () => service.resolve(headers, guildId, 'youtube', '@handle'),
        () => service.add(headers, guildId, 'fake'),
        () => service.change(headers, guildId, subscriptionId, false),
        () => service.change(headers, guildId, subscriptionId),
      ])
        await expect(operation()).rejects.toMatchObject({ status });
      expect(resolve).not.toHaveBeenCalled();
      for (const fn of Object.values(repository)) expect(fn).not.toHaveBeenCalled();
    },
  );
  it('limits attempts per user across guilds, then permits later retry', async () => {
    for (let i = 0; i < 10; i++) await service.resolve(headers, guildId, 'youtube', '@handle');
    await expect(
      service.resolve(headers, '333333333333333333', 'youtube', '@handle'),
    ).rejects.toMatchObject({ code: 'lookup_rate_limited', retryAfter: 60 });
    expect(resolve).toHaveBeenCalledTimes(10);
    now += 60001;
    await service.resolve(headers, guildId, 'youtube', '@handle');
    expect(resolve).toHaveBeenCalledTimes(11);
  });
  it('does not call providers for invalid input and maps uniqueness failures to 409', async () => {
    await expect(
      service.resolve(headers, guildId, 'youtube', 'https://evil.test'),
    ).rejects.toMatchObject({ status: 400 });
    expect(resolve).not.toHaveBeenCalled();
    const { confirmation } = await service.resolve(headers, guildId, 'youtube', '@handle');
    repository.add.mockRejectedValueOnce(new RegistrationError('duplicate_subscription'));
    await expect(service.add(headers, guildId, confirmation)).rejects.toMatchObject({
      status: 409,
      code: 'duplicate_subscription',
    });
  });
});
describe('registration HTTP contract', () => {
  it('resolves, confirms and lists with uncached responses, then supports disable and removal', async () => {
    const resolved = await RESOLVE(
      request('POST', { platform: 'youtube', identifier: '@handle', acceptPolicy: true }),
      context,
    );
    expect(resolved.status).toBe(200);
    const data = await resolved.json();
    const added = await POST(
      request('POST', { confirmation: data.confirmation, externalId: 'forged-id' }),
      context,
    );
    expect(added.status).toBe(201);
    expect(repository.add).toHaveBeenCalledWith(guildId, account);
    const listed = await GET(request('GET'), context);
    expect(await listed.json()).toEqual({ subscriptions: [] });
    expect(listed.headers.get('cache-control')).toBe('no-store');
    expect((await PATCH(request('PATCH', { enabled: false }), context)).status).toBe(200);
    expect(repository.setEnabled).toHaveBeenCalledWith(guildId, subscriptionId, false);
    expect((await DELETE(request('DELETE'), context)).status).toBe(200);
    expect(repository.remove).toHaveBeenCalledWith(guildId, subscriptionId);
  });
  it('rejects cross-origin mutations, missing enabled, invalid JSON and oversized payloads', async () => {
    const unaccepted = await RESOLVE(
      request('POST', { platform: 'youtube', identifier: '@handle' }),
      context,
    );
    expect(unaccepted.status).toBe(400);
    expect(await unaccepted.json()).toEqual({ error: 'policy_required' });
    expect((await POST(request('POST', {}, 'https://evil.test'), context)).status).toBe(403);
    expect((await PATCH(request('PATCH', {}), context)).status).toBe(400);
    expect(repository.remove).not.toHaveBeenCalled();
    expect(
      (
        await POST(
          new Request('http://localhost:3000', {
            method: 'POST',
            headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
            body: '{',
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect((await POST(request('POST', { oversized: 'x'.repeat(13000) }), context)).status).toBe(
      413,
    );
    expect(authorize).not.toHaveBeenCalled();
  });
  it('returns safe failures, permission and session errors without raw database messages', async () => {
    denial = 401;
    expect((await GET(request('GET'), context)).status).toBe(401);
    denial = 403;
    expect(
      (
        await RESOLVE(
          request('POST', { platform: 'kick', identifier: 'tester', acceptPolicy: true }),
          context,
        )
      ).status,
    ).toBe(403);
    denial = 0;
    repository.list.mockRejectedValueOnce(new Error('postgresql://secret'));
    const failed = await GET(request('GET'), context);
    expect(failed.status).toBe(503);
    expect(await failed.text()).toBe('{"error":"service_unavailable"}');
  });
});
