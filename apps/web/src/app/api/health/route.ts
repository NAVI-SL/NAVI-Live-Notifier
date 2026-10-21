import { scaffoldStatus } from '@navi/core';

export function GET() {
  // Liveness only. This does not claim bot, database or provider readiness.
  return Response.json(scaffoldStatus('web'), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
