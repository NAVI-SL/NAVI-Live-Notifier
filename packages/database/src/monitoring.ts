import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, lte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { normalizeNotificationMentions, type LiveNotification } from '@navi/core';
import * as s from './schema.js';

export function createMonitoringRepository(
  db: PgDatabase<PgQueryResultHKT, typeof s>,
  now = () => new Date(),
  allowedGuilds?: string[],
) {
  const guildScope = () =>
    allowedGuilds === undefined
      ? undefined
      : allowedGuilds.length
        ? inArray(s.streamerSubscriptions.guildId, allowedGuilds)
        : sql`false`;
  async function routes(sourceId: string) {
    return db
      .select({ subscription: s.streamerSubscriptions, settings: s.notificationSettings })
      .from(s.streamerSubscriptions)
      .innerJoin(
        s.notificationSettings,
        and(
          eq(s.notificationSettings.subscriptionId, s.streamerSubscriptions.id),
          eq(s.notificationSettings.guildId, s.streamerSubscriptions.guildId),
        ),
      )
      .where(
        and(
          eq(s.streamerSubscriptions.providerChannelId, sourceId),
          eq(s.streamerSubscriptions.enabled, true),
          eq(s.notificationSettings.enabled, true),
          guildScope(),
        ),
      );
  }
  return {
    async sources() {
      const sources = await db
        .selectDistinct({ channel: s.providerChannels })
        .from(s.providerChannels)
        .innerJoin(
          s.streamerSubscriptions,
          eq(s.streamerSubscriptions.providerChannelId, s.providerChannels.id),
        )
        .innerJoin(
          s.notificationSettings,
          and(
            eq(s.notificationSettings.subscriptionId, s.streamerSubscriptions.id),
            eq(s.notificationSettings.guildId, s.streamerSubscriptions.guildId),
          ),
        )
        .where(
          and(
            eq(s.streamerSubscriptions.enabled, true),
            eq(s.notificationSettings.enabled, true),
            gt(s.providerChannels.expiresAt, now()),
            guildScope(),
          ),
        );
      for (const { channel } of sources)
        await db
          .insert(s.monitorSources)
          .values({
            sourceId: channel.id,
            nextPoll: now(),
            discoverAfter: now(),
            renewAfter: now(),
          })
          .onConflictDoNothing();
      const states = await db.select().from(s.monitorSources);
      return sources.map(({ channel }) => ({
        ...channel,
        ...states.find((x) => x.sourceId === channel.id)!,
      }));
    },
    async state(sourceId: string, changes: Partial<typeof s.monitorSources.$inferInsert>) {
      await db.update(s.monitorSources).set(changes).where(eq(s.monitorSources.sourceId, sourceId));
    },
    // Merge discovery into the current row, never into an HTTP-era snapshot.
    async mergeCandidates(sourceId: string, ids: string[]) {
      return db.transaction(async (tx) => {
        const [state] = await tx
          .select()
          .from(s.monitorSources)
          .where(eq(s.monitorSources.sourceId, sourceId))
          .for('update');
        if (!state) throw new Error('Monitoring source unavailable.');
        const [updated] = await tx
          .update(s.monitorSources)
          .set({
            candidates: [...new Set([...ids, ...state.candidates])].slice(0, 100),
          })
          .where(eq(s.monitorSources.sourceId, sourceId))
          .returning();
        return updated!;
      });
    },
    async reconcileCandidates(sourceId: string, hintVersion: number, candidates: string[]) {
      // A concurrent committed hint wins, including an update to an already known ID.
      await db
        .update(s.monitorSources)
        .set({ candidates })
        .where(
          and(
            eq(s.monitorSources.sourceId, sourceId),
            eq(s.monitorSources.hintVersion, hintVersion),
          ),
        );
    },
    async ready() {
      await db
        .select({ mentionEveryone: s.notificationSettings.mentionEveryone })
        .from(s.notificationSettings)
        .limit(0);
      await db
        .select({ id: s.monitorSources.sourceId, version: s.monitorSources.hintVersion })
        .from(s.monitorSources)
        .limit(1);
      await db.select({ id: s.liveDeliveries.id }).from(s.liveDeliveries).limit(1);
      await db.select({ id: s.monitorSessions.id }).from(s.monitorSessions).limit(1);
      await db.select({ id: s.monitorReceipts.id }).from(s.monitorReceipts).limit(1);
      await db.select({ provider: s.monitorLimits.provider }).from(s.monitorLimits).limit(1);
    },
    async refreshIdentity(sourceId: string, displayName: string, canonicalUrl: string) {
      await db
        .update(s.providerChannels)
        .set({
          displayName,
          canonicalUrl,
          verifiedAt: now(),
          expiresAt: new Date(now().getTime() + 29 * 86400_000),
        })
        .where(eq(s.providerChannels.id, sourceId));
    },
    async observe(sourceId: string, live: LiveNotification[], initialized: boolean) {
      const targets = await routes(sourceId);
      return db.transaction(async (tx) => {
        const detectionLagMs: number[] = [];
        const [state] = await tx
          .select()
          .from(s.monitorSources)
          .where(eq(s.monitorSources.sourceId, sourceId))
          .for('update');
        if (!state) return detectionLagMs;
        for (const event of live) {
          const startedAt = new Date(event.startedAt);
          const id = createHash('sha256').update(`${sourceId}:${event.sessionKey}`).digest('hex');
          const inserted = await tx
            .insert(s.monitorSessions)
            .values({ id, sourceId, startedAt, payload: event, createdAt: now() })
            .onConflictDoNothing()
            .returning();
          if (!inserted.length) continue;
          if (initialized && state.initialized)
            detectionLagMs.push(Math.max(0, now().getTime() - startedAt.getTime()));
          for (const { subscription, settings } of targets) {
            const active =
              initialized &&
              state.initialized &&
              !!state.baselineAt &&
              startedAt > state.baselineAt &&
              settings.updatedAt <= startedAt &&
              subscription.updatedAt <= startedAt &&
              now().getTime() - startedAt.getTime() <= 600_000 &&
              startedAt <= now();
            await tx
              .insert(s.liveDeliveries)
              .values({
                id: randomUUID(),
                sessionId: id,
                subscriptionId: subscription.id,
                guildId: subscription.guildId,
                channelId: settings.channelId,
                settingsVersion: settings.version,
                dueAt: now(),
                updatedAt: now(),
                status: active ? 'pending' : 'suppressed',
                errorCode: active ? null : 'baseline_or_stale',
              })
              .onConflictDoNothing();
          }
        }
        await tx
          .update(s.monitorSources)
          .set({ initialized: true, baselineAt: state.baselineAt ?? now() })
          .where(eq(s.monitorSources.sourceId, sourceId));
        return detectionLagMs;
      });
    },
    async quotaSnapshot() {
      return db
        .select()
        .from(s.monitorLimits)
        .where(inArray(s.monitorLimits.provider, ['youtube', 'kick']));
    },
    async receipt(id: string, sourceId: string, videoIds: string[] = []) {
      await db.transaction(async (tx) => {
        const [state] = await tx
          .select()
          .from(s.monitorSources)
          .where(eq(s.monitorSources.sourceId, sourceId))
          .for('update');
        if (!state) return;
        const inserted = await tx
          .insert(s.monitorReceipts)
          .values({ id, createdAt: now() })
          .onConflictDoNothing()
          .returning();
        if (!inserted.length) return;
        await tx
          .update(s.monitorSources)
          .set({
            candidates: [...new Set([...videoIds, ...state.candidates])].slice(0, 100),
            hintVersion: sql`${s.monitorSources.hintVersion} + 1`,
            nextPoll: now(),
          })
          .where(eq(s.monitorSources.sourceId, sourceId));
      });
    },
    async reserve(provider: string, limit: number) {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(
        now(),
      );
      return db.transaction(async (tx) => {
        await tx.insert(s.monitorLimits).values({ provider, day }).onConflictDoNothing();
        const [row] = await tx
          .select()
          .from(s.monitorLimits)
          .where(eq(s.monitorLimits.provider, provider))
          .for('update');
        if (row!.blockedUntil && row!.blockedUntil > now()) return false;
        const used = row!.day === day ? row!.used : 0;
        if (used >= limit) return false;
        await tx
          .update(s.monitorLimits)
          .set({ day, used: used + 1 })
          .where(eq(s.monitorLimits.provider, provider));
        return true;
      });
    },
    async block(provider: string, seconds: number) {
      await db
        .insert(s.monitorLimits)
        .values({ provider, day: '', blockedUntil: new Date(now().getTime() + seconds * 1000) })
        .onConflictDoUpdate({
          target: s.monitorLimits.provider,
          set: {
            blockedUntil: sql`greatest(${s.monitorLimits.blockedUntil}, excluded.blocked_until)`,
          },
        });
    },
    async claim() {
      return db.transaction(async (tx) => {
        // An orphaned send may already have reached Discord: never blindly resend it.
        await tx
          .update(s.liveDeliveries)
          .set({ status: 'uncertain', errorCode: 'sender_interrupted', updatedAt: now() })
          .where(
            and(
              eq(s.liveDeliveries.status, 'sending'),
              lte(s.liveDeliveries.updatedAt, new Date(now().getTime() - 120_000)),
            ),
          );
        const [delivery] = await tx
          .select()
          .from(s.liveDeliveries)
          .where(and(eq(s.liveDeliveries.status, 'pending'), lte(s.liveDeliveries.dueAt, now())))
          .orderBy(s.liveDeliveries.dueAt)
          .limit(1)
          .for('update', { skipLocked: true });
        if (!delivery) return;
        await tx
          .update(s.liveDeliveries)
          .set({ status: 'sending', attempts: delivery.attempts + 1, updatedAt: now() })
          .where(eq(s.liveDeliveries.id, delivery.id));
        return { ...delivery, attempts: delivery.attempts + 1 };
      });
    },
    async payload(delivery: typeof s.liveDeliveries.$inferSelect) {
      const [session] = await db
        .select()
        .from(s.monitorSessions)
        .where(eq(s.monitorSessions.id, delivery.sessionId));
      if (!session?.payload || now().getTime() - session.startedAt.getTime() > 600_000) return;
      const [source] = await db
        .select()
        .from(s.providerChannels)
        .where(
          and(eq(s.providerChannels.id, session.sourceId), gt(s.providerChannels.expiresAt, now())),
        );
      if (!source) return;
      const [state] = await db
        .select()
        .from(s.monitorSources)
        .where(eq(s.monitorSources.sourceId, source.id));
      if (!state) return;
      const target = (await routes(source.id)).find(
        (x) =>
          x.subscription.id === delivery.subscriptionId &&
          x.subscription.updatedAt <= session.startedAt &&
          x.settings.updatedAt <= session.startedAt &&
          x.subscription.guildId === delivery.guildId &&
          x.settings.guildId === delivery.guildId &&
          x.settings.version === delivery.settingsVersion &&
          x.settings.channelId === delivery.channelId,
      );
      if (!target) return;
      return {
        source: { ...source, ...state },
        config: normalizeNotificationMentions({
          channelId: target.settings.channelId,
          roleId: target.settings.roleId,
          template: target.settings.template,
          enabled: true,
          ...(target.settings.mentionEveryone ? { mentionEveryone: true } : {}),
        }),
        identity: {
          provider: source.provider,
          displayName: source.displayName,
          canonicalUrl: source.canonicalUrl,
        },
        live: session.payload,
        requestId: delivery.id,
      };
    },
    async finish(
      id: string,
      status: (typeof s.liveDeliveries.$inferSelect)['status'],
      errorCode: string | null,
      delay = 0,
      expectedAttempt?: number,
    ) {
      const applied = await db
        .update(s.liveDeliveries)
        .set({
          status,
          errorCode,
          dueAt: new Date(now().getTime() + delay * 1000),
          updatedAt: now(),
        })
        .where(
          and(
            eq(s.liveDeliveries.id, id),
            eq(s.liveDeliveries.status, 'sending'),
            expectedAttempt === undefined
              ? undefined
              : eq(s.liveDeliveries.attempts, expectedAttempt),
          ),
        )
        .returning({ id: s.liveDeliveries.id });
      return applied.length > 0;
    },
    async cleanup() {
      await db
        .delete(s.monitorReceipts)
        .where(lte(s.monitorReceipts.createdAt, new Date(now().getTime() - 7 * 86400_000)));
      await db
        .update(s.monitorSessions)
        .set({ payload: null })
        .where(
          and(
            isNotNull(s.monitorSessions.payload),
            lte(s.monitorSessions.createdAt, new Date(now().getTime() - 29 * 86400_000)),
          ),
        );
    },
  };
}
export type MonitoringRepository = ReturnType<typeof createMonitoringRepository>;
export type MonitoringSource = Awaited<ReturnType<MonitoringRepository['sources']>>[number];
