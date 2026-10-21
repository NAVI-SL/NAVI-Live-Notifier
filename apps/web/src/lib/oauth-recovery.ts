import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type { AuthEnvironment } from '@navi/config';
import { AppError } from './errors';
import { discordRateLog, discordRetrySeconds, recordDiscordRate } from '@navi/core/discord-rate';

type Attempt = { failure?: AppError };
// Shared across Next server bundles in one process; no raw refresh tokens are retained as keys.
const shared = globalThis as typeof globalThis & {
  __naviOAuthRecovery?: {
    attempts: AsyncLocalStorage<Attempt>;
    cooldowns: Map<string, number>;
  };
};
const state = (shared.__naviOAuthRecovery ??= {
  attempts: new AsyncLocalStorage<Attempt>(),
  cooldowns: new Map(),
});

export function createOAuthRecovery(
  environment: AuthEnvironment,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
) {
  return {
    async run<T>(operation: () => Promise<T>): Promise<T> {
      return state.attempts.run({}, async () => {
        try {
          return await operation();
        } catch (error) {
          const failure = state.attempts.getStore()?.failure;
          if (failure) throw failure;
          if (error instanceof AppError) throw error;
          if (
            error &&
            typeof error === 'object' &&
            'statusCode' in error &&
            error.statusCode === 401
          )
            throw new AppError(401, 'login_required');
          throw new AppError(503, 'authentication_unavailable');
        }
      });
    },
    async refreshAccessToken(refreshToken: string) {
      const key = createHash('sha256')
        .update(environment.DISCORD_CLIENT_ID)
        .update(refreshToken)
        .digest('hex');
      function fail(error: AppError): never {
        const attempt = state.attempts.getStore();
        if (attempt) attempt.failure = error;
        throw error;
      }
      const until = state.cooldowns.get(key) ?? 0;
      if (until > Date.now())
        fail(new AppError(429, 'discord_rate_limited', Math.ceil((until - Date.now()) / 1000)));
      state.cooldowns.delete(key);
      let response: Response;
      try {
        response = await fetcher('https://discord.com/api/oauth2/token', {
          method: 'POST',
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: environment.DISCORD_CLIENT_ID,
            client_secret: environment.DISCORD_CLIENT_SECRET,
          }),
        });
      } catch {
        return fail(new AppError(503, 'discord_unavailable'));
      }
      const parsed: unknown = await response.json().catch(() => ({}));
      const data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      if (response.status === 429) {
        const seconds = discordRetrySeconds(response.headers.get('retry-after'), data.retry_after);
        recordDiscordRate(discordRateLog('web', '/oauth2/token', 429, response.headers, seconds));
        for (const [stored, expiry] of state.cooldowns)
          if (expiry <= Date.now()) state.cooldowns.delete(stored);
        state.cooldowns.set(key, Date.now() + seconds * 1000);
        return fail(new AppError(429, 'discord_rate_limited', Math.ceil(seconds)));
      }
      if (!response.ok)
        return fail(
          new AppError(
            response.status === 400 && data.error === 'invalid_grant' ? 401 : 503,
            response.status === 400 && data.error === 'invalid_grant'
              ? 'discord_reauthentication_required'
              : 'discord_unavailable',
          ),
        );
      if (
        typeof data.access_token !== 'string' ||
        !data.access_token ||
        typeof data.expires_in !== 'number' ||
        data.expires_in <= 0 ||
        (data.refresh_token !== undefined && typeof data.refresh_token !== 'string')
      )
        return fail(new AppError(503, 'discord_invalid_response'));
      return {
        accessToken: data.access_token,
        ...(typeof data.refresh_token === 'string' ? { refreshToken: data.refresh_token } : {}),
        accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    },
  };
}
