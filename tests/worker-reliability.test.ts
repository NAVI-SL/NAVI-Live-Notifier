import { afterEach, describe, expect, it, vi } from 'vitest';
import { startMonitorRuntime } from '../apps/worker/src/runtime';
import { createWorkerHealthHandler } from '../apps/worker/src/health';
import { createStatusHandler } from '../apps/bot/src/status-server';
import { notificationDiscordFixture } from './notification-fixtures';
import { spawnSync } from 'node:child_process';

afterEach(() => vi.useRealTimers());
describe('Phase 7 process lifecycle and private health', () => {
  it('fails private bot readiness when REST works but Gateway is disconnected, then recovers without changing sends', async () => {
    let connected = false;
    const fixture = notificationDiscordFixture();
    const handler = createStatusHandler(
      'private-secret',
      async () => 'installed',
      fixture.bot,
      undefined,
      () => ({
        status: connected ? 'ok' : 'degraded',
        state: connected ? 'ready' : 'disconnected',
        changedAt: 123,
      }),
    );
    const request = () =>
      new Request('http://localhost/internal/health', {
        headers: { Authorization: 'Bearer private-secret' },
      });
    expect((await handler(new Request('http://localhost/internal/health'))).status).toBe(401);
    const unavailable = await handler(request());
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get('cache-control')).toBe('no-store');
    expect(await unavailable.json()).toMatchObject({
      status: 'degraded',
      gateway: { state: 'disconnected' },
    });
    connected = true;
    expect((await handler(request())).status).toBe(200);
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
  it('fails enabled entry-point startup safely when PostgreSQL is unreachable', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'apps/worker/src/index.ts'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        MONITORING_ENABLED: 'true',
        BOT_INTERNAL_SECRET: 'synthetic-private-broker-secret-123456',
        DATABASE_URL: 'postgresql://synthetic:FAKE_DATABASE_SECRET@127.0.0.1:1/synthetic',
        REDIS_URL: 'redis://127.0.0.1:6379',
        MONITOR_PUBLIC_ORIGIN: '',
        MONITOR_WEBHOOK_SECRET: '',
        YOUTUBE_API_KEY: '',
        KICK_CLIENT_ID: '',
        KICK_CLIENT_SECRET: '',
      },
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('startup_or_shutdown_failed');
    expect(result.stdout + result.stderr).not.toContain('FAKE_DATABASE_SECRET');
    expect(result.stdout).not.toContain('monitor_started');
  });
  it('does not overlap ticks and aborts/drains once before closing database connections', async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    let complete!: () => void;
    const monitor = {
      tick: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            complete = resolve;
          }),
      ),
      stop: vi.fn(() => events.push('stop')),
    };
    const runtime = startMonitorRuntime(
      monitor,
      {
        abort: () => {
          events.push('abort');
          complete();
        },
        stopServer: async () => {
          events.push('server');
        },
        close: async () => {
          events.push('database');
        },
      },
      () => {},
    );
    await vi.advanceTimersByTimeAsync(60000);
    expect(monitor.tick).toHaveBeenCalledTimes(1);
    await Promise.all([runtime.stop(), runtime.stop()]);
    expect(events).toEqual(['stop', 'abort', 'server', 'database']);
    await vi.advanceTimersByTimeAsync(60000);
    expect(monitor.tick).toHaveBeenCalledTimes(1);
  });
  it('recovers failed ticks, redacts raw errors and still closes the database if server close fails', async () => {
    vi.useFakeTimers();
    const log = vi.fn(),
      close = vi.fn(async () => {});
    const monitor = {
      tick: vi.fn(async () => {
        throw new Error('FAKE_DATABASE_SECRET');
      }),
      stop: vi.fn(),
    };
    const runtime = startMonitorRuntime(
      monitor,
      {
        abort: () => {},
        stopServer: async () => {
          throw new Error('close failed');
        },
        close,
      },
      log,
      100,
    );
    await vi.advanceTimersByTimeAsync(250);
    expect(monitor.tick.mock.calls.length).toBeGreaterThan(1);
    await expect(runtime.stop()).rejects.toThrow('close failed');
    expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_DATABASE_SECRET');
  });
  it('protects worker health separately from public callbacks and reports degraded status honestly', async () => {
    const callback = vi.fn(async () => new Response(null, { status: 204 }));
    let status = 'degraded';
    const handler = createWorkerHealthHandler(
      'synthetic-health-secret',
      () => ({ status }),
      callback,
    );
    const request = (path: string, auth = false) =>
      new Request(`http://127.0.0.1:4100${path}`, {
        headers: auth ? { authorization: 'Bearer synthetic-health-secret' } : {},
      });
    expect((await handler(request('/internal/health'))).status).toBe(401);
    expect((await handler(request('/internal/health', true))).status).toBe(503);
    status = 'ok';
    const response = await handler(request('/internal/health', true));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await handler(request('/webhooks/kick'));
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it('checks current bot REST credentials without sending messages or trusting an identity cache', async () => {
    const fixture = notificationDiscordFixture();
    const handler = createStatusHandler('synthetic', async () => 'installed', fixture.bot);
    const request = () =>
      new Request('http://127.0.0.1:4001/internal/health', {
        headers: { authorization: 'Bearer synthetic' },
      });
    expect((await handler(request())).status).toBe(200);
    fixture.rest.get.mockRejectedValueOnce(new Error('FAKE_BOT_TOKEN'));
    const response = await handler(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('FAKE_BOT_TOKEN');
    expect(fixture.rest.post).not.toHaveBeenCalled();
  });
});
