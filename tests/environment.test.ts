import { describe, expect, it } from 'vitest';
import {
  readBotEnvironment,
  readDatabaseEnvironment,
  readWebEnvironment,
  readWorkerEnvironment,
  loadRootEnvironment,
  readStreamerEnvironment,
} from '@navi/config';

describe('service environment boundaries', () => {
  it('allows the web and scaffold bot to start without provider credentials', () => {
    expect(readWebEnvironment({}).WEB_ORIGIN).toBe('http://localhost:3000');
    expect(readBotEnvironment({ DISCORD_BOT_TOKEN: '' }).DISCORD_BOT_TOKEN).toBeUndefined();
  });

  it('validates database and Redis protocols rather than accepting any URL', () => {
    expect(() => readDatabaseEnvironment({ DATABASE_URL: 'https://example.com' })).toThrow(
      'DATABASE_URL',
    );
    expect(() =>
      readWorkerEnvironment({
        DATABASE_URL: 'postgresql://localhost/navi',
        REDIS_URL: 'http://localhost',
      }),
    ).toThrow('REDIS_URL');
    expect(
      readWorkerEnvironment({
        DATABASE_URL: 'postgresql://localhost/navi',
        REDIS_URL: 'redis://localhost:6379',
      }).REDIS_URL,
    ).toBe('redis://localhost:6379');
  });

  it('rejects missing required configuration without leaking credentials in errors', () => {
    expect(() => readWorkerEnvironment({})).toThrow('DATABASE_URL, REDIS_URL');
    const secret = 'https://user:private-password@example.com';
    try {
      readDatabaseEnvironment({ DATABASE_URL: secret });
      expect.fail('Invalid database protocol was accepted');
    } catch (error) {
      expect(String(error)).toContain('DATABASE_URL');
      expect(String(error)).not.toContain('private-password');
    }
  });

  it('limits web configuration to its own fields and rejects invalid runtime modes', () => {
    expect(readWebEnvironment({ DISCORD_BOT_TOKEN: 'private-token' })).not.toHaveProperty(
      'DISCORD_BOT_TOKEN',
    );
    expect(() => readWebEnvironment({ NODE_ENV: 'preview' })).toThrow('NODE_ENV');
  });

  it('sanitizes malformed URL errors, including their serialized properties', () => {
    for (const bad of [
      '',
      ' ',
      'not-a-url-FAKE_SECRET',
      'postgresql://u:FAKE_SECRET@host:bad/db',
    ]) {
      try {
        readDatabaseEnvironment({ DATABASE_URL: bad });
        expect.fail('Accepted malformed URL');
      } catch (error) {
        expect(String(error)).toContain('DATABASE_URL');
        expect(`${String(error)}${JSON.stringify(error)}`).not.toContain('FAKE_SECRET');
        expect(error).not.toHaveProperty('input');
      }
    }
    expect(() => readWebEnvironment({ WEB_ORIGIN: 'not-a-url' })).toThrow('WEB_ORIGIN');
    expect(() =>
      readWorkerEnvironment({ DATABASE_URL: 'postgresql://localhost/db', REDIS_URL: 'not-a-url' }),
    ).toThrow('REDIS_URL');
  });

  it('does not inject secrets into process.env while loading per-service configuration', () => {
    const before = { ...process.env };
    const web = loadRootEnvironment('web');
    const worker = loadRootEnvironment('worker');
    expect(web).not.toHaveProperty('DISCORD_BOT_TOKEN');
    expect(worker).not.toHaveProperty('DISCORD_CLIENT_SECRET');
    expect(worker).not.toHaveProperty('BETTER_AUTH_SECRET');
    expect(worker).not.toHaveProperty('DISCORD_BOT_TOKEN');
    expect(process.env).toEqual(before);
  });
  it('validates optional provider credentials and a bounded development source limit', () => {
    expect(readStreamerEnvironment({})).toMatchObject({ STREAMER_SOURCE_LIMIT: 10 });
    expect(
      readStreamerEnvironment({
        YOUTUBE_API_KEY: '',
        KICK_CLIENT_SECRET: '',
        STREAMER_SOURCE_LIMIT: '5',
      }),
    ).toMatchObject({ STREAMER_SOURCE_LIMIT: 5 });
    for (const limit of ['0', '101', '1.5', 'not a number'])
      expect(() => readStreamerEnvironment({ STREAMER_SOURCE_LIMIT: limit })).toThrow(
        'STREAMER_SOURCE_LIMIT',
      );
    expect(readStreamerEnvironment({ DISCORD_BOT_TOKEN: 'secret' })).not.toHaveProperty(
      'DISCORD_BOT_TOKEN',
    );
  });
});
