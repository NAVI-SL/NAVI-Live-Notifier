import { notificationRequest } from '../../../../../../../lib/notification-http';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  context: { params: Promise<{ guildId: string; subscriptionId: string }> },
) {
  const { guildId, subscriptionId } = await context.params;
  return notificationRequest(request, guildId, 'test', subscriptionId);
}
