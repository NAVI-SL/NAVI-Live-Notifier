import {
  CommandError,
  NotificationError,
  commandErrorCode,
  readCommandTargets,
  validateNotificationTarget,
  isDiscordId,
  type NotificationTargets,
} from '@navi/core';
import type { CommandRepository } from '@navi/database';

export type CommandDiscordAccess = {
  status(guildId: string): Promise<'installed' | 'not_installed' | 'unknown'>;
  authorize(guildId: string, requesterDiscordId: string): Promise<void>;
  targets(guildId: string): Promise<NotificationTargets>;
  sendTest(
    guildId: string,
    input: unknown,
  ): Promise<{ status: 'sent'; channelId: string; messageId: string }>;
};
export type CommandCoordinator = <T>(
  id: string,
  operation: (assertHeld: () => void) => Promise<T>,
) => Promise<T>;
/** Explicit single-step consumer. Import/construction never starts a timer, Gateway or monitoring. */
export function createCommandProcessor(
  repository: CommandRepository,
  discord: CommandDiscordAccess,
  coordinate: CommandCoordinator,
  log: (entry: Record<string, unknown>) => void = () => {},
) {
  let running = false;
  return {
    async runOne(owner: string) {
      if (running) return false;
      running = true;
      try {
        const row = await repository.claim(owner);
        if (!row) return false;
        let lost = false;
        let renewal: Promise<void> | undefined;
        const timer = setInterval(() => {
          if (renewal) return;
          renewal = repository
            .renew(row)
            .then(
              (ok) => {
                if (!ok) lost = true;
              },
              () => {
                lost = true;
              },
            )
            .finally(() => {
              renewal = undefined;
            });
        }, 15000);
        const guard = async () => {
          if (lost || !(await repository.renew(row))) throw new CommandError('command_lease_lost');
        };
        try {
          const command = await repository.checkExecution(row);
          await guard();
          if (command.kind === 'guild_status.refresh') {
            const status = await discord.status(row.guildId);
            if (status === 'unknown') throw new CommandError('discord_unavailable');
            if (status === 'installed')
              await discord.authorize(row.guildId, row.requesterDiscordId);
            await guard();
            await repository.complete(row, { status, observedAt: new Date().toISOString() }, true);
          } else if (command.kind === 'notification_targets.refresh') {
            await discord.authorize(row.guildId, row.requesterDiscordId);
            const targets = readCommandTargets(await discord.targets(row.guildId));
            await guard();
            await repository.complete(
              row,
              { ...targets, observedAt: new Date().toISOString() },
              true,
            );
          } else {
            const execute = async (assertHeld: () => void) => {
              await discord.authorize(row.guildId, row.requesterDiscordId);
              await guard();
              const saved = await repository.saved(row);
              if (saved.version !== command.payload.expectedVersion)
                throw new CommandError('notification_settings_changed');
              const config =
                command.kind === 'notification_settings.apply'
                  ? command.payload.config
                  : saved.config;
              if (!config) throw new CommandError('notification_settings_changed');
              validateNotificationTarget(
                config,
                readCommandTargets(await discord.targets(row.guildId)),
              );
              await repository.checkExecution(row);
              await guard();
              assertHeld();
              if (command.kind === 'notification_settings.apply')
                await repository.complete(row, {});
              else {
                await repository.markEffect(row);
                const receipt = await discord.sendTest(row.guildId, {
                  config,
                  identity: {
                    provider: saved.provider,
                    displayName: saved.displayName,
                    canonicalUrl: saved.canonicalUrl,
                  },
                  requestId: row.idempotencyKey,
                });
                if (!isDiscordId(receipt.messageId) || receipt.channelId !== config.channelId)
                  throw new CommandError('invalid_command_result');
                await repository.recordReceipt(row, receipt);
                assertHeld();
                await repository.complete(row, receipt);
              }
            };
            // Normal settings saves take the same transaction lock inside complete().
            // Test sends need the existing session route lock throughout external I/O.
            if (command.kind === 'notification_test.send')
              await coordinate(`live:${command.payload.subscriptionId}`, execute);
            else await execute(() => {});
          }
          log({
            service: 'bot_commands',
            event: 'command_completed',
            commandId: row.id,
            kind: row.kind,
          });
        } catch (error) {
          const safe =
            error instanceof NotificationError
              ? new CommandError(error.code, error.retryAfter ?? 0)
              : error;
          try {
            const applied = await repository.fail(
              row,
              safe,
              safe instanceof CommandError ? safe.retryAfter : 0,
            );
            if (!applied) await repository.recover();
          } catch {
            /* DB outage: retain processing; durable recovery quarantines possible sends. */
          }
          log({
            service: 'bot_commands',
            event: 'command_unconfirmed_or_failed',
            commandId: row.id,
            code: commandErrorCode(safe),
          });
        } finally {
          clearInterval(timer);
          await renewal;
        }
        return true;
      } catch {
        log({ service: 'bot_commands', event: 'command_store_unavailable' });
        return false;
      } finally {
        running = false;
      }
    },
  };
}
