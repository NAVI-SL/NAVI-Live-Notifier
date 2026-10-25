export const PROJECT_NAME = 'NAVI Live Notifier';
export * from './notifications.js';
export * from './bot-commands.js';
export * from './read-cache.js';
export type ServiceName = 'web' | 'bot' | 'worker';

export function scaffoldStatus<T extends ServiceName>(service: T) {
  return { service, status: 'initialized', mode: 'scaffold' } as const;
}

/** Keep scaffold processes running locally, with no external connections or jobs. */
export async function runScaffoldProcess(
  service: Exclude<ServiceName, 'web'>,
  stop: () => void | Promise<void> = () => {},
): Promise<void> {
  console.info(JSON.stringify(scaffoldStatus(service)));
  if (process.argv.includes('--smoke')) {
    await stop();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setInterval(() => {}, 60_000);
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      clearInterval(timer);
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
      Promise.resolve().then(stop).then(resolve, reject);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
