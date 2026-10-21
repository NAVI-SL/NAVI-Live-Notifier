import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { expect, it } from 'vitest';
import { readMonitoringEnvironment } from '@navi/config';
import {
  schema,
  createMonitoringRepository,
  createNotificationRepository,
  createStreamerRepository,
} from '@navi/database';
import { renderNotification } from '@navi/core';
import { createMonitor } from '../apps/worker/src/monitor';
import type { MonitoringProviders } from '../apps/worker/src/providers';

it('drains a 10-source / 10-guild burst once per destination through a safe 429 and worker reconstruction', async () => {
  const database = new PGlite();
  try {
    for (const file of readdirSync('packages/database/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await database.exec(readFileSync(`packages/database/migrations/${file}`, 'utf8'));
    const db = drizzle(database, { schema });
    // SQL defaults use the database clock. Start after actual fixture creation so
    // activation checks are exercised without accidentally onboarding an old stream.
    let clock = Date.now() + 60_000;
    const now = () => new Date(clock);
    const repository = createMonitoringRepository(db, now);
    const registry = createStreamerRepository(db, now, 10);
    const settings = createNotificationRepository(db, now);
    for (let guildIndex = 0; guildIndex < 10; guildIndex++) {
      const guildId = String(111111111111111110n + BigInt(guildIndex));
      for (let sourceIndex = 0; sourceIndex < 10; sourceIndex++) {
        const youtube = sourceIndex < 5;
        const externalId = youtube
          ? 'UC' + String(sourceIndex).padStart(22, 'a')
          : String(sourceIndex + 1);
        await registry.add(guildId, {
          provider: youtube ? 'youtube' : 'kick',
          externalId,
          displayName: `Synthetic source ${sourceIndex}`,
          canonicalUrl: youtube
            ? `https://www.youtube.com/channel/${externalId}`
            : `https://kick.com/synthetic${sourceIndex}`,
          userIdentifier: `synthetic${sourceIndex}`,
        });
      }
      for (const subscription of await registry.list(guildId))
        await settings.save(
          guildId,
          subscription.id,
          {
            channelId: String(222222222222222220n + BigInt(guildIndex)),
            roleId: null,
            enabled: true,
            template: '{streamer} {platform} {title} {url}',
          },
          0,
        );
    }
    expect(await repository.sources()).toHaveLength(10);
    let live = false;
    let observations = 0;
    const startedAt = new Date(clock + 270_000).toISOString();
    // Official provider responses are deliberately simulated. No platform fetch exists here.
    const providers: MonitoringProviders = {
      async discover(source) {
        return {
          ids: source.provider === 'youtube' ? ['sample00001'] : [],
          displayName: source.displayName,
          canonicalUrl: source.canonicalUrl,
        };
      },
      async observe(source) {
        observations++;
        return {
          live: live
            ? [
                {
                  sessionKey: source.provider === 'youtube' ? 'sample00001' : startedAt,
                  startedAt,
                  title: 'Synthetic simultaneous stream @everyone',
                  url:
                    source.provider === 'youtube'
                      ? 'https://www.youtube.com/watch?v=sample00001'
                      : source.canonicalUrl,
                },
              ]
            : [],
          keep: [],
        };
      },
      youtube: async () => {
        throw new Error('Not used in synthetic capacity fixture.');
      },
      kick: async () => {
        throw new Error('Not used in synthetic capacity fixture.');
      },
      publicKey: async () => {
        throw new Error('No public callback in synthetic capacity fixture.');
      },
      subscriptions: async () => {
        throw new Error('No subscriptions in synthetic capacity fixture.');
      },
    };
    const accepted = new Set<string>();
    let attempted = 0;
    let throttled = false;
    const fetcher: typeof fetch = async (_input, init) => {
      if (init?.method !== 'POST') return Response.json({ status: 'ok' });
      attempted++;
      if (!throttled) {
        throttled = true;
        return Response.json(
          { error: 'discord_rate_limited' },
          { status: 429, headers: { 'retry-after': '30' } },
        );
      }
      const payload = JSON.parse(String(init.body)) as NonNullable<
        Awaited<ReturnType<typeof repository.payload>>
      >;
      expect(accepted.has(payload.requestId)).toBe(false);
      const message = renderNotification(payload.config, payload.identity, payload.live);
      expect(message.allowed_mentions).toEqual({
        parse: [],
        roles: [],
        users: [],
        replied_user: false,
      });
      expect(message.content).not.toContain('@everyone');
      accepted.add(payload.requestId);
      return Response.json({ status: 'sent' });
    };
    const environment = readMonitoringEnvironment({
      MONITORING_ENABLED: 'true',
      BOT_INTERNAL_SECRET: 'synthetic-capacity-secret-at-least-thirty-two-characters',
      YOUTUBE_API_KEY: 'synthetic-key',
      KICK_CLIENT_ID: 'synthetic-client',
      KICK_CLIENT_SECRET: 'synthetic-secret',
    });
    const makeMonitor = () =>
      createMonitor(
        environment,
        repository,
        providers,
        async (_id, operation) => operation(() => {}),
        fetcher,
        () => clock,
        () => {},
      );
    const first = makeMonitor();
    await first.tick(); // Real SQL baseline, no live messages.
    clock += 300_000;
    live = true;
    await first.tick();
    expect(accepted.size).toBe(49); // Fifty claims, one definite rejection.
    await first.tick();
    expect(accepted.size).toBe(99);
    await first.tick();
    expect(accepted.size).toBe(99); // Retry-After is still in force.
    clock += 31_000;
    await first.tick();
    expect(accepted.size).toBe(100);
    expect(attempted).toBe(101);
    // At most one poll and one confirmation per source in each of two delivery batches,
    // plus initial baseline and a single delayed confirmation: not 100 source polls.
    expect(observations).toBeLessThanOrEqual(41);
    first.stop();
    clock += 300_000;
    await makeMonitor().tick();
    expect(accepted.size).toBe(100);
    expect(attempted).toBe(101);
    const ledger = await db.select().from(schema.liveDeliveries);
    expect(ledger).toHaveLength(100);
    expect(ledger.every((delivery) => delivery.status === 'sent')).toBe(true);
    expect(await db.select().from(schema.monitorSessions)).toHaveLength(10);
    expect(
      new Set(ledger.map((row) => `${row.sessionId}:${row.guildId}:${row.channelId}`)).size,
    ).toBe(100);
  } finally {
    await database.close();
  }
}, 30_000);
