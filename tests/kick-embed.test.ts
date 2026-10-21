import { describe, expect, it } from 'vitest';
import {
  readLiveNotification,
  readNotificationConfig,
  renderNotification,
  renderKickPreview,
  kickImageUrl,
} from '@navi/core';
import { notificationDiscordFixture, ids } from './notification-fixtures';
const identity = {
  provider: 'kick' as const,
  displayName: 'Saved name',
  canonicalUrl: 'https://kick.com/navi-gaming',
};
const config = {
  channelId: ids.channel,
  roleId: null,
  enabled: true,
  template: '{streamer} is live on {platform}!\n{title}\n{url}',
};
const live = {
  sessionKey: '2026-10-18T00:00:00Z',
  startedAt: '2026-10-18T00:00:00Z',
  title: 'Ranked Valorant',
  url: identity.canonicalUrl,
  streamerName: 'Navi_Gaming',
  categoryName: 'VALORANT',
  thumbnailUrl: 'https://images.kick.com/video_thumbnails/stream.webp',
  profileImageUrl: 'https://files.kick.com/images/user/avatar.png',
  categoryImageUrl: 'https://files.kick.com/images/subcategories/valorant.jpg',
};
describe('Kick rich live notification', () => {
  it('matches the reference layout with current title, profile, cover, thumbnail, branding and link buttons', () => {
    const message = renderNotification(config, identity, readLiveNotification(live, 'kick'));
    expect(message.content).toContain('Navi_Gaming is live on Kick!');
    expect(message.flags).toBe(0);
    expect(message.embeds).toEqual([
      {
        color: 0x53fc18,
        author: { name: '🔴 [LIVE] Navi_Gaming', url: live.url, icon_url: live.profileImageUrl },
        url: live.url,
        description: '**Stream title:** Ranked Valorant',
        fields: [{ name: 'Category', value: 'VALORANT', inline: false }],
        thumbnail: { url: live.categoryImageUrl },
        image: { url: live.thumbnailUrl },
        footer: { text: 'Kick • Live' },
      },
    ]);
    const buttons = message.components![0]!.components;
    expect(buttons.map((b) => b.label)).toEqual(['Watch on Kick', 'Watch Stream']);
    expect(
      buttons.every(
        (b) => b.type === 2 && b.style === 5 && b.url === live.url && !('custom_id' in b),
      ),
    ).toBe(true);
  });
  it('falls back cleanly for legacy live payloads and unavailable optional images/category', () => {
    const minimal = {
      sessionKey: live.sessionKey,
      startedAt: live.startedAt,
      title: live.title,
      url: live.url,
    };
    const message = renderNotification(config, identity, readLiveNotification(minimal, 'kick'));
    expect(message.embeds?.[0]).toMatchObject({
      author: { name: '🔴 [LIVE] Saved name' },
      fields: [{ name: 'Category', value: 'Category unavailable', inline: false }],
    });
    expect(message.embeds?.[0]?.image).toBeUndefined();
    expect(message.embeds?.[0]?.thumbnail).toBeUndefined();
    expect(message.components).toHaveLength(1);
  });
  it.each([
    'http://images.kick.com/a.jpg',
    'https://images.kick.com.evil.example/a.jpg',
    'https://127.0.0.1/a.jpg',
    'https://user:secret@files.kick.com/a.jpg',
    'javascript:alert(1)',
    'https://images.kick.com:444/a.jpg',
    'https://unknown.example/a.jpg',
  ])('omits unsafe or unsupported artwork without losing the alert: %s', (url) => {
    expect(kickImageUrl(url)).toBeUndefined();
    const safe = readLiveNotification(
      { ...live, thumbnailUrl: url, profileImageUrl: url, categoryImageUrl: url },
      'kick',
    );
    expect(safe.thumbnailUrl).toBeUndefined();
    expect(safe.profileImageUrl).toBeUndefined();
    expect(safe.categoryImageUrl).toBeUndefined();
    expect(renderNotification(config, identity, safe).embeds).toHaveLength(1);
  });
  it('retains configured mention exclusivity and escapes unsafe stream metadata', () => {
    const unsafe = readLiveNotification(
      {
        ...live,
        title: '@everyone <@123> **title**',
        categoryName: '@here [x](https://evil.example)',
        streamerName: '@everyone',
      },
      'kick',
    );
    for (const choice of [
      config,
      { ...config, roleId: ids.role },
      { ...config, roleId: ids.role, mentionEveryone: true },
    ]) {
      const message = renderNotification(readNotificationConfig(choice), identity, unsafe);
      const everyone = 'mentionEveryone' in choice;
      expect(message.allowed_mentions).toEqual({
        parse: everyone ? ['everyone'] : [],
        roles: !everyone && choice.roleId ? [choice.roleId] : [],
        users: [],
        replied_user: false,
      });
      expect(message.content.match(/@everyone/g)?.length ?? 0).toBe(everyone ? 1 : 0);
      expect(JSON.stringify(message.embeds)).not.toContain('@everyone');
      expect(JSON.stringify(message.embeds)).not.toContain('@here');
    }
  });
  it('builds a labelled dashboard sample with configured text but no mention parsing or send', () => {
    const message = renderKickPreview(
      { ...config, mentionEveryone: true, roleId: ids.role },
      identity,
    );
    expect(message.content).toContain('[NAVI PREVIEW — SAMPLE DATA]');
    expect(message.content).toContain('Saved name is live on Kick!');
    expect(message.content).not.toContain('@everyone');
    expect(message.allowed_mentions).toEqual({
      parse: [],
      roles: [],
      users: [],
      replied_user: false,
    });
    expect(message.embeds?.[0]?.fields?.[0]?.value).toBe('VALORANT');
  });
  it('requires Embed Links before an automatic Kick send and keeps tests plain and mention-safe', async () => {
    const fixture = notificationDiscordFixture();
    const payload = { identity, live, config, requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
    fixture.state.canEmbed = false;
    await expect(fixture.bot.sendLive(ids.guild, payload)).rejects.toMatchObject({
      code: 'bot_missing_embed_permissions',
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
    fixture.state.canMentionEveryone = true;
    await fixture.bot.sendTest(ids.guild, {
      ...payload,
      config: { ...config, mentionEveryone: true },
    });
    expect(fixture.rest.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          flags: 4,
          content: expect.not.stringContaining('@everyone'),
          allowed_mentions: expect.objectContaining({ parse: [], roles: [] }),
        }),
      }),
    );
    fixture.state.canEmbed = true;
    await fixture.bot.sendLive(ids.guild, payload);
    expect(fixture.rest.post).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          enforce_nonce: true,
          embeds: [expect.objectContaining({ color: 0x53fc18 })],
        }),
      }),
    );
  });
  it('rejects arbitrary livestream button destinations', () => {
    expect(() =>
      readLiveNotification({ ...live, url: 'https://evil.example/watch' }, 'kick'),
    ).toThrow('invalid_live_notification');
  });
});
