import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  schema,
  createNotificationRepository,
  createStreamerRepository,
  type NotificationRow,
} from '@navi/database';
import { DEFAULT_NOTIFICATION_TEMPLATE } from '@navi/core';
import { createGuildService } from '../apps/web/src/lib/guild-service';
import type { NaviAuth } from '../apps/web/src/lib/auth-factory';
import { createNotificationBroker } from '../apps/web/src/lib/notification-broker';
import { createNotificationService } from '../apps/web/src/lib/notification-service';
import { createStatusHandler } from '../apps/bot/src/status-server';
import { ids, notificationDiscordFixture } from './notification-fixtures';
vi.mock('server-only', () => ({}));
const runtime = vi.hoisted(() => ({ notifications: undefined as unknown }));
vi.mock('../apps/web/src/lib/runtime', () => ({
  getRuntime: () => ({
    notifications: runtime.notifications,
    environment: { WEB_ORIGIN: 'http://localhost:3000' },
  }),
}));
import { GET } from '../apps/web/src/app/api/guilds/[guildId]/notifications/route';
import { GET as TARGETS } from '../apps/web/src/app/api/guilds/[guildId]/notifications/targets/route';
import { PUT } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/route';
import { POST as PREVIEW } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/preview/route';
import { POST as TEST } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/test/route';
import { POST as DISABLE } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/disable/route';
const pg = new PGlite(),
  db = drizzle(pg, { schema });
let now = new Date('2026-10-17T00:00:00Z'),
  loggedIn = true,
  manager = true;
let youtube: string, kick: string, foreign: string;
let service: ReturnType<typeof createNotificationService>,
  fixture: ReturnType<typeof notificationDiscordFixture>;
let brokerFetch: ReturnType<typeof vi.fn<typeof fetch>>;
const repo = createNotificationRepository(db, () => now),
  headers = new Headers();
