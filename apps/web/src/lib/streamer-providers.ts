import { isLosslessNumber, parse } from 'lossless-json';
import type { ResolvedStreamer } from '@navi/database';
import { AppError } from './errors';
import { streamerInput } from './streamer-input';

type Credentials = {
  YOUTUBE_API_KEY?: string | undefined;
  KICK_CLIENT_ID?: string | undefined;
  KICK_CLIENT_SECRET?: string | undefined;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
export function createStreamerProviders(
  credentials: Credentials,
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  let kickToken: { value: string; expires: number } | undefined;
  let pendingToken: Promise<string> | undefined;
  const cooldown = { youtube: 0, kick: 0 };
  async function request(url: string, options?: RequestInit) {
    try {
      const response = await fetcher(url, {
        ...options,
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      // Bound the response independently of untrusted Content-Length.
      const reader = response.body?.getReader();
      let size = 0;
      const parts: Uint8Array[] = [];
      if (reader) {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 1024 * 1024) throw new AppError(502, 'platform_invalid_response');
            parts.push(value);
          }
        } finally {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      }
      let body: unknown;
      try {
        body = parse(Buffer.concat(parts).toString('utf8'));
      } catch {
        if (response.ok) throw new AppError(502, 'platform_invalid_response');
      }
      return { response, body: record(body) };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, 'platform_unavailable');
    }
  }
  function check(provider: 'youtube' | 'kick') {
    if (cooldown[provider] > now())
      throw new AppError(
        429,
        'platform_rate_limited',
        Math.ceil((cooldown[provider] - now()) / 1000),
      );
  }
  function failure(
    provider: 'youtube' | 'kick',
    response: Response,
    body: Record<string, unknown>,
  ): never {
    if (response.status === 429) {
      const header = response.headers.get('retry-after');
      const parsed = Number(header);
      const seconds =
        header && Number.isFinite(parsed)
          ? parsed
          : header
            ? (Date.parse(header) - now()) / 1000
            : 60;
      const retry = Math.ceil(Math.max(1, Number.isFinite(seconds) ? seconds : 60));
      cooldown[provider] = now() + retry * 1000;
      throw new AppError(429, 'platform_rate_limited', retry);
    }
    const errors = record(body.error).errors;
    if (
      provider === 'youtube' &&
      Array.isArray(errors) &&
      errors.some((e) => ['quotaExceeded', 'dailyLimitExceeded'].includes(String(record(e).reason)))
    ) {
      cooldown.youtube = now() + 3600_000;
      throw new AppError(429, 'youtube_quota_exhausted', 3600);
    }
    if (response.status === 404) throw new AppError(404, 'streamer_not_found');
    if (
      response.status === 401 ||
      response.status === 403 ||
      body.error === 'invalid_client' ||
      body.error === 'unauthorized_client'
    )
      throw new AppError(503, 'platform_credentials_rejected');
    throw new AppError(503, 'platform_unavailable');
  }
  async function token() {
    if (kickToken && kickToken.expires > now() + 30_000) return kickToken.value;
    if (!credentials.KICK_CLIENT_ID?.trim() || !credentials.KICK_CLIENT_SECRET?.trim())
      throw new AppError(503, 'kick_not_configured');
    pendingToken ??= (async () => {
      const { response, body } = await request('https://id.kick.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: credentials.KICK_CLIENT_ID!,
          client_secret: credentials.KICK_CLIENT_SECRET!,
        }),
      });
      if (!response.ok) failure('kick', response, body);
      const seconds = Number(String(body.expires_in));
      if (
        typeof body.access_token !== 'string' ||
        !body.access_token ||
        !Number.isFinite(seconds) ||
        seconds <= 30 ||
        seconds > 365 * 86400
      )
        throw new AppError(502, 'platform_invalid_response');
      kickToken = { value: body.access_token, expires: now() + seconds * 1000 };
      return kickToken.value;
    })();
    try {
      return await pendingToken;
    } finally {
      pendingToken = undefined;
    }
  }
  return {
    async resolve(provider: unknown, input: unknown): Promise<ResolvedStreamer> {
      const parsed = streamerInput(provider, input);
      check(parsed.provider);
      if (parsed.provider === 'youtube') {
        if (!credentials.YOUTUBE_API_KEY?.trim()) throw new AppError(503, 'youtube_not_configured');
        const url = new URL('https://www.googleapis.com/youtube/v3/channels');
        url.search = new URLSearchParams({
          part: 'snippet',
          [parsed.filter]: parsed.identifier,
          key: credentials.YOUTUBE_API_KEY,
        }).toString();
        const { response, body } = await request(url.toString());
        if (!response.ok) failure('youtube', response, body);
        if (!Array.isArray(body.items)) throw new AppError(502, 'platform_invalid_response');
        if (!body.items.length) throw new AppError(404, 'streamer_not_found');
        const channel = record(body.items[0]),
          snippet = record(channel.snippet);
        if (
          typeof channel.id !== 'string' ||
          !/^UC[A-Za-z0-9_-]{22}$/.test(channel.id) ||
          (parsed.filter === 'id' && channel.id !== parsed.identifier) ||
          typeof snippet.title !== 'string' ||
          !snippet.title.trim() ||
          snippet.title.length > 300
        )
          throw new AppError(502, 'platform_invalid_response');
        return {
          provider: 'youtube',
          externalId: channel.id,
          displayName: snippet.title,
          canonicalUrl: `https://www.youtube.com/channel/${channel.id}`,
          userIdentifier: parsed.userIdentifier,
        };
      }
      const url = new URL('https://api.kick.com/public/v1/channels');
      url.searchParams.set('slug', parsed.identifier);
      let result = await request(url.toString(), {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      if (result.response.status === 401) {
        kickToken = undefined;
        result = await request(url.toString(), {
          headers: { Authorization: `Bearer ${await token()}` },
        });
      }
      if (!result.response.ok) failure('kick', result.response, result.body);
      if (!Array.isArray(result.body.data)) throw new AppError(502, 'platform_invalid_response');
      if (!result.body.data.length) throw new AppError(404, 'streamer_not_found');
      const channel = record(result.body.data[0]);
      const id = isLosslessNumber(channel.broadcaster_user_id)
        ? channel.broadcaster_user_id.toString()
        : channel.broadcaster_user_id;
      if (
        typeof id !== 'string' ||
        !/^[1-9]\d{0,19}$/.test(id) ||
        BigInt(id) > 18446744073709551615n ||
        typeof channel.slug !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,25}$/.test(channel.slug) ||
        channel.slug.toLowerCase() !== parsed.identifier
      )
        throw new AppError(502, 'platform_invalid_response');
      return {
        provider: 'kick',
        externalId: id,
        displayName: channel.slug,
        canonicalUrl: `https://kick.com/${channel.slug}`,
        userIdentifier: parsed.userIdentifier,
      };
    },
  };
}
