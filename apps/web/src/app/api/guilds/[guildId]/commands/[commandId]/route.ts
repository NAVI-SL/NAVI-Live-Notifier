import { commandRequest } from '../../../../../../lib/command-http';
import { getRuntime } from '../../../../../../lib/runtime';
import { errorResponse } from '../../../../../../lib/errors';
export async function GET(
  request: Request,
  context: { params: Promise<{ guildId: string; commandId: string }> },
) {
  try {
    const { guildId, commandId } = await context.params;
    return await commandRequest(request, guildId, getRuntime(), commandId);
  } catch (error) {
    return errorResponse(error);
  }
}
export const dynamic = 'force-dynamic';
