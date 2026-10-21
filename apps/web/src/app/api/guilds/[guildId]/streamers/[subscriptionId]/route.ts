import { streamerRequest } from '../../../../../../lib/streamer-http';
export const runtime = 'nodejs';
type Context = { params: Promise<{ guildId: string; subscriptionId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { guildId, subscriptionId } = await context.params;
  return streamerRequest(request, guildId, 'change', subscriptionId);
}
export async function DELETE(request: Request, context: Context) {
  const { guildId, subscriptionId } = await context.params;
  return streamerRequest(request, guildId, 'remove', subscriptionId);
}
