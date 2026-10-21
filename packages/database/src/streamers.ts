import { randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

export type ResolvedStreamer = {
  provider: 'youtube' | 'kick';
  externalId: string;
  displayName: string;
  canonicalUrl: string;
  userIdentifier: string;
};
export type StreamerSubscription = ResolvedStreamer & {
  id: string;
  enabled: boolean;
  verifiedAt: string;
};
export class RegistrationError extends Error {
  constructor(
    public readonly code: 'duplicate_subscription' | 'subscription_not_found' | 'source_limit',
  ) {
    super(code);
  }
}
export function createStreamerRepository(
  db: PgDatabase<PgQueryResultHKT, typeof schema>,
  now = () => new Date(),
  maxSources = 10,
) {
  const channels = schema.providerChannels,
    subscriptions = schema.streamerSubscriptions;
  const selection = {
    id: subscriptions.id,
    enabled: subscriptions.enabled,
    userIdentifier: subscriptions.userIdentifier,
    provider: channels.provider,
    externalId: channels.externalId,
    displayName: channels.displayName,
    canonicalUrl: channels.canonicalUrl,
    verifiedAt: channels.verifiedAt,
  };
  return {
    // No provider requests or monitoring: expire personal-development registrations after 29 days.
    async prune() {
      await db.delete(channels).where(lt(channels.expiresAt, now()));
    },
    async list(guildId: string): Promise<StreamerSubscription[]> {
      const rows = await db
        .select(selection)
        .from(subscriptions)
        .innerJoin(channels, eq(subscriptions.providerChannelId, channels.id))
        .where(and(eq(subscriptions.guildId, guildId), sql`${channels.expiresAt} > ${now()}`))
        .orderBy(channels.provider, channels.displayName);
      return rows.map((row) => ({ ...row, verifiedAt: row.verifiedAt.toISOString() }));
    },
    async add(guildId: string, resolved: ResolvedStreamer) {
      await db.transaction(async (tx) => {
        // Short registry-write lock serializes the development source cap and orphan removal.
        // No HTTP calls take place in this transaction.
        await tx.execute(sql`LOCK TABLE provider_channels IN SHARE ROW EXCLUSIVE MODE`);
        await tx.delete(channels).where(lt(channels.expiresAt, now()));
        const [existing] = await tx
          .select()
          .from(channels)
          .where(
            and(
              eq(channels.provider, resolved.provider),
              eq(channels.externalId, resolved.externalId),
            ),
          );
        if (!existing) {
          const [count] = await tx.select({ count: sql<number>`count(*)::integer` }).from(channels);
          if (count!.count >= maxSources) throw new RegistrationError('source_limit');
        }
        const { userIdentifier, ...identity } = resolved;
        const metadata = {
          ...identity,
          verifiedAt: now(),
          expiresAt: new Date(now().getTime() + 29 * 86400_000),
        };
        const [channel] = await tx
          .insert(channels)
          .values({ id: randomUUID(), ...metadata })
          .onConflictDoUpdate({ target: [channels.provider, channels.externalId], set: metadata })
          .returning({ id: channels.id });
        const added = await tx
          .insert(subscriptions)
          .values({ id: randomUUID(), guildId, providerChannelId: channel!.id, userIdentifier })
          .onConflictDoNothing()
          .returning({ id: subscriptions.id });
        if (!added.length) throw new RegistrationError('duplicate_subscription');
      });
    },
    async setEnabled(guildId: string, id: string, enabled: boolean) {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${'navi:discord-account:live:' + id}, 0))`,
        );
        const changed = await tx
          .update(subscriptions)
          .set({ enabled, updatedAt: now() })
          .where(and(eq(subscriptions.guildId, guildId), eq(subscriptions.id, id)))
          .returning({ id: subscriptions.id });
        if (!changed.length) throw new RegistrationError('subscription_not_found');
      });
    },
    async remove(guildId: string, id: string) {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${'navi:discord-account:live:' + id}, 0))`,
        );
        await tx.execute(sql`LOCK TABLE provider_channels IN SHARE ROW EXCLUSIVE MODE`);
        const [removed] = await tx
          .delete(subscriptions)
          .where(and(eq(subscriptions.guildId, guildId), eq(subscriptions.id, id)))
          .returning({ source: subscriptions.providerChannelId });
        if (!removed) throw new RegistrationError('subscription_not_found');
        await tx
          .delete(channels)
          .where(
            and(
              eq(channels.id, removed.source),
              sql`not exists (select 1 from streamer_subscriptions where provider_channel_id = ${removed.source})`,
            ),
          );
      });
    },
  };
}
export type StreamerRepository = ReturnType<typeof createStreamerRepository>;
