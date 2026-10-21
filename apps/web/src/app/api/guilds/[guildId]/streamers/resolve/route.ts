import { streamerRequest } from '../../../../../../lib/streamer-http';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ guildId: string }> }) {
  return streamerRequest(request, (await context.params).guildId, 'resolve');
}
