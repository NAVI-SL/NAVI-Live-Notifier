import { getRuntime } from '../../../../lib/runtime';
import { guildRequest } from '../../../../lib/application-handlers';
import { errorResponse } from '../../../../lib/errors';
export async function GET(request: Request, context: { params: Promise<{ guildId: string }> }) {
  try {
    return await guildRequest(
      request,
      getRuntime().guilds,
      'status',
      (await context.params).guildId,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export const dynamic = 'force-dynamic';