const config = {
  channelId: ids.channel,
  roleId: ids.role,
  template: DEFAULT_NOTIFICATION_TEMPLATE,
  enabled: true,
};
const context = () => ({
  params: Promise.resolve({ guildId: ids.guild, subscriptionId: youtube }),
});
function request(method: string, data?: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/guilds/test/notifications', {
    method,
    headers: { origin, 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
beforeAll(async () => {
  for (const file of [
    '0000_phase02_auth.sql',
    '0001_phase04_streamers.sql',
    '0002_phase05_notifications.sql',
    '0006_youtube_embed_mentions.sql',
  ])
    await pg.exec(
      readFileSync(new URL('../packages/database/migrations/' + file, import.meta.url), 'utf8'),
    );
}, 20000);
afterAll(async () => pg.close());
beforeEach(async () => {
  now = new Date('2026-10-17T00:00:00Z');
  loggedIn = true;
  manager = true;
  await pg.exec(
    'TRUNCATE notification_test_attempts, notification_settings, streamer_subscriptions, provider_channels CASCADE',
  );
  const registrations = createStreamerRepository(db, () => now);
  const identity = {
    provider: 'youtube' as const,
    externalId: 'UC' + 'a'.repeat(22),
    displayName: 'Test YouTube',
    canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
    userIdentifier: '@youtube',
  };
  await registrations.add(ids.guild, identity);
  await registrations.add(ids.otherGuild, identity);
  await registrations.add(ids.guild, {
    ...identity,
    provider: 'kick',
    externalId: '123',
    displayName: 'Test Kick',
    canonicalUrl: 'https://kick.com/tester',
    userIdentifier: 'tester',
  });
  const rows = await registrations.list(ids.guild);
  youtube = rows.find((row) => row.provider === 'youtube')!.id;
  kick = rows.find((row) => row.provider === 'kick')!.id;
  foreign = (await registrations.list(ids.otherGuild))[0]!.id;
  fixture = notificationDiscordFixture();
  const secret = 'local-test-shared-secret-1234567890-abcdef';
  const botHandler = createStatusHandler(secret, async () => 'installed', fixture.bot);
  brokerFetch = vi.fn<typeof fetch>(async (url, options) =>
    botHandler(new Request(String(url), options)),
  );
  const guilds = createGuildService({
    auth: {
      api: {
        getSession: async () =>
          loggedIn
            ? { user: { email: `discord-${ids.bot}@users.navi.invalid`, name: 'Developer' } }
            : null,
        listUserAccounts: async () => [{ id: 'discord-account', providerId: 'discord' }],
        getAccessToken: async () => ({ accessToken: 'private-user-token' }),
      },
    } as unknown as NaviAuth,
    allowedUsers: [ids.bot],
    clientId: ids.bot,
    origin: 'http://localhost:3000',
    fetchGuilds: async () =>
      [ids.guild, ids.otherGuild].map((id) => ({
        id,
        name: 'Guild',
        icon: null,
        owner: false,
        permissions: manager ? '32' : '0',
      })),
    installationStatus: async () => 'installed',
  });
  service = createNotificationService({
    guilds,
    repository: repo,
    broker: createNotificationBroker(
      { BOT_INTERNAL_URL: 'http://127.0.0.1:4001', BOT_INTERNAL_SECRET: secret },
      brokerFetch,
    ),
  });
  runtime.notifications = service;
});
describe('composed notification HTTP, auth, PostgreSQL and bot integration', () => {
  it('returns Kick sample embed and buttons without a live lookup, queue write or send', async () => {
    const preview = await service.preview(headers, ids.guild, kick, config);
    expect(preview.sample).toBe(true);
    expect(preview.kick?.embeds?.[0]).toMatchObject({
      color: 0x53fc18,
      fields: [{ name: 'Category', value: 'VALORANT', inline: false }],
    });
    expect(
      preview.kick?.components?.[0]?.components.every(
        (button) => button.style === 5 && button.url === 'https://kick.com/tester',
      ),
    ).toBe(true);
    expect(preview.kick?.allowed_mentions).toEqual({
      parse: [],
      roles: [],
      users: [],
      replied_user: false,
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
  });
  it('reauthorizes a forced permission refresh and bypasses the short display cache', async () => {
    const targetRequest = (fresh = false) =>
      new Request(
        `http://localhost:3000/api/guilds/${ids.guild}/notifications/targets${fresh ? '?fresh=1' : ''}`,
      );
    const before = await TARGETS(targetRequest(), context());
    expect(before.status).toBe(200);
    expect(
      (await before.json()).channels.find((c: { id: string }) => c.id === ids.channel)
        .canMentionEveryone,
    ).toBeUndefined();
    fixture.state.canMentionEveryone = true;
    const cached = await TARGETS(targetRequest(), context());
    expect(
      (await cached.json()).channels.find((c: { id: string }) => c.id === ids.channel)
        .canMentionEveryone,
    ).toBeUndefined();
    const refreshed = await TARGETS(targetRequest(true), context());
    expect(refreshed.status).toBe(200);
    expect(refreshed.headers.get('cache-control')).toBe('no-store');
    expect(
      (await refreshed.json()).channels.find((c: { id: string }) => c.id === ids.channel)
        .canMentionEveryone,
    ).toBe(true);
    expect(String(brokerFetch.mock.calls.at(-1)![0])).toContain('/notification-targets?fresh=1');
    await service.save(
      headers,
      ids.guild,
      youtube,
      { ...config, roleId: null, mentionEveryone: true },
      0,
    );
    expect((await repo.get(ids.guild, youtube)).config?.mentionEveryone).toBe(true);
    const calls = brokerFetch.mock.calls.length;
    manager = false;
    expect((await TARGETS(targetRequest(true), context())).status).toBe(403);
    loggedIn = false;
    expect((await TARGETS(targetRequest(true), context())).status).toBe(401);
    expect(brokerFetch).toHaveBeenCalledTimes(calls);
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
  it.each(['youtube', 'kick'] as const)(
    'persists exclusive %s everyone, role and no-mention selections without changing other settings',
    async (provider) => {
      fixture.state.canMentionEveryone = true;
      const id = provider === 'youtube' ? youtube : kick;
      await service.save(headers, ids.guild, id, config, 0);
      expect((await repo.get(ids.guild, id)).config).toEqual(config);
      await service.save(headers, ids.guild, id, { ...config, mentionEveryone: true }, 1);
      expect((await createNotificationRepository(db, () => now).get(ids.guild, id)).config).toEqual(
        { ...config, roleId: null, mentionEveryone: true },
      );
      await service.save(headers, ids.guild, id, { ...config, roleId: null }, 2);
      expect((await repo.get(ids.guild, id)).config).toEqual({ ...config, roleId: null });
      await service.save(headers, ids.guild, id, config, 3);
      expect((await repo.get(ids.guild, id)).config).toEqual(config);
    },
  );
  it('maps legacy checkbox-plus-role rows to everyone on read without rewriting saved data', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    await service.save(headers, ids.guild, kick, config, 0);
    await db
      .update(schema.notificationSettings)
      .set({ mentionEveryone: true })
      .where(eq(schema.notificationSettings.subscriptionId, youtube));
    const before = await db.select().from(schema.notificationSettings);
    const recovered = createNotificationRepository(db, () => now);
    expect((await recovered.get(ids.guild, youtube)).config).toEqual({
      ...config,
      roleId: null,
      mentionEveryone: true,
    });
    expect((await recovered.get(ids.guild, kick)).config).toEqual(config);
    expect(await db.select().from(schema.notificationSettings)).toEqual(before);
  });
  it.each(['youtube', 'kick'] as const)(
    'never pings everyone in %s previews or test messages',
    async (provider) => {
      fixture.state.canMentionEveryone = true;
      const id = provider === 'youtube' ? youtube : kick;
      const opted = { ...config, roleId: null, mentionEveryone: true };
      await service.save(headers, ids.guild, id, opted, 0);
      expect((await service.preview(headers, ids.guild, id, opted)).content).not.toContain(
        '@everyone',
      );
      await service.test(headers, ids.guild, id, randomUUID(), 1);
      expect(fixture.rest.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            content: expect.not.stringContaining('@everyone'),
            allowed_mentions: { parse: [], roles: [], users: [], replied_user: false },
          }),
        }),
      );
    },
  );
  it('persists the explicit YouTube everyone opt-in and resets it when disabled or omitted', async () => {
    fixture.state.canMentionEveryone = true;
    await service.save(headers, ids.guild, youtube, { ...config, mentionEveryone: true }, 0);
    expect(
      (await createNotificationRepository(db, () => now).get(ids.guild, youtube)).config
        ?.mentionEveryone,
    ).toBe(true);
    expect((await repo.get(ids.otherGuild, foreign)).config).toBeNull();
    await service.save(headers, ids.guild, youtube, { ...config, mentionEveryone: false }, 1);
    expect((await repo.get(ids.guild, youtube)).config?.mentionEveryone).toBeUndefined();
    await service.save(headers, ids.guild, youtube, { ...config, mentionEveryone: true }, 2);
    await service.save(headers, ids.guild, youtube, config, 3);
    expect((await repo.get(ids.guild, youtube)).config?.mentionEveryone).toBeUndefined();
  });
  it('rejects unprivileged saves and absent mention permission for either platform without writing settings', async () => {
    const optIn = { ...config, mentionEveryone: true };
    await expect(service.save(headers, ids.guild, youtube, optIn, 0)).rejects.toMatchObject({
      code: 'everyone_mention_not_permitted',
    });
    await expect(service.save(headers, ids.guild, kick, optIn, 0)).rejects.toMatchObject({
      code: 'everyone_mention_not_permitted',
    });
    fixture.state.canMentionEveryone = true;
    manager = false;
    await expect(service.save(headers, ids.guild, youtube, optIn, 0)).rejects.toMatchObject({
      code: 'guild_forbidden',
    });
    expect((await repo.get(ids.guild, youtube)).config).toBeNull();
  });
  it.each(['save', 'disable'] as const)(
    'returns the committed %s snapshot without a fallible post-commit read',
    async (action) => {
      if (action === 'disable') await service.save(headers, ids.guild, youtube, config, 0);
      const read = vi.spyOn(repo, 'get');
      read.mockImplementationOnce(async () => {
        const row = await createNotificationRepository(db, () => now).get(ids.guild, youtube);
        read.mockRejectedValue(new Error('simulated post-commit read outage'));
        return row;
      });
      const response =
        action === 'save'
          ? await PUT(request('PUT', { config, version: 0 }), context())
          : await DISABLE(request('POST', { version: 1 }), context());
      expect(response.status).toBe(200);
      const saved = (await response.json()) as NotificationRow;
      expect(saved.config).toEqual({ ...config, enabled: action === 'save' });
      expect(saved.version).toBe(action === 'save' ? 1 : 2);
      expect(read).toHaveBeenCalledTimes(1);
      read.mockRestore();
      // A later writer cannot rewrite the snapshot returned by the earlier commit.
      await repo.save(
        ids.guild,
        youtube,
        { ...saved.config!, template: 'Later edit' },
        saved.version,
      );
      expect(saved.config!.template).toBe(config.template);
      expect((await repo.get(ids.guild, youtube)).version).toBe(saved.version + 1);
    },
  );
  it('returns the exact inserted/updated repository rows and rejects stale versions', async () => {
    const added = await repo.save(ids.guild, youtube, config, 0);
    expect(added).toMatchObject({ subscriptionId: youtube, config, version: 1 });
    const changed = await repo.save(ids.guild, youtube, { ...config, enabled: false }, 1);
    expect(changed).toMatchObject({ config: { ...config, enabled: false }, version: 2 });
    await expect(repo.save(ids.guild, youtube, config, 1)).rejects.toMatchObject({
      code: 'notification_settings_changed',
    });
    expect((await repo.get(ids.guild, youtube)).config).toEqual(changed.config);
  });
  it('marks acknowledgment-storage failure uncertain and never resends a pending replay', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    const requestId = randomUUID();
    const finish = vi.spyOn(repo, 'finishTest').mockRejectedValueOnce(new Error('storage outage'));
    await expect(service.test(headers, ids.guild, youtube, requestId, 1)).rejects.toMatchObject({
      code: 'test_delivery_uncertain',
    });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.notificationTestAttempts))[0]!.status).toBe('pending');
    finish.mockRestore();
    const restarted = createNotificationService({
      guilds: { authorize: async () => ({ id: ids.guild, name: 'Guild', icon: null }) },
      repository: createNotificationRepository(db, () => now),
      broker: {
        targets: async () => fixture.bot.targets(ids.guild),
        sendTest: async () => {
          throw new Error('must not send');
        },
      },
    });
    expect(await restarted.test(headers, ids.guild, youtube, requestId, 1)).toEqual({
      status: 'uncertain',
      replayed: true,
    });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('keeps a failed-send result uncertain if recording its failure also fails', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    fixture.state.writable = false;
    vi.spyOn(repo, 'finishTest').mockRejectedValueOnce(new Error('storage outage'));
    await expect(service.test(headers, ids.guild, youtube, randomUUID(), 1)).rejects.toMatchObject({
      code: 'test_delivery_uncertain',
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
  it.each([
    { body: '{', type: 'application/json', status: 400 },
    { body: '[]', type: 'application/json', status: 400 },
    { body: '{}', type: 'text/plain', status: 415 },
    { body: JSON.stringify({ padding: 'x'.repeat(12001) }), type: 'application/json', status: 413 },
  ])(
    'rejects invalid/bounded mutation bodies with $status and no writes',
    async ({ body, type, status }) => {
      const response = await PUT(
        new Request('http://localhost:3000/api/guilds/test/notifications', {
          method: 'PUT',
          headers: { origin: 'http://localhost:3000', 'content-type': type },
          body,
        }),
        context(),
      );
      expect(response.status).toBe(status);
      expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
      expect(brokerFetch).not.toHaveBeenCalled();
    },
  );
  it('saves/restores separate YouTube and Kick destinations without changing another guild', async () => {
    expect((await GET(request('GET'), context())).status).toBe(200);
    expect((await PUT(request('PUT', { config, version: 0 }), context())).status).toBe(200);
    await service.save(
      headers,
      ids.guild,
      kick,
      { ...config, channelId: ids.otherChannel, roleId: null, enabled: false },
      0,
    );
    const reloaded = createNotificationRepository(db, () => now);
    expect((await reloaded.get(ids.guild, youtube)).config).toEqual(config);
    expect((await reloaded.get(ids.guild, kick)).config).toMatchObject({
      channelId: ids.otherChannel,
      roleId: null,
      enabled: false,
    });
    expect((await reloaded.get(ids.otherGuild, foreign)).config).toBeNull();
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(2);
  });
  it('rejects foreign subscriptions and enforces the composite guild FK in PostgreSQL', async () => {
    await expect(service.save(headers, ids.guild, foreign, config, 0)).rejects.toMatchObject({
      code: 'subscription_not_found',
    });
    await expect(
      db
        .insert(schema.notificationSettings)
        .values({ guildId: ids.otherGuild, subscriptionId: youtube, ...config }),
    ).rejects.toThrow();
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
  });
  it.each([false, true])(
    'denies all operations before provider/DB side effects for missing or revoked access (logged in: %s)',
    async (active) => {
      loggedIn = active;
      manager = false;
      for (const action of [
        () => service.list(headers, ids.guild),
        () => service.targets(headers, ids.guild),
        () => service.save(headers, ids.guild, youtube, config, 0),
        () => service.preview(headers, ids.guild, youtube, config),
        () => service.test(headers, ids.guild, youtube, randomUUID(), 1),
        () => service.disable(headers, ids.guild, youtube, 1),
      ])
        await expect(action()).rejects.toMatchObject({ status: active ? 403 : 401 });
      expect(brokerFetch).not.toHaveBeenCalled();
      expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
      expect(await db.select().from(schema.notificationTestAttempts)).toHaveLength(0);
    },
  );
  it('rejects forged channels and unauthorized, managed and everyone role IDs', async () => {
    for (const settings of [
      { ...config, channelId: '999999999999999999' },
      { ...config, roleId: ids.guild },
      { ...config, roleId: ids.botRole },
      { ...config, roleId: '999999999999999999' },
    ])
      await expect(service.save(headers, ids.guild, youtube, settings, 0)).rejects.toMatchObject({
        status: 409,
      });
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
  });
  it('previews validated sample data without persisting or sending', async () => {
    const result = await PREVIEW(request('POST', { config }), context());
    expect(result.status).toBe(200);
    const preview = await result.json();
    expect(preview).toMatchObject({ sample: true });
    expect(preview.content).toContain('Test YouTube');
    expect(preview.content).toContain('Sample livestream title');
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
    expect(JSON.stringify(preview)).not.toContain('secret');
  });
  it('protects origins, rejects malformed templates/versions and handles concurrent edits', async () => {
    expect(
      (await PUT(request('PUT', { config, version: 0 }, 'https://evil.example'), context())).status,
    ).toBe(403);
    expect(
      (
        await PUT(
          request('PUT', { config: { ...config, template: '@everyone' }, version: 0 }),
          context(),
        )
      ).status,
    ).toBe(400);
    expect((await PUT(request('PUT', { config, version: -1 }), context())).status).toBe(400);
    await service.save(headers, ids.guild, youtube, config, 0);
    await service.save(headers, ids.guild, youtube, { ...config, enabled: false }, 1);
    await expect(service.save(headers, ids.guild, youtube, config, 1)).rejects.toMatchObject({
      code: 'notification_settings_changed',
    });
    expect((await repo.get(ids.guild, youtube)).config!.enabled).toBe(false);
  });
  it('sends one labelled test from saved settings even when disabled, and deduplicates replay', async () => {
    await service.save(headers, ids.guild, youtube, { ...config, enabled: false }, 0);
    const requestId = randomUUID();
    const first = await TEST(
      request('POST', {
        version: 1,
        requestId,
        config: { ...config, channelId: '999999999999999999' },
      }),
      context(),
    );
    expect(await first.json()).toEqual({ status: 'sent', replayed: false });
    expect(await service.test(headers, ids.guild, youtube, requestId, 1)).toEqual({
      status: 'sent',
      replayed: true,
    });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.notificationTestAttempts))[0]!.status).toBe('sent');
  });
  it('serializes competing test requests and throttles distinct attempts per guild in PostgreSQL', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    const requestId = randomUUID();
    await Promise.all([
      service.test(headers, ids.guild, youtube, requestId, 1),
      service.test(headers, ids.guild, youtube, requestId, 1),
    ]);
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    await expect(service.test(headers, ids.guild, youtube, randomUUID(), 1)).rejects.toMatchObject({
      code: 'test_notification_rate_limited',
      retryAfter: 30,
    });
    now = new Date(now.getTime() + 30001);
    await service.test(headers, ids.guild, youtube, randomUUID(), 1);
    expect(fixture.rest.post).toHaveBeenCalledTimes(2);
  });
  it.each(['channel', 'role', 'bot'])(
    'handles removed/revoked %s state after save without sending',
    async (reason) => {
      await service.save(headers, ids.guild, youtube, config, 0);
      if (reason === 'channel') fixture.state.writable = false;
      if (reason === 'role') fixture.state.mentionable = false;
      if (reason === 'bot') fixture.state.installed = false;
      await expect(
        service.test(headers, ids.guild, youtube, randomUUID(), 1),
      ).rejects.toMatchObject({ status: 409 });
      expect(fixture.rest.post).not.toHaveBeenCalled();
      expect((await db.select().from(schema.notificationTestAttempts))[0]!.status).toBe('failed');
    },
  );
  it('allows restrictive disable after bot removal without accepting new channel or role IDs', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    fixture.state.installed = false;
    brokerFetch.mockClear();
    expect((await service.disable(headers, ids.guild, youtube, 1)).config).toEqual({
      ...config,
      enabled: false,
    });
    expect(brokerFetch).not.toHaveBeenCalled();
  });
  it('records ambiguous delivery, prevents replay resend and expires test history without provider data', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    fixture.state.failSend = true;
    const requestId = randomUUID();
    await expect(service.test(headers, ids.guild, youtube, requestId, 1)).rejects.toMatchObject({
      code: 'test_delivery_uncertain',
    });
    expect(await service.test(headers, ids.guild, youtube, requestId, 1)).toMatchObject({
      status: 'uncertain',
      replayed: true,
    });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    now = new Date(now.getTime() + 8 * 86400_000);
    await repo.pruneTests();
    expect(await db.select().from(schema.notificationTestAttempts)).toHaveLength(0);
  });
  it('cascades settings on registration deletion and refuses expired identities', async () => {
    await service.save(headers, ids.guild, youtube, config, 0);
    await createStreamerRepository(db, () => now).remove(ids.guild, youtube);
    expect(await db.select().from(schema.notificationSettings)).toHaveLength(0);
    now = new Date(now.getTime() + 30 * 86400_000);
    expect(await service.list(headers, ids.guild)).toEqual([]);
    await expect(service.save(headers, ids.guild, kick, config, 0)).rejects.toMatchObject({
      code: 'subscription_not_found',
    });
  });
});
