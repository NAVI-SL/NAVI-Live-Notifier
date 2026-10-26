import { describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  readAuthEnvironment,
  readMonitoringEnvironment,
  readWorkerEnvironment,
} from '@navi/config';

// Synthetic values only. No clients are connected and no monitoring process starts.
const auth = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://navi-dashboard.example',
  DATABASE_URL: 'postgresql://fixture:synthetic@direct.example/navi?sslmode=verify-full',
  BETTER_AUTH_SECRET: 'synthetic-auth-key-with-at-least-32-characters',
  DISCORD_CLIENT_ID: '111111111111111111',
  DISCORD_CLIENT_SECRET: 'synthetic',
  DISCORD_ALLOWED_USER_IDS: '222222222222222222',
  BETA_GUILD_IDS: '333333333333333333',
  BOT_INTERNAL_SECRET: 'synthetic-broker-key-with-at-least-32-characters',
};

describe('cloud deployment compatibility without external side effects', () => {
  it('keeps certificate and hostname verification enabled in the installed pg driver', () => {
    const client = new pg.Client({ connectionString: auth.DATABASE_URL });
    expect(client.ssl).toBeTypeOf('object');
    expect(client.ssl).not.toHaveProperty('rejectUnauthorized', false);
    expect(client.ssl).not.toHaveProperty('checkServerIdentity');
    // Construction only: an actual Neon TLS handshake remains a separate acceptance gate.
  });

  it('accepts an HTTPS origin with scoped beta restrictions and a local broker', () => {
    const env = readAuthEnvironment(auth);
    expect(env.WEB_ORIGIN).toBe(auth.WEB_ORIGIN);
    expect(env.BOT_INTERNAL_URL).toBe('http://127.0.0.1:4001');
    expect(env.BETA_GUILD_IDS).toEqual(['333333333333333333']);
  });

  it.each(['https://broker.example', 'http://bot:4001', 'http://0.0.0.0:4001'])(
    'rejects a non-loopback internal broker (%s)',
    (url) => {
      expect(() => readAuthEnvironment({ ...auth, BOT_INTERNAL_URL: url })).toThrow(
        'BOT_INTERNAL_URL',
      );
      expect(() => readMonitoringEnvironment({ BOT_INTERNAL_URL: url })).toThrow(
        'BOT_INTERNAL_URL',
      );
    },
  );

  it('accepts a native Redis TLS URI without treating it as a queue implementation', () => {
    const redis = 'rediss://default:synthetic@redis.example:6379';
    expect(readWorkerEnvironment({ ...auth, REDIS_URL: redis }).REDIS_URL).toBe(redis);
    expect(readMonitoringEnvironment({}).MONITORING_ENABLED).toBe(false);
  });

  it('rejects an Upstash REST URL in place of the native Redis connection string', () => {
    expect(() => readWorkerEnvironment({ ...auth, REDIS_URL: 'https://redis.example' })).toThrow(
      'REDIS_URL',
    );
  });

  it('requires a webhook secret when a public HTTPS monitoring origin is supplied', () => {
    expect(() =>
      readMonitoringEnvironment({ MONITOR_PUBLIC_ORIGIN: 'https://hooks.example' }),
    ).toThrow('MONITOR_WEBHOOK_SECRET');
  });
});
