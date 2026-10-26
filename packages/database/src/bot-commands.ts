import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, lte, inArray, isNull, sql, getTableColumns } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import {
  CommandError,
  NotificationError,
  commandUuid,
  readCommand,
  readCommandResult,
  requireCommandScope,
  commandErrorCode,
  isDiscordId,
  type CommandPrincipal,
  type CommandPolicy,
} from '@navi/core';
import * as s from './schema.js';
import { createNotificationRepository } from './notifications.js';

type Database = PgDatabase<PgQueryResultHKT, typeof s>;
export type BotCommand = typeof s.botCommands.$inferSelect;
const clock = sql`clock_timestamp()`;
const c = s.botCommands;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const principalOf = (row: BotCommand): CommandPrincipal => ({
  userId: row.requesterUserId,
  discordId: row.requesterDiscordId,
  sessionRef: row.sessionRef,
});
async function sanitized<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CommandError) throw error;
    if (error instanceof NotificationError)
      throw new CommandError(
        error.code === 'test_request_conflict'
          ? 'command_conflict'
          : commandErrorCode(new CommandError(error.code)),
        error.retryAfter ?? 0,
      );
    if (error && typeof error === 'object') {
      const status =
        'status' in error ? error.status : 'statusCode' in error ? error.statusCode : undefined;
      if (status === 401 || status === 403) throw new CommandError('command_forbidden');
      if (status === 429) {
        const delay =
          'retryAfter' in error &&
          typeof error.retryAfter === 'number' &&
          Number.isFinite(error.retryAfter)
            ? Math.max(1, Math.ceil(error.retryAfter))
            : 60;
        throw new CommandError('discord_rate_limited', delay);
      }
    }
    throw new CommandError('command_unavailable');
  }
}
export function createCommandRepository(db: Database, inputPolicy: CommandPolicy) {
  const policy = {
    allowedUsers: [...inputPolicy.allowedUsers].sort(),
    allowedGuilds: [...inputPolicy.allowedGuilds].sort(),
  };
  if (
    !policy.allowedUsers.length ||
    !policy.allowedGuilds.length ||
    policy.allowedGuilds.length > 5 ||
    ![...policy.allowedUsers, ...policy.allowedGuilds].every(isDiscordId)
  )
    throw new CommandError('command_forbidden');
  const policyHash = hash(policy);
  const notifications = createNotificationRepository(db);
  const owned = (row: BotCommand) =>
    and(
      eq(c.id, row.id),
      eq(c.status, 'processing'),
      eq(c.leaseOwner, row.leaseOwner!),
      eq(c.leaseGeneration, row.leaseGeneration),
      gt(c.leaseExpiresAt, clock),
      gt(c.expiresAt, clock),
    );
  async function sessionValid(connection: Database, principal: CommandPrincipal) {
    const [result] = await connection
      .select({
        valid: sql<boolean>`navi_command_requester_valid(${principal.sessionRef},${principal.userId},${principal.discordId})`,
      })
      .from(sql`(values (1)) as command_probe(value)`);
    if (result?.valid !== true) throw new CommandError('command_forbidden');
  }
  async function validateActor(connection: Database, guildId: string, principal: CommandPrincipal) {
    requireCommandScope(policy, guildId, principal);
    await sessionValid(connection, principal);
  }
  async function checkExecution(row: BotCommand) {
    return sanitized(async () => {
      await validateActor(db, row.guildId, principalOf(row));
      const parsed = readCommand({ kind: row.kind, payload: row.payload });
      if (
        'subscriptionId' in parsed.payload &&
        (parsed.payload.subscriptionId !== row.subscriptionId ||
          parsed.payload.expectedVersion !== row.expectedVersion)
      )
        throw new CommandError('invalid_command');
      if (
        row.schemaVersion !== 1 ||
        row.policyHash !== policyHash ||
        row.payloadHash !== hash(parsed.payload)
      )
        throw new CommandError('command_forbidden');
      return parsed;
    });
  }
  async function finishAttempt(connection: Database, row: BotCommand, code: string | null) {
    await connection
      .update(s.botCommandAttempts)
      .set({ finishedAt: clock, errorCode: code })
      .where(
        and(
          eq(s.botCommandAttempts.commandId, row.id),
          eq(s.botCommandAttempts.generation, row.leaseGeneration),
        ),
      );
  }
  async function finishTest(
    connection: Database,
    row: BotCommand,
    status: 'sent' | 'failed' | 'uncertain',
    code: string | null,
  ) {
    if (row.kind === 'notification_test.send')
      await createNotificationRepository(connection).finishTest(
        row.guildId,
        row.idempotencyKey,
        status,
        code,
      );
  }
  async function recover() {
    return sanitized(() =>
      db.transaction(async (tx) => {
        // Lock only recoverable rows; never steal active ownership or touch normal live deliveries.
        const rows = await tx
          .select()
          .from(c)
          .where(
            and(
              inArray(c.guildId, policy.allowedGuilds),
              sql`((${c.status}='pending' and ${c.expiresAt}<=${clock}) or (${c.status}='processing' and (${c.leaseExpiresAt}<=${clock} or ${c.expiresAt}<=${clock})))`,
            ),
          )
          .for('update', { skipLocked: true })
          .limit(50);
        for (const row of rows) {
          const uncertain = row.effectStartedAt !== null;
          const expired = await tx
            .select({ value: sql<boolean>`${c.expiresAt} <= ${clock}` })
            .from(c)
            .where(eq(c.id, row.id));
          const status = uncertain
            ? 'uncertain'
            : expired[0]?.value
              ? 'expired'
              : row.attemptCount >= 3
                ? 'failed'
                : 'pending';
          const code = uncertain
            ? 'command_uncertain'
            : status === 'expired'
              ? 'command_expired'
              : 'command_lease_lost';
          await tx
            .update(c)
            .set({
              status,
              errorCode: code,
              updatedAt: clock,
              finishedAt: status === 'pending' ? null : clock,
              leaseOwner: null,
              leaseExpiresAt: null,
              retryCount: Math.min(2, row.retryCount + (status === 'pending' ? 1 : 0)),
            })
            .where(eq(c.id, row.id));
          if (row.status === 'processing') await finishAttempt(tx, row, code);
          if (status !== 'pending')
            await finishTest(tx, row, uncertain ? 'uncertain' : 'failed', code);
        }
        return rows.length;
      }),
    );
  }
  return {
    checkExecution,
    recover,
    /** Advisory data only; web callers must freshly authorize the current guild. */
    async snapshot(guildId: string, kind: 'guild_status.refresh' | 'notification_targets.refresh') {
      return sanitized(async () => {
        if (!policy.allowedGuilds.includes(guildId)) throw new CommandError('command_forbidden');
        const [row] = await db
          .select()
          .from(s.botGuildSnapshots)
          .where(
            and(
              eq(s.botGuildSnapshots.guildId, guildId),
              eq(s.botGuildSnapshots.kind, kind),
              gt(s.botGuildSnapshots.staleAfter, clock),
            ),
          );
        return row ? readCommandResult(kind, row.payload) : null;
      });
    },
    async enqueue(
      guildId: string,
      principal: CommandPrincipal,
      idempotencyKey: string,
      input: unknown,
    ) {
      return sanitized(async () => {
        const parsed = readCommand(input);
        if (!commandUuid(idempotencyKey)) throw new CommandError('invalid_command');
        idempotencyKey = idempotencyKey.toLowerCase();
        return db.transaction(async (tx) => {
          await validateActor(tx, guildId, principal);
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${'navi:command-actor:' + principal.userId},0))`,
          );
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${'navi:command-admission:' + guildId},0))`,
          );
          const [existing] = await tx
            .select()
            .from(c)
            .where(
              and(
                eq(c.guildId, guildId),
                eq(c.kind, parsed.kind),
                eq(c.idempotencyKey, idempotencyKey),
              ),
            );
          if (existing) {
            if (
              existing.requesterUserId !== principal.userId ||
              existing.requesterDiscordId !== principal.discordId ||
              existing.payloadHash !== hash(parsed.payload)
            )
              throw new CommandError('command_conflict');
            return existing;
          }
          const [{ count } = { count: 0 }] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(c)
            .where(and(eq(c.guildId, guildId), inArray(c.status, ['pending', 'processing'])));
          if (count >= 20) throw new CommandError('command_capacity');
          const [actorLoad] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(c)
            .where(
              and(
                eq(c.requesterUserId, principal.userId),
                inArray(c.status, ['pending', 'processing']),
              ),
            );
          if ((actorLoad?.count ?? 0) >= 10) throw new CommandError('command_capacity');
          const payload = parsed.payload;
          if ('subscriptionId' in payload) {
            const saved = await createNotificationRepository(tx).get(
              guildId,
              payload.subscriptionId,
            );
            if (saved.version !== payload.expectedVersion)
              throw new CommandError('notification_settings_changed');
          }
          const [row] = await tx
            .insert(c)
            .values({
              id: randomUUID(),
              kind: parsed.kind,
              guildId,
              requesterUserId: principal.userId,
              requesterDiscordId: principal.discordId,
              sessionRef: principal.sessionRef,
              idempotencyKey,
              payload: parsed.payload,
              payloadHash: hash(parsed.payload),
              policyHash,
              subscriptionId: 'subscriptionId' in payload ? payload.subscriptionId : null,
              expectedVersion: 'expectedVersion' in payload ? payload.expectedVersion : null,
              expiresAt: sql`${clock} + ${parsed.kind.endsWith('.refresh') ? 60 : 120} * interval '1 second'`,
            })
            .returning();
          if (!row) throw new CommandError('command_unavailable');
          if (parsed.kind === 'notification_test.send') {
            const reservation = await createNotificationRepository(tx).claimTest(
              guildId,
              parsed.payload.subscriptionId,
              idempotencyKey,
              parsed.payload.expectedVersion,
            );
            if (!reservation.claimed) throw new CommandError('command_conflict');
          }
          return row;
        });
      });
    },
    async get(guildId: string, principal: CommandPrincipal, id: string) {
      return sanitized(async () => {
        await validateActor(db, guildId, principal);
        const [row] = await db
          .select({ ...getTableColumns(c), deadlinePassed: sql<boolean>`${c.expiresAt}<=${clock}` })
          .from(c)
          .where(
            and(
              eq(c.id, id),
              eq(c.guildId, guildId),
              eq(c.requesterUserId, principal.userId),
              eq(c.requesterDiscordId, principal.discordId),
            ),
          );
        if (!row) throw new CommandError('command_forbidden');
        return {
          id: row.id,
          // Read-only projection: an offline bot cannot leave expired, unstarted work shown as pending forever.
          // Processing/effect-marked outcomes require consumer recovery; never infer that a send did not happen.
          status: row.status === 'pending' && row.deadlinePassed ? 'expired' : row.status,
          result: row.result === null ? null : readCommandResult(row.kind, row.result),
          errorCode:
            row.errorCode === null ? null : commandErrorCode(new CommandError(row.errorCode)),
          expiresAt: row.expiresAt,
          retryAfterSeconds: row.retryAfterSeconds,
        };
      });
    },
    async claim(owner: string) {
      if (!commandUuid(owner)) throw new CommandError('invalid_command');
      await recover();
      return sanitized(() =>
        db.transaction(async (tx) => {
          const [row] = await tx
            .select()
            .from(c)
            .where(
              and(
                inArray(c.guildId, policy.allowedGuilds),
                eq(c.status, 'pending'),
                lte(c.dueAt, clock),
                gt(c.expiresAt, clock),
                sql`${c.attemptCount}<3`,
              ),
            )
            .orderBy(c.dueAt, c.createdAt, c.id)
            .for('update', { skipLocked: true })
            .limit(1);
          if (!row) return;
          const [claimed] = await tx
            .update(c)
            .set({
              status: 'processing',
              leaseOwner: owner,
              leaseGeneration: row.leaseGeneration + 1,
              leaseExpiresAt: sql`${clock}+interval '60 seconds'`,
              attemptCount: row.attemptCount + 1,
              updatedAt: clock,
            })
            .where(eq(c.id, row.id))
            .returning();
          await tx
            .insert(s.botCommandAttempts)
            .values({ commandId: row.id, generation: row.leaseGeneration + 1, owner });
          return claimed;
        }),
      );
    },
    async renew(row: BotCommand) {
      return sanitized(
        async () =>
          (
            await db
              .update(c)
              .set({ leaseExpiresAt: sql`${clock}+interval '60 seconds'`, updatedAt: clock })
              .where(owned(row))
              .returning({ id: c.id })
          ).length === 1,
      );
    },
    async markEffect(row: BotCommand) {
      if (row.kind !== 'notification_test.send') throw new CommandError('invalid_command');
      return sanitized(() =>
        db.transaction(async (tx) => {
          await validateActor(tx, row.guildId, principalOf(row));
          const saved = await createNotificationRepository(tx).get(
            row.guildId,
            row.subscriptionId!,
          );
          if (saved.version !== row.expectedVersion)
            throw new CommandError('notification_settings_changed');
          const result = await tx
            .update(c)
            .set({ effectStartedAt: clock, updatedAt: clock })
            .where(and(owned(row), isNull(c.effectStartedAt)))
            .returning();
          if (!result.length) throw new CommandError('command_lease_lost');
          await tx
            .update(s.botCommandAttempts)
            .set({ effectStartedAt: clock })
            .where(
              and(
                eq(s.botCommandAttempts.commandId, row.id),
                eq(s.botCommandAttempts.generation, row.leaseGeneration),
              ),
            );
        }),
      );
    },
    async saved(row: BotCommand) {
      return notifications.get(row.guildId, row.subscriptionId!);
    },
    async recordReceipt(row: BotCommand, receipt: { channelId: string; messageId: string }) {
      return sanitized(async () => {
        if (
          row.kind !== 'notification_test.send' ||
          !isDiscordId(receipt.channelId) ||
          !isDiscordId(receipt.messageId)
        )
          throw new CommandError('invalid_command_result');
        // Receipt evidence can arrive after lease loss; it never changes terminal state.
        await db
          .update(s.botCommandAttempts)
          .set(receipt)
          .where(
            and(
              eq(s.botCommandAttempts.commandId, row.id),
              eq(s.botCommandAttempts.generation, row.leaseGeneration),
              eq(s.botCommandAttempts.owner, row.leaseOwner!),
              sql`${s.botCommandAttempts.effectStartedAt} is not null`,
              isNull(s.botCommandAttempts.messageId),
            ),
          );
      });
    },
    async complete(row: BotCommand, result: unknown, snapshot = false) {
      return sanitized(() =>
        db.transaction(async (tx) => {
          const [current] = await tx.select().from(c).where(owned(row)).for('update');
          if (!current) throw new CommandError('command_lease_lost');
          if (row.kind === 'notification_test.send' && current.effectStartedAt === null)
            throw new CommandError('invalid_command');
          let committed = result;
          if (row.kind === 'notification_settings.apply') {
            await validateActor(tx, row.guildId, principalOf(row));
            const parsed = readCommand({ kind: row.kind, payload: row.payload });
            if (parsed.kind !== 'notification_settings.apply')
              throw new CommandError('invalid_command');
            committed = await createNotificationRepository(tx).save(
              row.guildId,
              parsed.payload.subscriptionId,
              parsed.payload.config,
              parsed.payload.expectedVersion,
            );
          }
          committed = readCommandResult(row.kind, committed);
          const updated = await tx
            .update(c)
            .set({
              status: 'completed',
              result: committed,
              errorCode: null,
              updatedAt: clock,
              finishedAt: clock,
              leaseOwner: null,
              leaseExpiresAt: null,
            })
            .where(owned(row))
            .returning();
          if (!updated.length) throw new CommandError('command_lease_lost');
          if (snapshot)
            await tx
              .insert(s.botGuildSnapshots)
              .values({
                guildId: row.guildId,
                kind: row.kind,
                payload: committed,
                staleAfter: sql`${clock}+interval '15 seconds'`,
                generation: row.leaseGeneration,
              })
              .onConflictDoUpdate({
                target: [s.botGuildSnapshots.guildId, s.botGuildSnapshots.kind],
                set: {
                  payload: committed,
                  observedAt: clock,
                  staleAfter: sql`${clock}+interval '15 seconds'`,
                  generation: row.leaseGeneration,
                },
              });
          await finishAttempt(tx, row, null);
          if (row.kind === 'notification_test.send') {
            const receipt = committed as { channelId: string; messageId: string };
            if (!isDiscordId(receipt.channelId) || !isDiscordId(receipt.messageId))
              throw new CommandError('invalid_command_result');
            await tx
              .update(s.botCommandAttempts)
              .set({ channelId: receipt.channelId, messageId: receipt.messageId })
              .where(
                and(
                  eq(s.botCommandAttempts.commandId, row.id),
                  eq(s.botCommandAttempts.generation, row.leaseGeneration),
                ),
              );
            await finishTest(tx, row, 'sent', null);
          }
        }),
      );
    },
    async fail(row: BotCommand, error: unknown, retryAfter = 0) {
      return sanitized(() =>
        db.transaction(async (tx) => {
          const [current] = await tx.select().from(c).where(owned(row)).for('update');
          if (!current) return false;
          const code = commandErrorCode(error);
          const uncertain = current.effectStartedAt !== null;
          const safeRetry =
            !uncertain &&
            ['discord_rate_limited', 'discord_unavailable', 'command_unavailable'].includes(code) &&
            current.attemptCount < 3;
          const delay = Math.max(
            1,
            Math.ceil(
              Number.isFinite(retryAfter) && retryAfter > 0
                ? Math.min(2147483647, retryAfter)
                : 5 * 2 ** (current.attemptCount - 1),
            ),
          );
          const [{ fits } = { fits: false }] = await tx
            .select({
              fits: sql<boolean>`${clock} + ${delay} * interval '1 second' < ${c.expiresAt}`,
            })
            .from(c)
            .where(eq(c.id, row.id));
          const status = uncertain
            ? 'uncertain'
            : safeRetry && fits
              ? 'pending'
              : safeRetry
                ? 'expired'
                : 'failed';
          const reason = uncertain
            ? 'command_uncertain'
            : status === 'expired'
              ? 'command_expired'
              : code;
          await tx
            .update(c)
            .set({
              status,
              errorCode: reason,
              retryCount: current.retryCount + (status === 'pending' ? 1 : 0),
              retryAfterSeconds: delay,
              dueAt: sql`${clock}+${delay}*interval '1 second'`,
              updatedAt: clock,
              finishedAt: status === 'pending' ? null : clock,
              leaseOwner: null,
              leaseExpiresAt: null,
            })
            .where(eq(c.id, row.id));
          await finishAttempt(tx, row, reason);
          if (status !== 'pending')
            await finishTest(tx, row, uncertain ? 'uncertain' : 'failed', reason);
          return true;
        }),
      );
    },
  };
}
export type CommandRepository = ReturnType<typeof createCommandRepository>;

