import {
  loadRootEnvironment,
  readAuthEnvironment,
  readMonitoringEnvironment,
  readWorkerEnvironment,
  readBotEnvironment,
  readStreamerEnvironment,
} from '@navi/config';

// Read-only admission preflight. Success is configuration consistency, never release approval.
try {
  const web = readAuthEnvironment(loadRootEnvironment('web'));
  const workerValues = loadRootEnvironment('worker');
  const worker = readWorkerEnvironment(workerValues);
  const monitoring = readMonitoringEnvironment(workerValues);
  const bot = readBotEnvironment(loadRootEnvironment('bot'));
  const registration = readStreamerEnvironment(loadRootEnvironment('web'));
  const guilds = web.BETA_GUILD_IDS;
  const publicHttps = (value: string | undefined) => {
    if (!value) return false;
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  };
  const checks = {
    beta_guild_scope_present: !!guilds?.length,
    web_worker_scope_matches:
      !!guilds?.length &&
      !!monitoring.BETA_GUILD_IDS?.length &&
      [...guilds].sort().join(',') === [...monitoring.BETA_GUILD_IDS].sort().join(','),
    user_allowlist_present: web.DISCORD_ALLOWED_USER_IDS.length > 0,
    broker_secret_matches:
      web.BOT_INTERNAL_SECRET === monitoring.BOT_INTERNAL_SECRET &&
      web.BOT_INTERNAL_SECRET === bot.BOT_INTERNAL_SECRET,
    database_target_matches: web.DATABASE_URL === worker.DATABASE_URL,
    broker_target_matches:
      web.BOT_INTERNAL_URL === monitoring.BOT_INTERNAL_URL &&
      new URL(web.BOT_INTERNAL_URL).port === String(bot.BOT_STATUS_PORT),
    source_cap_within_beta_ceiling: registration.STREAMER_SOURCE_LIMIT <= 10,
    bot_token_configured: !!bot.DISCORD_BOT_TOKEN,
    public_https_web_origin: publicHttps(web.WEB_ORIGIN),
    public_https_webhook_origin: publicHttps(monitoring.MONITOR_PUBLIC_ORIGIN),
  };
  console.info(
    JSON.stringify({
      event: 'release_configuration',
      checks,
      ready: Object.values(checks).every(Boolean),
      liveVerification: false,
    }),
  );
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} catch {
  console.error(
    JSON.stringify({
      event: 'release_configuration',
      ready: false,
      code: 'check_service_configuration',
      liveVerification: false,
    }),
  );
  process.exitCode = 1;
}
