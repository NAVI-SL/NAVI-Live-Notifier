import { getRuntime } from '../../../../../lib/runtime';
import { guildRequest } from '../../../../../lib/application-handlers';
import { errorResponse } from '../../../../../lib/errors';
export async function POST(request: Request, context: { params: Promise<{ guildId: string }> }) {
  try {
    const { guilds, environment } = getRuntime();
    return await guildRequest(
      request,
      guilds,
      'install',
      (await context.params).guildId,
      environment.WEB_ORIGIN,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
