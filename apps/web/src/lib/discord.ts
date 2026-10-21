import type { AuthEnvironment } from '@navi/config';
import { AppError } from './errors';
import { createHash } from 'node:crypto';
import { createReadCache } from '@navi/core';
import { discordRateLog, discordRetrySeconds, recordDiscordRate } from '@navi/core/discord-rate';

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};
export type InstallationStatus = 'installed' | 'not_installed' | 'unknown';
function guildState() {
  return {
    cooldowns: new Map<string, number>(),
    exhausted: new Map<string, number>(),
    read: createReadCache<DiscordGuild[]>(10000),
  };
}
const processState = globalThis as typeof globalThis & {
  __naviGuildReadsV2?: ReturnType<typeof guildState>;
};
const shared = (processState.__naviGuildReadsV2 ??= guildState());
const injected = new WeakMap<typeof fetch, ReturnType<typeof guildState>>();

export async function discordGuilds(
  token: string,
  fetcher?: typeof fetch,
  options: { fresh?: boolean } = {},
): Promise<DiscordGuild[]> {
  let state = shared;
  if (fetcher) {
    state = injected.get(fetcher) ?? guildState();
    injected.set(fetcher, state);
  }
  const { cooldowns, exhausted } = state;
  const key = createHash('sha256').update(token).digest('hex');
  return state.read(
    key,
    async () => {
      const blockedUntil = cooldowns.get(key) ?? 0;
      if (blockedUntil > Date.now())
        throw new AppError(
          429,
          'discord_rate_limited',
          Math.ceil((blockedUntil - Date.now()) / 1000),
        );
      const guilds: DiscordGuild[] = [];
      let after = '';
      for (let page = 0; page < 20; page++) {
        const wait = Math.ceil((exhausted.get(key) ?? 0) - Date.now());
        if (wait > 8000) throw new AppError(429, 'discord_rate_limited', Math.ceil(wait / 1000));
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        exhausted.delete(key);
        let response: Response;
        try {
          response = await (fetcher ?? fetch)(
            `https://discord.com/api/v10/users/@me/guilds?limit=200${after ? `&after=${after}` : ''}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
              signal: AbortSignal.timeout(8_000),
              redirect: 'error',
            },
          );
        } catch {
          throw new AppError(503, 'discord_unavailable');
        }
        if (response.status === 429) {
          const body = (await response.json().catch(() => ({}))) as {
            retry_after?: number;
            global?: boolean;
          };
          const seconds = discordRetrySeconds(
            response.headers.get('retry-after'),
            body.retry_after,
          );
          const logHeaders = new Headers(response.headers);
          if (body.global) logHeaders.set('x-ratelimit-global', 'true');
          recordDiscordRate(discordRateLog('web', '/users/@me/guilds', 429, logHeaders, seconds));
          for (const [stored, expiry] of cooldowns)
            if (expiry <= Date.now()) cooldowns.delete(stored);
          cooldowns.set(key, Math.max(cooldowns.get(key) ?? 0, Date.now() + seconds * 1000));
          throw new AppError(429, 'discord_rate_limited', seconds);
        }
        recordDiscordRate(
          discordRateLog('web', '/users/@me/guilds', response.status, response.headers),
        );
        if (response.status === 401) throw new AppError(401, 'discord_reauthentication_required');
        if (!response.ok) throw new AppError(503, 'discord_unavailable');
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isGuild))
          throw new AppError(503, 'discord_invalid_response');
        guilds.push(...data);
        if (response.headers.get('x-ratelimit-remaining') === '0') {
          const delay = discordRetrySeconds(response.headers.get('x-ratelimit-reset-after'));
          exhausted.set(key, Date.now() + delay * 1000);
        }
        if (data.length < 200) return guilds;
        const last = data.at(-1) as DiscordGuild;
        if (last.id === after) break;
        after = last.id;
      }
      throw new AppError(503, 'discord_pagination_incomplete');
    },
    options.fresh,
  );
}
function isGuild(value: unknown): value is DiscordGuild {
  if (!value || typeof value !== 'object') return false;
  const guild = value as Record<string, unknown>;
  return (
    typeof guild.id === 'string' &&
    /^\d{17,20}$/.test(guild.id) &&
    typeof guild.name === 'string' &&
    typeof guild.owner === 'boolean' &&
    typeof guild.permissions === 'string' &&
    /^\d+$/.test(guild.permissions) &&
    (guild.icon === null || typeof guild.icon === 'string')
  );
}

export async function botInstallationStatus(
  id: string,
  environment: AuthEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<InstallationStatus> {
  try {
    const response = await fetcher(`${environment.BOT_INTERNAL_URL}/internal/guilds/${id}`, {
      headers: { Authorization: `Bearer ${environment.BOT_INTERNAL_SECRET}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if (!response.ok) return 'unknown';
    const data = (await response.json()) as { status?: unknown };
    return data.status === 'installed' || data.status === 'not_installed' ? data.status : 'unknown';
  } catch {
    return 'unknown';
  }
}
