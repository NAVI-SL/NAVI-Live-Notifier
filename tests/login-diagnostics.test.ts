import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NaviAuth } from '../apps/web/src/lib/auth-factory';
import { handleAuthRequest } from '../apps/web/src/lib/auth-handler';
import { authFailureResponse } from '../apps/web/src/lib/auth-failures';
import { authFailureMessage } from '../apps/web/src/lib/auth-messages';
import { canonicalLoginUrl } from '../apps/web/src/lib/login-origin';
import { AppError } from '../apps/web/src/lib/errors';

afterEach(() => vi.restoreAllMocks());
const origin = 'http://localhost:3000';
const request = () =>
  new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers: { origin } });
const auth = (handler: NaviAuth['handler']) => ({ handler }) as NaviAuth;

describe('login origin recovery and safe authentication diagnostics', () => {
  it.each([
    ['development', origin, '127.0.0.1:3000', `${origin}/login`],
    ['development', origin, '[::1]:3000', `${origin}/login`],
    ['development', origin, 'localhost:3000', null],
    ['development', origin, '127.0.0.1:3001', null],
    ['development', origin, 'evil.example:3000', null],
    ['development', origin, 'localhost:3000@evil.example', null],
    ['development', 'https://navi.example', '127.0.0.1', null],
    ['production', origin, '127.0.0.1:3000', null],
  ])(
    'canonicalizes only same-port development loopback aliases (%s %s %s)',
    (NODE_ENV, WEB_ORIGIN, host, expected) => {
      expect(canonicalLoginUrl({ NODE_ENV, WEB_ORIGIN }, host)).toBe(expected);
    },
  );
  it('keeps mismatched-origin POST forbidden before database/auth calls', async () => {
    const handler = vi.fn(async () => Response.json({})),
      database = vi.fn(async () => {});
    const response = await handleAuthRequest(
      new Request('http://127.0.0.1:3000/api/auth/sign-in/social', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:3000' },
      }),
      auth(handler),
      origin,
      database,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'invalid_origin' });
    expect(database).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
  it('distinguishes database preflight failure and does not enter OAuth', async () => {
    const handler = vi.fn(async () => Response.json({}));
    const response = await handleAuthRequest(request(), auth(handler), origin, async () => {
      throw new AppError(503, 'authentication_database');
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'authentication_database' });
    expect(handler).not.toHaveBeenCalled();
  });
  it('maps callback database failure to a safe login message, without raw request query or exception logs', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await handleAuthRequest(
      new Request(`${origin}/api/auth/callback/discord?code=FAKE_PRIVATE&state=FAKE_PRIVATE`),
      auth(async () => Response.json({})),
      origin,
      async () => {
        throw new AppError(503, 'authentication_database');
      },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${origin}/login?error=authentication_database`);
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_PRIVATE');
  });
  it('redacts configuration exceptions and unknown callback error descriptions', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const configuration = authFailureResponse(
      new Error('Invalid environment variables: FAKE_PRIVATE'),
      'route',
    );
    expect(await configuration.json()).toEqual({ error: 'authentication_configuration' });
    const response = await handleAuthRequest(
      new Request(`${origin}/api/auth/callback/discord`),
      auth(
        async () =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `${origin}/login?error=oauth&error=account_not_allowed&error_description=FAKE_PRIVATE`,
              'Set-Cookie': 'binding=synthetic; HttpOnly',
            },
          }),
      ),
      origin,
    );
    expect(response.headers.get('location')).toBe(`${origin}/login?error=account_not_allowed`);
    expect(response.headers.getSetCookie()).toHaveLength(1);
    expect(await response.text()).toBe('');
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_PRIVATE');
    expect(authFailureMessage('FAKE_PRIVATE')).not.toContain('FAKE_PRIVATE');
  });
  it('sanitizes provider API errors and preserves rate deadlines and cookie handling', async () => {
    const response = await handleAuthRequest(
      request(),
      auth(async () =>
        Response.json(
          { code: 'TOO_MANY_REQUESTS', message: 'FAKE_PRIVATE' },
          {
            status: 429,
            headers: { 'Retry-After': '60', 'Set-Cookie': 'binding=synthetic; HttpOnly' },
          },
        ),
      ),
      origin,
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'authentication_rate_limited' });
    expect(response.headers.get('retry-after')).toBe('60');
    expect(response.headers.getSetCookie()).toHaveLength(1);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
