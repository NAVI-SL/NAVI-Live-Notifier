import type { NaviAuth } from './auth-factory';
import { AppError, assertOrigin } from './errors';
import { authFailureCode } from './auth-messages';
import { authFailureResponse, logAuthFailure, type AuthStage } from './auth-failures';

/** Never expose Better Auth's OAuth token/account APIs to the browser. */
export async function handleAuthRequest(
  request: Request,
  auth: NaviAuth,
  origin: string,
  databaseReady?: () => Promise<void>,
): Promise<Response> {
  const path = new URL(request.url).pathname;
  const stage: AuthStage =
    path === '/api/auth/callback/discord'
      ? 'callback'
      : path === '/api/auth/sign-in/social'
        ? 'sign_in'
        : 'sign_out';
  try {
    if (request.method === 'GET' && path === '/api/auth/callback/discord') {
      await databaseReady?.();
      return await safeResponse(await auth.handler(request), stage, origin);
    }
    if (
      request.method !== 'POST' ||
      !['/api/auth/sign-in/social', '/api/auth/sign-out'].includes(path)
    )
      throw new AppError(404, 'not_found');
    assertOrigin(request, origin);
    await databaseReady?.();
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json');
    const body = path.endsWith('/sign-in/social')
      ? {
          provider: 'discord',
          callbackURL: `${origin}/dashboard`,
          errorCallbackURL: `${origin}/login?error=oauth`,
        }
      : {};
    // Provider/scopes/return locations are server-owned, never browser-controlled.
    return await safeResponse(
      await auth.handler(
        new Request(`${origin}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }),
      ),
      stage,
      origin,
    );
  } catch (error) {
    // Unsupported token/account endpoints keep their existing hidden 404 contract.
    if (error instanceof AppError && error.status === 404)
      return Response.json(
        { error: 'not_found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    return authFailureResponse(error, stage, stage === 'callback' ? origin : undefined);
  }
}
async function safeResponse(response: Response, stage: AuthStage, origin: string) {
  const location = response.headers.get('location');
  if (location && stage === 'callback') {
    const target = new URL(location, origin);
    if (target.origin === origin && target.pathname === '/login') {
      const code = authFailureCode(target.searchParams.getAll('error').at(-1));
      logAuthFailure(stage, code, response.status);
      response.headers.set('Location', `${origin}/login?error=${code}`);
      response.headers.delete('content-length');
      return noStore(new Response(null, { status: response.status, headers: response.headers }));
    }
  }
  if (!response.ok && response.status >= 400) {
    let value: unknown;
    try {
      value = await response.clone().json();
    } catch {
      /* No raw body is exposed. */
    }
    const field = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const code =
      response.status === 429
        ? 'authentication_rate_limited'
        : authFailureCode(field.code ?? field.error);
    logAuthFailure(stage, code, response.status);
    response.headers.set('Content-Type', 'application/json');
    response.headers.delete('content-length');
    return noStore(
      new Response(JSON.stringify({ error: code }), {
        status: response.status,
        headers: response.headers,
      }),
    );
  }
  return noStore(response);
}
function noStore(response: Response) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
