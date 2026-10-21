import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  schema,
  createMonitoringRepository,
  createStreamerRepository,
  createNotificationRepository,
  CoordinationBusyError,
} from '@navi/database';
import { readMonitoringEnvironment } from '@navi/config';
import { createMonitoringProviders } from '../apps/worker/src/providers';
import { createMonitor, retryDelay, youtubePollInterval } from '../apps/worker/src/monitor';
import { createStatusHandler } from '../apps/bot/src/status-server';
import { notificationDiscordFixture, ids } from './notification-fixtures';
const pg = new PGlite(),
  db = drizzle(pg, { schema });
let clock = Date.parse('2026-11-01T00:00:00Z'),
  live = false,
  videoId = 'abcdefghijk';
const now = () => new Date(clock),
  repo = createMonitoringRepository(db, now);
const channelId = 'UC' + 'a'.repeat(22);
const env = readMonitoringEnvironment({
  MONITORING_ENABLED: 'true',
  BOT_INTERNAL_SECRET: 'test-secret-with-thirty-two-characters',
  YOUTUBE_API_KEY: 'test-api-key',
  KICK_CLIENT_ID: 'test-id',
  KICK_CLIENT_SECRET: 'test-secret',
});
let fixture: ReturnType<typeof notificationDiscordFixture>;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
let startedAt: string;
beforeAll(async () => {
  for (const file of [
    '0000_phase02_auth.sql',
    '0001_phase04_streamers.sql',
    '0002_phase05_notifications.sql',
    '0003_phase06_monitoring.sql',
    '0004_phase06_baseline.sql',
    '0005_phase07_reliability.sql',
    '0006_youtube_embed_mentions.sql',
  ])
    await pg.exec(
      readFileSync(new URL('../packages/database/migrations/' + file, import.meta.url), 'utf8'),
    );
}, 20000);
afterAll(() => pg.close());
beforeEach(async () => {
  clock = Date.parse('2026-11-01T00:00:00Z');
  live = false;
  videoId = 'abcdefghijk';
  startedAt = new Date(clock + 30000).toISOString();
  await pg.exec('TRUNCATE monitor_receipts, monitor_limits, provider_channels CASCADE');
  fixture = notificationDiscordFixture();
  const broker = createStatusHandler(
    env.BOT_INTERNAL_SECRET!,
    async () => 'installed',
    fixture.bot,
  );
  fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === '127.0.0.1') return broker(new Request(url, init));
    if (url.hostname === 'id.kick.com')
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    if (url.pathname.endsWith('/channels'))
      return url.hostname === 'api.kick.com'
        ? Response.json({ data: [{ broadcaster_user_id: 123, slug: 'tester' }] })
        : Response.json({
            items: [
              {
                id: channelId,
                snippet: { title: 'YouTube Tester' },
                contentDetails: { relatedPlaylists: { uploads: 'UUtest' } },
              },
            ],
          });
    if (url.pathname.endsWith('/playlistItems'))
      return Response.json({ items: [{ contentDetails: { videoId } }] });
    if (url.pathname.endsWith('/videos'))
      return Response.json({
        items: [
          {
            id: videoId,
            snippet: {
              channelId,
              title: 'Real title @everyone',
              liveBroadcastContent: live ? 'live' : 'none',
              thumbnails: { high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault_live.jpg` } },
            },
            liveStreamingDetails: live ? { actualStartTime: startedAt } : {},
            status: { privacyStatus: 'public' },
          },
        ],
      });
    if (url.pathname.endsWith('/users/livestreams'))
      return Response.json({
        data: live
          ? [
              {
                broadcaster_user: {
                  id: 123,
                  username: 'Navi_Gaming',
                  profile_picture: 'https://files.kick.com/images/user/sample.png',
                },
                channel: { slug: 'tester' },
                title: 'Kick title',
                started_at: startedAt,
                category: {
                  id: 1,
                  name: 'VALORANT',
                  thumbnail: 'https://files.kick.com/images/subcategories/valorant.jpg',
                },
                thumbnail: 'https://images.kick.com/video_thumbnails/sample.webp',
              },
            ]
          : [],
      });
    throw new Error('unexpected official request');
  });
});
async function registrations(provider: 'youtube' | 'kick', both = true) {
  const registrations = createStreamerRepository(db, now),
    settings = createNotificationRepository(db, now);
  const identity = {
    provider,
    externalId: provider === 'youtube' ? channelId : '123',
    displayName: 'Streamer',
    canonicalUrl:
      provider === 'youtube'
        ? `https://www.youtube.com/channel/${channelId}`
        : 'https://kick.com/tester',
    userIdentifier: 'tester',
  };
  for (const [index, guildId] of (both ? [ids.guild, ids.otherGuild] : [ids.guild]).entries()) {
    await registrations.add(guildId, identity);
    const [row] = await registrations.list(guildId);
    await settings.save(
      guildId,
      row!.id,
      {
        channelId: index === 0 ? ids.channel : ids.otherChannel,
        roleId: null,
        template: '{streamer} {platform} {title} {url}',
        enabled: true,
      },
      0,
    );
  }
  return (await repo.sources())[0]!;
}
const coordinate = async <T>(_id: string, operation: (assertHeld: () => void) => Promise<T>) =>
  operation(() => {});
function monitor() {
  return createMonitor(
    env,
    repo,
    createMonitoringProviders(env, repo, fetcher, () => clock),
    coordinate,
    fetcher,
    () => clock,
    () => {},
  );
}
describe('Phase 6 durable monitor and existing Discord sender integration (simulated providers)', () => {
  it('reports bounded heartbeat, quota and first-detection/ack telemetry without counting repeat LIVE observations as new detections', async () => {
    await registrations('kick', false);
    const worker = monitor();
    expect(worker.health().heartbeat).toEqual({ lastCompletedTickAt: null, ageMs: null });
    await worker.tick();
    expect(worker.health().metrics.firstDetectionLagMs.samples).toBe(0);
    clock += 60001;
    live = true;
    await worker.tick();
    const health = worker.health();
    expect(health.status).toBe('ok');
    expect(health.heartbeat).toEqual({ lastCompletedTickAt: clock, ageMs: 0 });
    expect(health.metrics.firstDetectionLagMs).toMatchObject({ samples: 1, maxMs: 30001 });
    expect(health.metrics.streamStartToBrokerAckMs).toMatchObject({ samples: 1, maxMs: 30001 });
    expect(health.metrics.deliveryOutcomes).toMatchObject({ sending: 1, sent: 1, uncertain: 0 });
    expect(health.quota.available).toBe(true);
    expect(health.quota.reservations.some((row) => row.provider === 'kick' && row.used > 0)).toBe(
      true,
    );
    health.metrics.deliveryOutcomes.sent = 999;
    expect(worker.health().metrics.deliveryOutcomes.sent).toBe(1);
    clock += 60001;
    await worker.tick();
    expect(worker.health().metrics.firstDetectionLagMs.samples).toBe(1);
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    const restarted = monitor();
    await restarted.tick();
    expect(restarted.health().metrics.deliveryOutcomes.sent).toBe(0);
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    clock += 120001;
    expect(restarted.health().heartbeat.ageMs).toBe(120001);
    expect(restarted.health().status).toBe('degraded');
    expect(JSON.stringify(worker.health())).not.toContain('test-api-key');
  });
  it('keeps optional quota telemetry failure separate from working detection and durable delivery', async () => {
    await registrations('kick', false);
    const worker = monitor();
    const stats = vi.spyOn(repo, 'quotaSnapshot').mockRejectedValueOnce(new Error('FAKE_SECRET'));
    try {
      await worker.tick();
      expect(worker.health().quota.available).toBe(false);
      expect(worker.health().status).toBe('ok');
      clock += 60001;
      live = true;
      await worker.tick();
      expect(worker.health().quota.available).toBe(true);
      expect(worker.health().metrics.deliveryOutcomes.sent).toBe(1);
      expect(fixture.rest.post).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(worker.health())).not.toContain('FAKE_SECRET');
    } finally {
      stats.mockRestore();
    }
  });
  it.each([50, 51, 100])(
    'checks a known YouTube LIVE candidate at position %i despite repeated upload discovery',
    async (count) => {
      const source = await registrations('youtube', false);
      await monitor().tick();
      const recent = Array.from(
        { length: count - 1 },
        (_, index) => 'sample' + String(index).padStart(5, '0'),
      );
      await repo.receipt('youtube:older-known', source.id, [...recent.slice(50), videoId]);
      const original = fetcher.getMockImplementation()!;
      const checked: string[] = [];
      fetcher.mockImplementation(async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('/playlistItems'))
          return Response.json({
            items: recent.slice(0, 50).map((id) => ({ contentDetails: { videoId: id } })),
          });
        if (url.pathname.endsWith('/videos')) {
          const ids = url.searchParams.get('id')!.split(',');
          expect(ids.length).toBeLessThanOrEqual(50);
          checked.push(...ids);
          return Response.json({
            items: ids.map((id) => ({
              id,
              snippet: {
                channelId,
                title: 'Current public LIVE',
                liveBroadcastContent: id === videoId ? 'live' : 'none',
              },
              liveStreamingDetails: id === videoId ? { actualStartTime: startedAt } : {},
              status: { privacyStatus: 'public' },
            })),
          });
        }
        return original(input, init);
      });
      clock += 60001;
      live = true;
      await monitor().tick();
      expect(new Set(checked).size).toBe(count);
      expect(checked).toContain(videoId);
      expect(fixture.rest.post).toHaveBeenCalledTimes(1);
      clock += 60001;
      await monitor().tick(); // New monitor instance, same source/session/destination.
      expect(fixture.rest.post).toHaveBeenCalledTimes(1);
      expect(await db.select().from(schema.liveDeliveries)).toHaveLength(1);
    },
  );
  it('commits no partial YouTube observation if the second candidate batch fails, then recovers once', async () => {
    const source = await registrations('youtube', false);
    await monitor().tick();
    const candidates = Array.from(
      { length: 50 },
      (_, index) => 'sample' + String(index).padStart(5, '0'),
    );
    await repo.receipt('youtube:second-batch', source.id, [videoId]);
    const original = fetcher.getMockImplementation()!;
    let fail = true;
    fetcher.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/playlistItems'))
        return Response.json({
          items: candidates.map((id) => ({ contentDetails: { videoId: id } })),
        });
      if (
        url.pathname.endsWith('/videos') &&
        !url.searchParams.get('id')!.split(',').includes(videoId)
      )
        return Response.json({ items: [] });
      if (fail && url.pathname.endsWith('/videos')) return Response.json({}, { status: 503 });
      return original(input, init);
    });
    clock += 60001;
    live = true;
    await monitor().tick();
    expect(await db.select().from(schema.monitorSessions)).toHaveLength(0);
    expect(await db.select().from(schema.liveDeliveries)).toHaveLength(0);
    fail = false;
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('suppresses previously queued foreign-guild work and fans out only to the beta scope', async () => {
    const source = await registrations('kick');
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      [
        {
          sessionKey: startedAt,
          startedAt,
          title: 'Scoped stream',
          url: 'https://kick.com/tester',
        },
      ],
      true,
    );
    const scoped = createMonitoringRepository(db, now, [ids.guild]);
    await createMonitor(
      env,
      scoped,
      createMonitoringProviders(env, scoped, fetcher, () => clock),
      coordinate,
      fetcher,
      () => clock,
      () => {},
    ).tick();
    const deliveries = await db.select().from(schema.liveDeliveries);
    expect(deliveries.find((row) => row.guildId === ids.guild)?.status).toBe('sent');
    expect(deliveries.find((row) => row.guildId === ids.otherGuild)?.status).toBe('suppressed');
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect(await createMonitoringRepository(db, now, []).sources()).toEqual([]);
    expect(await createMonitoringRepository(db, now, ['999999999999999999']).sources()).toEqual([]);
  });
  it('uses fresh Kick title and image metadata from one shared pre-send confirmation for multiple destinations', async () => {
    await registrations('kick');
    await monitor().tick();
    clock += 60001;
    live = true;
    const original = fetcher.getMockImplementation()!;
    let checks = 0;
    fetcher.mockImplementation(async (input, init) => {
      const response = await original(input, init);
      if (new URL(String(input)).pathname.endsWith('/users/livestreams')) {
        checks++;
        const body = await response.json();
        body.data[0].title = checks === 1 ? 'Detected title' : 'Latest confirmed title';
        body.data[0].thumbnail = 'https://images.kick.com/video_thumbnails/latest.webp';
        return Response.json(body);
      }
      return response;
    });
    await monitor().tick();
    expect(checks).toBe(2); // one observation + one confirmation shared by both destinations
    expect(fixture.rest.post).toHaveBeenCalledTimes(2);
    expect(fixture.rest.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          content: expect.stringContaining('Latest confirmed title'),
          embeds: [
            expect.objectContaining({
              description: '**Stream title:** Latest confirmed title',
              image: { url: 'https://images.kick.com/video_thumbnails/latest.webp' },
            }),
          ],
        }),
      }),
    );
    const saved = await db.select().from(schema.liveDeliveries);
    expect(saved.every((row) => row.status === 'sent')).toBe(true);
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(2);
  });
  it('uses a safe Kick title/category fallback without additional metadata lookups', async () => {
    const source = await registrations('kick', false);
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) =>
      new URL(String(input)).pathname.endsWith('/users/livestreams')
        ? Response.json({
            data: [
              {
                broadcaster_user: { id: 123 },
                channel: { slug: 'tester' },
                title: null,
                started_at: startedAt,
                thumbnail: 'http://127.0.0.1/private',
              },
            ],
          })
        : original(input, init),
    );
    const result = await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source);
    expect(result.live[0]).toMatchObject({ title: 'Live on Kick', url: 'https://kick.com/tester' });
    expect(result.live[0]!.thumbnailUrl).toBeUndefined();
    expect(result.live[0]!.categoryName).toBeUndefined();
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).includes('/users/livestreams')),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.some(
        ([url]) => String(url).includes('/categories') || String(url).includes('/users?'),
      ),
    ).toBe(false);
  });
  it('does not create a Kick LIVE alert or offline message when the official active-stream response is empty', async () => {
    const source = await registrations('kick', false);
    const result = await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source);
    expect(result.live).toEqual([]);
    await monitor().tick();
    clock += 60001;
    await monitor().tick();
    expect(await db.select().from(schema.liveDeliveries)).toHaveLength(0);
    expect(fixture.rest.post).not.toHaveBeenCalled();
    live = true;
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    live = false;
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('sent');
  });
  it.each(['youtube', 'kick'] as const)(
    'normalizes legacy %s everyone preferences in the durable worker payload and keeps destination deduplication',
    async (provider) => {
      await registrations(provider);
      const settings = createNotificationRepository(db, now);
      const first = (await settings.list(ids.guild))[0]!;
      const second = (await settings.list(ids.otherGuild))[0]!;
      await settings.save(
        ids.guild,
        first.subscriptionId,
        { ...first.config!, mentionEveryone: true },
        first.version,
      );
      // Simulate an old checkbox row containing both fields, without a data migration.
      await db
        .update(schema.notificationSettings)
        .set({ roleId: ids.role })
        .where(eq(schema.notificationSettings.subscriptionId, first.subscriptionId));
      await settings.save(
        ids.otherGuild,
        second.subscriptionId,
        { ...second.config!, roleId: ids.role },
        second.version,
      );
      fixture.state.canMentionEveryone = true;
      await monitor().tick();
      clock += 60001;
      live = true;
      await monitor().tick();
      expect(fixture.rest.post).toHaveBeenCalledTimes(2);
      if (provider === 'kick') {
        expect(fixture.rest.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.objectContaining({
              embeds: [
                expect.objectContaining({
                  color: 0x53fc18,
                  author: expect.objectContaining({
                    name: '🔴 [LIVE] Navi_Gaming',
                    icon_url: 'https://files.kick.com/images/user/sample.png',
                  }),
                  description: '**Stream title:** Kick title',
                  fields: [{ name: 'Category', value: 'VALORANT', inline: false }],
                  image: { url: 'https://images.kick.com/video_thumbnails/sample.webp' },
                  thumbnail: { url: 'https://files.kick.com/images/subcategories/valorant.jpg' },
                }),
              ],
              components: [
                expect.objectContaining({
                  components: [
                    expect.objectContaining({ style: 5, url: 'https://kick.com/tester' }),
                    expect.objectContaining({ style: 5, url: 'https://kick.com/tester' }),
                  ],
                }),
              ],
            }),
          }),
        );
      }
      expect(fixture.rest.post).toHaveBeenCalledWith(
        `/channels/${ids.channel}/messages`,
        expect.objectContaining({
          body: expect.objectContaining({
            allowed_mentions: { parse: ['everyone'], roles: [], users: [], replied_user: false },
          }),
        }),
      );
      expect(fixture.rest.post).toHaveBeenCalledWith(
        `/channels/${ids.otherChannel}/messages`,
        expect.objectContaining({
          body: expect.objectContaining({
            allowed_mentions: { parse: [], roles: [ids.role], users: [], replied_user: false },
          }),
        }),
      );
      clock += 60001;
      await monitor().tick();
      expect(fixture.rest.post).toHaveBeenCalledTimes(2);
      expect(await db.select().from(schema.liveDeliveries)).toHaveLength(2);
    },
  );
  it('discovers a new YouTube video on the next local poll without a webhook or a 15-minute wait', async () => {
    const source = await registrations('youtube', false);
    await monitor().tick(); // Offline baseline; the old upload is no longer a candidate.
    expect((await repo.sources())[0]!.candidates).toEqual([]);
    videoId = 'zyxwvutsrqp';
    live = true;
    clock += 60001;
    expect((await repo.sources())[0]!.discoverAfter.getTime()).toBeGreaterThan(clock);
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (
        url.pathname.endsWith('/videos') &&
        !url.searchParams.get('id')?.split(',').includes(videoId)
      )
        return Response.json({ items: [] });
      return original(input, init);
    });
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    const [delivery] = await db.select().from(schema.liveDeliveries);
    expect(delivery!.status).toBe('sent');
    const [session] = await db.select().from(schema.monitorSessions);
    expect(session!.payload!.sessionKey).toBe(videoId);
    expect(fixture.rest.post).toHaveBeenCalledWith(
      `/channels/${ids.channel}/messages`,
      expect.objectContaining({
        body: expect.objectContaining({
          embeds: [
            expect.objectContaining({
              description: expect.stringContaining(`https://www.youtube.com/watch?v=${videoId}`),
              color: 0xff0000,
            }),
          ],
        }),
      }),
    );
    clock += 60001;
    await monitor().tick(); // Reconstructed worker, same persistent stream/destination.
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect(await db.select().from(schema.liveDeliveries)).toHaveLength(1);
    expect((await repo.sources())[0]!.id).toBe(source.id);
  });
  it.each([
    ['upcoming', undefined, undefined, 'public', false],
    ['live', undefined, undefined, 'public', false],
    ['live', '2026-11-01T00:00:30Z', undefined, 'public', true],
    ['none', '2026-11-01T00:00:30Z', '2026-11-01T00:01:00Z', 'public', false],
    ['live', '2026-11-01T00:00:30Z', undefined, 'unlisted', false],
    ['live', '2026-11-01T00:00:30Z', undefined, 'private', false],
  ] as const)(
    'requires confirmed public LIVE, not %s/%s/%s/%s',
    async (broadcast, start, end, privacy, expected) => {
      const source = await registrations('youtube', false);
      const response = vi.fn<typeof fetch>(async () =>
        Response.json({
          items: [
            {
              id: videoId,
              snippet: { channelId, title: 'YouTube live', liveBroadcastContent: broadcast },
              liveStreamingDetails: {
                scheduledStartTime: '2026-11-01T00:00:00Z',
                actualStartTime: start,
                actualEndTime: end,
              },
              status: { privacyStatus: privacy },
            },
          ],
        }),
      );
      const result = await createMonitoringProviders(
        env,
        repo,
        response,
        () => clock,
        () => {},
      ).observe(source, [videoId]);
      expect(result.live).toHaveLength(expected ? 1 : 0);
      if (broadcast === 'upcoming') expect(result.keep).toContain(videoId);
    },
  );
  it('does not mark a YouTube observation failure as notified and recovers on the next poll', async () => {
    await registrations('youtube', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    const original = fetcher.getMockImplementation()!;
    let fail = true;
    fetcher.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname.endsWith('/videos') && fail)
        throw new Error('FAKE_NETWORK_SECRET');
      return original(input, init);
    });
    await monitor().tick();
    expect(await db.select().from(schema.monitorSessions)).toHaveLength(0);
    expect(await db.select().from(schema.liveDeliveries)).toHaveLength(0);
    fail = false;
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('sent');
  });
  it('retains an upcoming YouTube candidate without consuming its future live notification', async () => {
    await registrations('youtube', false);
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) => {
      const response = await original(input, init);
      if (new URL(String(input)).pathname.endsWith('/videos') && !live) {
        const body = await response.json();
        body.items[0].snippet.liveBroadcastContent = 'upcoming';
        body.items[0].liveStreamingDetails = { scheduledStartTime: startedAt };
        return Response.json(body);
      }
      return response;
    });
    await monitor().tick();
    expect((await repo.sources())[0]!.candidates).toContain(videoId);
    expect(await db.select().from(schema.monitorSessions)).toHaveLength(0);
    expect(fixture.rest.post).not.toHaveBeenCalled();
    clock += 60001;
    live = true;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('logs a YouTube quota error without the key, query URL or raw provider error', async () => {
    const logs = vi.fn();
    const source = await registrations('youtube', false);
    const upstream = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { errors: [{ reason: 'quotaExceeded' }], message: 'FAKE_PRIVATE_ERROR' } },
        { status: 403 },
      ),
    );
    const provider = createMonitoringProviders(
      { ...env, YOUTUBE_API_KEY: 'FAKE_PRIVATE_KEY' },
      repo,
      upstream,
      () => clock,
      logs,
    );
    await expect(provider.discover(source)).rejects.toMatchObject({
      code: 'youtube_quota_exhausted',
    });
    expect(logs).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'youtube_api',
        endpoint: 'channels',
        status: 403,
        code: 'youtube_quota_exhausted',
        retryAfter: 3600,
        unitsReserved: 1,
      }),
    );
    expect(JSON.stringify(logs.mock.calls)).not.toMatch(/FAKE_PRIVATE|key=|https:/);
  });
  it('keeps a definite YouTube delivery 429 pending and sends once after Retry-After', async () => {
    await registrations('youtube', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    const original = fetcher.getMockImplementation()!;
    let limited = true;
    fetcher.mockImplementation(async (input, init) =>
      String(input).includes('/live-notification') && limited
        ? Response.json(
            { error: 'discord_rate_limited' },
            { status: 429, headers: { 'Retry-After': '2' } },
          )
        : original(input, init),
    );
    await monitor().tick();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('pending');
    expect(fixture.rest.post).not.toHaveBeenCalled();
    limited = false;
    clock += 2001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('sent');
  });
  it('fans out one YouTube embed per destination, preserving opt-in and deduplication across restart and repeated hints', async () => {
    const source = await registrations('youtube');
    const settings = createNotificationRepository(db, now);
    const first = (await settings.list(ids.guild))[0]!;
    await settings.save(
      ids.guild,
      first.subscriptionId,
      { ...first.config!, mentionEveryone: true },
      first.version,
    );
    fixture.state.canMentionEveryone = true;
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.receipt('first-live-hint', source.id, [videoId]);
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(2);
    expect(fixture.rest.post).toHaveBeenCalledWith(
      `/channels/${ids.channel}/messages`,
      expect.objectContaining({
        body: expect.objectContaining({
          allowed_mentions: expect.objectContaining({ parse: ['everyone'] }),
          embeds: [
            expect.objectContaining({
              color: 0xff0000,
              image: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault_live.jpg` },
            }),
          ],
        }),
      }),
    );
    expect(fixture.rest.post).toHaveBeenCalledWith(
      `/channels/${ids.otherChannel}/messages`,
      expect.objectContaining({
        body: expect.objectContaining({ allowed_mentions: expect.objectContaining({ parse: [] }) }),
      }),
    );
    await repo.receipt('repeat-hint', source.id, [videoId]);
    await repo.receipt('repeat-hint', source.id, [videoId]);
    await monitor().tick();
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(2);
    const rows = await db.select().from(schema.liveDeliveries);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === 'sent')).toBe(true);
  });
  it('retains the longest provider cooldown across failures and reconstruction, then expires', async () => {
    await Promise.all([repo.block('kick', 3600), repo.block('kick', 60)]);
    clock += 61000;
    const recovered = createMonitoringRepository(db, now);
    expect(await recovered.reserve('kick', 100000)).toBe(false);
    await recovered.block('kick', 5);
    expect(await repo.reserve('kick', 100000)).toBe(false);
    clock += 3600000;
    expect(await recovered.reserve('kick', 100000)).toBe(true);
  });
  it('degrades an active missing provider, permits unused missing configuration, and recovers', async () => {
    await registrations('kick', false);
    fetcher.mockImplementationOnce(async () => Response.json({ status: 'ok' }));
    const missing = { ...env, KICK_CLIENT_ID: undefined, KICK_CLIENT_SECRET: undefined };
    const worker = createMonitor(
      missing,
      repo,
      createMonitoringProviders(missing, repo, fetcher, () => clock),
      coordinate,
      fetcher,
      () => clock,
      () => {},
    );
    await worker.tick();
    expect(worker.health().integrations.kick).toBe('not_configured');
    expect(worker.health().status).toBe('degraded');
    const restored = { ...env, YOUTUBE_API_KEY: undefined };
    const healthy = createMonitor(
      restored,
      repo,
      createMonitoringProviders(restored, repo, fetcher, () => clock),
      coordinate,
      fetcher,
      () => clock,
      () => {},
    );
    clock += 900001;
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) =>
      String(input).endsWith('/internal/health')
        ? Response.json({ status: 'ok' })
        : original(input, init),
    );
    await healthy.tick();
    expect(healthy.health().status).toBe('ok');
    expect(healthy.health().integrations.youtube).toBe('not_configured');
  });
  it('reports leader contention as standby without inventing a database outage', async () => {
    const standby = createMonitor(
      env,
      repo,
      createMonitoringProviders(env, repo, fetcher, () => clock),
      async () => {
        throw new CoordinationBusyError();
      },
      fetcher,
      () => clock,
      () => {},
    );
    await standby.tick();
    expect(standby.health().database).toBe('unknown');
    expect(standby.health().worker).toBe('standby');
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) =>
      String(input).endsWith('/internal/health')
        ? Response.json({ status: 'ok' })
        : original(input, init),
    );
    let busy = false;
    const logs = vi.fn();
    const worker = createMonitor(
      env,
      repo,
      createMonitoringProviders(env, repo, fetcher, () => clock),
      async (id, operation) => {
        if (busy) throw new CoordinationBusyError();
        return coordinate(id, operation);
      },
      fetcher,
      () => clock,
      logs,
    );
    await worker.tick();
    busy = true;
    await worker.tick();
    expect(worker.health().database).toBe('ok');
    expect(worker.health().worker).toBe('standby');
    expect(logs).toHaveBeenCalledWith({ event: 'monitor_standby', code: 'leader_busy' });
    clock += 120001;
    expect(worker.health().status).toBe('degraded');
  });
  it('logs stale completion without claiming a persisted sent state', async () => {
    await registrations('kick', false);
    const logs = vi.fn();
    const worker = createMonitor(
      env,
      repo,
      createMonitoringProviders(env, repo, fetcher, () => clock),
      coordinate,
      fetcher,
      () => clock,
      logs,
    );
    await worker.tick();
    clock += 60001;
    live = true;
    const original = repo.finish;
    vi.spyOn(repo, 'finish').mockImplementation(async (...args) => {
      if (args[1] === 'sent')
        await original(args[0], 'uncertain', 'sender_interrupted', 0, args[4]);
      return original(...args);
    });
    await worker.tick();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('uncertain');
    expect(logs).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'delivery_attempt',
        state: 'retained',
        code: 'stale_completion',
      }),
    );
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it.each(['discovery', 'observation'] as const)(
    'preserves a committed hint arriving during %s, including a duplicate receipt',
    async (phase) => {
      const source = await registrations('youtube', false);
      const providers = createMonitoringProviders(env, repo, fetcher, () => clock);
      const original = providers[phase === 'discovery' ? 'discover' : 'observe'];
      const hint = 'zyxwvutsrqp';
      if (phase === 'discovery') {
        providers.discover = async (s) => {
          const result = await providersDiscover(s);
          await repo.receipt('new-hint', s.id, [hint]);
          return result;
        };
      } else {
        providers.observe = async (s, c) => {
          const result = await providersObserve(s, c);
          await repo.receipt('new-hint', s.id, [hint]);
          return result;
        };
      }
      async function providersDiscover(s: typeof source) {
        return (original as typeof providers.discover)(s);
      }
      async function providersObserve(s: typeof source, c?: string[]) {
        return (original as typeof providers.observe)(s, c);
      }
      await createMonitor(
        env,
        repo,
        providers,
        coordinate,
        fetcher,
        () => clock,
        () => {},
      ).tick();
      await repo.receipt('new-hint', source.id, [hint]);
      expect((await repo.sources())[0]!.candidates).toContain(hint);
      expect(await db.select().from(schema.monitorReceipts)).toHaveLength(1);
    },
  );
  it('does not revive an old queued start after subscription disable/re-enable and worker reconstruction', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      (await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source)).live,
      true,
    );
    const [subscription] = await createStreamerRepository(db, now).list(ids.guild);
    clock += 1;
    await createStreamerRepository(db, now).setEnabled(ids.guild, subscription!.id, false);
    clock += 1;
    await createStreamerRepository(db, now).setEnabled(ids.guild, subscription!.id, true);
    await monitor().tick();
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('suppressed');
    clock += 60001;
    startedAt = new Date(clock - 1000).toISOString();
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('keeps one logical delivery through hours live, offline interruption and same-session reconnect', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await monitor().tick();
    for (const isLive of [true, false, true, true]) {
      clock += 3600000;
      live = isLive;
      await repo.receipt('wake-' + clock, source.id);
      await monitor().tick();
    }
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect(await db.select().from(schema.liveDeliveries)).toHaveLength(1);
  });
  it('recovers missed webhook starts by polling without a receipt', async () => {
    await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect(await db.select().from(schema.monitorReceipts)).toHaveLength(0);
  });
  it('guards attempt ownership, terminal outcomes and the destination uniqueness constraint', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      (await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source)).live,
      true,
    );
    const first = await repo.claim();
    expect(first).toBeDefined();
    expect(await repo.claim()).toBeUndefined();
    await repo.finish(first!.id, 'pending', 'rate', 0, first!.attempts);
    const second = await repo.claim();
    await repo.finish(first!.id, 'sent', null, 0, first!.attempts);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('sending');
    await repo.finish(second!.id, 'sent', null, 0, second!.attempts);
    await repo.finish(second!.id, 'pending', 'late', 0, second!.attempts);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('sent');
    await expect(
      db.insert(schema.liveDeliveries).values({ ...second!, id: randomUUID() }),
    ).rejects.toThrow();
  });
  it('does not repeat a Discord POST after database acknowledgment storage fails', async () => {
    await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    const original = repo.finish;
    const finish = vi.spyOn(repo, 'finish').mockImplementation(async (...args) => {
      if (args[1] === 'sent') throw new Error('FAKE_DATABASE_SECRET');
      return original(...args);
    });
    await monitor().tick();
    finish.mockRestore();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('uncertain');
    clock += 60001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it.each(['channel', 'permission', 'role', 'bot'] as const)(
    'blocks a live send when the configured %s is removed or revoked',
    async (kind) => {
      await registrations('kick', false);
      await monitor().tick();
      clock += 60001;
      live = true;
      if (kind === 'channel') {
        const original = fixture.rest.get.getMockImplementation()!;
        fixture.rest.get.mockImplementation(async (path) =>
          path.endsWith('/channels') ? [] : original(path),
        );
      } else if (kind === 'permission') fixture.state.writable = false;
      else if (kind === 'bot') fixture.state.installed = false;
      else {
        const settings = createNotificationRepository(db, now);
        const [row] = await settings.list(ids.guild);
        clock -= 30001;
        await settings.save(
          ids.guild,
          row!.subscriptionId,
          { ...row!.config!, roleId: ids.role },
          row!.version,
        );
        clock += 30001;
        fixture.state.mentionable = false;
      }
      await monitor().tick();
      expect(fixture.rest.post).not.toHaveBeenCalled();
      expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('failed');
    },
  );
  it.each(['preflight', 'malformed', 'ambiguous', 'rate-date', 'deleted'] as const)(
    'classifies %s broker outcomes safely',
    async (mode) => {
      await registrations('kick', false);
      await monitor().tick();
      clock += 60001;
      live = true;
      const original = fetcher.getMockImplementation()!;
      fetcher.mockImplementation(async (input, init) => {
        if (!String(input).includes('/live-notification')) return original(input, init);
        if (mode === 'preflight')
          return Response.json({ error: 'bot_unavailable', retrySafe: true }, { status: 503 });
        if (mode === 'malformed') return new Response('not-json', { status: 200 });
        if (mode === 'ambiguous') throw new Error('FAKE_BROKER_SECRET');
        if (mode === 'deleted')
          return Response.json({ error: 'notification_channel_unavailable' }, { status: 409 });
        return Response.json(
          { error: 'discord_rate_limited' },
          { status: 429, headers: { 'retry-after': new Date(clock + 120000).toUTCString() } },
        );
      });
      await monitor().tick();
      const [delivery] = await db.select().from(schema.liveDeliveries);
      expect(delivery!.status).toBe(
        mode === 'preflight' || mode === 'rate-date'
          ? 'pending'
          : mode === 'deleted'
            ? 'failed'
            : 'uncertain',
      );
      if (mode === 'rate-date') expect(delivery!.dueAt.getTime()).toBe(clock + 120000);
      fetcher.mockImplementation(original);
      clock += 120001;
      await monitor().tick();
      expect(fixture.rest.post).toHaveBeenCalledTimes(
        mode === 'preflight' || mode === 'rate-date' ? 1 : 0,
      );
    },
  );
  it('keeps ten sustained YouTube sources within the polling allocation and honors Retry-After formats', () => {
    for (const sources of [1, 4, 5, 10]) {
      const interval = youtubePollInterval(sources, 7200);
      expect((sources * 86400000 * 4) / interval).toBeLessThanOrEqual(7200 * 0.8 + 0.01);
    }
    expect(retryDelay('0.25', clock, 1)).toBe(1);
    expect(retryDelay(new Date(clock + 65000).toUTCString(), clock, 1)).toBe(65);
    expect(retryDelay('invalid', clock, 1)).toBe(10);
  });
  it('reports database/bot/provider health without credentials and fails closed after database loss', async () => {
    const source = await registrations('kick', false);
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (input, init) =>
      String(input).endsWith('/internal/health')
        ? Response.json({ status: 'ok' })
        : original(input, init),
    );
    const worker = monitor();
    await worker.tick();
    expect(worker.health().status).toBe('ok');
    expect(worker.health().integrations.kick).toBe('ok');
    const fail = vi.spyOn(repo, 'sources').mockRejectedValueOnce(new Error('FAKE_DATABASE_SECRET'));
    clock += 60001;
    await expect(worker.tick()).rejects.toThrow('Monitor tick unavailable');
    expect(worker.health().database).toBe('unavailable');
    fail.mockRestore();
    await repo.receipt('recover', source.id);
    await worker.tick();
    expect(worker.health().database).toBe('ok');
    worker.stop();
    expect(worker.health().worker).toBe('stopping');
    expect(JSON.stringify(worker.health())).not.toContain('FAKE_');
  });
  it('expires receipt/payload metadata while retaining session deduplication keys', async () => {
    const source = await registrations('kick', false);
    await repo.observe(source.id, [], false);
    clock += 60000;
    const event = {
      sessionKey: 'unique-session',
      title: 'Public stream title',
      url: 'https://kick.com/tester',
      startedAt: new Date(clock).toISOString(),
    };
    await repo.observe(source.id, [event], true);
    await repo.receipt('receipt-to-expire', source.id);
    clock += 30 * 86400000;
    await repo.cleanup();
    expect(await db.select().from(schema.monitorReceipts)).toHaveLength(0);
    const [session] = await db.select().from(schema.monitorSessions);
    expect(session!.payload).toBeNull();
    expect(session!.id).toMatch(/^[a-f0-9]{64}$/);
    await repo.observe(source.id, [event], true);
    expect(await db.select().from(schema.monitorSessions)).toHaveLength(1);
  });
  it('does not initiate a send after losing its configuration coordination lock', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      (await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source)).live,
      true,
    );
    const lost = async <T>(id: string, operation: (assertHeld: () => void) => Promise<T>) =>
      operation(() => {
        if (id.startsWith('live:')) throw new Error('lost lock');
      });
    await createMonitor(
      env,
      repo,
      createMonitoringProviders(env, repo, fetcher, () => clock),
      lost,
      fetcher,
      () => clock,
      () => {},
    ).tick();
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('pending');
  });
  it('does not turn upcoming, ended or private YouTube videos into LIVE notifications', async () => {
    const source = await registrations('youtube', false);
    for (const overrides of [
      {
        snippet: { channelId, title: 'Scheduled', liveBroadcastContent: 'upcoming' },
        liveStreamingDetails: { scheduledStartTime: startedAt },
        status: { privacyStatus: 'public' },
      },
      {
        snippet: { channelId, title: 'Ended', liveBroadcastContent: 'live' },
        liveStreamingDetails: { actualStartTime: startedAt, actualEndTime: startedAt },
        status: { privacyStatus: 'public' },
      },
      {
        snippet: { channelId, title: 'Private', liveBroadcastContent: 'live' },
        liveStreamingDetails: { actualStartTime: startedAt },
        status: { privacyStatus: 'private' },
      },
    ]) {
      const request = vi.fn<typeof fetch>(async () =>
        Response.json({ items: [{ id: videoId, ...overrides }] }),
      );
      expect(
        (await createMonitoringProviders(env, repo, request).observe(source, [videoId])).live,
      ).toEqual([]);
    }
  });
  it('restores missing Kick subscriptions with the documented app-token payload', async () => {
    const source = await registrations('kick', false);
    const request = vi.fn<typeof fetch>(async (input, init) => {
      if (String(input).includes('id.kick.com'))
        return Response.json({ access_token: 'FAKE_TOKEN', expires_in: 3600 });
      if (init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          broadcaster_user_id: 123,
          events: [{ name: 'livestream.status.updated', version: 1 }],
          method: 'webhook',
        });
        return Response.json({
          data: [{ name: 'livestream.status.updated', version: 1, subscription_id: 'new-id' }],
        });
      }
      return Response.json({ data: [] });
    });
    expect(await createMonitoringProviders(env, repo, request).subscriptions(source)).toBe(
      'new-id',
    );
  });
  it.each(['youtube', 'kick'] as const)(
    'detects %s offline-to-live once and fans out across guilds',
    async (provider) => {
      const source = await registrations(provider),
        worker = monitor();
      await worker.tick();
      expect(fixture.rest.post).not.toHaveBeenCalled();
      clock += 60001;
      live = true;
      await repo.receipt(randomUUID(), source.id, provider === 'youtube' ? [videoId] : []);
      await worker.tick();
      expect(fixture.rest.post).toHaveBeenCalledTimes(2);
      const serialized = JSON.stringify(fixture.rest.post.mock.calls);
      expect(serialized).toContain(provider === 'youtube' ? 'YouTube' : 'Kick');
      expect(serialized).not.toContain('NAVI TEST');
      expect(serialized).not.toContain('test-api-key');
      expect((await db.select().from(schema.liveDeliveries)).map((x) => x.status)).toEqual([
        'sent',
        'sent',
      ]);
      // One global source, not one provider monitor per server.
      expect(await repo.sources()).toHaveLength(1);
      const checks = fetcher.mock.calls.filter(([input]) =>
        new URL(String(input)).pathname.endsWith(
          provider === 'youtube' ? '/videos' : '/users/livestreams',
        ),
      );
      expect(checks).toHaveLength(3); // offline baseline + live observation + one shared pre-send confirmation
      clock += 60001;
      await monitor().tick();
      expect(fixture.rest.post).toHaveBeenCalledTimes(2);
      expect(await db.select().from(schema.monitorSessions)).toHaveLength(1);
    },
  );
  it('suppresses already-live onboarding and delayed discovery of pre-baseline streams', async () => {
    await registrations('kick');
    live = true;
    startedAt = new Date(clock - 1000).toISOString();
    await monitor().tick();
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect(
      (await db.select().from(schema.liveDeliveries)).every((x) => x.status === 'suppressed'),
    ).toBe(true);
  });
  it('recovers a pending queue through a fresh worker and does not resend interrupted sends', async () => {
    const source = await registrations('kick');
    await monitor().tick();
    clock += 60001;
    live = true;
    const providers = createMonitoringProviders(env, repo, fetcher, () => clock);
    await repo.observe(source.id, (await providers.observe(source)).live, true);
    const claim = await repo.claim();
    expect(claim).toBeDefined();
    clock += 120001;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    expect((await db.select().from(schema.liveDeliveries)).map((x) => x.status).sort()).toEqual([
      'sent',
      'uncertain',
    ]);
  });
  it('suppresses queued work after configuration disable and rejects foreign settings', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      (await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source)).live,
      true,
    );
    const [row] = await createNotificationRepository(db, now).list(ids.guild);
    await createNotificationRepository(db, now).save(
      ids.guild,
      row!.subscriptionId,
      { ...row!.config!, enabled: false },
      row!.version,
    );
    await monitor().tick();
    expect(fixture.rest.post).not.toHaveBeenCalled();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('suppressed');
  });
  it('keeps API failures unknown and persists rate-limit/quota admission across adapters', async () => {
    const source = await registrations('youtube', false);
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 }),
    );
    const providers = createMonitoringProviders(env, repo, fetcher, () => clock);
    await expect(providers.discover(source)).rejects.toMatchObject({
      code: 'youtube_quota_exhausted',
    });
    await expect(
      createMonitoringProviders(env, repo, fetcher, () => clock).discover(source),
    ).rejects.toMatchObject({ code: 'provider_budget_or_cooldown' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await repo.sources())[0]!.initialized).toBe(false);
  });
  it('classifies the official Google HTTP 400 API_KEY_INVALID response as rejected credentials', async () => {
    const source = await registrations('youtube', false);
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } },
        { status: 400 },
      ),
    );
    await expect(
      createMonitoringProviders(env, repo, fetcher, () => clock).discover(source),
    ).rejects.toMatchObject({ code: 'provider_credentials_rejected', retryAfter: 900 });
    await expect(
      createMonitoringProviders(env, repo, fetcher, () => clock).discover(source),
    ).rejects.toMatchObject({ code: 'provider_budget_or_cooldown' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries definite Discord rate limits but keeps a lost send acknowledgment uncertain', async () => {
    const source = await registrations('kick', false);
    await monitor().tick();
    clock += 60001;
    live = true;
    await repo.observe(
      source.id,
      (await createMonitoringProviders(env, repo, fetcher, () => clock).observe(source)).live,
      true,
    );
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementationOnce(async (input, init) => original(input, init));
    // Fail only the broker POST, after live confirmation succeeds.
    let blocked = true;
    fetcher.mockImplementation(async (input, init) =>
      String(input).includes('/live-notification') && blocked
        ? Response.json(
            { error: 'discord_rate_limited' },
            { status: 429, headers: { 'retry-after': '2' } },
          )
        : original(input, init),
    );
    await monitor().tick();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('pending');
    blocked = false;
    clock += 3000;
    await monitor().tick();
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    await db.update(schema.liveDeliveries).set({ status: 'pending' });
    fixture.state.failSend = true;
    await monitor().tick();
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('uncertain');
  });
  it('honors a provider timeout without exposing request URLs or treating it as offline', async () => {
    const source = await registrations('youtube', false);
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.signal).toBeDefined();
      throw new Error('FAKE_API_SECRET');
    });
    await expect(
      createMonitoringProviders(env, repo, fetcher).discover(source),
    ).rejects.toMatchObject({ message: 'provider_unavailable' });
    expect((await repo.sources())[0]!.initialized).toBe(false);
  });
  it('deduplicates verified hint receipts and retains a persistent baseline', async () => {
    const source = await registrations('youtube', false);
    await repo.receipt('same-message', source.id, [videoId]);
    await repo.receipt('same-message', source.id, [videoId]);
    expect(await db.select().from(schema.monitorReceipts)).toHaveLength(1);
    await repo.observe(source.id, [], false);
    expect((await repo.sources())[0]!.baselineAt).toEqual(now());
    const old = {
      sessionKey: videoId,
      title: 'Delayed hint',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      startedAt: new Date(clock - 1000).toISOString(),
    };
    await repo.observe(source.id, [old], true);
    expect((await db.select().from(schema.liveDeliveries))[0]!.status).toBe('suppressed');
    expect(
      (
        await db
          .select()
          .from(schema.monitorSources)
          .where(eq(schema.monitorSources.sourceId, source.id))
      )[0]!.candidates,
    ).toEqual([videoId]);
  });
});
