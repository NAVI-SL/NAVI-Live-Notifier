import { describe, expect, it } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import { createBot } from '../apps/bot/src/application.js';
import { createWorker } from '../apps/worker/src/application.js';
import { GET } from '../apps/web/src/app/api/health/route.js';
import { createDatabase } from '@navi/database';

describe('application smoke checks', () => {
  it('constructs a disconnected Discord client with only the Guilds intent and no automatic mentions', async () => {
    const bot = createBot();
    expect(bot.isReady()).toBe(false);
    expect(bot.options.intents.bitfield).toBe(GatewayIntentBits.Guilds);
    expect(bot.options.allowedMentions?.parse).toEqual([]);
    await bot.destroy();
  });

  it('initializes the worker as a scaffold rather than claiming queue readiness', () => {
    expect(createWorker()).toEqual({ service: 'worker', status: 'initialized', mode: 'scaffold' });
  });

  it('returns minimal liveness without connection strings or provider data', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      service: 'web',
      status: 'initialized',
      mode: 'scaffold',
    });
  });

  it('creates a lazy database pool without connecting on import or construction', async () => {
    const database = createDatabase('postgresql://local:local@127.0.0.1:1/navi');
    expect(database.pool.totalCount).toBe(0);
    expect(database.db).toBeDefined();
    await database.close();
  });
});
