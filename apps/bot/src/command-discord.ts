import { DiscordAPIError, RateLimitError, Routes, type REST } from 'discord.js';
import { CommandError, isDiscordId } from '@navi/core';
import type { CommandDiscordAccess } from './command-processor.js';
import type { BotNotifications } from './notifications.js';
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CommandError('discord_unavailable');
  return value as Record<string, unknown>;
};
function failure(error: unknown): never {
  if (error instanceof CommandError) throw error;
  if (error instanceof RateLimitError)
    throw new CommandError(
      'discord_rate_limited',
      Math.max(
        1,
        Math.ceil(
          Math.max(error.retryAfter ?? 0, error.timeToReset ?? 0, error.sublimitTimeout ?? 0) /
            1000,
        ),
      ),
    );
  if (
    error instanceof DiscordAPIError &&
    [10004, 10007, 50001, 50013].includes(error.code as number)
  )
    throw new CommandError('command_forbidden');
  throw new CommandError('discord_unavailable');
}
/** Uses the existing bot REST instance; no new client, intent or credentials. */
export function createCommandDiscordAccess(
  rest: Pick<REST, 'get'>,
  notifications: BotNotifications,
): CommandDiscordAccess {
  return {
    async status(guildId) {
      try {
        const guild = object(await rest.get(Routes.guild(guildId)));
        if (guild.id !== guildId) throw new CommandError('discord_unavailable');
        return 'installed';
      } catch (error) {
        if (error instanceof DiscordAPIError && [10004, 50001].includes(error.code as number))
          return 'not_installed';
        failure(error);
      }
    },
    async authorize(guildId, requester) {
      try {
        if (!isDiscordId(guildId) || !isDiscordId(requester))
          throw new CommandError('command_forbidden');
        const [guildInput, memberInput, roles] = await Promise.all([
          rest.get(Routes.guild(guildId)),
          rest.get(Routes.guildMember(guildId, requester)),
          rest.get(Routes.guildRoles(guildId)),
        ]);
        const guild = object(guildInput),
          member = object(memberInput);
        if (
          guild.id !== guildId ||
          !isDiscordId(guild.owner_id) ||
          object(member.user).id !== requester ||
          !Array.isArray(member.roles) ||
          !member.roles.every(isDiscordId) ||
          !Array.isArray(roles) ||
          roles.length > 1000
        )
          throw new CommandError('discord_unavailable');
        let bits = 0n;
        const found = new Set<string>();
        for (const input of roles) {
          const role = object(input);
          if (
            !isDiscordId(role.id) ||
            typeof role.permissions !== 'string' ||
            !/^\d{1,30}$/.test(role.permissions)
          )
            throw new CommandError('discord_unavailable');
          found.add(role.id);
          if (role.id === guildId || member.roles.includes(role.id))
            bits |= BigInt(role.permissions);
        }
        if (!found.has(guildId) || !member.roles.every((id) => found.has(id)))
          throw new CommandError('discord_unavailable');
        if (guild.owner_id !== requester && (bits & (8n | 32n)) === 0n)
          throw new CommandError('command_forbidden');
      } catch (error) {
        failure(error);
      }
    },
    targets: (guildId) => notifications.targets(guildId, true),
    sendTest: (guildId, input) => notifications.sendTestWithReceipt(guildId, input),
  };
}
