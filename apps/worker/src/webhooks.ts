import { createHash, createHmac, timingSafeEqual, verify } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from 'lossless-json';
import type { MonitoringEnvironment } from '@navi/config';
import type { MonitoringRepository } from '@navi/database';
import { boundedBody, record, stableId, type MonitoringProviders } from './providers.js';

export const youtubeTopic = (id: string) =>
  `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${id}`;
export function youtubeCallback(env: MonitoringEnvironment, id: string) {
  const mac = createHmac('sha256', env.MONITOR_WEBHOOK_SECRET!).update(id).digest('hex');
  return `${env.MONITOR_PUBLIC_ORIGIN}/webhooks/youtube/${id}/${mac}`;
}
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function verifyKick(headers: Headers, body: string, key: string, now = Date.now()) {
  const id = headers.get('kick-event-message-id') ?? '',
    time = headers.get('kick-event-message-timestamp') ?? '',
    signature = headers.get('kick-event-signature') ?? '';
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(id) ||
    !Number.isFinite(Date.parse(time)) ||
    Math.abs(now - Date.parse(time)) > 300_000 ||
    signature.length > 2048
  )
    return false;
  try {
    return verify(
      'RSA-SHA256',
      Buffer.from(`${id}.${time}.${body}`),
      key,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}
export function youtubeHints(body: string, channelId: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(body) || XMLValidator.validate(body) !== true)
    throw new Error('invalid_xml');
  const feed = record(
    new XMLParser({ ignoreAttributes: true, processEntities: false, parseTagValue: false }).parse(
      body,
    ),
  ).feed;
  const entry = record(feed).entry;
  const entries = entry === undefined ? [] : Array.isArray(entry) ? entry : [entry];
  if (entries.length > 100) throw new Error('too_many_entries');
  const ids: string[] = [];
  for (const value of entries) {
    const e = record(value);
    if (
      e['yt:channelId'] !== channelId ||
      typeof e['yt:videoId'] !== 'string' ||
      !/^[A-Za-z0-9_-]{11}$/.test(e['yt:videoId'])
    )
      throw new Error('invalid_hint');
    ids.push(e['yt:videoId']);
  }
  return ids;
}
export function createWebhookHandler(
  env: MonitoringEnvironment,
  repo: MonitoringRepository,
  providers: Pick<MonitoringProviders, 'publicKey'>,
  now = Date.now,
) {
  let keyCache: { value: string; expires: number } | undefined;
  let refreshAllowed = 0;
  let keyRequest: Promise<string> | undefined;
  async function publicKey(refresh = false) {
    if (!refresh && keyCache && keyCache.expires > now()) return keyCache.value;
    if (refresh && now() < refreshAllowed) return keyCache?.value ?? '';
    if (!keyRequest && now() < refreshAllowed)
      throw new Error('Public key temporarily unavailable.');
    refreshAllowed = now() + 60_000;
    keyRequest ??= providers.publicKey().then((value) => {
      keyCache = { value, expires: now() + 3600_000 };
      return value;
    });
    try {
      return await keyRequest;
    } finally {
      keyRequest = undefined;
    }
  }
  return async (request: Request): Promise<Response> => {
    if (!env.MONITOR_PUBLIC_ORIGIN || !env.MONITOR_WEBHOOK_SECRET)
      return new Response(null, { status: 404 });
    const url = new URL(request.url);
    try {
      const match = /^\/webhooks\/youtube\/(UC[A-Za-z0-9_-]{22})\/([a-f0-9]{64})$/.exec(
        url.pathname,
      );
      if (match) {
        if (!equal(url.pathname, new URL(youtubeCallback(env, match[1]!)).pathname))
          return new Response(null, { status: 403 });
        const source = (await repo.sources()).find(
          (x) => x.provider === 'youtube' && x.externalId === match[1],
        );
        if (!source) return new Response(null, { status: 404 });
        if (request.method === 'GET') {
          const lease = Number(url.searchParams.get('hub.lease_seconds')),
            challenge = url.searchParams.get('hub.challenge');
          if (
            !source.hubPending ||
            url.searchParams.get('hub.mode') !== 'subscribe' ||
            url.searchParams.get('hub.topic') !== youtubeTopic(source.externalId) ||
            !challenge ||
            challenge.length > 2048 ||
            !Number.isInteger(lease) ||
            lease < 60 ||
            lease > 864000
          )
            return new Response(null, { status: 403 });
          await repo.state(source.id, {
            hubPending: false,
            hubExpires: new Date(now() + lease * 1000),
            renewAfter: new Date(now() + lease * 800),
          });
          return new Response(challenge, {
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
          });
        }
        if (request.method !== 'POST') return new Response(null, { status: 405 });
        const body = await boundedBody(new Response(request.body), 65536);
        const signature = request.headers.get('x-hub-signature') ?? '';
        if (
          !equal(
            signature,
            `sha1=${createHmac('sha1', env.MONITOR_WEBHOOK_SECRET).update(body).digest('hex')}`,
          )
        )
          return new Response(null, { status: 403 });
        const ids = youtubeHints(body, source.externalId);
        await repo.receipt(
          `youtube:${createHash('sha256').update(body).digest('hex')}`,
          source.id,
          ids,
        );
        return new Response(null, { status: 204 });
      }
      if (url.pathname !== '/webhooks/kick' || request.method !== 'POST')
        return new Response(null, { status: 404 });
      const timestamp = request.headers.get('kick-event-message-timestamp') ?? '';
      if (
        !request.headers.get('kick-event-signature') ||
        !Number.isFinite(Date.parse(timestamp)) ||
        Math.abs(now() - Date.parse(timestamp)) > 300_000
      )
        return new Response(null, { status: 403 });
      const body = await boundedBody(new Response(request.body), 65536);
      const headers = request.headers;
      if (
        !verifyKick(headers, body, await publicKey(), now()) &&
        !verifyKick(headers, body, await publicKey(true), now())
      )
        return new Response(null, { status: 403 });
      if (
        headers.get('kick-event-type') !== 'livestream.status.updated' ||
        headers.get('kick-event-version') !== '1'
      )
        return new Response(null, { status: 400 });
      let event: Record<string, unknown>;
      try {
        event = record(parse(body));
      } catch {
        return new Response(null, { status: 400 });
      }
      const source = (await repo.sources()).find(
        (x) =>
          x.provider === 'kick' &&
          x.externalId === stableId(record(event.broadcaster).user_id) &&
          x.upstreamId === headers.get('kick-event-subscription-id'),
      );
      if (!source) return new Response(null, { status: 404 });
      // Even authenticated events are only durable reconciliation hints. REST proves LIVE.
      await repo.receipt(`kick:${headers.get('kick-event-message-id')!}`, source.id);
      return new Response(null, { status: 204 });
    } catch (error) {
      if (
        error instanceof Error &&
        ['invalid_xml', 'invalid_hint', 'too_many_entries'].includes(error.message)
      )
        return new Response(null, { status: 400 });
      return new Response(null, { status: 503 }); // Hub retries; never acknowledge a failed DB commit.
    }
  };
}
