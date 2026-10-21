import { setTimeout as delay } from 'node:timers/promises';
import {
  loadRootEnvironment,
  readWebEnvironment,
  readBotEnvironment,
  readMonitoringEnvironment,
} from '@navi/config';
import { betaHealth, healthOptions, createHealthAlerts } from './lib/beta-health';

const abort = new AbortController();
const stop = () => abort.abort();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
try {
  const options = healthOptions(process.argv.slice(2));
  const healthAlerts = createHealthAlerts();
  const web = readWebEnvironment(loadRootEnvironment('web'));
  const bot = readBotEnvironment(loadRootEnvironment('bot'));
  const monitor = readMonitoringEnvironment(loadRootEnvironment('worker'));
  if (!bot.BOT_INTERNAL_SECRET || bot.BOT_INTERNAL_SECRET.length < 32)
    throw new Error('Invalid configuration.');
  for (let sample = 1; sample <= options.samples && !abort.signal.aborted; sample++) {
    const result = await betaHealth(
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
  process.off('SIGINT', stop);
  process.off('SIGTERM', stop);
}
