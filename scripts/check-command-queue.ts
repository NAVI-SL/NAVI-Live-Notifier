import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import { schema, createCommandRepository } from '@navi/database';

// Explicit isolated SQL check. Never imports a bot entrypoint or calls Discord.
const { DATABASE_URL } = readDatabaseEnvironment(loadRootEnvironment('database'));
const namespace = 'navi_command_test_' + randomUUID().replaceAll('-', '');
assert(/^navi_command_test_[a-f0-9]{32}$/.test(namespace));
const connection = {
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
};
const admin = new pg.Pool({ ...connection, max: 1 });
const first = new pg.Pool({ ...connection, max: 3, options: `-c search_path=${namespace}` });
const second = new pg.Pool({ ...connection, max: 3, options: `-c search_path=${namespace}` });
let created = false;
try {
  await admin.query(`CREATE SCHEMA "${namespace}"`);
  created = true;
  for (const file of readdirSync('packages/database/migrations')
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    // Rebind explicit function search paths and table references only in this scratch schema.
    const migration = readFileSync(`packages/database/migrations/${file}`, 'utf8').replaceAll(
      '"public"',
      `"${namespace}"`,
    );
    await first.query(migration);
  }
  const guild = '111111111111111111',
    actor = '222222222222222222';
  await first.query(`INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES ('user','Fixture','discord-${actor}@users.navi.invalid',false,now(),now());
    INSERT INTO auth_session(id,user_id,token,expires_at,created_at,updated_at) VALUES ('session','user','synthetic-integration-session',now()+interval '1 hour',now(),now());
    INSERT INTO auth_account(id,user_id,account_id,provider_id,created_at,updated_at) VALUES ('account','user','${actor}','discord',now(),now());`);
  const policy = { allowedUsers: [actor], allowedGuilds: [guild] },
    principal = { userId: 'user', discordId: actor, sessionRef: 'session' };
  const a = createCommandRepository(drizzle(first, { schema }), policy),
    b = createCommandRepository(drizzle(second, { schema }), policy);
  const key = randomUUID(),
    input = { kind: 'guild_status.refresh', payload: {} };
  const admitted = await Promise.all([
    a.enqueue(guild, principal, key, input),
    b.enqueue(guild, principal, key, input),
  ]);
  assert.equal(admitted[0]!.id, admitted[1]!.id);
  const claims = await Promise.all([a.claim(randomUUID()), b.claim(randomUUID())]);
  assert.equal(claims.filter(Boolean).length, 1);
  const original = claims.find(Boolean)!;
  // Hold the first due row locked while another physical connection skips it.
  const next = await a.enqueue(guild, principal, randomUUID(), input);
  const lock = await first.connect();
  try {
    await lock.query('BEGIN');
    await lock.query('SELECT id FROM bot_commands WHERE id=$1 FOR UPDATE', [next.id]);
    assert.equal(await b.claim(randomUUID()), undefined);
    await lock.query('ROLLBACK');
  } finally {
    lock.release();
  }
  assert.equal((await b.claim(randomUUID()))?.id, next.id);
  await first.query(
    "UPDATE bot_commands SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [original.id],
  );
  await b.recover();
  const resumed = (await b.claim(randomUUID()))!;
  assert.equal(resumed.id, original.id);
  assert.equal(resumed.leaseGeneration, 2);
  await assert.rejects(() =>
    a.complete(original, { status: 'installed', observedAt: new Date().toISOString() }),
  );
  await b.complete(resumed, { status: 'installed', observedAt: new Date().toISOString() }, true);
  assert.equal((await a.get(guild, principal, resumed.id)).status, 'completed');
  console.info(
    'PASS: independent PostgreSQL admissions deduplicate, SKIP LOCKED skips held rows, and lease generations fence stale acknowledgments.',
  );
} catch {
  console.error(
    'FAIL: isolated command PostgreSQL check; inspect connectivity/migration/claim behavior without logging credentials.',
  );
  process.exitCode = 1;
} finally {
  await Promise.all([first.end(), second.end()]);
  if (created) {
    try {
      await admin.query(`DROP SCHEMA "${namespace}" CASCADE`);
      console.info('PASS: temporary command schema removed; application data untouched.');
    } catch {
      console.error('FAIL: scratch command schema cleanup; inspect navi_command_test_ schemas.');
      process.exitCode = 1;
    }
  }
  await admin.end();
}
