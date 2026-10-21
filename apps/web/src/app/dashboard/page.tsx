import { dashboardSelection } from '../../lib/dashboard-data';
import { ServerSelection } from '../../components/server-selection';
export const dynamic = 'force-dynamic';
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  return <ServerSelection selection={await dashboardSelection(Number(page ?? 1))} />;
}
