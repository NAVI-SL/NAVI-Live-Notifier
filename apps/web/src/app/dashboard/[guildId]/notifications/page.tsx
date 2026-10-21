import { dashboardGuild, dashboardNotifications } from '../../../../lib/dashboard-data';
import { ServerWorkspace } from '../../../../components/server-workspace';
import { NotificationManager } from '../../../../components/notification-manager';
export const dynamic = 'force-dynamic';
export default async function Notifications({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const data = await dashboardGuild(guildId),
    subscriptions = await dashboardNotifications(guildId);
  return (
    <ServerWorkspace data={data} section="notifications">
      <NotificationManager guildId={guildId} initial={subscriptions} />
    </ServerWorkspace>
  );
}
