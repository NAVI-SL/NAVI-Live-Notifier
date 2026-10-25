import type { NaviAuth } from './auth-factory';
import { discordIdentity } from './auth-factory';
import type { DiscordGuild, InstallationStatus } from './discord';
import { AppError } from './errors';

export const BOT_PERMISSIONS = 19456n;
export function canManageGuild(guild: Pick<DiscordGuild, 'owner' | 'permissions'>): boolean {
  return guild.owner || (BigInt(guild.permissions) & (8n | 32n)) !== 0n;
}
export function installationUrl(clientId: string, guildId: string): string {
  if (!/^\d{17,20}$/.test(clientId) || !/^\d{17,20}$/.test(guildId))
    throw new AppError(400, 'invalid_guild');
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: clientId,
    scope: 'bot applications.commands',
    permissions: String(BOT_PERMISSIONS),
    guild_id: guildId,
    disable_guild_select: 'true',
    integration_type: '0',
  }).toString();
  return url.toString();
}
type Dependencies = {
  auth: Pick<NaviAuth, 'api'>;
  allowedUsers: string[];
  allowedGuilds?: string[] | undefined;
  clientId: string;
  origin: string;
  fetchGuilds: (token: string, options?: { fresh: boolean }) => Promise<DiscordGuild[]>;
  installationStatus: (id: string) => Promise<InstallationStatus>;
  commandMode?: boolean;
  accessToken?: (headers: Headers, accountId: string) => Promise<string>;
};

export function createGuildService(deps: Dependencies) {
  async function identity(headers: Headers) {
    const session = await deps.auth.api.getSession({
      headers,
      query: { disableCookieCache: true },
    });
    if (!session) throw new AppError(401, 'login_required');
    const id = discordIdentity(session.user.email);
    if (!id || !deps.allowedUsers.includes(id)) throw new AppError(403, 'account_not_allowed');
    return { id, name: session.user.name, image: session.user.image ?? null };
  }
  async function list(headers: Headers, fresh = false) {
    await identity(headers);
    let token: string;
    try {
      const accounts = await deps.auth.api.listUserAccounts({ headers });
      const account = accounts.find((account) => account.providerId === 'discord');
      if (!account) throw new AppError(401, 'discord_reauthentication_required');
      if (deps.accessToken) token = await deps.accessToken(headers, account.id);
      else {
        const access = await deps.auth.api.getAccessToken({
          headers,
          body: { accountId: account.id },
        });
        token = access.accessToken;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401)
        throw new AppError(401, 'login_required');
      throw new AppError(503, 'authentication_unavailable');
    }
    return (await (fresh ? deps.fetchGuilds(token, { fresh: true }) : deps.fetchGuilds(token)))
      .filter(canManageGuild)
      .filter((guild) => !deps.allowedGuilds || deps.allowedGuilds.includes(guild.id))
      .map(({ id, name, icon }) => ({ id, name, icon }));
  }
  async function authorize(headers: Headers, id: string) {
    if (!/^\d{17,20}$/.test(id)) throw new AppError(400, 'invalid_guild');
    const guild = (await list(headers, true)).find((guild) => guild.id === id);
    if (!guild) throw new AppError(403, 'guild_forbidden');
    return guild;
  }
  return {
    identity,
    list,
    async selection(headers: Headers, page = 1) {
      const guilds = (await list(headers)).sort(
        (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );
      const pages = Math.max(1, Math.ceil(guilds.length / 6));
      const current = Math.min(Math.max(1, Number.isSafeInteger(page) ? page : 1), pages);
      const selected = guilds.slice((current - 1) * 6, current * 6);
      const servers: { guild: (typeof guilds)[number]; status: InstallationStatus }[] = [];
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(3, selected.length) }, async () => {
          while (next < selected.length) {
            const index = next++;
            const guild = selected[index]!;
            servers[index] = { guild, status: await deps.installationStatus(guild.id) };
          }
        }),
      );
      return { servers, page: current, pages, total: guilds.length };
    },
    authorize,
    async status(headers: Headers, id: string) {
      const guild = await authorize(headers, id);
      return {
        guild,
        status: await deps.installationStatus(id),
        commandMode: deps.commandMode ?? false,
      };
    },
    async install(headers: Headers, id: string) {
      await authorize(headers, id);
      return installationUrl(deps.clientId, id);
    },
  };
}
export type GuildService = ReturnType<typeof createGuildService>;
