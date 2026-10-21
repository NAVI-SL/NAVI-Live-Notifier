import { randomUUID } from 'node:crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import {
  NotificationError,
  normalizeNotificationMentions,
  type NotificationConfig,
  type NotificationIdentity,
} from '@navi/core';
import * as schema from './schema.js';
export type NotificationRow = NotificationIdentity & {
  subscriptionId: string;
  subscriptionEnabled: boolean;
  config: NotificationConfig | null;
  version: number;
};
export function createNotificationRepository(
  db: PgDatabase<PgQueryResultHKT, typeof schema>,
  now = () => new Date(),
) {
  const subscriptions = schema.streamerSubscriptions,
    channels = schema.providerChannels,
    settings = schema.notificationSettings,
    attempts = schema.notificationTestAttempts;
  async function list(guildId: string): Promise<NotificationRow[]> {
    const rows = await db
      .select({
        subscriptionId: subscriptions.id,
        subscriptionEnabled: subscriptions.enabled,
        provider: channels.provider,
        displayName: channels.displayName,
        canonicalUrl: channels.canonicalUrl,
        settings,
      })
      .from(subscriptions)
      .innerJoin(channels, eq(subscriptions.providerChannelId, channels.id))
      .leftJoin(
        settings,
        and(eq(settings.subscriptionId, subscriptions.id), eq(settings.guildId, guildId)),
      )
      .where(and(eq(subscriptions.guildId, guildId), gt(channels.expiresAt, now())))
      .orderBy(channels.provider, channels.displayName);
    return rows.map(({ settings: saved, ...row }) => ({
      ...row,
      config: saved
        ? normalizeNotificationMentions({
            channelId: saved.channelId,
            roleId: saved.roleId,
            template: saved.template,
            enabled: saved.enabled,
            ...(saved.mentionEveryone ? { mentionEveryone: true } : {}),
          })
        : null,
      version: saved?.version ?? 0,
    }));
  }
  return {
    list,
    async pruneTests() {
      await db
        .delete(attempts)
        .where(lt(attempts.createdAt, new Date(now().getTime() - 7 * 86400_000)));
    },
    async get(guildId: string, subscriptionId: string) {
      const row = (await list(guildId)).find((row) => row.subscriptionId === subscriptionId);
      if (!row) throw new NotificationError(404, 'subscription_not_found');
      return row;
    },
    async save(
      guildId: string,
      subscriptionId: string,
      config: NotificationConfig,
      version: number,
    ): Promise<NotificationRow> {
      config = normalizeNotificationMentions(config);
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${'navi:discord-account:live:' + subscriptionId}, 0))`,
        );
        const [subscription] = await tx
          .select({
            subscriptionId: subscriptions.id,
            subscriptionEnabled: subscriptions.enabled,
            provider: channels.provider,
            displayName: channels.displayName,
            canonicalUrl: channels.canonicalUrl,
          })
          .from(subscriptions)
          .innerJoin(channels, eq(subscriptions.providerChannelId, channels.id))
          .where(
            and(
              eq(subscriptions.guildId, guildId),
              eq(subscriptions.id, subscriptionId),
              gt(channels.expiresAt, now()),
            ),
          )
          .for('update');
        if (!subscription) throw new NotificationError(404, 'subscription_not_found');
        let committed: typeof settings.$inferSelect;
        if (version === 0) {
          const added = await tx
            .insert(settings)
            .values({
              subscriptionId,
              guildId,
              ...config,
              mentionEveryone: config.mentionEveryone === true,
            })
            .onConflictDoNothing()
            .returning();
          if (!added.length) throw new NotificationError(409, 'notification_settings_changed');
          committed = added[0]!;
        } else {
          const updated = await tx
            .update(settings)
            .set({
              ...config,
              mentionEveryone: config.mentionEveryone === true,
              version: version + 1,
              updatedAt: now(),
            })
            .where(
              and(
                eq(settings.guildId, guildId),
                eq(settings.subscriptionId, subscriptionId),
                eq(settings.version, version),
              ),
            )
            .returning();
          if (!updated.length) throw new NotificationError(409, 'notification_settings_changed');
          committed = updated[0]!;
        }
        // Resolve only after commit, using the row returned by this write. A later
        // read outage or competing edit must not change the result of this save.
        return {
          ...subscription,
          config: {
            channelId: committed.channelId,
            roleId: committed.roleId,
            template: committed.template,
            enabled: committed.enabled,
            ...(committed.mentionEveryone ? { mentionEveryone: true } : {}),
          },
          version: committed.version,
        };
      });
    },
    async claimTest(guildId: string, subscriptionId: string, requestId: string, version: number) {
      return db.transaction(async (tx) => {
        await tx.execute(sql`LOCK TABLE notification_test_attempts IN SHARE ROW EXCLUSIVE MODE`);
        await tx
          .delete(attempts)
          .where(lt(attempts.createdAt, new Date(now().getTime() - 7 * 86400_000)));
        const [existing] = await tx
          .select()
          .from(attempts)
          .where(and(eq(attempts.guildId, guildId), eq(attempts.requestId, requestId)));
        if (existing) {
          if (existing.subscriptionId !== subscriptionId || existing.version !== version)
            throw new NotificationError(409, 'test_request_conflict');
          return {
            claimed: false as const,
            status: existing.status,
            errorCode: existing.errorCode,
          };
        }
        const [current] = await tx
          .select({ version: settings.version })
          .from(settings)
          .innerJoin(
            subscriptions,
            and(
              eq(settings.subscriptionId, subscriptions.id),
              eq(settings.guildId, subscriptions.guildId),
            ),
          )
          .innerJoin(channels, eq(subscriptions.providerChannelId, channels.id))
          .where(
            and(
              eq(settings.guildId, guildId),
              eq(settings.subscriptionId, subscriptionId),
              gt(channels.expiresAt, now()),
            ),
          )
          .for('update');
        if (!current || current.version !== version)
          throw new NotificationError(409, 'notification_settings_changed');
        const [recent] = await tx
          .select()
          .from(attempts)
          .where(
            and(
              eq(attempts.guildId, guildId),
              gt(attempts.createdAt, new Date(now().getTime() - 30_000)),
            ),
          )
          .orderBy(sql`${attempts.createdAt} desc`)
          .limit(1);
        if (recent)
          throw new NotificationError(
            429,
            'test_notification_rate_limited',
            Math.max(1, Math.ceil((recent.createdAt.getTime() + 30_000 - now().getTime()) / 1000)),
          );
        await tx.insert(attempts).values({
          id: randomUUID(),
          guildId,
          requestId,
          subscriptionId,
          version,
          status: 'pending',
          createdAt: now(),
        });
        return { claimed: true as const, status: 'pending' as const, errorCode: null };
      });
    },
    async finishTest(
      guildId: string,
      requestId: string,
      status: 'sent' | 'failed' | 'uncertain',
      errorCode: string | null,
    ) {
      await db
        .update(attempts)
        .set({ status, errorCode })
        .where(
          and(
            eq(attempts.guildId, guildId),
            eq(attempts.requestId, requestId),
            eq(attempts.status, 'pending'),
          ),
        );
    },
  };
}
export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
