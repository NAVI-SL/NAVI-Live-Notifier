import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGuildService } from '../apps/web/src/lib/guild-service';
import type { NaviAuth } from '../apps/web/src/lib/auth-factory';
import type { DiscordGuild, InstallationStatus } from '../apps/web/src/lib/discord';
import { dashboardNavigation, guildIconUrl } from '../apps/web/src/lib/dashboard-model';
import { ServerWorkspace } from '../apps/web/src/components/server-workspace';
import { ServerSelection } from '../apps/web/src/components/server-selection';

vi.mock('server-only', () => ({}));
const runtime = vi.hoisted(() => ({ service: undefined as unknown }));
vi.mock('../apps/web/src/lib/runtime', () => ({
  getRuntime: () => ({
    guilds: runtime.service,
    streamers: { list: async () => [] },
    notifications: { list: async () => [] },
  }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import Dashboard from '../apps/web/src/app/dashboard/page';
import Overview from '../apps/web/src/app/dashboard/[guildId]/page';
import Channels from '../apps/web/src/app/dashboard/[guildId]/streaming-channels/page';
import Notifications from '../apps/web/src/app/dashboard/[guildId]/notifications/page';
import Settings from '../apps/web/src/app/dashboard/[guildId]/settings/page';

const id = '111111111111111111',
  guildId = '333333333333333333';
const guild = {
  id: guildId,
  name: 'NAVI Community',
  icon: 'a'.repeat(32),
  owner: false,
  permissions: '32',
};
let loggedIn: boolean, allowed: boolean, permitted: boolean;
let fetchGuilds: ReturnType<typeof vi.fn<() => Promise<DiscordGuild[]>>>,
  installationStatus: ReturnType<typeof vi.fn<() => Promise<InstallationStatus>>>;
beforeEach(() => {
  loggedIn = true;
  allowed = true;
  permitted = true;
  fetchGuilds = vi.fn(async () => [{ ...guild, permissions: permitted ? '32' : '0' }]);
  installationStatus = vi.fn(async () => 'installed' as const);
  runtime.service = createGuildService({
    auth: {
      api: {
        getSession: async () =>
          loggedIn
            ? {
                user: {
                  email: `discord-${allowed ? id : '999999999999999999'}@users.navi.invalid`,
                  name: 'Tester',
                },
              }
            : null,
        listUserAccounts: async () => [{ id: 'account', providerId: 'discord' }],
        getAccessToken: async () => ({ accessToken: 'secret' }),
      },
    } as unknown as NaviAuth,
    allowedUsers: [id],
    clientId: '222222222222222222',
    origin: 'http://localhost:3000',
    fetchGuilds,
    installationStatus,
  });
});

describe('protected dashboard routes and selection', () => {
  it('renders authorized servers with escaped names, icons and verified installation state', async () => {
    const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('NAVI Community');
    expect(html).toContain(`/dashboard/${guildId}`);
    expect(html).toContain('cdn.discordapp.com/icons/');
    expect(html).toContain('Bot installed');
    expect(fetchGuilds).toHaveBeenCalledTimes(1);
  });
  it.each([Overview, Channels, Notifications, Settings])(
    'rechecks session and permissions on each server page',
    async (page) => {
      const params = Promise.resolve({ guildId });
      expect(renderToStaticMarkup(await page({ params }))).toContain('NAVI Community');
      permitted = false;
      await expect(page({ params })).rejects.toThrow('redirect:/access-denied');
      expect(installationStatus).toHaveBeenCalledTimes(1);
      loggedIn = false;
      await expect(page({ params })).rejects.toThrow('redirect:/login?error=session');
    },
  );
  it('rejects an unauthorized guild and a removed account allowlist entry', async () => {
    await expect(
      Settings({ params: Promise.resolve({ guildId: '444444444444444444' }) }),
    ).rejects.toThrow('redirect:/access-denied');
    allowed = false;
    await expect(Dashboard({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/access-denied',
    );
    expect(installationStatus).not.toHaveBeenCalled();
  });
  it('requires a current session for server selection, including after logout/expiry', async () => {
    loggedIn = false;
    await expect(Dashboard({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'redirect:/login?error=session',
    );
    expect(fetchGuilds).not.toHaveBeenCalled();
  });
  it('displays empty and unavailable states without claiming a live connection', () => {
    expect(
      renderToStaticMarkup(
        <ServerSelection selection={{ servers: [], total: 0, page: 1, pages: 1 }} />,
      ),
    ).toContain('No manageable servers found');
    const html = renderToStaticMarkup(
      <ServerWorkspace data={{ guild, status: 'unknown' }} section="overview" />,
    );
    expect(html).toContain('Status unavailable');
    expect(html).not.toContain('Install NAVI</button>');
    expect(html).toContain('Channel registry');
    expect(html).toContain('Monitoring requires a running worker');
    expect(html).toContain('Worker status is not verified here');
  });
  it('scopes every navigation link to the selected server and marks the active section', () => {
    const nav = dashboardNavigation(`/dashboard/${guildId}/settings`);
    expect(nav).toHaveLength(4);
    expect(nav.every((item) => item.href?.startsWith(`/dashboard/${guildId}`))).toBe(true);
    expect(nav.filter((item) => item.active).map((item) => item.key)).toEqual(['settings']);
    expect(dashboardNavigation('/dashboard').every((item) => item.href === null)).toBe(true);
    expect(guildIconUrl(guildId, 'https://evil.example')).toBeNull();
  });
  it('shows explicit future states and installation forms only for known absent bots', () => {
    for (const section of ['streaming-channels', 'notifications', 'settings'] as const) {
      const html = renderToStaticMarkup(
        <ServerWorkspace data={{ guild, status: 'not_installed' }} section={section} />,
      );
      expect(html).toContain(`/api/guilds/${guildId}/install`);
      expect(html).toContain(
        section === 'notifications'
          ? 'Automatic delivery requires the enabled monitoring worker'
          : section === 'streaming-channels'
            ? 'Register YouTube and Kick channels'
            : 'Server preferences are not available yet',
      );
      expect(html).not.toContain('type="checkbox"');
    }
  });
  it('paginates only manageable servers and bounds concurrent installation lookups', async () => {
    fetchGuilds.mockResolvedValue(
      Array.from({ length: 9 }, (_, index) => ({
        ...guild,
        id: String(333333333333333330n + BigInt(index)),
        name: `Server ${index}`,
        permissions: index === 8 ? '0' : '32',
      })),
    );
    let active = 0,
      maximum = 0;
    installationStatus.mockImplementation(async () => {
      maximum = Math.max(maximum, ++active);
      await Promise.resolve();
      active--;
      return 'installed';
    });
    const service = runtime.service as ReturnType<typeof createGuildService>;
    const result = await service.selection(new Headers(), 2);
    expect(result).toMatchObject({ page: 2, pages: 2, total: 8 });
    expect(result.servers).toHaveLength(2);
    expect(maximum).toBeLessThanOrEqual(3);
    expect(installationStatus).toHaveBeenCalledTimes(2);
  });
});
