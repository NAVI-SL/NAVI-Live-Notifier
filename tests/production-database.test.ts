import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/pglite';
import { createNotificationRepository, schema } from '@navi/database';
import { errorResponse } from '../apps/web/src/lib/errors';

it('reproduces an unmigrated workspace 503 and restores legacy preferences after migration 0006', async () => {
  const database = new PGlite();
  try {
    for (const file of readdirSync('packages/database/migrations')
      .filter((name) => name.endsWith('.sql') && name < '0006')
      .sort())
      await database.exec(readFileSync(`packages/database/migrations/${file}`, 'utf8'));
    await database.exec(`
      INSERT INTO provider_channels(id,provider,external_id,display_name,canonical_url,verified_at,expires_at)
      VALUES ('source','youtube','UCaaaaaaaaaaaaaaaaaaaaaa','Test channel','https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',now(),now()+interval '1 day');
      INSERT INTO streamer_subscriptions(id,guild_id,provider_channel_id,user_identifier)
      VALUES ('subscription','111111111111111111','source','@test');
      INSERT INTO notification_settings(subscription_id,guild_id,channel_id,template,enabled,version)
      VALUES ('subscription','111111111111111111','222222222222222222','{streamer} {url}',true,3);
    `);
    const repository = createNotificationRepository(drizzle(database, { schema }));
    let failure: unknown;
    try {
      await repository.list('111111111111111111');
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ cause: { code: '42703' } });
    const response = errorResponse(failure);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'service_unavailable' });
    await database.exec(
      readFileSync('packages/database/migrations/0006_youtube_embed_mentions.sql', 'utf8'),
    );
    const rows = await repository.list('111111111111111111');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      version: 3,
      config: { channelId: '222222222222222222', template: '{streamer} {url}', enabled: true },
    });
    expect(rows[0]!.config?.mentionEveryone).not.toBe(true);
  } finally {
    await database.close();
  }
}, 20000);

it('migrates an isolated database and restricts runtime roles without weakening application authorization', async () => {
  const database = new PGlite();
  try {
    const folder = 'packages/database/migrations';
    for (const file of readdirSync(folder)
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await database.exec(readFileSync(`${folder}/${file}`, 'utf8'));
    await database.exec('CREATE ROLE navi_web; CREATE ROLE navi_worker;');
    const { rows } = await database.query<{ name: string }>('SELECT current_database() AS name');
    const name = String(rows[0]!.name);
    if (!/^[a-z_]+$/.test(name)) throw new Error('Unexpected fixture database name.');
    await database.exec(
      readFileSync('deployment/database-permissions.sql', 'utf8').replaceAll(
        'DATABASE navi ',
        `DATABASE ${name} `,
      ),
    );
    await database.exec('SET ROLE navi_worker');
    await database.query('SELECT id FROM live_deliveries LIMIT 0');
    await database.query('SELECT id FROM streamer_subscriptions LIMIT 0');
    await expect(database.query('SELECT id FROM auth_account LIMIT 0')).rejects.toThrow(
      /permission denied/,
    );
    await expect(database.query('UPDATE notification_settings SET enabled=false')).rejects.toThrow(
      /permission denied/,
    );
    await database.exec('RESET ROLE; SET ROLE navi_web');
    await database.query('SELECT id FROM auth_user LIMIT 0');
    await database.query('SELECT id FROM notification_test_attempts LIMIT 0');
    await expect(
      database.query('CREATE TABLE public.forbidden_runtime_ddl (id text)'),
    ).rejects.toThrow(/permission denied/);
    await expect(database.query("UPDATE live_deliveries SET status='sent'")).rejects.toThrow(
      /permission denied/,
    );
  } finally {
    await database.close();
  }
}, 20000);
