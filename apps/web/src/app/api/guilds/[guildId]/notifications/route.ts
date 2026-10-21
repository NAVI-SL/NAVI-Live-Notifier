import { notificationRequest } from '../../../../../lib/notification-http';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ guildId: string }> }) {
  return notificationRequest(request, (await context.params).guildId, 'list');
}
