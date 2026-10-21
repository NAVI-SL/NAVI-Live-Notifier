import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { describe, expect, it, vi } from 'vitest';
import { schema } from '@navi/database';
import { readAuthEnvironment } from '@navi/config';
import { createNaviAuth } from '../apps/web/src/lib/auth-factory';
import { handleAuthRequest } from '../apps/web/src/lib/auth-handler';
import { createGuildService } from '../apps/web/src/lib/guild-service';

describe('PostgreSQL authentication migration and adapter', () => {
  it('applies the real SQL and completes a Discord login with encrypted credentials and a database session', async () => {
    const pg = new PGlite();
    try {
      await pg.exec(
        readFileSync(
          new URL('../packages/database/migrations/0000_phase02_auth.sql', import.meta.url),
          'utf8',
        ),
      );
      const db = drizzle(pg, { schema });
      const origin = 'http://localhost:3000';
      const userId = '111111111111111111';
      const env = readAuthEnvironment({
        NODE_ENV: 'test',
        WEB_ORIGIN: origin,
        DATABASE_URL: 'postgresql://localhost/test',
        BETTER_AUTH_SECRET: 'pg-test-secret-123456789-abcdefgh-12345678',
        DISCORD_CLIENT_ID: '222222222222222222',
        DISCORD_CLIENT_SECRET: 'pg-test-client',
        DISCORD_ALLOWED_USER_IDS: userId,
        BOT_INTERNAL_SECRET: 'pg-internal-123456789-abcdefgh-12345678',
      });
      const auth = createNaviAuth(env, drizzleAdapter(db, { provider: 'pg', schema }));
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL | Request) => {
          const url = decodeURIComponent(
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
          );
          if (url.endsWith('/oauth2/token'))
            return Response.json({
              access_token: 'pg-access-secret',
              refresh_token: 'pg-refresh-secret',
              expires_in: 3600,
              token_type: 'Bearer',
              scope: 'identify guilds',
            });
          if (url.endsWith('/users/@me'))
            return Response.json({
              id: userId,
              username: 'Postgres User',
              global_name: null,
              discriminator: '0',
              avatar: null,
            });
          throw new Error('Unexpected provider request');
        }),
      );
      const start = await handleAuthRequest(
        new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers: { origin } }),
        auth,
        origin,
      );
      const startBody = (await start.json()) as { url: string };
      const state = new URL(startBody.url).searchParams.get('state');
      const callback = await handleAuthRequest(
        new Request(`${origin}/api/auth/callback/discord?code=pg-code&state=${state}`, {
          headers: {
            cookie: start.headers
              .getSetCookie()
              .map((entry) => entry.split(';')[0])
              .join('; '),
          },
        }),
        auth,
        origin,
      );
      expect(callback.status).toBe(302);
      expect(callback.headers.get('location')).toBe(`${origin}/dashboard`);
      const headers = new Headers({
        cookie: callback.headers
          .getSetCookie()
          .map((entry) => entry.split(';')[0])
          .join('; '),
      });
      expect((await auth.api.getSession({ headers }))?.user.name).toBe('Postgres User');
      const accounts = await db.select().from(schema.account);
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.accessToken).not.toBe('pg-access-secret');
      expect(accounts[0]?.refreshToken).not.toBe('pg-refresh-secret');
      const service = createGuildService({
        auth,
        allowedUsers: [userId],
        clientId: env.DISCORD_CLIENT_ID,
        origin,
        fetchGuilds: async (token) => {
          expect(token).toBe('pg-access-secret');
          return [];
        },
        installationStatus: async () => 'unknown',
      });
      expect(await service.list(headers)).toEqual([]);
      await handleAuthRequest(
        new Request(`${origin}/api/auth/sign-out`, {
          method: 'POST',
          headers: { origin, cookie: headers.get('cookie') ?? '' },
        }),
        auth,
        origin,
      );
      expect(await db.select().from(schema.session)).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
      await pg.close();
    }
  }, 30_000);
});
