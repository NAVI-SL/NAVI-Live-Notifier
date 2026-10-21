import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, existsSync, statSync, renameSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export function discordRetrySeconds(header: string | null, body?: unknown, now = Date.now()) {
  const numeric = header === null || !header.trim() ? NaN : Number(header);
  const value =
    header !== null && Number.isFinite(numeric) && numeric >= 0
      ? numeric
      : header && Number.isFinite(Date.parse(header))
        ? (Date.parse(header) - now) / 1000
        : Number(body);
  return Number.isFinite(value) && value >= 0 ? Math.max(1, Math.ceil(value)) : 5;
}
export function discordRateLog(
  service: 'web' | 'bot',
  route: string,
  status: number,
  headers: Headers,
  retryAfter = 0,
  source = 'http',
) {
  route = route.replace(/^\/api\/v10(?=\/)/, '');
  // Only known route templates are logged, never raw URLs/IDs/query strings.
  const endpoint =
    /^\/users\/(?:@me|\d+|:id)(?:\/guilds)?$|^\/oauth2\/token$|^\/guilds\/(?:\d+|:id)(?:\/(?:channels|roles|members\/(?:\d+|:id|@me)))?$|^\/channels\/(?:\d+|:id)\/messages$/.test(
      route,
    )
      ? route.replace(/\/\d+(?=\/|$)/g, '/:id')
      : 'other_discord_route';
  const bucket = headers.get('x-ratelimit-bucket');
  return {
    time: new Date().toISOString(),
    event: 'discord_rest',
    service,
    endpoint,
    status,
    source,
    retryAfter,
    bucket: bucket ? createHash('sha256').update(bucket).digest('hex').slice(0, 12) : null,
    global:
      headers.get('x-ratelimit-global') === 'true' || headers.get('x-ratelimit-scope') === 'global',
    remaining: /^\d+$/.test(headers.get('x-ratelimit-remaining') ?? '')
      ? Number(headers.get('x-ratelimit-remaining'))
      : null,
    resetAfter:
      headers.has('x-ratelimit-reset-after') &&
      Number.isFinite(Number(headers.get('x-ratelimit-reset-after')))
        ? Number(headers.get('x-ratelimit-reset-after'))
        : null,
  };
}

/** Native development log contains only the explicitly projected safe event above. */
export function recordDiscordRate(event: ReturnType<typeof discordRateLog>) {
  const line = JSON.stringify(event);
  console.info(line);
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    try {
      const cwd = process.cwd();
      const root = ['web', 'bot', 'worker'].includes(basename(cwd)) ? resolve(cwd, '../..') : cwd;
      const folder = resolve(root, '.local');
      mkdirSync(folder, { recursive: true });
      const file = resolve(folder, 'discord-rest.jsonl');
      if (existsSync(file) && statSync(file).size > 1024 * 1024)
        renameSync(file, resolve(folder, 'discord-rest.previous.jsonl'));
      appendFileSync(file, line + '\n', { mode: 0o600 });
    } catch {
      /* Console logging remains available if local file logging is unavailable. */
    }
  }
}
