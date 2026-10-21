import { NotificationError } from '@navi/core';
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly retryAfter?: number,
  ) {
    super(code);
  }
}
export function errorResponse(error: unknown) {
  const known = error instanceof AppError || error instanceof NotificationError;
  return Response.json(
    { error: known ? error.code : 'service_unavailable' },
    {
      status: known ? error.status : 503,
      headers: {
        'Cache-Control': 'no-store',
        ...(known && error.retryAfter !== undefined
          ? { 'Retry-After': String(error.retryAfter) }
          : {}),
      },
    },
  );
}
export function assertOrigin(request: Request, origin: string) {
  if (
    request.headers.get('origin') !== origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new AppError(403, 'invalid_origin');
}
