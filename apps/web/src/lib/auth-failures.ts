import { AppError } from './errors';
import { authFailureCode, type AuthFailureCode } from './auth-messages';

export type AuthStage = 'sign_in' | 'sign_out' | 'callback' | 'route';
function classify(error: unknown): { code: AuthFailureCode; status: number } {
  if (error instanceof AppError) return { code: authFailureCode(error.code), status: error.status };
  if (
    error instanceof Error &&
    /^(Invalid environment variables:|Unable to read the repository environment file\.)/.test(
      error.message,
    )
  )
    return { code: 'authentication_configuration', status: 503 };
  return { code: 'authentication_unavailable', status: 503 };
}
export function logAuthFailure(stage: AuthStage, code: AuthFailureCode, status: number) {
  console.warn(JSON.stringify({ event: 'authentication_failure', stage, code, status }));
}
export function authFailureResponse(error: unknown, stage: AuthStage, callbackOrigin?: string) {
  const { code, status } = classify(error);
  logAuthFailure(stage, code, status);
  if (stage === 'callback' && callbackOrigin)
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${callbackOrigin}/login?error=${code}`,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  return Response.json(
    { error: code },
    { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
  );
}
