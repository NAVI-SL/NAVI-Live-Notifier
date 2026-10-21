import { dashboardGuild, dashboardStreamers } from '../../../../lib/dashboard-data';
import { ServerWorkspace } from '../../../../components/server-workspace';
import { StreamerManager } from '../../../../components/streamer-manager';
export const dynamic = 'force-dynamic';
export default async function StreamingChannels({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const data = await dashboardGuild(guildId);
  const subscriptions = await dashboardStreamers(guildId);
  return (
    <ServerWorkspace data={data} section="streaming-channels">
      <StreamerManager guildId={guildId} initial={subscriptions} />
    </ServerWorkspace>
  );
}
