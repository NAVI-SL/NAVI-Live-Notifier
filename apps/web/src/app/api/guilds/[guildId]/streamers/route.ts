import { streamerRequest } from '../../../../../lib/streamer-http';
export const runtime = 'nodejs';
type Context = { params: Promise<{ guildId: string }> };
export async function GET(request: Request, context: Context) {
  return streamerRequest(request, (await context.params).guildId, 'list');
}
export async function POST(request: Request, context: Context) {
  return streamerRequest(request, (await context.params).guildId, 'add');
}
