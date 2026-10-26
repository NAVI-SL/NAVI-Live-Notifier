import { NotificationError, CommandError, commandErrorCode } from '@navi/core';
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
  if (error instanceof CommandError) {
    const code = commandErrorCode(error);
    return Response.json(
      { error: code },
      {
        status:
          code === 'command_forbidden'
            ? 403
            : code === 'invalid_command'
              ? 400
              : code === 'command_not_found'
                ? 404
                : code === 'command_conflict'
                  ? 409
                  : error.retryAfter > 0
                    ? 429
                    : 503,
        headers: {
          'Cache-Control': 'no-store',
          ...(error.retryAfter > 0 ? { 'Retry-After': String(error.retryAfter) } : {}),
        },
      },
    );
  }
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
