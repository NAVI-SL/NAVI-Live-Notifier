import { dashboardGuild } from '../../../lib/dashboard-data';
import { ServerWorkspace } from '../../../components/server-workspace';
export const dynamic = 'force-dynamic';
export default async function Overview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  return <ServerWorkspace data={await dashboardGuild(guildId)} section="overview" />;
}
