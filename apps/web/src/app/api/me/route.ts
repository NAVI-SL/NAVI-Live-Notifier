import { getRuntime } from '../../../lib/runtime';
import { errorResponse } from '../../../lib/errors';
export async function GET(request: Request) {
  try {
    return Response.json(await getRuntime().guilds.identity(request.headers), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export const dynamic = 'force-dynamic';
