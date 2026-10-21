import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReadCache } from '@navi/core';
import { discordRateLog, discordRetrySeconds } from '@navi/core/discord-rate';
import { discordGuilds } from '../apps/web/src/lib/discord';
import { notificationDiscordFixture, ids } from './notification-fixtures';
import { RateLimitError } from 'discord.js';
import { createStatusHandler } from '../apps/bot/src/status-server';

afterEach(() => vi.useRealTimers());
describe('Discord request sharing and safe cooldowns', () => {
  it('shares pending reads, expires display values, refreshes permissions and drops failures', async () => {
    let now = 0;
    const read = createReadCache<{ allowed: boolean }>(5000, () => now);
    let resolve!: (value: { allowed: boolean }) => void;
    const load = vi.fn(
      () =>
        new Promise<{ allowed: boolean }>((done) => {
          resolve = done;
        }),
    );
    const first = read('guild', load),
      second = read('guild', load, true);
    await Promise.resolve();
    resolve({ allowed: true });
    expect(await first).toEqual(await second);
    expect(load).toHaveBeenCalledTimes(1);
    const denied = vi.fn(async () => ({ allowed: false }));
    expect(await read('guild', denied)).toEqual({ allowed: true });
    expect(await read('guild', denied, true)).toEqual({ allowed: false });
    now = 6000;
    await read('guild', denied);
    expect(denied).toHaveBeenCalledTimes(2);
    await expect(
      read(
        'guild',
        async () => {
          throw new Error('network');
        },
        true,
      ),
    ).rejects.toThrow();
    await read('guild', denied);
    expect(denied).toHaveBeenCalledTimes(3);
  });
  it('isolates tokens and refreshes revoked guild permissions despite a display cache', async () => {
    let permitted = true;
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json([
        {
          id: ids.guild,
          name: 'Test',
          icon: null,
          owner: false,
          permissions: permitted ? '32' : '0',
        },
      ]),
    );
    await Promise.all([discordGuilds('FIRST_FAKE', fetcher), discordGuilds('FIRST_FAKE', fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    permitted = false;
    expect((await discordGuilds('FIRST_FAKE', fetcher))[0]!.permissions).toBe('32');
    expect((await discordGuilds('FIRST_FAKE', fetcher, { fresh: true }))[0]!.permissions).toBe('0');
    await discordGuilds('SECOND_FAKE', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('coalesces a global 429 and respects decimal delay with no stale authorization fallback', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { retry_after: 3.2, global: true },
        { status: 429, headers: { 'Retry-After': '3.2', 'X-RateLimit-Bucket': 'FAKE_SECRET' } },
      ),
    );
    await Promise.all([
      expect(discordGuilds('LIMITED_FAKE', fetcher)).rejects.toMatchObject({
        status: 429,
        retryAfter: 4,
      }),
      expect(discordGuilds('LIMITED_FAKE', fetcher)).rejects.toMatchObject({ status: 429 }),
    ]);
    await expect(discordGuilds('LIMITED_FAKE', fetcher, { fresh: true })).rejects.toMatchObject({
      status: 429,
      retryAfter: 4,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_SECRET');
    expect(JSON.parse(String(log.mock.calls[0]![0]))).toMatchObject({
      endpoint: '/users/@me/guilds',
      global: true,
      status: 429,
    });
    await vi.advanceTimersByTimeAsync(4000);
    await expect(discordGuilds('LIMITED_FAKE', fetcher)).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('paces fresh reads until an exhausted successful bucket resets without a retry loop', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json([], {
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset-After': '2.1' },
      }),
    );
    await discordGuilds('EXHAUSTED_FAKE', fetcher);
    await discordGuilds('EXHAUSTED_FAKE', fetcher);
    const pending = discordGuilds('EXHAUSTED_FAKE', fetcher, { fresh: true });
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    await pending;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('caches display targets but rechecks revoked permissions before any Discord POST', async () => {
    const fixture = notificationDiscordFixture();
    await Promise.all([fixture.bot.targets(ids.guild), fixture.bot.targets(ids.guild)]);
    expect(fixture.rest.get).toHaveBeenCalledTimes(5);
    await fixture.bot.targets(ids.guild);
    expect(fixture.rest.get).toHaveBeenCalledTimes(5);
    fixture.state.writable = false;
    expect(
      (await fixture.bot.targets(ids.guild, true)).channels.some((c) => c.id === ids.channel),
    ).toBe(false);
    await expect(
      fixture.bot.sendTest(ids.guild, {
        requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        identity: {
          provider: 'youtube',
          displayName: 'Test',
          canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
        },
        config: { channelId: ids.channel, roleId: null, template: '{url}', enabled: true },
      }),
    ).rejects.toMatchObject({ code: 'notification_channel_unavailable' });
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
  it('returns a long advertised reset without holding a request or calling Discord again', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json([], {
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset-After': '60.1' },
      }),
    );
    await discordGuilds('LONG_WAIT_FAKE', fetcher);
    await expect(discordGuilds('LONG_WAIT_FAKE', fetcher, { fresh: true })).rejects.toMatchObject({
      status: 429,
      retryAfter: 61,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('uses the longest SDK retry/sublimit/global delay rather than a zero bucket reset', async () => {
    const fixture = notificationDiscordFixture();
    fixture.rest.get.mockRejectedValueOnce(
      new RateLimitError({
        global: true,
        hash: 'test',
        limit: 1,
        majorParameter: 'global',
        method: 'GET',
        retryAfter: 4000,
        route: '/guilds/:id/channels',
        scope: 'global',
        sublimitTimeout: 9000,
        timeToReset: 0,
        url: 'https://discord.com/api/v10/guilds/1/channels',
      }),
    );
    await expect(fixture.bot.targets(ids.guild)).rejects.toMatchObject({
      status: 429,
      retryAfter: 9,
    });
  });
  it('logs route templates and bucket fingerprints without credentials or external URLs', () => {
    expect(discordRetrySeconds('1.1')).toBe(2);
    expect(discordRateLog('web', '/oauth2/token', 429, new Headers()).endpoint).toBe(
      '/oauth2/token',
    );
    expect(discordRateLog('bot', '/api/v10/users/@me', 200, new Headers()).endpoint).toBe(
      '/users/@me',
    );
    expect(discordRetrySeconds('invalid', 3.2)).toBe(4);
    expect(discordRetrySeconds('', 3.2)).toBe(4);
    expect(discordRetrySeconds(new Date(5000).toUTCString(), undefined, 1000)).toBe(4);
    const event = discordRateLog(
      'bot',
      `/guilds/${ids.guild}/channels`,
      429,
      new Headers({ 'x-ratelimit-bucket': 'FAKE_SECRET' }),
      2,
      'sdk_bucket',
    );
    expect(event.endpoint).toBe('/guilds/:id/channels');
    expect(discordRateLog('bot', `/users/${ids.guild}`, 200, new Headers()).endpoint).toBe(
      '/users/:id',
    );
    expect(JSON.stringify(event)).not.toContain(ids.guild);
    expect(JSON.stringify(event)).not.toContain('FAKE_SECRET');
    expect(discordRateLog('web', 'https://evil/FAKE_SECRET', 429, new Headers()).endpoint).toBe(
      'other_discord_route',
    );
  });
  it('requires broker authentication for diagnostics', async () => {
    const diagnostics = vi.fn(() => []);
    const handler = createStatusHandler(
      'a'.repeat(32),
      async () => 'installed',
      undefined,
      diagnostics,
    );
    expect(
      (await handler(new Request('http://localhost/internal/discord-diagnostics'))).status,
    ).toBe(401);
    expect(diagnostics).not.toHaveBeenCalled();
    const response = await handler(
      new Request('http://localhost/internal/discord-diagnostics', {
        headers: { Authorization: 'Bearer ' + 'a'.repeat(32) },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
