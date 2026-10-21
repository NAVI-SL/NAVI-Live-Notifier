import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from '@better-auth/memory-adapter';
import { createNaviAuth } from '../apps/web/src/lib/auth-factory';
import { handleAuthRequest } from '../apps/web/src/lib/auth-handler';
import { createOAuthRecovery } from '../apps/web/src/lib/oauth-recovery';
import { createGuildService } from '../apps/web/src/lib/guild-service';
import { readAuthEnvironment } from '@navi/config';
import { withAccountLock } from '@navi/database';
import type pg from 'pg';

const origin = 'http://localhost:3000',
  userId = '111111111111111111';
const environment = readAuthEnvironment({
  NODE_ENV: 'test',
  WEB_ORIGIN: origin,
  DATABASE_URL: 'postgresql://localhost/test',
  BETTER_AUTH_SECRET: 'recovery-test-secret-12345678901234567890',
  DISCORD_CLIENT_ID: '222222222222222222',
  DISCORD_CLIENT_SECRET: 'test-client',
  DISCORD_ALLOWED_USER_IDS: userId,
  BOT_INTERNAL_SECRET: 'test-internal-1234567890123456789012345678',
});
const cookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ');
let fixtureNumber = 0;
async function setup() {
  const number = ++fixtureNumber;
  const database: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  let mode: 'success' | 'revoked' | 'unavailable' | 'rate' | 'network' = 'success';
  let refreshCalls = 0;
  let currentRefresh = `refresh-${number}-initial`;
  const provider = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = decodeURIComponent(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    if (url.endsWith('/oauth2/token')) {
      const body = new URLSearchParams(String(init?.body ?? ''));
      if (body.get('grant_type') === 'refresh_token') {
        refreshCalls++;
        if (mode === 'network') throw new Error('FAKE_PROVIDER_SECRET');
        if (mode === 'rate')
          return Response.json(
            { retry_after: 30 },
            { status: 429, headers: { 'Retry-After': '30' } },
          );
        if (mode === 'unavailable') return Response.json({}, { status: 503 });
        if (mode === 'revoked' || body.get('refresh_token') !== currentRefresh)
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        currentRefresh = `refresh-${number}-rotated-${refreshCalls}`;
      }
      return Response.json({
        access_token: `access-${number}-${refreshCalls}`,
        refresh_token: currentRefresh,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'identify guilds',
      });
    }
    if (url.endsWith('/users/@me'))
      return Response.json({
        id: userId,
        username: 'Recovery Tester',
        global_name: null,
        avatar: null,
        discriminator: '0',
      });
    throw new Error('Unexpected provider request');
  });
  vi.stubGlobal('fetch', provider);
  const recovery = createOAuthRecovery(environment, provider);
  const auth = createNaviAuth(environment, memoryAdapter(database), recovery);
  const start = await handleAuthRequest(
    new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers: { origin } }),
    auth,
    origin,
  );
  const state = new URL(((await start.json()) as { url: string }).url).searchParams.get('state');
  const callback = await handleAuthRequest(
    new Request(`${origin}/api/auth/callback/discord?code=test&state=${state}`, {
      headers: { cookie: cookie(start) },
    }),
    auth,
    origin,
  );
  expect(callback.headers.get('location')).toBe(`${origin}/dashboard`);
  const headers = new Headers({ cookie: cookie(callback) });
  let locked = false;
  // Emulate PostgreSQL's session lock, while exercising the actual locking algorithm.
  const pool = {
    connect: async () => ({
      query: async ({ text }: { text: string }) => {
        if (text.includes('pg_try_advisory_lock')) {
          const acquired = !locked;
          if (acquired) locked = true;
          return { rows: [{ acquired }] };
        }
        locked = false;
        return { rows: [] };
      },
      release: () => {},
      on: () => {},
      off: () => {},
    }),
  } as unknown as pg.Pool;
  const fetchGuilds = vi.fn(async () => []);
  const service = createGuildService({
    auth,
    allowedUsers: [userId],
    clientId: environment.DISCORD_CLIENT_ID,
    origin,
    fetchGuilds,
    installationStatus: async () => 'unknown',
    accessToken: (requestHeaders, accountId) =>
      recovery.run(() =>
        withAccountLock(
          pool,
          accountId,
          async () =>
            (await auth.api.getAccessToken({ headers: requestHeaders, body: { accountId } }))
              .accessToken,
        ),
      ),
  });
  return {
    auth,
    headers,
    service,
    database,
    provider,
    fetchGuilds,
    setMode: (value: typeof mode) => {
      mode = value;
    },
    calls: () => refreshCalls,
    expire: () => {
      database.account![0]!.accessTokenExpiresAt = new Date(Date.now() - 1000);
    },
  };
}
afterEach(() => vi.unstubAllGlobals());
describe('authentication recovery with the real auth engine', () => {
  it('serializes simultaneous refresh and uses the rotated credential for a later refresh', async () => {
    const test = await setup();
    test.expire();
    await Promise.all([test.service.list(test.headers), test.service.list(test.headers)]);
    expect(test.calls()).toBe(1);
    expect(test.fetchGuilds).toHaveBeenCalledWith(expect.stringContaining('-1'));
    test.expire();
    await test.service.list(test.headers);
    expect(test.calls()).toBe(2);
    expect(JSON.stringify(test.database.account)).not.toContain('rotated-');
  });
  it.each(['unavailable', 'network'] as const)(
    'preserves sessions and recovers after %s',
    async (mode) => {
      const test = await setup();
      test.expire();
      test.setMode(mode);
      await expect(test.service.list(test.headers)).rejects.toMatchObject({
        status: 503,
        code: 'discord_unavailable',
      });
      expect(await test.auth.api.getSession({ headers: test.headers })).not.toBeNull();
      test.setMode('success');
      await expect(test.service.list(test.headers)).resolves.toEqual([]);
    },
  );
  it('preserves Retry-After and prevents repeated exchanges during token endpoint cooldown', async () => {
    const test = await setup();
    test.expire();
    test.setMode('rate');
    await expect(test.service.list(test.headers)).rejects.toMatchObject({
      status: 429,
      retryAfter: 30,
    });
    await expect(test.service.list(test.headers)).rejects.toMatchObject({ status: 429 });
    expect(test.calls()).toBe(1);
    expect(await test.auth.api.getSession({ headers: test.headers })).not.toBeNull();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    test.setMode('success');
    await expect(test.service.list(test.headers)).resolves.toEqual([]);
  });
  it('requires reauthentication for confirmed revoked refresh credentials', async () => {
    const test = await setup();
    test.expire();
    test.setMode('revoked');
    await expect(test.service.list(test.headers)).rejects.toMatchObject({
      status: 401,
      code: 'discord_reauthentication_required',
    });
  });
  it('does not treat account database failures as invalid login', async () => {
    const test = await setup();
    vi.spyOn(test.auth.api, 'listUserAccounts').mockRejectedValueOnce(
      new Error('FAKE_DATABASE_SECRET'),
    );
    await expect(test.service.list(test.headers)).rejects.toMatchObject({
      status: 503,
      code: 'authentication_unavailable',
    });
    expect(await test.auth.api.getSession({ headers: test.headers })).not.toBeNull();
  });
  it('recognizes a session revoked between identity and account lookup', async () => {
    const test = await setup();
    vi.spyOn(test.auth.api, 'listUserAccounts').mockRejectedValueOnce({ statusCode: 401 });
    await expect(test.service.list(test.headers)).rejects.toMatchObject({
      status: 401,
      code: 'login_required',
    });
    expect(test.fetchGuilds).not.toHaveBeenCalled();
  });
});
