type Monitor = { tick(): Promise<void>; stop(): void };
/** One in-flight tick; stop admission before aborting I/O and draining resources. */
export function startMonitorRuntime(
  monitor: Monitor,
  resources: { abort(): void; stopServer(): Promise<void>; close(): Promise<void> },
  log: (event: Record<string, unknown>) => void,
  interval = 10_000,
) {
  let running: Promise<void> | undefined;
  let stopping: Promise<void> | undefined;
  let stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = monitor
      .tick()
      .catch(() => log({ service: 'worker', event: 'monitor_error', code: 'monitor_unavailable' }))
      .finally(() => {
        running = undefined;
      });
  };
  const timer = setInterval(tick, interval);
  tick();
  return {
    stop() {
      stopping ??= (async () => {
        stopped = true;
        clearInterval(timer);
        monitor.stop();
        resources.abort();
        try {
          await running;
        } finally {
          try {
            await resources.stopServer();
          } finally {
            await resources.close();
          }
        }
        log({ service: 'worker', event: 'monitor_stopped' });
      })();
      return stopping;
    },
  };
}
