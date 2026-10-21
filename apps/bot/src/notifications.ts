import { createHash } from 'node:crypto';
import {
  DiscordAPIError,
  PermissionFlagsBits,
  RateLimitError,
  Routes,
  type REST,
} from 'discord.js';
import {
  isDiscordId,
  NotificationError,
  readNotificationConfig,
  readNotificationIdentity,
  readLiveNotification,
  renderNotification,
  validateNotificationTarget,
  type NotificationTargets,
  createReadCache,
} from '@navi/core';
type Role = {
  id: string;
  name: string;
  permissions: string;
  mentionable: boolean;
  managed: boolean;
};
type Overwrite = { id: string; type: number; allow: string; deny: string };
type Channel = { id: string; name: string; type: number; permission_overwrites: Overwrite[] };
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const bits = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{1,30}$/.test(value);
export function canPost(
  guildId: string,
  botId: string,
  memberRoles: string[],
  roles: Role[],
  channel: Channel,
  timedOut = false,
  extraPermissions = 0n,
) {
  if (timedOut || channel.type !== 0) return false;
  let permissions = 0n;
  for (const role of roles)
    if (role.id === guildId || memberRoles.includes(role.id))
      permissions |= BigInt(role.permissions);
  if ((permissions & PermissionFlagsBits.Administrator) !== 0n) return true;
  const everyone = channel.permission_overwrites.find(
    (overwrite) => overwrite.id === guildId && overwrite.type === 0,
  );
  if (everyone) permissions = (permissions & ~BigInt(everyone.deny)) | BigInt(everyone.allow);
  let allow = 0n,
    deny = 0n;
  for (const overwrite of channel.permission_overwrites)
    if (overwrite.type === 0 && overwrite.id !== guildId && memberRoles.includes(overwrite.id)) {
      allow |= BigInt(overwrite.allow);
      deny |= BigInt(overwrite.deny);
    }
  permissions = (permissions & ~deny) | allow;
  const member = channel.permission_overwrites.find(
    (overwrite) => overwrite.type === 1 && overwrite.id === botId,
  );
  if (member) permissions = (permissions & ~BigInt(member.deny)) | BigInt(member.allow);
  const needed =
    PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | extraPermissions;
  return (permissions & needed) === needed;
}
function safeError(error: unknown, sending = false): never {
  if (error instanceof NotificationError) throw error;
  if (error instanceof RateLimitError)
    throw new NotificationError(
      429,
      'discord_rate_limited',
      Math.max(
        1,
        Math.ceil(
          Math.max(error.timeToReset ?? 0, error.retryAfter ?? 0, error.sublimitTimeout ?? 0) /
            1000,
        ),
      ),
    );
  if (error instanceof DiscordAPIError) {
    if (error.code === 10004 || error.code === 10007)
      throw new NotificationError(409, 'bot_not_installed');
    if (error.code === 10003) throw new NotificationError(409, 'notification_channel_unavailable');
    if (error.code === 10011) throw new NotificationError(409, 'notification_role_unavailable');
    if (error.code === 50001 || error.code === 50013)
      throw new NotificationError(403, 'bot_missing_permissions');
    if (error.status < 500) throw new NotificationError(502, 'discord_request_rejected');
  }
  throw new NotificationError(503, sending ? 'test_delivery_uncertain' : 'bot_unavailable');
}
export function createBotNotifications(rest: Pick<REST, 'get' | 'post'>) {
  const readTargets = createReadCache<NotificationTargets>(5000);
  let botIdentity: Promise<string> | undefined;
  async function botId() {
    botIdentity ??= rest
      .get(Routes.user('@me'))
      .then((value) => {
        const id = object(value).id;
        if (!isDiscordId(id)) throw new NotificationError(503, 'discord_invalid_response');
        return id;
      })
      .catch((error) => {
        botIdentity = undefined;
        throw error;
      });
    return botIdentity;
  }
  async function loadTargets(guildId: string): Promise<NotificationTargets> {
    if (!isDiscordId(guildId)) throw new NotificationError(400, 'invalid_guild');
    try {
      const id = await botId();
      const [guildValue, channelsValue, rolesValue, memberValue] = await Promise.all([
        rest.get(Routes.guild(guildId)),
        rest.get(Routes.guildChannels(guildId)),
        rest.get(Routes.guildRoles(guildId)),
        rest.get(Routes.guildMember(guildId, id)),
      ]);
      const member = object(memberValue);
      if (
        object(guildValue).id !== guildId ||
        !Array.isArray(member.roles) ||
        !member.roles.every(isDiscordId) ||
        !Array.isArray(channelsValue) ||
        channelsValue.length > 1000 ||
        !Array.isArray(rolesValue) ||
        rolesValue.length > 1000
      )
        throw new NotificationError(503, 'discord_invalid_response');
      const roles: Role[] = rolesValue.map((value) => {
        const role = object(value);
        if (
          !isDiscordId(role.id) ||
          typeof role.name !== 'string' ||
          !bits(role.permissions) ||
          typeof role.mentionable !== 'boolean' ||
          typeof role.managed !== 'boolean'
        )
          throw new NotificationError(503, 'discord_invalid_response');
        return {
          id: role.id,
          name: role.name,
          permissions: role.permissions,
          mentionable: role.mentionable,
          managed: role.managed,
        };
      });
      if (
        !roles.some((role) => role.id === guildId) ||
        !member.roles.every((id) => roles.some((role) => role.id === id))
      )
        throw new NotificationError(503, 'discord_invalid_response');
      const channels: Channel[] = channelsValue
        .filter((value) => object(value).type === 0)
        .map((value) => {
          const channel = object(value),
            overwrites =
              channel.permission_overwrites === undefined ? [] : channel.permission_overwrites;
          if (
            !isDiscordId(channel.id) ||
            typeof channel.name !== 'string' ||
            (channel.guild_id !== undefined && channel.guild_id !== guildId) ||
            !Array.isArray(overwrites)
          )
            throw new NotificationError(503, 'discord_invalid_response');
          return {
            id: channel.id,
            name: channel.name,
            type: 0,
            permission_overwrites: overwrites.map((value) => {
              const overwrite = object(value);
              if (
                !isDiscordId(overwrite.id) ||
                (overwrite.type !== 0 && overwrite.type !== 1) ||
                !bits(overwrite.allow) ||
                !bits(overwrite.deny)
              )
                throw new NotificationError(503, 'discord_invalid_response');
              return {
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow,
                deny: overwrite.deny,
              };
            }),
          };
        });
      const timedOut =
        typeof member.communication_disabled_until === 'string' &&
        Date.parse(member.communication_disabled_until) > Date.now();
      return {
        channels: channels
          .filter((channel) =>
            canPost(guildId, id, member.roles as string[], roles, channel, timedOut),
          )
          .map((channel) => ({
            id: channel.id,
            name: channel.name,
            ...(canPost(
              guildId,
              id,
              member.roles as string[],
              roles,
              channel,
              timedOut,
              PermissionFlagsBits.EmbedLinks,
            )
              ? { canEmbed: true }
              : {}),
            ...(canPost(
              guildId,
              id,
              member.roles as string[],
              roles,
              channel,
              timedOut,
              PermissionFlagsBits.MentionEveryone,
            )
              ? { canMentionEveryone: true }
              : {}),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        roles: roles
          .filter((role) => role.id !== guildId && role.mentionable && !role.managed)
          .map(({ id, name }) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch (error) {
      safeError(error);
    }
  }
  const targets = (guildId: string, fresh = false) =>
    readTargets(guildId, () => loadTargets(guildId), fresh);
  async function send(guildId: string, input: unknown, automatic = false) {
    const value = object(input),
      config = readNotificationConfig(value.config),
      identity = readNotificationIdentity(value.identity);
    if (automatic && !config.enabled) throw new NotificationError(409, 'notification_disabled');
    if (
      typeof value.requestId !== 'string' ||
      !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value.requestId)
    )
      throw new NotificationError(400, 'invalid_test_request');
    const currentTargets = await targets(guildId, true);
    validateNotificationTarget(config, currentTargets);
    if (
      automatic &&
      !currentTargets.channels.some(
        (channel) => channel.id === config.channelId && channel.canEmbed === true,
      )
    )
      throw new NotificationError(403, 'bot_missing_embed_permissions');
    try {
      const live = automatic ? readLiveNotification(value.live, identity.provider) : undefined;
      const message = renderNotification(config, identity, live);
      const nonce = createHash('sha256')
        .update(`${guildId}:${value.requestId}`)
        .digest('hex')
        .slice(0, 24);
      await rest.post(Routes.channelMessages(config.channelId), {
        body: { ...message, nonce, enforce_nonce: true },
      });
      return { status: 'sent' as const };
    } catch (error) {
      safeError(error, true);
    }
  }
  return {
    async health() {
      try {
        const value = await rest.get(Routes.user('@me'));
        if (!isDiscordId(object(value).id))
          throw new NotificationError(503, 'discord_invalid_response');
        return { status: 'ok' as const };
      } catch (error) {
        safeError(error);
      }
    },
    targets,
    sendTest: (guildId: string, input: unknown) => send(guildId, input),
    sendLive: (guildId: string, input: unknown) => send(guildId, input, true),
  };
}
export type BotNotifications = ReturnType<typeof createBotNotifications>;
