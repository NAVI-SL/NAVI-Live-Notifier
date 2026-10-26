import { setTimeout as delay } from 'node:timers/promises';
import {
  loadRootEnvironment,
  readAuthEnvironment,
  readBotEnvironment,
  readMonitoringEnvironment,
} from '@navi/config';
import { createDatabase } from '@navi/database';
import {
  betaHealth,
  healthOptions,
  createHealthAlerts,
  probeAuthDatabase,
} from './lib/beta-health';

const abort = new AbortController();
const stop = () => abort.abort();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
let database: ReturnType<typeof createDatabase> | undefined;
try {
  const options = healthOptions(process.argv.slice(2));
  const healthAlerts = createHealthAlerts();
  const web = readAuthEnvironment(loadRootEnvironment('web'));
  const bot = readBotEnvironment(loadRootEnvironment('bot'));
  const monitor = readMonitoringEnvironment(loadRootEnvironment('worker'));
  if (!bot.BOT_INTERNAL_SECRET || bot.BOT_INTERNAL_SECRET.length < 32)
    throw new Error('Invalid configuration.');
  database = createDatabase(web.DATABASE_URL);
  for (let sample = 1; sample <= options.samples && !abort.signal.aborted; sample++) {
    const services = await betaHealth(
      {
        webOrigin: web.WEB_ORIGIN,
        botUrl: `http://127.0.0.1:${bot.BOT_STATUS_PORT}`,
        botSecret: bot.BOT_INTERNAL_SECRET,
        workerPort: monitor.MONITOR_PORT,
        workerSecret: monitor.BOT_INTERNAL_SECRET ?? '',
        monitoringEnabled: monitor.MONITORING_ENABLED,
      },
      fetch,
      abort.signal,
    );
    const databaseResult = await probeAuthDatabase((sql) => database!.pool.query(sql));
    const result = {
      ...services,
      status:
        services.status === 'ok' && databaseResult.status === 'ok'
          ? ('ok' as const)
          : ('degraded' as const),
      database: databaseResult,
    };
    if (abort.signal.aborted) break;
    const event = {
      time: new Date().toISOString(),
      event: 'beta_health',
      severity: result.status === 'ok' ? 'info' : 'error',
      sample,
      ...result,
    };
    if (result.status !== 'ok') process.exitCode = 1;
    console.info(JSON.stringify(event));
    const alert = healthAlerts(result);
    if (alert) console.info(JSON.stringify({ time: event.time, ...alert }));
    if (sample < options.samples)
      await delay(options.intervalSeconds * 1000, undefined, { signal: abort.signal });
  }
} catch {
  if (!abort.signal.aborted) {
    console.error(
      JSON.stringify({
        time: new Date().toISOString(),
        event: 'beta_health_error',
        code: 'check_local_configuration_and_options',
      }),
    );
    process.exitCode = 1;
  }
} finally {
  await database?.close();
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
}
