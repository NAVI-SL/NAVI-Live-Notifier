import { describe, expect, it } from 'vitest';
import { DiscordAPIError, RateLimitError } from 'discord.js';
import { createServer } from 'node:net';
import {
  readNotificationConfig,
  renderNotification,
  validateNotificationTarget,
  DEFAULT_NOTIFICATION_TEMPLATE,
} from '@navi/core';
import { canPost } from '../apps/bot/src/notifications';
import { createStatusHandler, startStatusServer } from '../apps/bot/src/status-server';
import { ids, notificationDiscordFixture } from './notification-fixtures';
const config = {
  channelId: ids.channel,
  roleId: null,
  template: DEFAULT_NOTIFICATION_TEMPLATE,
  enabled: false,
};
describe('notification templates and mention safety', () => {
  it.each([
    '',
    'a'.repeat(1501),
    '@everyone live!',
    '@here',
    '<@12345678901234567>',
    '<@&12345678901234567>',
    '{unknown}',
    '{{streamer}}',
    '{title',
    '\u0000bad',
  ])('rejects unsafe or invalid template %s', (template) => {
    expect(() => readNotificationConfig({ ...config, template })).toThrow();
  });
  it('accepts only typed settings and documented variables', () => {
    expect(readNotificationConfig(config)).toEqual(config);
    for (const input of [
      { ...config, enabled: 'true' },
      { ...config, channelId: 'bad' },
      { ...config, roleId: ids.role + 'x' },
      null,
    ])
      expect(() => readNotificationConfig(input)).toThrow();
  });
  it('neutralizes interpolated mentions, allows only the selected role, and caps content without splitting Unicode', () => {
    const rendered = renderNotification(
      { ...config, roleId: ids.role, template: '{streamer} {platform} {title} {url}' },
      {
        provider: 'kick',
        displayName: '@everyone <@&' + ids.botRole + '>',
        canonicalUrl: 'https://kick.com/tester',
      },
    );
    expect(rendered.content).toContain('[NAVI TEST — SAMPLE DATA]');
    expect(rendered.content).toContain(`\n<@&${ids.role}> `);
    expect(rendered.content).not.toContain('@everyone');
    expect(rendered.content).not.toContain(`<@&${ids.botRole}>`);
    expect(rendered.allowed_mentions).toEqual({
      parse: [],
      roles: [ids.role],
      users: [],
      replied_user: false,
    });
    expect(rendered.flags).toBe(4);
    const long = renderNotification(
      { ...config, template: '{streamer}'.repeat(100) },
      {
        provider: 'youtube',
        displayName: '😀'.repeat(150),
        canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
      },
    );
    expect(long.content.length).toBeLessThanOrEqual(2000);
    expect([...long.content].at(-1)).toBe('😀');
  });
});
describe('fresh Discord destination permission checks', () => {
  it.each([
    [403, 50013, 'bot_missing_permissions'],
    [403, 50001, 'bot_missing_permissions'],
    [404, 10003, 'notification_channel_unavailable'],
    [404, 10011, 'notification_role_unavailable'],
    [404, 10004, 'bot_not_installed'],
    [400, 50035, 'discord_request_rejected'],
    [500, 0, 'test_delivery_uncertain'],
  ] as const)(
    'translates SDK POST error %s/%s to %s without leaking raw errors',
    async (status, code, expected) => {
      const fixture = notificationDiscordFixture();
      fixture.rest.post.mockImplementationOnce(async () => {
        throw new DiscordAPIError(
          { message: 'RAW_PRIVATE_ERROR', code },
          code,
          status,
          'POST',
          'https://discord.com/api/v10/channels/test/messages',
          { body: {} },
        );
      });
      await expect(
        fixture.bot.sendTest(ids.guild, {
          config,
          identity: {
            provider: 'kick',
            displayName: 'Test',
            canonicalUrl: 'https://kick.com/test',
          },
          requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        }),
      ).rejects.toMatchObject({ code: expected, message: expected });
    },
  );
  it('preserves SDK rate-limit retry timing without posting or exposing its URL', async () => {
    const fixture = notificationDiscordFixture();
    fixture.rest.get.mockRejectedValueOnce(
      new RateLimitError({
        timeToReset: 1501,
        retryAfter: 1501,
        limit: 1,
        method: 'GET',
        hash: 'test',
        url: 'https://discord.com/private',
        route: '/users/@me',
        majorParameter: 'global',
        global: false,
        sublimitTimeout: 0,
        scope: 'shared',
      }),
    );
    await expect(fixture.bot.targets(ids.guild)).rejects.toMatchObject({
      status: 429,
      code: 'discord_rate_limited',
      retryAfter: 2,
      message: 'discord_rate_limited',
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
  it.each(['{', 'x'.repeat(12001)])(
    'rejects malformed/oversized authenticated broker JSON',
    async (body) => {
      const fixture = notificationDiscordFixture(),
        secret = 's'.repeat(40);
      const handler = createStatusHandler(secret, async () => 'installed', fixture.bot);
      const response = await handler(
        new Request(`http://localhost/internal/guilds/${ids.guild}/test-notification`, {
          method: 'POST',
          headers: { authorization: `Bearer ${secret}` },
          body,
        }),
      );
      expect(response.status).toBe(body.length > 12000 ? 413 : 400);
      expect(fixture.rest.post).not.toHaveBeenCalled();
    },
  );
  it('forwards authenticated POST JSON through the real loopback HTTP adapter', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const address = probe.address();
    if (!address || typeof address === 'string') throw new Error('No loopback port');
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const fixture = notificationDiscordFixture(),
      secret = 's'.repeat(40);
    const stop = await startStatusServer(port, secret, async () => 'installed', fixture.bot);
    try {
      const url = `http://127.0.0.1:${port}/internal/guilds/${ids.guild}/test-notification`;
      expect((await fetch(url, { method: 'POST', body: '{}' })).status).toBe(401);
      const result = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          identity: {
            provider: 'kick',
            displayName: 'Test',
            canonicalUrl: 'https://kick.com/test',
          },
          requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        }),
      });
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual({ status: 'sent' });
      const oversized = 'x'.repeat(12001);
      expect((await fetch(url, { method: 'POST', body: oversized })).status).toBe(401);
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { authorization: `Bearer ${secret}` },
            body: oversized,
          })
        ).status,
      ).toBe(413);
      expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    } finally {
      await stop();
    }
  });
  it('applies everyone, combined role and member overwrites in Discord order', () => {
    const roles = [
      { id: ids.guild, permissions: '3072', name: 'everyone', mentionable: false, managed: false },
      { id: ids.role, permissions: '0', name: 'role', mentionable: true, managed: false },
    ];
    const channel = {
      id: ids.channel,
      name: 'live',
      type: 0,
      permission_overwrites: [{ id: ids.guild, type: 0, deny: '2048', allow: '0' }],
    };
    expect(canPost(ids.guild, ids.bot, [], roles, channel)).toBe(false);
    channel.permission_overwrites.push({ id: ids.role, type: 0, deny: '0', allow: '2048' });
    expect(canPost(ids.guild, ids.bot, [ids.role], roles, channel)).toBe(true);
    channel.permission_overwrites.push({ id: ids.bot, type: 1, deny: '1024', allow: '0' });
    expect(canPost(ids.guild, ids.bot, [ids.role], roles, channel)).toBe(false);
    expect(canPost(ids.guild, ids.bot, [], [{ ...roles[0]!, permissions: '8' }], channel)).toBe(
      true,
    );
    expect(canPost(ids.guild, ids.bot, [], roles, { ...channel, type: 5 })).toBe(false);
    expect(canPost(ids.guild, ids.bot, [], roles, channel, true)).toBe(false);
  });
  it('lists only writable ordinary text channels and mentionable unmanaged non-everyone roles', async () => {
    const fixture = notificationDiscordFixture();
    fixture.state.writable = false;
    expect(await fixture.bot.targets(ids.guild)).toEqual({
      channels: [{ id: ids.otherChannel, name: 'kick-live', canEmbed: true }],
      roles: [{ id: ids.role, name: 'Stream alerts' }],
    });
    expect(() =>
      validateNotificationTarget(
        { ...config, channelId: ids.channel },
        { channels: [], roles: [] },
      ),
    ).toThrow('notification_channel_unavailable');
  });
  it('rechecks permissions and roles on every send and never posts to forged destinations', async () => {
    const fixture = notificationDiscordFixture();
    const identity = {
      provider: 'youtube',
      displayName: 'Channel',
      canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
    };
    const payload = {
      config: { ...config, roleId: ids.role },
      identity,
      requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    };
    await fixture.bot.sendTest(ids.guild, payload);
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
    fixture.state.mentionable = false;
    await expect(fixture.bot.sendTest(ids.guild, payload)).rejects.toMatchObject({
      code: 'notification_role_unavailable',
    });
    fixture.state.mentionable = true;
    fixture.state.writable = false;
    await expect(fixture.bot.sendTest(ids.guild, payload)).rejects.toMatchObject({
      code: 'notification_channel_unavailable',
    });
    fixture.state.writable = true;
    await expect(
      fixture.bot.sendTest(ids.guild, {
        ...payload,
        config: { ...config, channelId: '999999999999999999' },
      }),
    ).rejects.toMatchObject({ code: 'notification_channel_unavailable' });
    expect(fixture.rest.post).toHaveBeenCalledTimes(1);
  });
  it('authenticates internal routes and posts a labelled, nonce-protected message without credentials in the response', async () => {
    const fixture = notificationDiscordFixture(),
      secret = 's'.repeat(40),
      handler = createStatusHandler(secret, async () => 'installed', fixture.bot);
    const url = `http://localhost/internal/guilds/${ids.guild}/test-notification`;
    expect((await handler(new Request(url, { method: 'POST', body: '{}' }))).status).toBe(401);
    const result = await handler(
      new Request(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          config: { ...config, roleId: ids.role },
          identity: {
            provider: 'kick',
            displayName: 'Tester',
            canonicalUrl: 'https://kick.com/tester',
          },
          requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        }),
      }),
    );
    expect(await result.json()).toEqual({ status: 'sent' });
    const call = fixture.rest.post.mock.calls[0] as unknown as [
      string,
      {
        body: { content: string; allowed_mentions: unknown; nonce: string; enforce_nonce: boolean };
      },
    ];
    expect(call[0]).toBe(`/channels/${ids.channel}/messages`);
    expect(call[1].body.content).toContain('NAVI TEST');
    expect(call[1].body.enforce_nonce).toBe(true);
    expect(call[1].body.nonce.length).toBeLessThanOrEqual(25);
    expect(JSON.stringify(call[1].body.allowed_mentions)).not.toContain('everyone');
  });
});
