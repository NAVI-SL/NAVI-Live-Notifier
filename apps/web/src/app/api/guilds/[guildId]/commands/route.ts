import { commandRequest } from '../../../../../lib/command-http';
import { getRuntime } from '../../../../../lib/runtime';
import { errorResponse } from '../../../../../lib/errors';
export async function POST(request: Request, context: { params: Promise<{ guildId: string }> }) {
  try {
    return await commandRequest(request, (await context.params).guildId, getRuntime());
  } catch (error) {
    return errorResponse(error);
  }
}
export const dynamic = 'force-dynamic';
