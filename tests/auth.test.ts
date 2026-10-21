import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from '@better-auth/memory-adapter';
import { createNaviAuth } from '../apps/web/src/lib/auth-factory';
import { handleAuthRequest } from '../apps/web/src/lib/auth-handler';
import { readAuthEnvironment } from '@navi/config';

const origin = 'http://localhost:3000';
const userId = '111111111111111111';
const environment = readAuthEnvironment({
  NODE_ENV: 'test',
  WEB_ORIGIN: origin,
  DATABASE_URL: 'postgresql://localhost/navi',
  BETTER_AUTH_SECRET: 'test-auth-secret-with-at-least-32-characters-123456',
  DISCORD_CLIENT_ID: '222222222222222222',
  DISCORD_CLIENT_SECRET: 'test-client-secret',
  DISCORD_ALLOWED_USER_IDS: userId,
  BOT_INTERNAL_SECRET: 'test-internal-secret-with-32-characters',
});
function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}
function setup(profileId = userId, tokenFailure = false) {
  const database: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const auth = createNaviAuth(environment, memoryAdapter(database));
  const provider = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url === 'https://discord.com/api/oauth2/token')
      return Response.json(
        tokenFailure
          ? { error: 'invalid_grant' }
          : {
              access_token: 'provider-access-secret',
              refresh_token: 'provider-refresh-secret',
              expires_in: 3600,
              scope: 'identify guilds',
              token_type: 'Bearer',
            },
        { status: tokenFailure ? 400 : 200 },
      );
    if (decodeURIComponent(url) === 'https://discord.com/api/users/@me')
      return Response.json({
        id: profileId,
        username: 'Navi Tester',
        global_name: 'Navi Tester',
        discriminator: '0',
        avatar: null,
      });
    throw new Error(`Unexpected external request in auth test: ${url}`);
  });
  vi.stubGlobal('fetch', provider);
  async function start() {
    const response = await handleAuthRequest(
      new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers: { origin } }),
      auth,
      origin,
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as { url: string };
    return { url: new URL(data.url), cookies: cookieHeader(response) };
  }
  async function callback(
    started: Awaited<ReturnType<typeof start>>,
    query = 'code=valid-code',
    cookie = started.cookies,
  ) {
    return handleAuthRequest(
      new Request(
        `${origin}/api/auth/callback/discord?${query}&state=${started.url.searchParams.get('state')}`,
        { headers: { cookie } },
      ),
      auth,
      origin,
    );
  }
  return { auth, database, provider, start, callback };
}
afterEach(() => vi.unstubAllGlobals());

describe('Better Auth Discord flow (mocked Discord, real auth engine)', () => {
  it('requests minimal scopes and fixed redirect; verifies state; persists encrypted provider tokens; logs out', async () => {
    const test = setup();
    const started = await test.start();
    expect(new Set(started.url.searchParams.get('scope')?.split(' '))).toEqual(
      new Set(['identify', 'guilds']),
    );
    expect(started.url.searchParams.get('redirect_uri')).toBe(
      `${origin}/api/auth/callback/discord`,
    );
    expect(started.url.searchParams.get('state')).toBeTruthy();
    const response = await test.callback(started);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
    const cookies = cookieHeader(response);
    expect(cookies).toContain('session_token');
    expect(
      response.headers
        .getSetCookie()
        .some((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')),
    ).toBe(true);
    const session = await test.auth.api.getSession({ headers: new Headers({ cookie: cookies }) });
    expect(session?.user.name).toBe('Navi Tester');
    expect(JSON.stringify(test.database.account)).not.toContain('provider-access-secret');
    expect(JSON.stringify(test.database.account)).not.toContain('provider-refresh-secret');
    const logout = await handleAuthRequest(
      new Request(`${origin}/api/auth/sign-out`, {
        method: 'POST',
        headers: { origin, cookie: cookies },
      }),
      test.auth,
      origin,
    );
    expect(logout.status).toBe(200);
    expect(
      await test.auth.api.getSession({ headers: new Headers({ cookie: cookies }) }),
    ).toBeNull();
  });

  it('rejects missing/wrong browser binding and replayed state', async () => {
    const test = setup();
    const started = await test.start();
    const rejected = await test.callback(started, 'code=valid-code', '');
    expect(rejected.headers.get('location')).toContain('/login');
    expect(test.database.session).toHaveLength(0);
    const fresh = await test.start();
    const ok = await test.callback(fresh);
    expect(ok.headers.get('location')).toBe(`${origin}/dashboard`);
    const replay = await test.callback(fresh);
    expect(replay.headers.get('location')).toContain('/login');
    expect(test.database.session).toHaveLength(1);
  });

  it('handles cancelled authorization and failed code exchange without a session', async () => {
    const test = setup(userId, true);
    const started = await test.start();
    const cancelled = await test.callback(started, 'error=access_denied');
    expect(cancelled.headers.get('location')).toBe(`${origin}/login?error=access_denied`);
    const fresh = await test.start();
    const failed = await test.callback(fresh);
    expect(failed.headers.get('location')).toBe(`${origin}/login?error=authentication_oauth`);
    expect(test.database.session).toHaveLength(0);
  });

  it('blocks users outside the personal allowlist', async () => {
    const test = setup('999999999999999999');
    const response = await test.callback(await test.start());
    expect(response.headers.get('location')).toBe(`${origin}/login?error=account_not_allowed`);
    expect(test.database.user).toHaveLength(0);
    expect(test.database.session).toHaveLength(0);
  });

  it('rejects cross-origin login/logout and keeps token/account APIs private', async () => {
    const test = setup();
    const forged = await handleAuthRequest(
      new Request(`${origin}/api/auth/sign-out`, {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
      test.auth,
      origin,
    );
    expect(forged.status).toBe(403);
    const token = await handleAuthRequest(
      new Request(`${origin}/api/auth/get-access-token`, { method: 'POST', headers: { origin } }),
      test.auth,
      origin,
    );
    expect(token.status).toBe(404);
  });

  it('ignores browser-selected providers, scopes and return locations', async () => {
    const test = setup();
    const response = await handleAuthRequest(
      new Request(`${origin}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          scopes: ['email', 'bot'],
          callbackURL: 'https://evil.example',
        }),
      }),
      test.auth,
      origin,
    );
    const body = (await response.json()) as { url: string };
    const url = new URL(body.url);
    expect(url.hostname).toBe('discord.com');
    expect(url.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/discord`);
    expect(url.searchParams.get('scope')).not.toContain('email');
    expect(url.searchParams.get('scope')).not.toContain('bot');
  });

  it('rejects a modified state value and expired stored state', async () => {
    const test = setup();
    const started = await test.start();
    const wrong = await handleAuthRequest(
      new Request(`${origin}/api/auth/callback/discord?code=test&state=wrong-state`, {
        headers: { cookie: started.cookies },
      }),
      test.auth,
      origin,
    );
    expect(wrong.headers.get('location')).toContain('/login');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
    const expired = await test.callback(started);
    expect(expired.headers.get('location')).toContain('/login');
    expect(test.database.session).toHaveLength(0);
  });

  it('rejects expired sessions in the auth engine', async () => {
    const test = setup();
    const response = await test.callback(await test.start());
    const row = test.database.session?.[0];
    expect(row).toBeTruthy();
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    expect(
      await test.auth.api.getSession({ headers: new Headers({ cookie: cookieHeader(response) }) }),
    ).toBeNull();
  });
});
