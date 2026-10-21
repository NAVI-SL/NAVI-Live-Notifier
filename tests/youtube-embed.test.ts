import { describe, expect, it } from 'vitest';
import {
  readNotificationConfig,
  readLiveNotification,
  renderNotification,
  type NotificationConfig,
} from '@navi/core';
import { ids, notificationDiscordFixture } from './notification-fixtures';
import { canPost } from '../apps/bot/src/notifications';
import { PermissionFlagsBits } from 'discord.js';

const identity = {
  provider: 'youtube' as const,
  displayName: 'Navi Gaming',
  canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
};
const live = {
  sessionKey: 'LUxsuJhFXaA',
  title: '[Live] කාලෙකට පස්සේ ආයෙත් Valorant',
  url: 'https://www.youtube.com/watch?v=LUxsuJhFXaA',
  startedAt: '2026-10-18T00:00:00Z',
  thumbnailUrl: 'https://i.ytimg.com/vi/LUxsuJhFXaA/maxresdefault.jpg',
};
const config: NotificationConfig = {
  channelId: ids.channel,
  roleId: null,
  enabled: true,
  template: '{streamer} is live!\n{url}',
};
const payload = (changes = {}) => ({
  config,
  identity,
  live,
  requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ...changes,
});
describe('YouTube rich notifications compared with the provided Discord screenshot', () => {
  it('matches the screenshot content order only after an explicit everyone opt-in', () => {
    const message = renderNotification(
      { ...config, template: '{url}', mentionEveryone: true },
      identity,
      live,
    );
    expect(message.content).toBe(`@everyone\n<${live.url}>`);
    expect(message.allowed_mentions.parse).toEqual(['everyone']);
    expect(message.embeds?.[0]?.description.startsWith('**Navi Gaming**\n\n[🔴')).toBe(true);
  });
  it.each([PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.MentionEveryone])(
    'honors channel overwrites for additional permission %s',
    (permission) => {
      const roles = [
        {
          id: ids.guild,
          name: '@everyone',
          permissions: String(19456n | PermissionFlagsBits.MentionEveryone),
          mentionable: false,
          managed: false,
        },
      ];
      const channel = {
        id: ids.channel,
        name: 'youtube',
        type: 0,
        permission_overwrites: [{ id: ids.bot, type: 1, allow: '0', deny: String(permission) }],
      };
      expect(canPost(ids.guild, ids.bot, [], roles, channel, false, permission)).toBe(false);
      expect(
        canPost(
          ids.guild,
          ids.bot,
          [],
          roles,
          { ...channel, permission_overwrites: [] },
          false,
          permission,
        ),
      ).toBe(true);
    },
  );
  it('renders the red edge, platform, bold channel, linked live title and full image in screenshot order', () => {
    const message = renderNotification(config, identity, live);
    expect(message.content).toBe(`Navi Gaming is live!\n<${live.url}>`);
    expect(message.embeds).toEqual([
      {
        color: 0xff0000,
        author: { name: 'YouTube' },
        description: `**Navi Gaming**\n\n[🔴 \\[Live\\] කාලෙකට පස්සේ ආයෙත් Valorant](${live.url})`,
        image: { url: live.thumbnailUrl },
      },
    ]);
    expect(message.flags & 4).toBe(0);
    expect(message.allowed_mentions.parse).toEqual([]);
  });
  it('uses a same-video fallback for legacy payloads and keeps tests plain while Kick uses its own embed', () => {
    const oldLive = {
      sessionKey: live.sessionKey,
      title: live.title,
      url: live.url,
      startedAt: live.startedAt,
    };
    const message = renderNotification(config, identity, oldLive);
    expect(message.embeds?.[0]?.image?.url).toBe(
      'https://i.ytimg.com/vi/LUxsuJhFXaA/hqdefault.jpg',
    );
    expect(
      renderNotification(
        config,
        { ...identity, provider: 'kick' },
        { ...oldLive, url: 'https://kick.com/tester' },
      ).embeds,
    ).toEqual([expect.objectContaining({ color: 0x53fc18 })]);
    const sample = renderNotification({ ...config, mentionEveryone: true }, identity);
    expect(sample.embeds).toBeUndefined();
    expect(sample.content).toContain('[NAVI TEST');
    expect(sample.content).not.toContain('@everyone');
    expect(sample.allowed_mentions.parse).toEqual([]);
  });
  it('keeps raw mentions and malformed opt-ins blocked and escapes embed metadata', () => {
    for (const mentionEveryone of ['true', 1, null])
      expect(() => readNotificationConfig({ ...config, mentionEveryone })).toThrow();
    expect(readNotificationConfig(config).mentionEveryone).toBeUndefined();
    expect(() =>
      readNotificationConfig({ ...config, template: '@everyone {url}', mentionEveryone: true }),
    ).toThrow();
    const message = renderNotification(
      { ...config, mentionEveryone: true },
      { ...identity, displayName: '@here [x](https://evil.example)' },
      { ...live, title: '@everyone <@123> **x**' },
    );
    expect(message.content.match(/@everyone/g)).toHaveLength(1);
    expect(message.allowed_mentions).toEqual({
      parse: ['everyone'],
      roles: [],
      users: [],
      replied_user: false,
    });
    expect(message.embeds?.[0]?.description).not.toContain('@everyone');
    expect(message.embeds?.[0]?.description).not.toContain('[x](https://evil.example)');
  });
  it.each([
    'http://i.ytimg.com/vi/LUxsuJhFXaA/hqdefault.jpg',
    'https://evil.example/a.jpg',
    'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    'not-a-url',
    'https://user:password@i.ytimg.com/vi/LUxsuJhFXaA/hqdefault.jpg',
  ])('rejects an untrusted or mismatched thumbnail %s', (thumbnailUrl) =>
    expect(() => readLiveNotification({ ...live, thumbnailUrl }, 'youtube')).toThrow(
      'invalid_live_notification',
    ),
  );
  it('checks Embed Links and Mention Everyone before every POST, including permission revocation', async () => {
    const fixture = notificationDiscordFixture();
    const everyone = payload({ config: { ...config, mentionEveryone: true } });
    await expect(fixture.bot.sendLive(ids.guild, everyone)).rejects.toMatchObject({
      code: 'everyone_mention_not_permitted',
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
    fixture.state.canMentionEveryone = true;
    await fixture.bot.sendLive(ids.guild, everyone);
    expect(fixture.rest.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          allowed_mentions: expect.objectContaining({ parse: ['everyone'] }),
          enforce_nonce: true,
          embeds: [expect.objectContaining({ color: 0xff0000 })],
        }),
      }),
    );
    fixture.state.canMentionEveryone = false;
    await expect(fixture.bot.sendLive(ids.guild, everyone)).rejects.toMatchObject({
      code: 'everyone_mention_not_permitted',
    });
    fixture.state.canEmbed = false;
    await expect(fixture.bot.sendLive(ids.guild, payload())).rejects.toMatchObject({
      code: 'bot_missing_embed_permissions',
    });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('never parses everyone on tests and allows explicitly selected everyone on automatic Kick alerts', async () => {
    const fixture = notificationDiscordFixture();
    fixture.state.canMentionEveryone = true;
    await fixture.bot.sendTest(
      ids.guild,
      payload({ config: { ...config, mentionEveryone: true } }),
    );
    expect(fixture.rest.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({ allowed_mentions: expect.objectContaining({ parse: [] }) }),
      }),
    );
    await fixture.bot.sendLive(
      ids.guild,
      payload({
        config: { ...config, mentionEveryone: true },
        identity: { ...identity, provider: 'kick', canonicalUrl: 'https://kick.com/tester' },
        live: { ...live, url: 'https://kick.com/tester', thumbnailUrl: undefined },
      }),
    );
    expect(fixture.rest.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          content: expect.stringContaining('@everyone\n'),
          allowed_mentions: { parse: ['everyone'], roles: [], users: [], replied_user: false },
        }),
      }),
    );
  });
});
