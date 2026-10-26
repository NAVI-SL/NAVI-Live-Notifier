import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { inspectCommandDatabase } from '@navi/database';
import {
  releaseConfiguration,
  sameDatabaseTarget,
  verifiedDirectDatabase,
} from '../scripts/lib/release-configuration';
import { commandGrantSql } from '../scripts/lib/command-grants';
import { secretCandidates } from '../scripts/lib/secret-candidates';

// Pure syntax/permission fixtures. These domains and flags never provision or enable a service.
const db = (role: string) =>
  `postgresql://${role}:SYNTHETIC_ONLY@direct.example/navi?sslmode=verify-full`;
const common = {
  NODE_ENV: 'production' as const,
  BETA_GUILD_IDS: '111111111111111111',
  DISCORD_ALLOWED_USER_IDS: '222222222222222222',
};
const secret = 'synthetic-private-broker-secret-32-characters';
function fixtures() {
  return {
    web: {
      ...common,
      WEB_ORIGIN: 'https://discord.com',
      DATABASE_URL: db('web'),
      BETTER_AUTH_SECRET: 'synthetic-auth-secret-with-32-characters',
      DISCORD_CLIENT_ID: '333333333333333333',
      DISCORD_CLIENT_SECRET: 'SYNTHETIC_ONLY',
      BOT_COMMAND_TRANSPORT: 'postgres',
      YOUTUBE_API_KEY: 'SYNTHETIC_ONLY',
      KICK_CLIENT_ID: 'fixture-app',
      KICK_CLIENT_SECRET: 'SYNTHETIC_ONLY',
    },
    bot: {
      ...common,
      DISCORD_BOT_TOKEN: 'SYNTHETIC_ONLY',
      BOT_INTERNAL_SECRET: secret,
      BOT_STATUS_PORT: '4001',
      BOT_COMMANDS_ENABLED: 'true',
      DATABASE_URL: db('consumer'),
    },
    worker: {
      ...common,
      DATABASE_URL: db('worker'),
      REDIS_URL: 'rediss://default:SYNTHETIC_ONLY@redis.example:6379',
      MONITORING_ENABLED: 'true',
      BOT_INTERNAL_SECRET: secret,
      MONITOR_PUBLIC_ORIGIN: 'https://discord.com',
      MONITOR_WEBHOOK_SECRET: 'synthetic-webhook-secret-with-32-characters',
      YOUTUBE_API_KEY: 'SYNTHETIC_ONLY',
      KICK_CLIENT_ID: 'fixture-app',
      KICK_CLIENT_SECRET: 'SYNTHETIC_ONLY',
    },
  };
}
describe('mode-aware cloud preflight without service side effects', () => {
  it('accepts distinct restricted DB identities for one target and omits web broker requirements', () => {
    const report = releaseConfiguration(fixtures());
    expect(report.ready).toBe(true);
    expect(report.transport).toBe('postgres');
    expect(report.liveVerification).toBe(false);
    expect(JSON.stringify(report)).not.toContain('SYNTHETIC_ONLY');
    expect(JSON.stringify(report)).not.toContain('direct.example');
  });
  it.each(['host', 'port', 'dbname', 'service', 'options'])(
    'rejects alternate endpoint routing through %s',
    (key) => {
      expect(sameDatabaseTarget(db('web'), db('other') + `&${key}=foreign`)).toBe(false);
    },
  );
  it('requires actual database names and preserves database/endpoint distinctions', () => {
    expect(sameDatabaseTarget(db('web'), db('worker'))).toBe(true);
    expect(sameDatabaseTarget('postgres://one:fake@db/', 'postgres://two:fake@db/')).toBe(false);
    expect(sameDatabaseTarget(db('web'), db('worker').replace('/navi?', '/other?'))).toBe(false);
    expect(
      sameDatabaseTarget(db('web'), db('worker').replace('direct.example', 'foreign.example')),
    ).toBe(false);
  });
  it.each([
    'sslmode=require',
    'sslmode=no-verify',
    'sslmode=disable',
    'sslmode=verify-full&uselibpqcompat=true',
  ])('rejects unsafe TLS profile %s', (suffix) => {
    expect(verifiedDirectDatabase('postgresql://fixture:fake@direct.example/navi?' + suffix)).toBe(
      false,
    );
  });
  it('rejects pooled endpoints even with verified TLS', () =>
    expect(
      verifiedDirectDatabase(db('web').replace('direct.example', 'direct-pooler.example')),
    ).toBe(false));
  it('retains worker/bot secret matching and command scope requirements', () => {
    const value = fixtures();
    value.bot.BOT_INTERNAL_SECRET = 'different-private-secret-at-least-32-characters';
    expect(releaseConfiguration(value).checks.broker_secret_matches).toBe(false);
    value.bot.BOT_INTERNAL_SECRET = secret;
    value.bot.DISCORD_ALLOWED_USER_IDS = '444444444444444444';
    expect(releaseConfiguration(value).checks.command_policy_matches).toBe(false);
  });
  it('does not claim release readiness with paused admission or disabled consumer', () => {
    const value = fixtures();
    value.bot.BOT_COMMANDS_ENABLED = 'false';
    expect(releaseConfiguration(value).checks.command_consumer_enabled).toBe(false);
    const paused = { ...value, web: { ...value.web, BOT_COMMAND_ADMISSION_ENABLED: 'false' } };
    expect(releaseConfiguration(paused).checks.command_admission_enabled).toBe(false);
  });
  it('preserves HTTP transport validation', () => {
    const value = fixtures();
    value.web.BOT_COMMAND_TRANSPORT = 'http';
    const web = { ...value.web, BOT_INTERNAL_SECRET: secret };
    expect(releaseConfiguration({ ...value, web }).ready).toBe(true);
    expect(() => releaseConfiguration(value)).toThrow('BOT_INTERNAL_SECRET');
  });
  it('fails full-release checks for missing provider credentials or plaintext Redis', () => {
    const value = fixtures();
    value.worker.YOUTUBE_API_KEY = '';
    value.worker.REDIS_URL = 'redis://localhost:6379';
    expect(releaseConfiguration(value).checks.platform_credentials_configured).toBe(false);
    expect(releaseConfiguration(value).checks.native_redis_tls).toBe(false);
  });
});
describe('private read-only queue readiness', () => {
  it('does not certify a consumer heartbeat from accessible DB dependencies', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          limited_role: true,
          required_grants: true,
          forbidden_grants_absent: true,
          identity_function: true,
          route_lock_grants: true,
        },
      ],
    });
    const result = await inspectCommandDatabase(
      { query } as unknown as Pick<pg.Pool, 'query'>,
      'bot',
    );
    expect(result.status).toBe('ok');
    expect(result.consumerHeartbeatVerified).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each([
    'limited_role',
    'required_grants',
    'forbidden_grants_absent',
    'identity_function',
    'route_lock_grants',
  ])('fails closed when %s fails', async (key) => {
    const row = {
      limited_role: true,
      required_grants: true,
      forbidden_grants_absent: true,
      identity_function: true,
      route_lock_grants: true,
      [key]: false,
    };
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    expect(
      (await inspectCommandDatabase({ query } as unknown as Pick<pg.Pool, 'query'>, 'web')).status,
    ).toBe('degraded');
  });
  it('redacts connection and SQL failures', async () => {
    const query = vi.fn().mockRejectedValue(new Error('SYNTHETIC_ONLY'));
    expect(
      JSON.stringify(
        await inspectCommandDatabase({ query } as unknown as Pick<pg.Pool, 'query'>, 'bot'),
      ),
    ).not.toContain('SYNTHETIC_ONLY');
  });
});
describe('review-only deployment artifacts', () => {
  it('scans credential-bearing URLs without treating password-free local examples as secrets', () => {
    expect(secretCandidates('REDIS_URL', 'redis://127.0.0.1:6379')).toEqual([]);
    expect(secretCandidates('DATABASE_URL', db('fixture'))).toContain('SYNTHETIC_ONLY');
    expect(secretCandidates('BETTER_AUTH_SECRET', 'synthetic-secret-value')).toEqual([
      'synthetic-secret-value',
    ]);
  });
  it('checks Render configuration before Next startup without connecting', () => {
    const value = fixtures();
    const env: NodeJS.ProcessEnv = { ...process.env, ...value.web, PORT: '10000' };
    delete env.DISCORD_BOT_TOKEN;
    const result = spawnSync(process.execPath, ['deployment/render/check-web.mjs'], {
      env,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('SYNTHETIC_ONLY');
    const wrong = spawnSync(process.execPath, ['deployment/render/check-web.mjs'], {
      env: { ...env, BOT_COMMAND_TRANSPORT: 'http' },
      encoding: 'utf8',
    });
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).not.toContain('SYNTHETIC_ONLY');
  });
  it('preserves literal disabled flags and a dashboard without broker credentials', () => {
    const blueprint = readFileSync('deployment/render/dashboard.yaml.example', 'utf8');
    expect(blueprint).toContain('deployment/render/check-web.mjs');
    expect(blueprint).not.toContain('key: BOT_INTERNAL_SECRET');
    expect(blueprint).not.toContain('127.0.0.1:4001');
    expect(readFileSync('deployment/render/bot.env.example', 'utf8')).toContain(
      'BOT_COMMANDS_ENABLED=false',
    );
  });
  it('renders reviewed grants safely and rejects shared or injected roles', () => {
    expect(commandGrantSql('fixture_db', 'fixture_web', 'fixture_bot')).toContain(
      'GRANT SELECT, INSERT ON public.bot_commands TO "fixture_web"',
    );
    expect(() => commandGrantSql('fixture_db', 'fixture', 'fixture')).toThrow();
    expect(() => commandGrantSql('fixture_db', 'bad;role', 'fixture_bot')).toThrow();
  });
});
