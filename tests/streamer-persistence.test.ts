import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStreamerRepository, schema } from '@navi/database';
const guildA = '111111111111111111',
  guildB = '222222222222222222';
const source = {
  provider: 'youtube' as const,
  externalId: 'UC' + 'a'.repeat(22),
  displayName: 'Channel',
  canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
  userIdentifier: '@handle',
};
const pg = new PGlite();
const db = drizzle(pg, { schema });
let now = new Date('2026-10-16T00:00:00Z');
const repository = createStreamerRepository(db, () => now);
beforeAll(async () => {
  for (const name of ['0000_phase02_auth.sql', '0001_phase04_streamers.sql'])
    await pg.exec(
      readFileSync(new URL('../packages/database/migrations/' + name, import.meta.url), 'utf8'),
    );
}, 20000);
afterAll(async () => {
  await pg.close();
});
describe('real PostgreSQL registration schema and repository', () => {
  it('persists one shared stable identity and two isolated guild subscriptions across repository instances', async () => {
    await repository.add(guildA, source);
    await repository.add(guildB, { ...source, userIdentifier: 'https://youtube.com/@handle' });
    expect(await db.select().from(schema.providerChannels)).toHaveLength(1);
    const reloaded = createStreamerRepository(db, () => now);
    expect(await reloaded.list(guildA)).toMatchObject([{ ...source, enabled: true }]);
    expect((await reloaded.list(guildB))[0]!.userIdentifier).toBe('https://youtube.com/@handle');
    expect(await reloaded.list('333333333333333333')).toEqual([]);
  });
  it('prevents aliases and concurrent attempts from duplicating guild subscriptions', async () => {
    const attempts = await Promise.allSettled([
      repository.add(guildA, { ...source, userIdentifier: '@renamed' }),
      repository.add(guildA, source),
    ]);
    expect(
      attempts.every(
        (result) => result.status === 'rejected' && result.reason.code === 'duplicate_subscription',
      ),
    ).toBe(true);
    expect(await repository.list(guildA)).toHaveLength(1);
    const freshGuild = '333333333333333333';
    const freshAttempts = await Promise.allSettled([
      repository.add(freshGuild, { ...source, externalId: 'UC' + 'b'.repeat(22) }),
      repository.add(freshGuild, {
        ...source,
        externalId: 'UC' + 'b'.repeat(22),
        userIdentifier: '@alias',
      }),
    ]);
    expect(freshAttempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      freshAttempts.filter(
        (result) => result.status === 'rejected' && result.reason.code === 'duplicate_subscription',
      ),
    ).toHaveLength(1);
    await repository.remove(freshGuild, (await repository.list(freshGuild))[0]!.id);
  });
  it('scopes enable, disable and removal to both guild and subscription ID', async () => {
    const id = (await repository.list(guildA))[0]!.id;
    await expect(repository.setEnabled(guildB, id, false)).rejects.toMatchObject({
      code: 'subscription_not_found',
    });
    await expect(repository.remove(guildB, id)).rejects.toMatchObject({
      code: 'subscription_not_found',
    });
    await repository.setEnabled(guildA, id, false);
    expect((await repository.list(guildA))[0]!.enabled).toBe(false);
    expect((await repository.list(guildB))[0]!.enabled).toBe(true);
    await repository.setEnabled(guildA, id, true);
    expect((await repository.list(guildA))[0]!.enabled).toBe(true);
    await repository.remove(guildA, id);
    expect(await repository.list(guildA)).toEqual([]);
    expect(await db.select().from(schema.providerChannels)).toHaveLength(1);
    await repository.remove(guildB, (await repository.list(guildB))[0]!.id);
    expect(await db.select().from(schema.providerChannels)).toHaveLength(0);
  });
  it('preserves the Kick stable ID exactly and enforces database uniqueness directly', async () => {
    await repository.add(guildA, {
      ...source,
      provider: 'kick',
      externalId: '9223372036854775807',
      canonicalUrl: 'https://kick.com/tester',
    });
    expect((await repository.list(guildA))[0]!.externalId).toBe('9223372036854775807');
    const subscription = (await db.select().from(schema.streamerSubscriptions))[0]!;
    await expect(
      db.insert(schema.streamerSubscriptions).values({ ...subscription, id: 'duplicate' }),
    ).rejects.toThrow();
  });
  it('expires metadata and entered identifiers together, cascading subscriptions after 29 days', async () => {
    now = new Date('2026-11-15T00:00:00Z');
    expect(await repository.list(guildA)).toEqual([]);
    await repository.prune();
    expect(await db.select().from(schema.providerChannels)).toHaveLength(0);
    expect(await db.select().from(schema.streamerSubscriptions)).toHaveLength(0);
  });
  it('limits personal development to 10 global sources, while allowing reuse in another guild', async () => {
    for (let i = 0; i < 10; i++)
      await repository.add(guildA, { ...source, externalId: 'UC' + String(i).padStart(22, '0') });
    await expect(repository.add(guildB, source)).rejects.toMatchObject({ code: 'source_limit' });
    await repository.add(guildB, { ...source, externalId: 'UC' + '0'.repeat(22) });
    expect(await db.select().from(schema.providerChannels)).toHaveLength(10);
    expect(await repository.list(guildB)).toHaveLength(1);
  });
});
