import { timingSafeEqual } from 'node:crypto';
export function createWorkerHealthHandler(
  secret: string,
  health: () => { status: string },
  webhook: (request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    if (new URL(request.url).pathname !== '/internal/health') return webhook(request);
    const supplied = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return new Response(null, { status: 401 });
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    const result = health();
    return Response.json(result, {
      status: result.status === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  };
}
