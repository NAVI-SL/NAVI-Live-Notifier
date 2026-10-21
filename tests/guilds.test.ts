import { describe, expect, it, vi } from 'vitest';
import {
  createGuildService,
  installationUrl,
  canManageGuild,
} from '../apps/web/src/lib/guild-service';
import { discordGuilds, botInstallationStatus } from '../apps/web/src/lib/discord';
import { guildRequest } from '../apps/web/src/lib/application-handlers';
import { createStatusHandler, discordBotLookup } from '../apps/bot/src/status-server';
import { REST, DiscordAPIError } from 'discord.js';
import type { NaviAuth } from '../apps/web/src/lib/auth-factory';
import { readAuthEnvironment } from '@navi/config';

const origin = 'http://localhost:3000';
const id = '111111111111111111';
const clientId = '222222222222222222';
const guildId = '333333333333333333';
const guild = { id: guildId, name: 'Test Server', icon: null, owner: false, permissions: '32' };
function setup(loggedIn = true, allowedGuilds?: string[]) {
  const getSession = vi.fn(async () =>
    loggedIn
      ? {
          user: {
            id: 'local-user',
            email: `discord-${id}@users.navi.invalid`,
            name: 'Tester',
            image: null,
          },
        }
      : null,
  );
  const fetchGuilds = vi.fn(async () => [
    guild,
    { ...guild, id: '444444444444444444', permissions: '0' },
  ]);
  const status = vi.fn(async () => 'installed' as const);
  const auth = {
    api: {
      getSession,
      listUserAccounts: vi.fn(async () => [{ providerId: 'discord', id: 'account-id' }]),
      getAccessToken: vi.fn(async () => ({ accessToken: 'secret' })),
    },
  } as unknown as NaviAuth;
  const service = createGuildService({
    auth,
    allowedUsers: [id],
    allowedGuilds,
    clientId,
    origin,
    fetchGuilds,
    installationStatus: status,
  });
  return { service, fetchGuilds, status, getSession };
}
describe('server-side guild authorization and installation', () => {
  it('restricts picker, install and protected requests to beta guilds without replacing Discord permissions', async () => {
    const test = setup(true, [guildId]);
    const otherId = '555555555555555555';
    test.fetchGuilds.mockResolvedValue([guild, { ...guild, id: otherId, owner: true }]);
    expect(await test.service.list(new Headers())).toEqual([
      { id: guildId, name: guild.name, icon: null },
    ]);
    await expect(test.service.authorize(new Headers(), otherId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(test.service.install(new Headers(), otherId)).rejects.toMatchObject({
      status: 403,
    });
    expect(test.status).not.toHaveBeenCalled();
    test.fetchGuilds.mockResolvedValue([{ ...guild, permissions: '0' }]);
    await expect(test.service.authorize(new Headers(), guildId)).rejects.toMatchObject({
      status: 403,
    });
    expect(await setup(true, []).service.list(new Headers())).toEqual([]);
    await expect(setup(false, [guildId]).service.list(new Headers())).rejects.toMatchObject({
      status: 401,
    });
  });
  it('bypasses completed display caches for every protected guild access', async () => {
    const test = setup();
    await test.service.list(new Headers());
    expect(test.fetchGuilds).toHaveBeenLastCalledWith('secret');
    await test.service.authorize(new Headers(), guildId);
    expect(test.fetchGuilds).toHaveBeenLastCalledWith('secret', { fresh: true });
    test.fetchGuilds.mockResolvedValueOnce([{ ...guild, permissions: '0' }]);
    await expect(test.service.authorize(new Headers(), guildId)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('distinguishes actual bot membership from absent access and upstream failures', async () => {
    const get = vi.spyOn(REST.prototype, 'get');
    const lookup = discordBotLookup('test-bot-token');
    get.mockResolvedValueOnce({ id: guildId });
    expect(await lookup(guildId)).toBe('installed');
    for (const code of [10004, 50001]) {
      get.mockRejectedValueOnce(
        new DiscordAPIError(
          { code, message: 'No access' },
          code,
          404,
          'GET',
          'https://discord.com/api/v10/guilds/test',
          {},
        ),
      );
      expect(await lookup(guildId)).toBe('not_installed');
    }
    get.mockRejectedValueOnce(new Error('Unauthorized or rate limited'));
    expect(await lookup(guildId)).toBe('unknown');
  });
  it('permits only owner/Admin/Manage Guild and uses BigInt permissions', () => {
    expect(canManageGuild({ owner: true, permissions: '0' })).toBe(true);
    expect(canManageGuild({ owner: false, permissions: '8' })).toBe(true);
    expect(canManageGuild({ owner: false, permissions: String((1n << 60n) | 32n) })).toBe(true);
    expect(canManageGuild({ owner: false, permissions: '16' })).toBe(false);
  });
  it('protects routes without relying on browser/server IDs', async () => {
    const test = setup(false);
    const response = await guildRequest(new Request(`${origin}/api/guilds`), test.service, 'list');
    expect(response.status).toBe(401);
    expect(test.fetchGuilds).not.toHaveBeenCalled();
  });
  it('filters guilds, rejects unauthorized direct access, and rechecks changed permissions', async () => {
    const test = setup();
    expect(await test.service.list(new Headers())).toEqual([
      { id: guildId, name: guild.name, icon: null },
    ]);
    await expect(test.service.status(new Headers(), '444444444444444444')).rejects.toThrow(
      'guild_forbidden',
    );
    expect(test.status).not.toHaveBeenCalled();
    await expect(test.service.install(new Headers(), guildId)).resolves.toContain(
      `guild_id=${guildId}`,
    );
    test.fetchGuilds.mockResolvedValueOnce([{ ...guild, permissions: '0' }]);
    await expect(test.service.install(new Headers(), guildId)).rejects.toThrow('guild_forbidden');
  });
  it('verifies installation only after authorization and rejects forged install origins', async () => {
    const test = setup();
    expect(await test.service.status(new Headers(), guildId)).toMatchObject({
      status: 'installed',
    });
    const response = await guildRequest(
      new Request(`${origin}/api/guilds/${guildId}/install`, {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
      test.service,
      'install',
      guildId,
      origin,
    );
    expect(response.status).toBe(403);
    const ok = await guildRequest(
      new Request(`${origin}/api/guilds/${guildId}/install`, {
        method: 'POST',
        headers: { origin },
      }),
      test.service,
      'install',
      guildId,
      origin,
    );
    expect(ok.status).toBe(303);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    const redirect = new URL(ok.headers.get('location')!);
    expect(redirect.origin).toBe('https://discord.com');
    expect(redirect.pathname).toBe('/oauth2/authorize');
    expect(redirect.searchParams.get('client_id')).toBe(clientId);
    expect(redirect.searchParams.get('guild_id')).toBe(guildId);
    expect(redirect.searchParams.get('integration_type')).toBe('0');
  });
  it('generates a guild-locked install URL without Administrator or user login scopes', () => {
    const url = new URL(installationUrl(clientId, guildId));
    expect(url.origin).toBe('https://discord.com');
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(['bot', 'applications.commands']);
    expect(url.searchParams.get('client_id')).toBe(clientId);
    expect(url.searchParams.get('integration_type')).toBe('0');
    expect(BigInt(url.searchParams.get('permissions') ?? '0') & 8n).toBe(0n);
    expect(url.searchParams.get('permissions')).toBe('19456');
    expect(url.searchParams.get('disable_guild_select')).toBe('true');
    expect(url.searchParams.get('guild_id')).toBe(guildId);
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(url.searchParams.has('redirect_uri')).toBe(false);
  });
  it.each([undefined, 'null', 'http://127.0.0.1:3000', 'https://evil.example'])(
    'keeps rejecting invalid install origins (%s) before authorization',
    async (supplied) => {
      const test = setup();
      const response = await guildRequest(
        new Request(`${origin}/api/guilds/${guildId}/install`, {
          method: 'POST',
          headers: supplied === undefined ? {} : { origin: supplied },
        }),
        test.service,
        'install',
        guildId,
        origin,
      );
      expect(response.status).toBe(403);
      expect(test.getSession).not.toHaveBeenCalled();
      expect(test.fetchGuilds).not.toHaveBeenCalled();
      expect(response.headers.has('location')).toBe(false);
    },
  );
  it('requires an authenticated manager even for the private bot install URL', async () => {
    const response = await guildRequest(
      new Request(`${origin}/api/guilds/${guildId}/install`, {
        method: 'POST',
        headers: { origin },
      }),
      setup(false).service,
      'install',
      guildId,
      origin,
    );
    expect(response.status).toBe(401);
    expect(response.headers.has('location')).toBe(false);
  });
  it('handles Discord authorization errors, invalid responses, API outages and rate limits', async () => {
    await expect(
      discordGuilds(
        'token-a',
        vi.fn(async () => new Response(null, { status: 401 })),
      ),
    ).rejects.toThrow('reauthentication');
    await expect(
      discordGuilds(
        'token-b',
        vi.fn(async () => new Response(null, { status: 503 })),
      ),
    ).rejects.toThrow('discord_unavailable');
    await expect(
      discordGuilds(
        'token-c',
        vi.fn(async () => Response.json({})),
      ),
    ).rejects.toThrow('invalid_response');
    const fetcher = vi.fn(async () => Response.json({ retry_after: 2 }, { status: 429 }));
    await expect(discordGuilds('rate-test', fetcher)).rejects.toMatchObject({
      status: 429,
      retryAfter: 2,
    });
    await expect(discordGuilds('rate-test', fetcher)).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('authenticates the internal bot endpoint and preserves unknown status', async () => {
    const secret = 'a'.repeat(40);
    const lookup = vi.fn(async () => 'not_installed' as const);
    const handler = createStatusHandler(secret, lookup);
    expect((await handler(new Request(`http://localhost/internal/guilds/${guildId}`))).status).toBe(
      401,
    );
    expect(lookup).not.toHaveBeenCalled();
    const response = await handler(
      new Request(`http://localhost/internal/guilds/${guildId}`, {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(await response.json()).toEqual({ status: 'not_installed' });
    const environment = readAuthEnvironment({
      NODE_ENV: 'test',
      WEB_ORIGIN: origin,
      DATABASE_URL: 'postgresql://localhost/navi',
      BETTER_AUTH_SECRET: 'x'.repeat(40),
      DISCORD_CLIENT_ID: clientId,
      DISCORD_CLIENT_SECRET: 'test',
      DISCORD_ALLOWED_USER_IDS: id,
      BOT_INTERNAL_SECRET: secret,
    });
    expect(
      await botInstallationStatus(
        guildId,
        environment,
        vi.fn(async () => new Response(null, { status: 503 })),
      ),
    ).toBe('unknown');
  });
});
