import 'server-only';
import { cache } from 'react';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import {
  createDatabase,
  createStreamerRepository,
  createNotificationRepository,
  schema,
} from '@navi/database';
import { loadRootEnvironment, readAuthEnvironment, readStreamerEnvironment } from '@navi/config';
import { createNaviAuth } from './auth-factory';
import { createGuildService } from './guild-service';
import { botInstallationStatus, discordGuilds } from './discord';
import { createOAuthRecovery } from './oauth-recovery';
import { createStreamerProviders } from './streamer-providers';
import { createStreamerService } from './streamer-service';
import { createNotificationBroker } from './notification-broker';
import { createNotificationService } from './notification-service';
import { AppError } from './errors';

let runtime: ReturnType<typeof createRuntime> | undefined;
// React memoization ends with this RSC request; never reuse permission grants across requests.
const freshGuilds = cache((token: string) => discordGuilds(token, undefined, { fresh: true }));
function createRuntime() {
  const environment = readAuthEnvironment(loadRootEnvironment('web'));
  const database = createDatabase(environment.DATABASE_URL);
  const recovery = createOAuthRecovery(environment);
  const auth = createNaviAuth(
    environment,
    drizzleAdapter(database.db, { provider: 'pg', schema }),
    recovery,
  );
  const guilds = createGuildService({
    auth,
    allowedUsers: environment.DISCORD_ALLOWED_USER_IDS,
    allowedGuilds: environment.BETA_GUILD_IDS,
    clientId: environment.DISCORD_CLIENT_ID,
    origin: environment.WEB_ORIGIN,
    fetchGuilds: (token, options) => (options?.fresh ? freshGuilds(token) : discordGuilds(token)),
    installationStatus: (id) => botInstallationStatus(id, environment),
    accessToken: (headers, accountId) =>
      recovery.run(() =>
        database.withAccountLock(accountId, async () => {
          const result = await auth.api.getAccessToken({ headers, body: { accountId } });
          return result.accessToken;
        }),
      ),
  });
  const streamerEnvironment = readStreamerEnvironment(loadRootEnvironment('web'));
  const providers = createStreamerProviders(streamerEnvironment);
  const streamers = createStreamerService({
    guilds,
    repository: createStreamerRepository(
      database.db,
      undefined,
      streamerEnvironment.STREAMER_SOURCE_LIMIT,
    ),
    resolve: providers.resolve,
    secret: environment.BETTER_AUTH_SECRET,
  });
  const notifications = createNotificationService({
    guilds,
    repository: createNotificationRepository(database.db),
    broker: createNotificationBroker(environment),
  });
  async function authDatabaseReady() {
    try {
      await database.pool.query(
        'SELECT u.*, s.*, a.*, v.* FROM auth_user u, auth_session s, auth_account a, auth_verification v LIMIT 0',
      );
    } catch {
      // Never propagate credential-bearing SQL errors through the public auth boundary.
      throw new AppError(503, 'authentication_database');
    }
  }
  return { auth, guilds, streamers, notifications, environment, authDatabaseReady };
}
// Configuration/DB are evaluated only for auth requests, not at static build time.
export function getRuntime() {
  return (runtime ??= createRuntime());
}
