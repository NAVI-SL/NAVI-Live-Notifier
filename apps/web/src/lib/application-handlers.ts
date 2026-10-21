import type { GuildService } from './guild-service';
import { assertOrigin, errorResponse } from './errors';
export async function guildRequest(
  request: Request,
  guilds: GuildService,
  operation: 'list' | 'status' | 'install',
  id?: string,
  origin?: string,
) {
  try {
    if (operation === 'install') {
      assertOrigin(request, origin ?? '');
      const url = await guilds.install(request.headers, id ?? '');
      return new Response(null, {
        status: 303,
        headers: { Location: url, 'Cache-Control': 'no-store' },
      });
    }
    const result =
      operation === 'list'
        ? await guilds.list(request.headers)
        : await guilds.status(request.headers, id ?? '');
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
