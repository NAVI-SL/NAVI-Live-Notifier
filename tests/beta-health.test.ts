import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import {
  betaHealth,
  healthOptions,
  probeHealth,
  createHealthAlerts,
} from '../scripts/lib/beta-health';

describe('private beta read-only operational checks', () => {
  it('emits console-only incident/recovery transitions without flooding unchanged failures', () => {
    const alert = createHealthAlerts();
    const healthy = { status: 'ok', services: { web: 'ok', bot: 'ok', worker: 'ok' } } as const;
    const failed = {
      status: 'degraded',
      services: { web: 'ok', bot: 'unavailable', worker: 'degraded' },
    } as const;
    expect(alert(healthy)).toBeNull();
    expect(alert(failed)).toMatchObject({
      event: 'health_alert',
      severity: 'error',
      delivery: 'console_only',
    });
    expect(alert(failed)).toBeNull();
    expect(alert(healthy)).toMatchObject({ event: 'health_recovered', severity: 'info' });
    expect(alert(healthy)).toBeNull();
    expect(createHealthAlerts()(failed)?.event).toBe('health_alert');
  });
  it('probes a real loopback server and reports a failed health transition without exposing its body', async () => {
    let healthy = true;
    const server = createServer((req, res) => {
      expect(req.method).toBe('GET');
      expect(req.headers.authorization).toBe('Bearer FAKE_SECRET');
      res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', diagnostic: 'FAKE_SECRET' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing test port.');
      const probe = {
        url: `http://127.0.0.1:${address.port}/internal/health`,
        expected: 'ok',
        secret: 'FAKE_SECRET',
      };
      expect(await probeHealth(probe)).toBe('ok');
      healthy = false;
      expect(await probeHealth(probe)).toBe('degraded');
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('fails invalid CLI options safely before reading configuration or making requests', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/check-beta-health.ts', '--url=FAKE_SECRET'],
      { encoding: 'utf8', timeout: 10000 },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('check_local_configuration_and_options');
    expect(result.stderr).not.toContain('FAKE_SECRET');
    expect(result.stdout).toBe('');
  });
  it('uses authenticated GET probes privately, rejects redirects and reports only safe states', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
      expect(options?.redirect).toBe('error');
      expect(options?.headers).toEqual({ Authorization: 'Bearer FAKE_SECRET' });
      expect(options?.method).toBeUndefined();
      return Response.json({ status: 'ok', debug: 'FAKE_SECRET' });
    });
    const result = await probeHealth(
      { url: 'http://127.0.0.1:4001/internal/health', expected: 'ok', secret: 'FAKE_SECRET' },
      fetcher,
    );
    expect(result).toBe('ok');
    expect(JSON.stringify(result)).not.toContain('FAKE_SECRET');
  });
  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [503, 'degraded'],
    [500, 'unavailable'],
  ])('classifies HTTP %s without exposing its body', async (status, expected) => {
    const result = await probeHealth(
      { url: 'http://localhost', expected: 'ok' },
      async () => new Response('FAKE_SECRET', { status: Number(status) }),
    );
    expect(result).toBe(expected);
  });
  it('rejects malformed, oversized or unexpected successful responses', async () => {
    for (const body of ['not-json', 'x'.repeat(5000), '{"status":"degraded"}', 'null']) {
      expect(
        await probeHealth(
          { url: 'http://localhost', expected: 'ok' },
          async () => new Response(body),
        ),
      ).toBe('invalid_response');
    }
  });
  it('redacts connection failures and timeouts', async () => {
    expect(
      await probeHealth({ url: 'http://localhost', expected: 'ok' }, async () => {
        throw new Error('FAKE_SECRET');
      }),
    ).toBe('unavailable');
  });
  it('never treats disabled monitoring as healthy or starts its endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      Response.json({ status: String(url).endsWith('/api/health') ? 'initialized' : 'ok' }),
    );
    const result = await betaHealth(
      {
        webOrigin: 'http://localhost',
        botUrl: 'http://127.0.0.1:4001',
        botSecret: 'FAKE_SECRET',
        workerPort: 4100,
        workerSecret: '',
        monitoringEnabled: false,
      },
      fetcher,
    );
    expect(result).toEqual({
      status: 'degraded',
      services: { web: 'ok', bot: 'ok', worker: 'disabled' },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('aggregates three healthy probes without sending credentials to web', async () => {
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      if (String(url).includes('/api/health')) expect(init?.headers).toEqual({});
      return Response.json({ status: String(url).includes('/api/health') ? 'initialized' : 'ok' });
    });
    expect(
      (
        await betaHealth(
          {
            webOrigin: 'http://localhost',
            botUrl: 'http://127.0.0.1:4001',
            botSecret: 'FAKE_SECRET',
            workerPort: 4100,
            workerSecret: 'FAKE_SECRET',
            monitoringEnabled: true,
          },
          fetcher,
        )
      ).status,
    ).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('bounds sample counts and cadence and rejects unknown or duplicate options', () => {
    expect(healthOptions([])).toEqual({ samples: 1, intervalSeconds: 60 });
    expect(healthOptions(['--samples=3', '--interval-seconds=10'])).toEqual({
      samples: 3,
      intervalSeconds: 10,
    });
    for (const args of [
      ['--samples=0'],
      ['--samples=1441'],
      ['--interval-seconds=1'],
      ['--url=FAKE_SECRET'],
      ['--samples=1', '--samples=2'],
    ])
      expect(() => healthOptions(args)).toThrow('Invalid monitor options.');
  });
});
