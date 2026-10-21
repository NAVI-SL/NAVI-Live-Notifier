import type { InstallationStatus } from './discord';
export const dashboardSections = [
  { key: 'overview', label: 'Overview', suffix: '' },
  { key: 'streaming-channels', label: 'Streaming Channels', suffix: '/streaming-channels' },
  { key: 'notifications', label: 'Notifications', suffix: '/notifications' },
  { key: 'settings', label: 'Settings', suffix: '/settings' },
] as const;
export type DashboardSection = (typeof dashboardSections)[number]['key'];
export function dashboardNavigation(path: string) {
  const id = /^\/dashboard\/(\d{17,20})(?:\/|$)/.exec(path)?.[1];
  return dashboardSections.map((section) => {
    const href = id ? `/dashboard/${id}${section.suffix}` : null;
    return { ...section, href, active: href === path };
  });
}
export function installationLabel(status: InstallationStatus) {
  return {
    installed: 'Bot installed',
    not_installed: 'Bot not installed',
    unknown: 'Status unavailable',
  }[status];
}
export function guildIconUrl(id: string, icon: string | null): string | null {
  return /^\d{17,20}$/.test(id) && icon && /^(?:a_)?[a-f0-9]{32}$/.test(icon)
    ? `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=128`
    : null;
}
export const sectionContent = {
  'streaming-channels': {
    title: 'Streaming Channels',
    heading: 'No streaming channels configured',
    description:
      'Register YouTube and Kick channels and configure a notification destination for each subscription.',
  },
  notifications: {
    title: 'Notifications',
    heading: 'Configure notification delivery',
    description:
      'Configure per-streamer destinations and send labelled tests. Automatic delivery requires the enabled monitoring worker.',
  },
  settings: {
    title: 'Settings',
    heading: 'Your server workspace',
    description:
      'Server preferences are not available yet. Your Discord permissions and bot connection are verified whenever you open this workspace.',
  },
} as const;
