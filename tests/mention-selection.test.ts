import { describe, expect, it } from 'vitest';
import { readNotificationConfig, renderNotification, type NotificationIdentity } from '@navi/core';
import { ids, notificationDiscordFixture } from './notification-fixtures';

const config = {
  channelId: ids.channel,
  roleId: null,
  template: '{streamer} {platform} {title} {url}',
  enabled: true,
};
function data(provider: 'youtube' | 'kick') {
  const identity: NotificationIdentity = {
    provider,
    displayName: 'Channel @everyone',
    canonicalUrl:
      provider === 'youtube'
        ? 'https://www.youtube.com/channel/UC' + 'a'.repeat(22)
        : 'https://kick.com/tester',
  };
  const live = {
    sessionKey: 'abcdefghijk',
    title: 'Title @here <@123>',
    startedAt: '2026-10-18T00:00:00Z',
    url:
      provider === 'youtube'
        ? 'https://www.youtube.com/watch?v=abcdefghijk'
        : 'https://kick.com/tester',
  };
  return { identity, live };
}
describe('single notification mention selection', () => {
  it('normalizes old mixed preferences and rejects a forged everyone role ID or template mention', () => {
    expect(readNotificationConfig({ ...config, roleId: ids.role, mentionEveryone: true })).toEqual({
      ...config,
      mentionEveryone: true,
    });
    expect(() => readNotificationConfig({ ...config, roleId: 'everyone' })).toThrow(
      'invalid_notification_settings',
    );
    for (const template of ['@everyone', '@here', '<@&' + ids.role + '>'])
      expect(() => readNotificationConfig({ ...config, template })).toThrow(
        'invalid_notification_template',
      );
  });
  it.each(['youtube', 'kick'] as const)(
    'renders only the selected mention for automatic %s messages',
    (provider) => {
      const { identity, live } = data(provider);
      for (const choice of [
        { ...config },
        { ...config, roleId: ids.role },
        { ...config, roleId: ids.role, mentionEveryone: true },
      ]) {
        const message = renderNotification(choice, identity, live);
        const everyone = 'mentionEveryone' in choice && choice.mentionEveryone === true;
        expect(message.allowed_mentions).toEqual({
          parse: everyone ? ['everyone'] : [],
          roles: !everyone && choice.roleId ? [choice.roleId] : [],
          users: [],
          replied_user: false,
        });
        expect(message.content.match(/@everyone/g)?.length ?? 0).toBe(everyone ? 1 : 0);
        expect(message.content.match(/<@&\d+>/g)?.length ?? 0).toBe(
          !everyone && choice.roleId ? 1 : 0,
        );
        expect(message.content).not.toContain('@here');
        expect(message.content).toContain(live.url);
      }
    },
  );
  it.each(['youtube', 'kick'] as const)(
    'revalidates %s everyone permission at send time and never falls back to a role',
    async (provider) => {
      const fixture = notificationDiscordFixture();
      const input = {
        ...data(provider),
        config: { ...config, roleId: ids.role, mentionEveryone: true },
        requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      };
      await expect(fixture.bot.sendLive(ids.guild, input)).rejects.toMatchObject({
        code: 'everyone_mention_not_permitted',
      });
      expect(fixture.rest.post).not.toHaveBeenCalled();
      fixture.state.canMentionEveryone = true;
      await fixture.bot.sendLive(ids.guild, input);
      expect(fixture.rest.post).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            allowed_mentions: { parse: ['everyone'], roles: [], users: [], replied_user: false },
            enforce_nonce: true,
          }),
        }),
      );
      fixture.state.canMentionEveryone = false;
      await expect(fixture.bot.sendLive(ids.guild, input)).rejects.toMatchObject({
        code: 'everyone_mention_not_permitted',
      });
      expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    },
  );
});
