import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRootEnvironment, readAuthEnvironment } from '@navi/config';
import { memoryAdapter } from '@better-auth/memory-adapter';
import { createNaviAuth } from '../apps/web/src/lib/auth-factory';
import { handleAuthRequest } from '../apps/web/src/lib/auth-handler';

const folders: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
function environmentFile(text: string) {
  const folder = mkdtempSync(join(tmpdir(), 'navi-production-'));
  folders.push(folder);
  const file = join(folder, 'service.env');
  writeFileSync(file, text);
  return file;
}
async function command(script: string, service: string, file: string) {
  const child = spawn(process.execPath, [script, service], {
    env: { NODE_ENV: 'production', NAVI_ENV_FILE: file, SystemRoot: process.env.SystemRoot },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (value) => (output += String(value)));
  child.stderr.on('data', (value) => (output += String(value)));
  const timer = setTimeout(() => child.kill(), 10000);
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    return { code, output };
  } finally {
    clearTimeout(timer);
  }
}
describe('production secret loading, startup and health probes', () => {
  it.each([
    [false, true],
    [true, true],
    [false, false],
    [true, false],
  ])(
    'checks release configuration without networking or printing credentials (scope: %s, monitoring: %s)',
    async (scoped, enabled) => {
      const file = environmentFile(
        [
          // Official-domain strings are syntax fixtures only; no network call is made.
          'WEB_ORIGIN=https://discord.com',
          'DATABASE_URL=postgresql://synthetic:FAKE_SECRET@direct.example/navi?sslmode=verify-full',
          'REDIS_URL=rediss://localhost:6379',
          'BOT_INTERNAL_URL=http://127.0.0.1:4001',
          'BOT_STATUS_PORT=4001',
          'STREAMER_SOURCE_LIMIT=10',
          'BETTER_AUTH_SECRET=synthetic-secret-at-least-thirty-two-characters',
          'DISCORD_CLIENT_ID=111111111111111111',
          'DISCORD_CLIENT_SECRET=FAKE_SECRET',
          'DISCORD_ALLOWED_USER_IDS=222222222222222222',
          'DISCORD_BOT_TOKEN=FAKE_SECRET',
          'BOT_INTERNAL_SECRET=synthetic-broker-secret-at-least-thirty-two-characters',
          'MONITOR_PUBLIC_ORIGIN=https://discord.com',
          `MONITORING_ENABLED=${enabled}`,
          'MONITOR_WEBHOOK_SECRET=synthetic-hook-secret-at-least-thirty-two-characters',
          'YOUTUBE_API_KEY=FAKE_SECRET',
          'KICK_CLIENT_ID=synthetic-app',
          'KICK_CLIENT_SECRET=FAKE_SECRET',
          `BETA_GUILD_IDS=${scoped ? '333333333333333333' : ''}`,
        ].join('\n'),
      );
      const result = await command('scripts/check-release.ts', 'check', file);
      expect(result.code).toBe(scoped && enabled ? 0 : 1);
      expect(result.output).not.toContain('FAKE_SECRET');
      const report = JSON.parse(result.output) as {
        ready: boolean;
        liveVerification: boolean;
        checks: { beta_guild_scope_present: boolean };
      };
      expect(report.ready).toBe(scoped && enabled);
      expect(report.liveVerification).toBe(false);
      expect(report.checks.beta_guild_scope_present).toBe(scoped);
    },
  );
  it('selects only service fields from a mounted secret and fails closed if it is missing', () => {
    const file = environmentFile('WEB_ORIGIN=https://navi.example\nDISCORD_BOT_TOKEN=FAKE_SECRET');
    vi.stubEnv('NAVI_ENV_FILE', file);
    expect(loadRootEnvironment('web').WEB_ORIGIN).toBe('https://navi.example');
    expect(loadRootEnvironment('web')).not.toHaveProperty('DISCORD_BOT_TOKEN');
    vi.stubEnv('NAVI_ENV_FILE', join(file, 'missing'));
    expect(() => loadRootEnvironment('web')).toThrow('Unable to read');
  });
  it.each(['bot', 'worker', 'unknown'])(
    'rejects incomplete %s production startup without external calls or secrets',
    async (service) => {
      const file = environmentFile(
        'DISCORD_BOT_TOKEN=\nBOT_INTERNAL_SECRET=\nMONITORING_ENABLED=false\nDATABASE_URL=postgresql://u:FAKE_SECRET@127.0.0.1:1/navi\nREDIS_URL=redis://localhost:6379',
      );
      const result = await command('deployment/start.mjs', service, file);
      expect(result.code).toBe(1);
      expect(result.output).toContain('invalid_production_configuration');
      expect(result.output).not.toContain('FAKE_SECRET');
      expect(result.output).not.toContain('gateway_ready');
    },
  );
  it('checks actual loopback health, authenticates privately and fails on degraded status', async () => {
    let healthy = true;
    const server = createServer((req, res) => {
      expect(req.url).toBe('/internal/health');
      expect(req.headers.authorization).toBe('Bearer FAKE_SECRET');
      res.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture port.');
    const file = environmentFile(
      `BOT_STATUS_PORT=${address.port}\nBOT_INTERNAL_SECRET=FAKE_SECRET`,
    );
    try {
      expect(await command('deployment/healthcheck.mjs', 'bot', file)).toEqual({
        code: 0,
        output: '',
      });
      healthy = false;
      expect(await command('deployment/healthcheck.mjs', 'bot', file)).toEqual({
        code: 1,
        output: '',
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('uses secure HTTP-only browser-bound state cookies at the production HTTPS origin', async () => {
    const origin = 'https://navi.example';
    const env = readAuthEnvironment({
      NODE_ENV: 'production',
      WEB_ORIGIN: origin,
      DATABASE_URL: 'postgresql://localhost/navi',
      BETTER_AUTH_SECRET: 'synthetic-production-auth-secret-123456789',
      DISCORD_CLIENT_ID: '222222222222222222',
      DISCORD_CLIENT_SECRET: 'synthetic',
      DISCORD_ALLOWED_USER_IDS: '111111111111111111',
      BOT_INTERNAL_SECRET: 'synthetic-production-broker-secret-12345',
    });
    const auth = createNaviAuth(
      env,
      memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    );
    const response = await handleAuthRequest(
      new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers: { origin } }),
      auth,
      origin,
    );
    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie().join(';');
    expect(cookies).toMatch(/secure/i);
    expect(cookies).toMatch(/httponly/i);
    expect(cookies).toMatch(/samesite=lax/i);
  });
});
