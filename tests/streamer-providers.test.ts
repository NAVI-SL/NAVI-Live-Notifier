import { describe, expect, it, vi } from 'vitest';
import { streamerInput } from '../apps/web/src/lib/streamer-input';
import { createStreamerProviders } from '../apps/web/src/lib/streamer-providers';
const youtubeId = 'UC' + 'a'.repeat(22);
const youtubeResponse = () =>
  Response.json({ items: [{ id: youtubeId, snippet: { title: 'Public channel' } }] });
describe('official streamer input resolution', () => {
  it('honors a provider Retry-After longer than one day', async () => {
    let clock = Date.now();
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({}, { status: 429, headers: { 'retry-after': '172800' } }),
    );
    const providers = createStreamerProviders(
      { YOUTUBE_API_KEY: 'synthetic-key' },
      fetcher,
      () => clock,
    );
    await expect(providers.resolve('youtube', '@tester')).rejects.toMatchObject({
      retryAfter: 172800,
    });
    clock += 86401 * 1000;
    await expect(providers.resolve('youtube', '@tester')).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('classifies HTTP 400 Kick invalid_client without exposing credentials', async () => {
    const providers = createStreamerProviders(
      { KICK_CLIENT_ID: 'synthetic', KICK_CLIENT_SECRET: 'private-sentinel' },
      async () => Response.json({ error: 'invalid_client' }, { status: 400 }),
    );
    await expect(providers.resolve('kick', 'tester')).rejects.toMatchObject({
      code: 'platform_credentials_rejected',
    });
  });
  it.each([
    '@channel',
    'channel',
    'https://youtube.com/@channel',
    'https://www.youtube.com/@channel/',
    'https://youtube.com/@%E6%97%A5%E6%9C%AC%E8%AA%9E',
  ])('accepts YouTube handles %s', (input) => {
    expect(streamerInput('youtube', input).filter).toBe('forHandle');
  });
  it('uses stable YouTube IDs without search', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => youtubeResponse());
    const result = await createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, fetcher).resolve(
      'youtube',
      `https://youtube.com/channel/${youtubeId}`,
    );
    expect(result.externalId).toBe(youtubeId);
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/youtube/v3/channels');
    expect(url.searchParams.get('id')).toBe(youtubeId);
    expect(url.searchParams.has('forHandle')).toBe(false);
    expect(result).not.toHaveProperty('key');
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ redirect: 'error', cache: 'no-store' });
  });
  it('resolves a YouTube handle through forHandle and retains the original identifier', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => youtubeResponse());
    const result = await createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, fetcher).resolve(
      'youtube',
      'https://youtube.com/@channel',
    );
    expect(result).toMatchObject({
      externalId: youtubeId,
      userIdentifier: 'https://youtube.com/@channel',
    });
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.searchParams.get('forHandle')).toBe('channel');
    expect(url.searchParams.has('id')).toBe(false);
  });
  it.each(['tester', 'https://kick.com/Tester/', 'www.kick.com/tester'])(
    'normalizes Kick usernames %s',
    (input) => {
      expect(streamerInput('kick', input)).toMatchObject({ identifier: 'tester', filter: 'slug' });
    },
  );
  it.each([
    ['youtube', ''],
    ['youtube', 'https://youtube.com/watch?v=test'],
    ['youtube', 'https://youtube.com/c/channel'],
    ['youtube', 'http://youtube.com/@channel'],
    ['youtube', 'https://youtube.com.evil.test/@channel'],
    ['youtube', 'https://user:secret@youtube.com/@channel'],
    ['youtube', 'https://youtube.com:8080/@channel'],
    ['youtube', 'https://127.0.0.1/@channel'],
    ['youtube', '@bad handle'],
    ['youtube', 'https://youtube.com/@%2Fsecret'],
    ['youtube', 'https://youtube.com/@%GG'],
    ['kick', 'https://kick.com/user/videos'],
    ['kick', '@tester'],
    ['kick', 'https://evil.test/user'],
    ['kick', 'a'.repeat(26)],
    ['kick', 'user?x=1'],
    ['other', 'tester'],
  ])('rejects malformed, unsupported and SSRF input %s %s', (platform, input) => {
    expect(() => streamerInput(platform, input)).toThrow();
  });
  it('resolves Kick through app authorization, retains int64 digits, and caches the token', async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url).includes('oauth/token')
        ? Response.json({ access_token: 'app-secret', expires_in: 3600 })
        : new Response('{"data":[{"broadcaster_user_id":9223372036854775807,"slug":"tester"}]}'),
    );
    const providers = createStreamerProviders(
      { KICK_CLIENT_ID: 'client', KICK_CLIENT_SECRET: 'secret' },
      fetcher,
    );
    const result = await providers.resolve('kick', 'tester');
    await providers.resolve('kick', 'https://kick.com/tester');
    expect(result).toMatchObject({
      externalId: '9223372036854775807',
      displayName: 'tester',
      canonicalUrl: 'https://kick.com/tester',
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]![0]).toBe('https://id.kick.com/oauth/token');
    expect(String(fetcher.mock.calls[0]![1]!.body)).toContain('grant_type=client_credentials');
    expect(fetcher.mock.calls[1]![0]).toBe('https://api.kick.com/public/v1/channels?slug=tester');
    expect(fetcher.mock.calls[1]![1]!.headers).toEqual({ Authorization: 'Bearer app-secret' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('refreshes once after rejected app authentication', async () => {
    let calls = 0;
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (String(url).includes('oauth/token')) {
        calls++;
        return Response.json({ access_token: 'token' + calls, expires_in: 3600 });
      }
      return calls === 1
        ? new Response('', { status: 401 })
        : Response.json({ data: [{ broadcaster_user_id: 123, slug: 'tester' }] });
    });
    const providers = createStreamerProviders(
      { KICK_CLIENT_ID: 'id', KICK_CLIENT_SECRET: 'secret' },
      fetcher,
    );
    await expect(providers.resolve('kick', 'tester')).resolves.toMatchObject({ externalId: '123' });
    expect(calls).toBe(2);
  });
  it('handles missing credentials without an HTTP call', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const providers = createStreamerProviders({}, fetcher);
    await expect(providers.resolve('youtube', '@channel')).rejects.toMatchObject({
      code: 'youtube_not_configured',
    });
    await expect(providers.resolve('kick', 'tester')).rejects.toMatchObject({
      code: 'kick_not_configured',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('coalesces simultaneous Kick app token requests and renews an expired token', async () => {
    let now = 0;
    let exchanges = 0;
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (String(url).includes('oauth/token')) {
        exchanges++;
        await Promise.resolve();
        return Response.json({ access_token: 'token-' + exchanges, expires_in: 60 });
      }
      return Response.json({ data: [{ broadcaster_user_id: 123, slug: 'tester' }] });
    });
    const providers = createStreamerProviders(
      { KICK_CLIENT_ID: 'id', KICK_CLIENT_SECRET: 'secret' },
      fetcher,
      () => now,
    );
    await Promise.all([providers.resolve('kick', 'tester'), providers.resolve('kick', 'tester')]);
    expect(exchanges).toBe(1);
    now = 61000;
    await providers.resolve('kick', 'tester');
    expect(exchanges).toBe(2);
  });
  it.each([
    ['youtube', { items: [] }],
    ['kick', { data: [] }],
  ])('returns not-found for unavailable %s channels', async (platform, response) => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url).includes('oauth/token')
        ? Response.json({ access_token: 'token', expires_in: 3600 })
        : Response.json(response),
    );
    await expect(
      createStreamerProviders(
        { YOUTUBE_API_KEY: 'key', KICK_CLIENT_ID: 'id', KICK_CLIENT_SECRET: 'secret' },
        fetcher,
      ).resolve(platform, 'tester'),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('does not return raw provider errors, honors retry delay and stops repeated calls during cooldown', async () => {
    let now = 0;
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ private: 'credential' }, { status: 429, headers: { 'Retry-After': '120' } }),
    );
    const providers = createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, fetcher, () => now);
    await expect(providers.resolve('youtube', '@channel')).rejects.toMatchObject({
      code: 'platform_rate_limited',
      retryAfter: 120,
    });
    await expect(providers.resolve('youtube', '@channel')).rejects.toMatchObject({
      retryAfter: 120,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = 121000;
    await expect(providers.resolve('youtube', '@channel')).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('handles exhausted quota, malformed data and network errors safely', async () => {
    const quota = createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, async () =>
      Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 }),
    );
    await expect(quota.resolve('youtube', '@tester')).rejects.toMatchObject({
      code: 'youtube_quota_exhausted',
    });
    for (const response of [
      new Response('not JSON'),
      Response.json({ items: [{}] }),
      new Response('x'.repeat(1024 * 1024 + 1)),
    ]) {
      await expect(
        createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, async () => response).resolve(
          'youtube',
          '@tester',
        ),
      ).rejects.toMatchObject({ code: 'platform_invalid_response' });
    }
    await expect(
      createStreamerProviders({ YOUTUBE_API_KEY: 'secret' }, async () => {
        throw new Error('secret');
      }).resolve('youtube', '@tester'),
    ).rejects.toMatchObject({ code: 'platform_unavailable' });
  });
});
