import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import {
  schema,
  createMonitoringRepository,
  createStreamerRepository,
  createNotificationRepository,
  withAccountLock,
} from '@navi/database';

// Explicit integration command: isolated temporary schema, no external APIs or messages.
const { DATABASE_URL } = readDatabaseEnvironment(loadRootEnvironment('database'));
const namespace = 'navi_phase07_' + randomUUID().replaceAll('-', '');
assert(/^navi_phase07_[a-f0-9]{32}$/.test(namespace));
const options = {
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
};
const admin = new pg.Pool({ ...options, max: 1 });
const first = new pg.Pool({ ...options, max: 3, options: `-c search_path=${namespace}` });
const second = new pg.Pool({ ...options, max: 3, options: `-c search_path=${namespace}` });
let created = false;
try {
  await admin.query(`CREATE SCHEMA "${namespace}"`);
  created = true;
  for (const file of [
    '0000_phase02_auth.sql',
    '0001_phase04_streamers.sql',
    '0002_phase05_notifications.sql',
    '0003_phase06_monitoring.sql',
    '0004_phase06_baseline.sql',
    '0005_phase07_reliability.sql',
    '0006_youtube_embed_mentions.sql',
  ]) {
    const text = readFileSync(
      new URL('../packages/database/migrations/' + file, import.meta.url),
      'utf8',
    );
    await first.query(text.replaceAll('"public".', `"${namespace}".`));
  }
  let clock = Date.now() + 60000;
  const now = () => new Date(clock);
  const db = drizzle(first, { schema }),
    other = drizzle(second, { schema });
  const repo = createMonitoringRepository(db, now),
    competing = createMonitoringRepository(other, now);
  const streamers = createStreamerRepository(db, now),
    settings = createNotificationRepository(db, now);
  const guild = '111111111111111111';
  await streamers.add(guild, {
    provider: 'kick',
    externalId: '123',
    displayName: 'Synthetic integration fixture',
    canonicalUrl: 'https://kick.com/tester',
    userIdentifier: 'tester',
  });
  const [subscription] = await streamers.list(guild);
  await settings.save(
    guild,
    subscription!.id,
    { enabled: true, channelId: '444444444444444444', roleId: null, template: '{title} {url}' },
    0,
  );
  const [source] = await repo.sources();
  await repo.ready();
  await repo.observe(source!.id, [], false);
  clock += 60000;
  const event = {
    sessionKey: now().toISOString(),
    title: 'Synthetic integration stream',
    url: 'https://kick.com/tester',
    startedAt: now().toISOString(),
  };
  await Promise.all([
    repo.observe(source!.id, [event], true),
    competing.observe(source!.id, [event], true),
  ]);
  const claims = await Promise.all([repo.claim(), competing.claim()]);
  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal((await db.select().from(schema.liveDeliveries)).length, 1);
  console.info('PASS: concurrent PostgreSQL admission and SKIP LOCKED claims return one delivery.');
  await Promise.all([repo.block('kick', 3600), competing.block('kick', 60)]);
  clock += 61000;
  assert.equal(await competing.reserve('kick', 100000), false);
  console.info('PASS: concurrent connections retain the longest provider cooldown.');

  const order: string[] = [];
  let release!: () => void, entered!: () => void;
  const enteredPromise = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const holding = withAccountLock(first, 'live:' + subscription!.id, async (assertHeld) => {
    order.push('first');
    entered();
    await blocked;
    assertHeld();
    order.push('released');
  });
  await enteredPromise;
  const waiting = withAccountLock(second, 'live:' + subscription!.id, async (assertHeld) => {
    assertHeld();
    order.push('second');
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(order, ['first']);
  release();
  await Promise.all([holding, waiting]);
  assert.deepEqual(order, ['first', 'released', 'second']);
  console.info(
    'PASS: independent PostgreSQL connections serialize the shared route advisory lock.',
  );

  clock += 120001;
  assert.equal(await competing.claim(), undefined);
  assert.equal((await other.select().from(schema.liveDeliveries))[0]!.status, 'uncertain');
  await competing.observe(source!.id, [event], true);
  assert.equal((await other.select().from(schema.liveDeliveries)).length, 1);
  console.info(
    'PASS: reconstructed repository quarantines interrupted sending and retains deduplication.',
  );
} catch {
  console.error(
    'FAIL: isolated PostgreSQL reliability checks. Check service, schema privileges and migration compatibility. No secret values printed.',
  );
  process.exitCode = 1;
} finally {
  await Promise.all([first.end(), second.end()]);
  if (created) {
    try {
      await admin.query(`DROP SCHEMA "${namespace}" CASCADE`);
      console.info('PASS: temporary integration schema removed; application tables untouched.');
    } catch {
      console.error(
        'FAIL: temporary integration schema cleanup; inspect schemas prefixed navi_phase07_.',
      );
      process.exitCode = 1;
    }
  }
  await admin.end();
}
