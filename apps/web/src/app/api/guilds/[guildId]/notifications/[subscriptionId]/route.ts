import { notificationRequest } from '../../../../../../lib/notification-http';
export const runtime = 'nodejs';
export async function PUT(
  request: Request,
  context: { params: Promise<{ guildId: string; subscriptionId: string }> },
) {
  const { guildId, subscriptionId } = await context.params;
  return notificationRequest(request, guildId, 'save', subscriptionId);
}
