import { spawn } from 'node:child_process';
import {
  loadRootEnvironment,
  readAuthEnvironment,
  readBotEnvironment,
  readWorkerEnvironment,
  readMonitoringEnvironment,
  readBotCommandEnvironment,
} from '@navi/config';

const service = process.argv[2];
try {
  if (!['web', 'bot', 'worker', 'migrate'].includes(service)) throw new Error();
  const env = loadRootEnvironment(service === 'migrate' ? 'database' : service);
  if (env.NODE_ENV !== 'production' && service !== 'migrate') throw new Error();
  if (service === 'web') readAuthEnvironment(env);
  if (service === 'bot') {
    const bot = readBotEnvironment(env);
    readBotCommandEnvironment(env);
    if (!bot.DISCORD_BOT_TOKEN || !bot.BOT_INTERNAL_SECRET || bot.BOT_INTERNAL_SECRET.length < 32)
      throw new Error();
  }
  if (service === 'worker') {
    readWorkerEnvironment(env);
    if (!readMonitoringEnvironment(env).MONITORING_ENABLED) throw new Error();
  }
  const commands = {
    web: ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1'],
    bot: ['apps/bot/dist/index.js'],
    worker: ['apps/worker/dist/index.js'],
    migrate: ['deployment/migrate.mjs'],
  };
  const child = spawn(process.execPath, commands[service], { stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => {
    console.error(JSON.stringify({ service, event: 'process_unavailable' }));
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1);
  });
} catch {
  console.error(
    JSON.stringify({ service: 'deployment', event: 'invalid_production_configuration' }),
  );
  process.exitCode = 1;
}
