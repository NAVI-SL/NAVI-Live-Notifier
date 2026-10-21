import {
  loadRootEnvironment,
  readWorkerEnvironment,
  readMonitoringEnvironment,
} from '@navi/config';
import { runScaffoldProcess } from '@navi/core';
import { createDatabase, createMonitoringRepository } from '@navi/database';
import { createWorker } from './application.js';
import { createMonitor } from './monitor.js';
import { createMonitoringProviders } from './providers.js';
import { createWebhookHandler } from './webhooks.js';
import { startWebhookServer } from './server.js';
import { startMonitorRuntime } from './runtime.js';
import { createWorkerHealthHandler } from './health.js';

const values = loadRootEnvironment('worker');
const environment = readWorkerEnvironment(values),
  monitoring = readMonitoringEnvironment(values);
const worker = createWorker();
if (process.argv.includes('--smoke') || !monitoring.MONITORING_ENABLED) {
  await runScaffoldProcess(worker.service);
} else {
  const database = createDatabase(environment.DATABASE_URL),
    repo = createMonitoringRepository(database.db, undefined, monitoring.BETA_GUILD_IDS);
  const abort = new AbortController();
  const fetcher: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, abort.signal]) : abort.signal,
    });
  const providers = createMonitoringProviders(monitoring, repo, fetcher);
  const monitor = createMonitor(monitoring, repo, providers, database.withAccountLock, fetcher);
  const log = (event: Record<string, unknown>) => console.info(JSON.stringify(event));
  let runtime: ReturnType<typeof startMonitorRuntime> | undefined;
  try {
    await repo.ready(); // Fail before announcing a worker with a missing deployed schema.
    const handler = createWebhookHandler(monitoring, repo, providers);
    const stopServer = await startWebhookServer(
      monitoring.MONITOR_PORT,
      createWorkerHealthHandler(monitoring.BOT_INTERNAL_SECRET!, () => monitor.health(), handler),
    );
    console.info(
      JSON.stringify({
        service: 'worker',
        event: 'monitor_started',
        webhooks: !!monitoring.MONITOR_PUBLIC_ORIGIN,
        youtubeConfigured: !!monitoring.YOUTUBE_API_KEY,
        youtubeDailyBudget: monitoring.YOUTUBE_DAILY_BUDGET,
        schedulerIntervalMs: 10_000,
      }),
    );
    runtime = startMonitorRuntime(
      monitor,
      { abort: () => abort.abort(), stopServer, close: database.close },
      log,
    );
    await new Promise<void>((resolve) => {
      const stop = () => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        resolve();
      };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    });
    const watchdog = setTimeout(() => {
      log({
        service: 'worker',
        event: 'shutdown_timeout',
        code: 'incomplete_sends_require_recovery',
      });
      process.exit(1);
    }, 30_000);
    watchdog.unref();
    try {
      await runtime.stop();
    } finally {
      clearTimeout(watchdog);
    }
  } catch {
    log({
      service: 'worker',
      event: 'startup_or_shutdown_failed',
      code: 'check_schema_configuration_and_services',
    });
    process.exitCode = 1;
  } finally {
    if (!runtime) {
      abort.abort();
      await database.close();
    }
  }
}
