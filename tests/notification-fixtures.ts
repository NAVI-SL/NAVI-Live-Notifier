import { vi } from 'vitest';
import { NotificationError } from '@navi/core';
import { createBotNotifications } from '../apps/bot/src/notifications';
export const ids = {
  guild: '111111111111111111',
  otherGuild: '222222222222222222',
  bot: '333333333333333333',
  channel: '444444444444444444',
  otherChannel: '555555555555555555',
  role: '666666666666666666',
  botRole: '777777777777777777',
};
export function notificationDiscordFixture() {
  const state = {
    writable: true,
    mentionable: true,
    installed: true,
    failSend: false,
    canEmbed: true,
    canMentionEveryone: false,
  };
  const rest = {
    get: vi.fn(async (path: string) => {
      if (path === '/users/@me') return { id: ids.bot };
      if (!state.installed) throw new NotificationError(409, 'bot_not_installed');
      const guild = path.includes(ids.otherGuild) ? ids.otherGuild : ids.guild;
      if (path.endsWith('/channels'))
        return [
          {
            id: ids.channel,
            guild_id: guild,
            name: 'youtube-live',
            type: 0,
            permission_overwrites: state.writable
              ? []
              : [{ id: guild, type: 0, allow: '0', deny: '2048' }],
          },
          {
            id: ids.otherChannel,
            guild_id: guild,
            name: 'kick-live',
            type: 0,
            permission_overwrites: [],
          },
          {
            id: '888888888888888888',
            guild_id: guild,
            name: 'voice',
            type: 2,
            permission_overwrites: [],
          },
        ];
      if (path.endsWith('/roles'))
        return [
          {
            id: guild,
            name: '@everyone',
            permissions: String(
              3072 + (state.canEmbed ? 16384 : 0) + (state.canMentionEveryone ? 131072 : 0),
            ),
            mentionable: true,
            managed: false,
          },
          {
            id: ids.role,
            name: 'Stream alerts',
            permissions: '0',
            mentionable: state.mentionable,
            managed: false,
          },
          {
            id: ids.botRole,
            name: 'Managed bot',
            permissions: '0',
            mentionable: true,
            managed: true,
          },
        ];
      if (path.includes('/members/')) return { roles: [], communication_disabled_until: null };
      return { id: guild };
    }),
    post: vi.fn(async () => {
      if (state.failSend) throw new Error('private-bot-token');
      return { id: '999999999999999999' };
    }),
  };
  return { state, rest, bot: createBotNotifications(rest) };
}
