import { Events, type Client } from 'discord.js';
import { BOT_PRESENCE } from './application.js';

export function createGateway(
  client: Client,
  token: string,
  log: (event: Record<string, unknown>) => void,
  fatal: () => void = () => {},
) {
  let starting: Promise<void> | undefined;
  let stopping: Promise<void> | undefined;
  let stopped = false;
  let state = 'starting';
  let changedAt = Date.now();
  const change = (value: string) => {
    if ((stopped || state === 'invalidated') && value !== 'stopped') return;
    state = value;
    changedAt = Date.now();
  };
  const report = (event: string) => log({ service: 'bot', event });
  const ready = () => {
    if (stopped) return;
    change('ready');
    client.user?.setPresence(BOT_PRESENCE);
    report('gateway_ready');
  };
  const reconnecting = () => {
    change('reconnecting');
    report('gateway_reconnecting');
  };
  const resumed = () => {
    if (!stopped) change('ready');
    report('gateway_resumed');
  };
  const disconnected = () => {
    change('disconnected');
    report('gateway_disconnected');
  };
  const error = () => report('gateway_error');
  const invalidated = () => {
    change('invalidated');
    report('gateway_invalidated');
    fatal();
  };
  // Never attach SDK debug/raw packet logging: those events can contain sensitive data.
  const listeners = [
    [Events.ClientReady, ready],
    [Events.ShardReconnecting, reconnecting],
    [Events.ShardResume, resumed],
    [Events.ShardDisconnect, disconnected],
    [Events.Error, error],
    [Events.ShardError, error],
    [Events.Invalidated, invalidated],
  ] as const;
  for (const [event, handler] of listeners) client.on(event, handler);
  return {
    health() {
      return { status: !stopped && state === 'ready' ? 'ok' : 'degraded', state, changedAt };
    },
    start() {
      starting ??= (async () => {
        if (stopped) throw new Error('Gateway is stopped.');
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            client.login(token).then(() => {}),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('Gateway startup unavailable.')), 30_000);
            }),
          ]);
        } catch {
          change('unavailable');
          throw new Error('Gateway startup unavailable.');
        } finally {
          if (timer) clearTimeout(timer);
        }
      })();
      return starting;
    },
    stop() {
      stopping ??= (async () => {
        stopped = true;
        change('stopped');
        try {
          await client.destroy();
        } finally {
          for (const [event, handler] of listeners) client.off(event, handler);
        }
        report('gateway_stopped');
      })();
      return stopping;
    },
  };
}
