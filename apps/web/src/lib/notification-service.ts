import {
  NotificationError,
  readNotificationConfig,
  renderNotification,
  renderKickPreview,
  validateNotificationTarget,
} from '@navi/core';
import type { NotificationRepository } from '@navi/database';
import type { GuildService } from './guild-service';
import type { NotificationBroker } from './notification-broker';
import { AppError } from './errors';
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
export function createNotificationService(deps: {
  guilds: Pick<GuildService, 'authorize'>;
  repository: NotificationRepository;
  broker: NotificationBroker;
}) {
  async function access(headers: Headers, guildId: string, subscriptionId?: string) {
    await deps.guilds.authorize(headers, guildId);
    if (subscriptionId !== undefined && !uuid(subscriptionId))
      throw new AppError(400, 'invalid_subscription');
  }
  function version(input: unknown) {
    if (!Number.isSafeInteger(input) || (input as number) < 0 || (input as number) > 2147483646)
      throw new AppError(400, 'invalid_settings_version');
    return input as number;
  }
  return {
    async list(headers: Headers, guildId: string) {
      await access(headers, guildId);
      return deps.repository.list(guildId);
    },
    async targets(headers: Headers, guildId: string, fresh = false) {
      await access(headers, guildId);
      return deps.broker.targets(guildId, fresh);
    },
    async save(
      headers: Headers,
      guildId: string,
      subscriptionId: string,
      input: unknown,
      expectedVersion: unknown,
    ) {
      await access(headers, guildId, subscriptionId);
      const config = readNotificationConfig(input);
      const revision = version(expectedVersion);
      await deps.repository.get(guildId, subscriptionId);
      validateNotificationTarget(config, await deps.broker.targets(guildId, true));
      return deps.repository.save(guildId, subscriptionId, config, revision);
    },
    async preview(headers: Headers, guildId: string, subscriptionId: string, input: unknown) {
      await access(headers, guildId, subscriptionId);
      const config = readNotificationConfig(input);
      const row = await deps.repository.get(guildId, subscriptionId);
      validateNotificationTarget(config, await deps.broker.targets(guildId, true));
      return {
        content: renderNotification(config, row).content,
        sample: true,
        ...(row.provider === 'kick' ? { kick: renderKickPreview(config, row) } : {}),
      };
    },
    async disable(
      headers: Headers,
      guildId: string,
      subscriptionId: string,
      expectedVersion: unknown,
    ) {
      await access(headers, guildId, subscriptionId);
      const row = await deps.repository.get(guildId, subscriptionId);
      if (!row.config) throw new AppError(409, 'notification_settings_changed');
      return deps.repository.save(
        guildId,
        subscriptionId,
        { ...row.config, enabled: false },
        version(expectedVersion),
      );
    },
    async test(
      headers: Headers,
      guildId: string,
      subscriptionId: string,
      requestId: unknown,
      expectedVersion: unknown,
    ) {
      await access(headers, guildId, subscriptionId);
      if (!uuid(requestId)) throw new AppError(400, 'invalid_test_request');
      const revision = version(expectedVersion),
        row = await deps.repository.get(guildId, subscriptionId);
      if (!row.config || !revision || row.version !== revision)
        throw new AppError(409, 'notification_settings_changed');
      const claim = await deps.repository.claimTest(guildId, subscriptionId, requestId, revision);
      if (!claim.claimed)
        return { status: claim.status === 'pending' ? 'uncertain' : claim.status, replayed: true };
      try {
        await deps.broker.sendTest(guildId, {
          config: row.config,
          identity: {
            provider: row.provider,
            displayName: row.displayName,
            canonicalUrl: row.canonicalUrl,
          },
          requestId,
        });
      } catch (error) {
        const known = error instanceof AppError || error instanceof NotificationError;
        const uncertain = !known || error.code === 'test_delivery_uncertain';
        try {
          await deps.repository.finishTest(
            guildId,
            requestId,
            uncertain ? 'uncertain' : 'failed',
            known ? error.code : 'test_delivery_uncertain',
          );
        } catch {
          throw new AppError(503, 'test_delivery_uncertain');
        }
        if (known) throw error;
        throw new AppError(503, 'test_delivery_uncertain');
      }
      try {
        await deps.repository.finishTest(guildId, requestId, 'sent', null);
      } catch {
        throw new AppError(503, 'test_delivery_uncertain');
      }
      return { status: 'sent', replayed: false };
    },
  };
}
