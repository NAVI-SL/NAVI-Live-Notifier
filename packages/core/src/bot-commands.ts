import {
  isDiscordId,
  readNotificationConfig,
  readNotificationIdentity,
  type NotificationConfig,
  type NotificationTargets,
} from './notifications.js';

export class CommandError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryAfter = 0,
  ) {
    super(code);
  }
}
export const commandKinds = [
  'guild_status.refresh',
  'notification_targets.refresh',
  'notification_settings.apply',
  'notification_test.send',
] as const;
export type CommandKind = (typeof commandKinds)[number];
export type CommandInput =
  | {
      kind: 'guild_status.refresh' | 'notification_targets.refresh';
      payload: Record<string, never>;
    }
  | {
      kind: 'notification_settings.apply';
      payload: { subscriptionId: string; expectedVersion: number; config: NotificationConfig };
    }
  | {
      kind: 'notification_test.send';
      payload: { subscriptionId: string; expectedVersion: number };
    };
export type CommandPrincipal = { userId: string; discordId: string; sessionRef: string };
export type CommandPolicy = { allowedUsers: readonly string[]; allowedGuilds: readonly string[] };
export const commandUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
export function commandObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CommandError('invalid_command');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new CommandError('invalid_command');
}
export function readCommand(input: unknown): CommandInput {
  try {
    if (Buffer.byteLength(JSON.stringify(input) ?? '') > 12000) throw new Error();
    const value = commandObject(input);
    keys(value, ['kind', 'payload']);
    if (!commandKinds.includes(value.kind as CommandKind)) throw new Error();
    const payload = commandObject(value.payload);
    if (value.kind === 'guild_status.refresh' || value.kind === 'notification_targets.refresh') {
      keys(payload, []);
      return { kind: value.kind, payload: {} };
    }
    keys(
      payload,
      value.kind === 'notification_settings.apply'
        ? ['subscriptionId', 'expectedVersion', 'config']
        : ['subscriptionId', 'expectedVersion'],
    );
    if (
      !commandUuid(payload.subscriptionId) ||
      !Number.isSafeInteger(payload.expectedVersion) ||
      (payload.expectedVersion as number) < (value.kind === 'notification_test.send' ? 1 : 0) ||
      (payload.expectedVersion as number) > 2147483646
    )
      throw new Error();
    const base = {
      subscriptionId: payload.subscriptionId,
      expectedVersion: payload.expectedVersion as number,
    };
    if (value.kind === 'notification_test.send') return { kind: value.kind, payload: base };
    const config = commandObject(payload.config);
    keys(config, ['channelId', 'roleId', 'mentionEveryone', 'template', 'enabled']);
    return {
      kind: 'notification_settings.apply',
      payload: { ...base, config: readNotificationConfig(config) },
    };
  } catch {
    throw new CommandError('invalid_command');
  }
}
export function requireCommandScope(
  policy: CommandPolicy,
  guildId: string,
  principal: CommandPrincipal,
) {
  if (
    !isDiscordId(guildId) ||
    !isDiscordId(principal.discordId) ||
    !principal.userId ||
    !principal.sessionRef ||
    !policy.allowedGuilds.includes(guildId) ||
    !policy.allowedUsers.includes(principal.discordId)
  )
    throw new CommandError('command_forbidden');
}
/** Only allowlisted errors may cross the durable/public boundary. */
export function commandErrorCode(error: unknown): string {
  const code = error instanceof CommandError ? error.code : '';
  return [
    'invalid_command',
    'command_forbidden',
    'command_expired',
    'command_conflict',
    'command_capacity',
    'command_unavailable',
    'command_lease_lost',
    'discord_rate_limited',
    'discord_unavailable',
    'bot_not_installed',
    'bot_missing_permissions',
    'everyone_mention_not_permitted',
    'notification_channel_unavailable',
    'notification_role_unavailable',
    'notification_settings_changed',
    'subscription_not_found',
    'test_notification_rate_limited',
    'command_uncertain',
    'invalid_command_result',
  ].includes(code)
    ? code
    : 'command_unavailable';
}

export function readCommandTargets(input: unknown): NotificationTargets {
  try {
    const value = commandObject(input);
    if (
      !Array.isArray(value.channels) ||
      !Array.isArray(value.roles) ||
      value.channels.length > 1000 ||
      value.roles.length > 1000
    )
      throw new Error();
    const identity = (input: unknown) => {
      const item = commandObject(input);
      if (!isDiscordId(item.id) || typeof item.name !== 'string' || item.name.length > 100)
        throw new Error();
      return { id: item.id, name: item.name };
    };
    return {
      channels: value.channels.map((input) => {
        const item = commandObject(input);
        if (
          (item.canEmbed !== undefined && typeof item.canEmbed !== 'boolean') ||
          (item.canMentionEveryone !== undefined && typeof item.canMentionEveryone !== 'boolean')
        )
          throw new Error();
        return {
          ...identity(item),
          ...(typeof item.canEmbed === 'boolean' ? { canEmbed: item.canEmbed } : {}),
          ...(typeof item.canMentionEveryone === 'boolean'
            ? { canMentionEveryone: item.canMentionEveryone }
            : {}),
        };
      }),
      roles: value.roles.map(identity),
    };
  } catch {
    throw new CommandError('invalid_command_result');
  }
}
/** Project a small DTO instead of persisting arbitrary adapter/SDK response properties. */
export function readCommandResult(kind: string, input: unknown): unknown {
  try {
    const value = commandObject(input);
    let result: unknown;
    if (kind === 'guild_status.refresh') {
      if (
        !['installed', 'not_installed'].includes(String(value.status)) ||
        typeof value.observedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.observedAt))
      )
        throw new Error();
      result = { status: value.status, observedAt: value.observedAt };
    } else if (kind === 'notification_targets.refresh') {
      if (typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)))
        throw new Error();
      result = { ...readCommandTargets(value), observedAt: value.observedAt };
    } else if (kind === 'notification_test.send') {
      if (value.status !== 'sent' || !isDiscordId(value.channelId) || !isDiscordId(value.messageId))
        throw new Error();
      result = { status: 'sent', channelId: value.channelId, messageId: value.messageId };
    } else if (kind === 'notification_settings.apply') {
      if (
        !commandUuid(value.subscriptionId) ||
        typeof value.subscriptionEnabled !== 'boolean' ||
        !Number.isSafeInteger(value.version) ||
        (value.version as number) < 1
      )
        throw new Error();
      result = {
        ...readNotificationIdentity(value),
        subscriptionId: value.subscriptionId,
        subscriptionEnabled: value.subscriptionEnabled,
        version: value.version,
        config: readNotificationConfig(value.config),
      };
    } else throw new Error();
    if (Buffer.byteLength(JSON.stringify(result)) > 1048576) throw new Error();
    return result;
  } catch {
    throw new CommandError('invalid_command_result');
  }
}
