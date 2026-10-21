import { getRuntime } from '../../../lib/runtime';
import { guildRequest } from '../../../lib/application-handlers';
import { errorResponse } from '../../../lib/errors';
export async function GET(request: Request) {
  try {
    return await guildRequest(request, getRuntime().guilds, 'list');
  } catch (error) {
    return errorResponse(error);
  }
}
export const dynamic = 'force-dynamic';
