import { getRuntime } from '../../../../lib/runtime';
import { handleAuthRequest } from '../../../../lib/auth-handler';
import { authFailureResponse } from '../../../../lib/auth-failures';
async function handle(request: Request) {
  try {
    const { auth, environment, authDatabaseReady } = getRuntime();
    return await handleAuthRequest(request, auth, environment.WEB_ORIGIN, authDatabaseReady);
  } catch (error) {
    return authFailureResponse(error, 'route');
  }
}
export const GET = handle;
export const POST = handle;
export const dynamic = 'force-dynamic';
