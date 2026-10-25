import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { REST, Routes, DiscordAPIError, RESTEvents } from 'discord.js';
import { NotificationError, createReadCache } from '@navi/core';
import { discordRateLog, discordRetrySeconds, recordDiscordRate } from '@navi/core/discord-rate';
import { createBotNotifications, type BotNotifications } from './notifications.js';
import { createCommandDiscordAccess } from './command-discord.js';

export type BotStatus = 'installed' | 'not_installed' | 'unknown';
function authenticated(value: string, secret: string) {
  const supplied = Buffer.from(value),
    expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
export function createStatusHandler(
  secret: string,
  lookup: (id: string) => Promise<BotStatus>,
  notifications?: BotNotifications,
  diagnostics?: () => ReturnType<typeof discordRateLog>[],
  gatewayHealth?: () => { status: string; state: string; changedAt: number },
) {
  return async (request: Request): Promise<Response> => {
    if (!authenticated(request.headers.get('authorization') ?? '', secret))
      return new Response(null, { status: 401 });
    if (
      new URL(request.url).pathname === '/internal/discord-diagnostics' &&
      request.method === 'GET' &&
      diagnostics
    )
      return Response.json(
        { requests: diagnostics() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    if (new URL(request.url).pathname === '/internal/health' && request.method === 'GET') {
      try {
        if (!notifications) throw new Error('Bot unavailable.');
        const rest = await notifications.health();
        const gateway = gatewayHealth?.();
        const status =
          rest.status === 'ok' && (!gateway || gateway.status === 'ok') ? 'ok' : 'degraded';
        return Response.json(
          { ...rest, status, ...(gateway ? { gateway } : {}) },
          {
            status: status === 'ok' ? 200 : 503,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      } catch {
        return Response.json(
          { status: 'degraded' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    const notificationMatch =
      /^\/internal\/guilds\/(\d{17,20})\/(notification-targets|test-notification|live-notification)$/.exec(
        new URL(request.url).pathname,
      );
    if (notificationMatch && notifications) {
      try {
        if (request.method === 'GET' && notificationMatch[2] === 'notification-targets')
          return Response.json(
            await notifications.targets(
              notificationMatch[1]!,
              new URL(request.url).searchParams.get('fresh') === '1',
            ),
            {
              headers: { 'Cache-Control': 'no-store' },
            },
          );
        if (
          request.method === 'POST' &&
          ['test-notification', 'live-notification'].includes(notificationMatch[2]!)
        ) {
          const text = await request.text();
          if (Buffer.byteLength(text) > 12000) throw new NotificationError(413, 'body_too_large');
          let payload: unknown;
          try {
            payload = JSON.parse(text);
          } catch {
            throw new NotificationError(400, 'invalid_body');
          }
          const result =
            notificationMatch[2] === 'live-notification'
              ? await notifications.sendLive(notificationMatch[1]!, payload)
              : await notifications.sendTest(notificationMatch[1]!, payload);
          return Response.json(result, {
            headers: { 'Cache-Control': 'no-store' },
          });
        }
        return new Response(null, { status: 405 });
      } catch (error) {
        const known = error instanceof NotificationError;
        return Response.json(
          {
            error: known ? error.code : 'bot_unavailable',
            ...(known && ['bot_unavailable', 'discord_invalid_response'].includes(error.code)
              ? { retrySafe: true }
              : {}),
          },
          {
            status: known ? error.status : 503,
            headers: {
              'Cache-Control': 'no-store',
              ...(known && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
            },
          },
        );
      }
    }
    const match = /^\/internal\/guilds\/(\d{17,20})$/.exec(new URL(request.url).pathname);
    if (request.method !== 'GET' || !match?.[1]) return new Response(null, { status: 404 });
    return Response.json(
      { status: await lookup(match[1]) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  };
}
function discordRest(
  token: string,
  record: (event: ReturnType<typeof discordRateLog>) => void = (event) =>
    console.info(JSON.stringify(event)),
) {
  const rest = new REST({
    version: '10',
    timeout: 8_000,
    retries: 0,
    rejectOnRateLimit: () => true,
  }).setToken(token);
  rest.on(RESTEvents.Response, (request, response) => {
    // Project only safe route/header metadata; never serialize the SDK request or response.
    const headers = new Headers();
    for (const key of [
      'retry-after',
      'x-ratelimit-bucket',
      'x-ratelimit-global',
      'x-ratelimit-scope',
      'x-ratelimit-remaining',
      'x-ratelimit-reset-after',
    ]) {
      const value = response.headers.get(key);
      if (value !== null) headers.set(key, value);
    }
    record(
      discordRateLog(
        'bot',
        request.path.split('?')[0]!,
        response.status,
        headers,
        response.status === 429 ? discordRetrySeconds(headers.get('retry-after')) : 0,
      ),
    );
  });
  rest.on(RESTEvents.RateLimited, (data) => {
    const headers = new Headers({
      'x-ratelimit-bucket': data.hash,
      'x-ratelimit-global': String(data.global),
    });
    record(
      discordRateLog(
        'bot',
        data.route,
        429,
        headers,
        Math.max(
          1,
          Math.ceil(Math.max(data.retryAfter, data.timeToReset, data.sublimitTimeout) / 1000),
        ),
        'sdk_bucket',
      ),
    );
  });
  return rest;
}
export function discordBotLookup(token: string, rest = discordRest(token)) {
  return async (id: string): Promise<BotStatus> => {
    try {
      await rest.get(Routes.guild(id));
      return 'installed';
    } catch (error) {
      if (error instanceof DiscordAPIError && (error.code === 10004 || error.code === 50001))
        return 'not_installed';
      return 'unknown';
    }
  };
}
export function discordBotServices(token: string) {
  const recent: ReturnType<typeof discordRateLog>[] = [];
  const rest = discordRest(token, (event) => {
    recent.push(event);
    if (recent.length > 30) recent.shift();
    recordDiscordRate(event);
  });
  const lookup = discordBotLookup(token, rest);
  const cached = createReadCache<BotStatus>(10000);
  const notifications = createBotNotifications(rest);
  return {
    lookup: async (id: string) => {
      try {
        return await cached(id, async () => {
          const result = await lookup(id);
          if (result === 'unknown') throw new Error('unavailable');
          return result;
        });
      } catch {
        return 'unknown' as const;
      }
    },
    notifications,
    commandAccess: createCommandDiscordAccess(rest, notifications),
    diagnostics: () => structuredClone(recent),
  };
}
export async function startStatusServer(
  port: number,
  secret: string,
  lookup: (id: string) => Promise<BotStatus>,
  notifications?: BotNotifications,
  diagnostics?: () => ReturnType<typeof discordRateLog>[],
  gatewayHealth?: () => { status: string; state: string; changedAt: number },
) {
  if (secret.length < 32) throw new Error('Invalid environment variables: BOT_INTERNAL_SECRET');
  const handler = createStatusHandler(secret, lookup, notifications, diagnostics, gatewayHealth);
  const server = createServer(async (request, response) => {
    try {
      // Authenticate before reading a potentially slow mutation body.
      if (!authenticated(request.headers.authorization ?? '', secret)) {
        response.writeHead(401);
        response.end();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of request) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 12000) {
          response.writeHead(413);
          response.end();
          return;
        }
        chunks.push(bytes);
      }
      const result = await handler(
        new Request(`http://127.0.0.1:${port}${request.url ?? '/'}`, {
          method: request.method ?? 'GET',
          headers: { authorization: request.headers.authorization ?? '' },
          ...(request.method === 'POST' ? { body: Buffer.concat(chunks).toString('utf8') } : {}),
        }),
      );
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(await result.text());
    } catch {
      response.writeHead(503);
      response.end();
    }
  });
  server.maxHeadersCount = 20;
  server.requestTimeout = 15_000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
}