/** Server adapter only: no routes are installed and no transport is switched here. */
export function createCommandAdmission(deps: {
  repository: CommandRepository;
  origin: string;
  session: (headers: Headers) => Promise<{
    session: { id: string; userId: string };
    user: { id: string; email: string };
  } | null>;
  authorize: (headers: Headers, guildId: string) => Promise<unknown>;
}) {
  async function access(headers: Headers, guildId: string) {
    const session = await deps.session(headers);
    const discordId =
      session && /^discord-(\d{17,20})@users\.navi\.invalid$/.exec(session.user.email)?.[1];
    if (!session || !discordId || session.session.userId !== session.user.id)
      throw new CommandError('command_forbidden');
    await deps.authorize(headers, guildId);
    return { userId: session.user.id, discordId, sessionRef: session.session.id };
  }
  return {
    async submit(headers: Headers, guildId: string, key: string, input: unknown) {
      return sanitized(async () => {
        if (headers.get('origin') !== deps.origin) throw new CommandError('command_forbidden');
        const row = await deps.repository.enqueue(
          guildId,
          await access(headers, guildId),
          key,
          input,
        );
        return { id: row.id, status: row.status, expiresAt: row.expiresAt };
      });
    },
    async status(headers: Headers, guildId: string, id: string) {
      return sanitized(async () =>
        deps.repository.get(guildId, await access(headers, guildId), id),
      );
    },
  };
}
