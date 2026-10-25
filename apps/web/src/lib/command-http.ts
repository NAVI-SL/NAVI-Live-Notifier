import type { createCommandAdmission } from '@navi/database';
import { assertOrigin, AppError, errorResponse } from './errors';
import { json } from './request-json';
export type CommandAdmission = ReturnType<typeof createCommandAdmission>;
export function commandAccepted(
  guildId: string,
  command: Awaited<ReturnType<CommandAdmission['submit']>>,
) {
  const statusUrl = `/api/guilds/${guildId}/commands/${command.id}`;
  return Response.json(
    { accepted: true, command: { ...command, statusUrl } },
    {
      status: 202,
      headers: { 'Cache-Control': 'no-store', Location: statusUrl, 'Retry-After': '3' },
    },
  );
}
/** The only generic command API: strict queue schemas, never an HTTP/Discord proxy. */
export async function commandRequest(
  request: Request,
  guildId: string,
  deps: {
    commands: CommandAdmission | undefined;
    environment: { WEB_ORIGIN: string; BOT_COMMAND_ADMISSION_ENABLED?: boolean };
  },
  id?: string,
) {
  try {
    if (!deps.commands) throw new AppError(404, 'command_mode_disabled');
    if (id !== undefined)
      return Response.json(await deps.commands.status(request.headers, guildId, id), {
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' },
      });
    assertOrigin(request, deps.environment.WEB_ORIGIN);
    if (deps.environment.BOT_COMMAND_ADMISSION_ENABLED === false)
      throw new AppError(503, 'command_admission_paused');
    return commandAccepted(
      guildId,
      await deps.commands.submit(
        request.headers,
        guildId,
        request.headers.get('idempotency-key') ?? '',
        await json(request),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
