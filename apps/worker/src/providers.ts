import { parse, isLosslessNumber } from 'lossless-json';
import type { MonitoringEnvironment } from '@navi/config';
import { readLiveNotification, type LiveNotification } from '@navi/core';
import type { MonitoringRepository, MonitoringSource } from '@navi/database';

export const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
export const items = (x: unknown): unknown[] => {
  if (!Array.isArray(x)) throw new ProviderError('invalid_provider_response');
  return x;
};
export const stableId = (x: unknown) => (isLosslessNumber(x) ? x.toString() : String(x ?? ''));
export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryAfter = 60,
  ) {
    super(code);
  }
}
export async function boundedBody(response: Response, limit = 1024 * 1024) {
  const parts: Uint8Array[] = [];
  let size = 0;
  const reader = response.body?.getReader();
  if (!reader) return '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new ProviderError('provider_body_too_large');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(parts).toString('utf8');
}
export function createMonitoringProviders(
  env: MonitoringEnvironment,
  repo: Pick<MonitoringRepository, 'reserve' | 'block'>,
  fetcher: typeof fetch = fetch,
  now = Date.now,
  log: (event: Record<string, unknown>) => void = (event) => console.info(JSON.stringify(event)),
) {
  let token: { value: string; expires: number } | undefined;
  async function request(
    provider: 'youtube' | 'kick',
    url: string,
    init?: RequestInit,
  ): Promise<Record<string, unknown>> {
    if (
      !(await repo.reserve(provider, provider === 'youtube' ? env.YOUTUBE_DAILY_BUDGET : 100000))
    ) {
      if (provider === 'youtube')
        log({
          event: 'youtube_api',
          endpoint: new URL(url).pathname.split('/').at(-1),
          status: null,
          code: 'provider_budget_or_cooldown',
        });
      throw new ProviderError('provider_budget_or_cooldown', 60);
    }
    let response: Response;
    let text: string;
    try {
      response = await fetcher(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      text = await boundedBody(response);
    } catch {
      if (provider === 'youtube')
        log({
          event: 'youtube_api',
          endpoint: new URL(url).pathname.split('/').at(-1),
          status: null,
          code: 'provider_unavailable',
        });
      throw new ProviderError('provider_unavailable');
    }
    let body: Record<string, unknown> = {};
    try {
      body = record(parse(text));
    } catch {
      if (response.ok) throw new ProviderError('invalid_provider_response');
    }
    if (!response.ok) {
      if (provider === 'kick' && response.status === 401) token = undefined;
      const retry = response.headers.get('retry-after');
      const numeric = retry === null ? NaN : Number(retry);
      const delay = Math.ceil(
        Math.max(
          1,
          Number.isFinite(numeric)
            ? numeric
            : retry && Number.isFinite(Date.parse(retry))
              ? (Date.parse(retry) - now()) / 1000
              : 60,
        ),
      );
      const quota =
        JSON.stringify(body).includes('quotaExceeded') ||
        JSON.stringify(body).includes('dailyLimitExceeded');
      const details = record(body.error).details;
      const badCredentials =
        response.status === 401 ||
        response.status === 403 ||
        body.error === 'invalid_client' ||
        body.error === 'unauthorized_client' ||
        (provider === 'youtube' &&
          Array.isArray(details) &&
          details.some((entry) =>
            ['API_KEY_INVALID', 'API_KEY_EXPIRED'].includes(String(record(entry).reason)),
          ));
      const block = response.status === 429 ? delay : quota ? 3600 : badCredentials ? 900 : 60;
      await repo.block(provider, block);
      if (provider === 'youtube')
        log({
          event: 'youtube_api',
          endpoint: new URL(url).pathname.split('/').at(-1),
          status: response.status,
          code: quota
            ? 'youtube_quota_exhausted'
            : badCredentials
              ? 'provider_credentials_rejected'
              : response.status === 429
                ? 'provider_rate_limited'
                : 'provider_unavailable',
          retryAfter: block,
          unitsReserved: 1,
        });
      throw new ProviderError(
        response.status === 429
          ? 'provider_rate_limited'
          : quota
            ? 'youtube_quota_exhausted'
            : badCredentials
              ? 'provider_credentials_rejected'
              : 'provider_unavailable',
        block,
      );
    }
    if (provider === 'youtube')
      log({
        event: 'youtube_api',
        endpoint: new URL(url).pathname.split('/').at(-1),
        status: response.status,
        unitsReserved: 1,
      });
    return body;
  }
  async function kickToken() {
    if (token && token.expires > now() + 30000) return token.value;
    if (!env.KICK_CLIENT_ID || !env.KICK_CLIENT_SECRET)
      throw new ProviderError('kick_not_configured', 900);
    const body = await request('kick', 'https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.KICK_CLIENT_ID,
        client_secret: env.KICK_CLIENT_SECRET,
      }),
    });
    const expires = Number(stableId(body.expires_in));
    if (
      typeof body.access_token !== 'string' ||
      !body.access_token ||
      !Number.isFinite(expires) ||
      expires < 60
    )
      throw new ProviderError('invalid_provider_response');
    token = { value: body.access_token, expires: now() + Math.min(expires, 86400) * 1000 };
    return token.value;
  }
  async function kick(path: string, init?: RequestInit) {
    return request('kick', `https://api.kick.com/public/v1/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await kickToken()}`,
        ...init?.headers,
      },
    });
  }
  async function youtube(path: string, params: Record<string, string>) {
    if (!env.YOUTUBE_API_KEY) throw new ProviderError('youtube_not_configured', 900);
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    url.search = new URLSearchParams({ ...params, key: env.YOUTUBE_API_KEY }).toString();
    return request('youtube', url.toString());
  }
  function ytEvents(
    body: Record<string, unknown>,
    channelId: string,
  ): { live: LiveNotification[]; keep: string[] } {
    const live: LiveNotification[] = [],
      keep: string[] = [];
    for (const item of items(body.items)) {
      const video = record(item),
        snippet = record(video.snippet),
        details = record(video.liveStreamingDetails),
        status = record(video.status);
      if (
        snippet.channelId !== channelId ||
        typeof video.id !== 'string' ||
        !/^[A-Za-z0-9_-]{11}$/.test(video.id)
      )
        throw new ProviderError('invalid_provider_response');
      if (snippet.liveBroadcastContent === 'upcoming' || snippet.liveBroadcastContent === 'live')
        keep.push(video.id);
      if (
        snippet.liveBroadcastContent === 'live' &&
        details.actualStartTime &&
        !details.actualEndTime &&
        status.privacyStatus === 'public'
      ) {
        const thumbnails = record(snippet.thumbnails);
        const thumbnailUrl = ['maxres', 'standard', 'high', 'medium', 'default']
          .map((quality) => record(thumbnails[quality]).url)
          .find((url): url is string => typeof url === 'string');
        live.push(
          readLiveNotification(
            {
              sessionKey: video.id,
              startedAt: details.actualStartTime,
              title: snippet.title,
              url: `https://www.youtube.com/watch?v=${video.id}`,
              ...(thumbnailUrl ? { thumbnailUrl } : {}),
            },
            'youtube',
          ),
        );
      }
    }
    return { live, keep };
  }
  return {
    youtube,
    kick,
    async publicKey() {
      const body = await request('kick', 'https://api.kick.com/public/v1/public-key');
      const key = record(body.data).public_key;
      if (typeof key !== 'string' || key.length > 10000)
        throw new ProviderError('invalid_public_key');
      return key;
    },
    async discover(source: MonitoringSource) {
      if (source.provider === 'kick') {
        if (!/^[1-9]\d{0,19}$/.test(source.externalId))
          throw new ProviderError('invalid_broadcaster_id');
        const body = await kick(`channels?broadcaster_user_id=${source.externalId}`);
        const channel = record(items(body.data)[0]);
        if (
          stableId(channel.broadcaster_user_id) !== source.externalId ||
          typeof channel.slug !== 'string' ||
          !/^[A-Za-z0-9_-]{1,25}$/.test(channel.slug)
        )
          throw new ProviderError('kick_channel_unavailable', 900);
        return {
          ids: [],
          displayName: channel.slug,
          canonicalUrl: `https://kick.com/${channel.slug}`,
        };
      }
      const body = await youtube('channels', {
        part: 'snippet,contentDetails',
        id: source.externalId,
      });
      const channel = record(items(body.items)[0]),
        details = record(channel.contentDetails),
        snippet = record(channel.snippet);
      const playlist = record(details.relatedPlaylists).uploads;
      if (
        channel.id !== source.externalId ||
        typeof playlist !== 'string' ||
        typeof snippet.title !== 'string'
      )
        throw new ProviderError('youtube_channel_unavailable', 900);
      const uploads = await youtube('playlistItems', {
        part: 'contentDetails',
        playlistId: playlist,
        maxResults: '50',
      });
      const ids = items(uploads.items)
        .map((x) => record(record(x).contentDetails).videoId)
        .filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{11}$/.test(x));
      return {
        ids,
        displayName: snippet.title,
        canonicalUrl: `https://www.youtube.com/channel/${source.externalId}`,
      };
    },
    async observe(source: MonitoringSource, candidates = source.candidates) {
      if (source.provider === 'youtube') {
        if (!candidates.length) return { live: [], keep: [] };
        // The persistent candidate set is bounded to 100. Check both batches:
        // rediscovery can otherwise continually displace a known older hint past 50.
        const checked = [...new Set(candidates)].slice(0, 100);
        const live: LiveNotification[] = [],
          keep: string[] = [];
        for (let offset = 0; offset < checked.length; offset += 50) {
          const batch = checked.slice(offset, offset + 50);
          const body = await youtube('videos', {
            part: 'snippet,liveStreamingDetails,status',
            id: batch.join(','),
          });
          const events = ytEvents(body, source.externalId);
          const seen = new Set(items(body.items).map((x) => record(x).id));
          live.push(...events.live);
          // Missing IDs are unavailable, not proof of offline.
          keep.push(...events.keep, ...batch.filter((id) => !seen.has(id)));
        }
        // A failed later batch throws before the caller commits any observation.
        return { live, keep };
      }
      if (!/^[1-9]\d{0,19}$/.test(source.externalId))
        throw new ProviderError('invalid_broadcaster_id');
      const body = await kick(`users/livestreams?user_id=${source.externalId}`);
      const live: LiveNotification[] = [];
      for (const item of items(body.data)) {
        const stream = record(item),
          user = record(stream.broadcaster_user),
          channel = record(stream.channel);
        if (stableId(user.id) !== source.externalId)
          throw new ProviderError('invalid_provider_response');
        const started = new Date(String(stream.started_at));
        live.push(
          readLiveNotification(
            {
              sessionKey: started.toISOString(),
              startedAt: started.toISOString(),
              title:
                typeof stream.title === 'string' && stream.title.trim()
                  ? stream.title.slice(0, 500)
                  : 'Live on Kick',
              url: `https://kick.com/${String(channel.slug)}`,
              thumbnailUrl: stream.thumbnail,
              profileImageUrl: user.profile_picture,
              streamerName: user.username,
              categoryName: record(stream.category).name,
              categoryImageUrl: record(stream.category).thumbnail,
            },
            'kick',
          ),
        );
      }
      return { live, keep: [] };
    },
    async subscriptions(source: MonitoringSource) {
      const existing = await kick(`events/subscriptions?broadcaster_user_id=${source.externalId}`);
      const matching = items(existing.data)
        .map(record)
        .find(
          (x) =>
            stableId(x.broadcaster_user_id) === source.externalId &&
            x.event === 'livestream.status.updated' &&
            Number(stableId(x.version)) === 1,
        );
      if (matching && typeof matching.id === 'string') return matching.id;
      // Preserve uint64 precision in the documented numeric broadcaster field.
      const created = await kick('events/subscriptions', {
        method: 'POST',
        body: `{"broadcaster_user_id":${source.externalId},"events":[{"name":"livestream.status.updated","version":1}],"method":"webhook"}`,
      });
      const row = items(created.data)
        .map(record)
        .find((x) => x.name === 'livestream.status.updated' && !x.error);
      if (typeof row?.subscription_id !== 'string')
        throw new ProviderError('kick_subscription_failed', 900);
      return row.subscription_id;
    },
  };
}
export type MonitoringProviders = ReturnType<typeof createMonitoringProviders>;
