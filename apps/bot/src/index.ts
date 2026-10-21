import { loadRootEnvironment, readBotEnvironment } from '@navi/config';
import { runScaffoldProcess } from '@navi/core';
import { createBot } from './application.js';
import { discordBotServices, startStatusServer } from './status-server.js';
import { createGateway } from './gateway.js';
import { acquireGatewayLease } from './gateway-lease.js';

const environment = readBotEnvironment(loadRootEnvironment('bot'));
if (!environment.DISCORD_BOT_TOKEN || process.argv.includes('--smoke')) {
  const bot = createBot();
  await runScaffoldProcess('bot', () => bot.destroy());
} else {
  const log = (event: Record<string, unknown>) => console.info(JSON.stringify(event));
  let lease: Awaited<ReturnType<typeof acquireGatewayLease>> | undefined;
  let stopBroker: (() => Promise<void>) | undefined;
  let gateway: ReturnType<typeof createGateway> | undefined;
  let requestStop!: () => void;
  const stopping = new Promise<void>((resolve) => {
    requestStop = resolve;
  });
  const invalidated = () => {
    process.exitCode = 1;
    requestStop();
  };
  const signal = () => requestStop();
  process.on('SIGINT', signal);
  process.on('SIGTERM', signal);
  try {
    // A duplicate must fail before either broker startup or login/IDENTIFY.
    lease = await acquireGatewayLease(environment.DISCORD_BOT_TOKEN);
    const services = discordBotServices(environment.DISCORD_BOT_TOKEN);
    stopBroker = await startStatusServer(
      environment.BOT_STATUS_PORT,
      environment.BOT_INTERNAL_SECRET ?? '',
      services.lookup,
      services.notifications,
      services.diagnostics,
      () => gateway?.health() ?? { status: 'degraded', state: 'starting', changedAt: 0 },
    );
    gateway = createGateway(createBot(), environment.DISCORD_BOT_TOKEN, log, invalidated);
    await Promise.race([gateway.start(), stopping]);
    await stopping;
  } catch {
    log({
      service: 'bot',
      event: 'bot_start_failed',
      code: 'check_credentials_network_and_single_process_ownership',
    });
    process.exitCode = 1;
  } finally {
    process.off('SIGINT', signal);
    process.off('SIGTERM', signal);
    const watchdog = setTimeout(() => {
      log({ service: 'bot', event: 'shutdown_timeout' });
      process.exit(1);
    }, 10000);
    watchdog.unref();
    try {
      try {
        await gateway?.stop();
      } finally {
        await stopBroker?.();
      }
    } catch {
      log({ service: 'bot', event: 'bot_shutdown_failed' });
      process.exitCode = 1;
    } finally {
      await lease?.release();
      clearTimeout(watchdog);
    }
  }
}
