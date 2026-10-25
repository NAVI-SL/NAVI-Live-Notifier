import {
  readAuthEnvironment,
  readBotEnvironment,
  readBotCommandEnvironment,
  readMonitoringEnvironment,
  readWorkerEnvironment,
  readStreamerEnvironment,
} from '@navi/config';
import { isPublicHttpsOrigin } from './release-origin.ts';
type Environment = Record<string, string | undefined>;
/** Canonical endpoint/database identity only: deliberately excludes credentials, never returned to logs. */
export function sameDatabaseTarget(first: string, second: string) {
  try {
    const identity = (value: string) => {
      const url = new URL(value);
      if (
        !['postgres:', 'postgresql:'].includes(url.protocol) ||
        !url.hostname ||
        url.pathname.length <= 1 ||
        url.searchParams.has('host') ||
        url.searchParams.has('port') ||
        url.searchParams.has('dbname') ||
        url.searchParams.has('service') ||
        url.searchParams.has('options')
      )
        throw new Error();
      return [
        url.hostname.toLowerCase(),
        url.port || '5432',
        decodeURIComponent(url.pathname.slice(1)),
      ];
    };
    return JSON.stringify(identity(first)) === JSON.stringify(identity(second));
  } catch {
    return false;
  }
}
export function verifiedDirectDatabase(value: string) {
  try {
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.hostname.split('.')[0]!.includes('-pooler') &&
      url.searchParams.get('sslmode') === 'verify-full' &&
      ![
        'host',
        'port',
        'dbname',
        'service',
        'options',
        'sslcert',
        'sslkey',
        'sslrootcert',
        'ssl',
      ].some((key) => url.searchParams.has(key)) &&
      url.searchParams.get('uselibpqcompat') !== 'true'
    );
  } catch {
    return false;
  }
}
const equalScope = (a: readonly string[] | undefined, b: readonly string[] | undefined) =>
  Boolean(a?.length && b?.length && [...a].sort().join(',') === [...b].sort().join(','));
/** Read-only consistency check. No connections, tokens, URLs or admission changes are returned. */
export function releaseConfiguration(values: {
  web: Environment;
  bot: Environment;
  worker: Environment;
}) {
  const web = readAuthEnvironment(values.web),
    worker = readWorkerEnvironment(values.worker),
    monitoring = readMonitoringEnvironment(values.worker),
    bot = readBotEnvironment(values.bot),
    registration = readStreamerEnvironment(values.web);
  const postgres = web.BOT_COMMAND_TRANSPORT === 'postgres';
  let commands: ReturnType<typeof readBotCommandEnvironment> | undefined;
  if (postgres) {
    try {
      commands = readBotCommandEnvironment({ ...values.bot, BOT_COMMANDS_ENABLED: 'true' });
    } catch {
      /* Missing prepared command configuration fails checks, never activates processing. */
    }
  }
  const checks = {
    production_service_modes:
      web.NODE_ENV === 'production' &&
      bot.NODE_ENV === 'production' &&
      worker.NODE_ENV === 'production',
    beta_guild_scope_present: Boolean(web.BETA_GUILD_IDS?.length),
    web_worker_scope_matches: equalScope(web.BETA_GUILD_IDS, monitoring.BETA_GUILD_IDS),
    user_allowlist_present: web.DISCORD_ALLOWED_USER_IDS.length > 0,
    broker_secret_matches: Boolean(
      bot.BOT_INTERNAL_SECRET &&
      bot.BOT_INTERNAL_SECRET.length >= 32 &&
      bot.BOT_INTERNAL_SECRET === monitoring.BOT_INTERNAL_SECRET &&
      (postgres || bot.BOT_INTERNAL_SECRET === web.BOT_INTERNAL_SECRET),
    ),
    database_target_matches:
      sameDatabaseTarget(web.DATABASE_URL, worker.DATABASE_URL) &&
      (!postgres ||
        Boolean(commands?.enabled && sameDatabaseTarget(web.DATABASE_URL, commands.databaseUrl))),
    broker_target_matches:
      new URL(monitoring.BOT_INTERNAL_URL).port === String(bot.BOT_STATUS_PORT) &&
      (postgres || web.BOT_INTERNAL_URL === monitoring.BOT_INTERNAL_URL),
    command_policy_matches:
      !postgres ||
      Boolean(
        commands?.enabled &&
        equalScope(commands.allowedGuilds, web.BETA_GUILD_IDS) &&
        equalScope(commands.allowedUsers, web.DISCORD_ALLOWED_USER_IDS),
      ),
    command_consumer_enabled: !postgres || values.bot.BOT_COMMANDS_ENABLED === 'true',
    command_admission_enabled: !postgres || web.BOT_COMMAND_ADMISSION_ENABLED,
    verified_direct_database_tls:
      verifiedDirectDatabase(web.DATABASE_URL) &&
      verifiedDirectDatabase(worker.DATABASE_URL) &&
      (!postgres || Boolean(commands?.enabled && verifiedDirectDatabase(commands.databaseUrl))),
    native_redis_tls: new URL(worker.REDIS_URL).protocol === 'rediss:',
    source_cap_within_beta_ceiling: registration.STREAMER_SOURCE_LIMIT <= 10,
    bot_token_configured: Boolean(bot.DISCORD_BOT_TOKEN),
    monitoring_enabled: monitoring.MONITORING_ENABLED,
    platform_credentials_configured: Boolean(
      registration.YOUTUBE_API_KEY &&
      registration.KICK_CLIENT_ID &&
      registration.KICK_CLIENT_SECRET &&
      monitoring.YOUTUBE_API_KEY &&
      monitoring.KICK_CLIENT_ID &&
      monitoring.KICK_CLIENT_SECRET,
    ),
    public_https_web_origin: isPublicHttpsOrigin(web.WEB_ORIGIN),
    public_https_webhook_origin: isPublicHttpsOrigin(monitoring.MONITOR_PUBLIC_ORIGIN),
  };
  return {
    transport: postgres ? 'postgres' : 'http',
    checks,
    ready: Object.values(checks).every(Boolean),
    liveVerification: false,
  };
}
