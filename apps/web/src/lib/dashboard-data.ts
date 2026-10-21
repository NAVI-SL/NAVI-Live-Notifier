import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { getRuntime } from './runtime';
import { handlePageError } from './page-session';
// React cache deduplicates within a render/request, never across users or requests.
export const dashboardIdentity = cache(async () => {
  try {
    return await getRuntime().guilds.identity(await headers());
  } catch (error) {
    handlePageError(error);
  }
});
export const dashboardGuild = cache(async (id: string) => {
  try {
    return await getRuntime().guilds.status(await headers(), id);
  } catch (error) {
    handlePageError(error);
  }
});
export async function dashboardSelection(page: number) {
  try {
    return await getRuntime().guilds.selection(await headers(), page);
  } catch (error) {
    handlePageError(error);
  }
}
export async function dashboardStreamers(id: string) {
  try {
    return await getRuntime().streamers.list(await headers(), id);
  } catch (error) {
    handlePageError(error);
  }
}
export async function dashboardNotifications(id: string) {
  try {
    return await getRuntime().notifications.list(await headers(), id);
  } catch (error) {
    handlePageError(error);
  }
}
