import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { spawnSync, fork } from 'node:child_process';
import { createServer } from 'node:http';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { CommandError } from '@navi/core';
import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import {
  schema,
  createCommandAdmission,
  createCommandRepository,
  createNotificationRepository,
  withAccountLock,
  inspectCommandDatabase,
} from '@navi/database';
import { commandGrantSql } from './lib/command-grants.js';
import {
  createCommandProcessor,
  type CommandDiscordAccess,
} from '../apps/bot/src/command-processor.js';
import { startBotCommands } from '../apps/bot/src/command-runtime.js';
import { commandRequest } from '../apps/web/src/lib/command-http.js';
import { awaitCommand } from '../apps/web/src/lib/command-client.js';

// No app entrypoint, Gateway, provider integration or live sender is imported.
// All DDL, fault injection and synthetic identities belong to this new disposable database.
const suffix = randomUUID().replaceAll('-', '');
const name = `navi_phase15e_${suffix}`,
  webRole = `navi_e_web_${suffix}`,
  botRole = `navi_e_bot_${suffix}`;
for (const identifier of [name, webRole, botRole])
  assert(/^navi_(?:phase15e|e_web|e_bot)_[a-f0-9]{32}$/.test(identifier));
const input = readDatabaseEnvironment(loadRootEnvironment('database'));
const target = new URL(input.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
  'Only local PostgreSQL is permitted.',
);
assert.notEqual(decodeURIComponent(target.pathname.slice(1)), name);
const connection = {
  connectionString: input.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  max: 1,
};
const admin = new pg.Pool(connection);
target.pathname = `/${name}`;
target.searchParams.delete('options');
const isolatedUrl = target.toString();
const owner = new pg.Pool({ ...connection, connectionString: isolatedUrl, max: 2 });
const scopedUrl = (role: string) => {
  const url = new URL(isolatedUrl);
  url.searchParams.set('options', `-c role=${role}`);
  return url.toString();
};
const web = new pg.Pool({ ...connection, connectionString: scopedUrl(webRole), max: 3 });
const bot = new pg.Pool({ ...connection, connectionString: scopedUrl(botRole), max: 3 });
for (const pool of [admin, owner, web, bot]) pool.on('error', () => {});
let queries = 0;
const logger = {
  logQuery() {
    queries++;
  },
};
const webDb = drizzle(web, { schema, logger }),
  botDb = drizzle(bot, { schema, logger });
const guild = '111111111111111111',
  other = '222222222222222222',
  actor = '333333333333333333',
  channel = '444444444444444444',
  message = '555555555555555555';
const sub = '11111111-aaaa-aaaa-aaaa-111111111111';
const principal = { userId: 'fixture-user', discordId: actor, sessionRef: 'fixture-session' };
const policy = { allowedUsers: [actor], allowedGuilds: [guild, other] };
const webRepo = createCommandRepository(webDb, policy),
  botRepo = createCommandRepository(botDb, policy);
const config = { channelId: channel, roleId: null, template: '{streamer} {url}', enabled: true };
const read = { kind: 'guild_status.refresh', payload: {} };
const apply = () => ({
  kind: 'notification_settings.apply',
  payload: { subscriptionId: sub, expectedVersion: 1, config },
});
const test = () => ({
  kind: 'notification_test.send',
  payload: { subscriptionId: sub, expectedVersion: 1 },
});
const fixtureOrigin = 'https://navi.phase15e.invalid';
let manager = true,
  executionAllowed = true,
  sends = 0;
let access: CommandDiscordAccess;
const logs: Record<string, unknown>[] = [];
const makeProcessor = () =>
  createCommandProcessor(
    botRepo,
    access,
    (id, operation) => withAccountLock(bot, id, operation),
    (entry) => logs.push(entry),
  );
const admission = createCommandAdmission({
  repository: webRepo,
  origin: fixtureOrigin,
  session: async (headers) =>
    headers.get('cookie') === 'phase15e=synthetic'
      ? {
          session: { id: principal.sessionRef, userId: principal.userId },
          user: { id: principal.userId, email: `discord-${actor}@users.navi.invalid` },
        }
      : null,
  authorize: async (_headers, id) => {
    if (!manager || !policy.allowedGuilds.includes(id)) throw new CommandError('command_forbidden');
  },
});
const deps = {
  commands: admission,
  environment: { WEB_ORIGIN: fixtureOrigin, BOT_COMMAND_ADMISSION_ENABLED: true },
};
const request = (body: unknown = read, key = randomUUID()) =>
  new Request(`${fixtureOrigin}/api`, {
    method: 'POST',
    headers: {
      origin: fixtureOrigin,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      cookie: 'phase15e=synthetic',
    },
    body: JSON.stringify(body),
  });
const status = (id: string, idGuild = guild) =>
  commandRequest(
    new Request(`${fixtureOrigin}/status`, { headers: { cookie: 'phase15e=synthetic' } }),
    idGuild,
    deps,
    id,
  );
const enqueue = (body: unknown = read, key = randomUUID()) =>
  webRepo.enqueue(guild, principal, key, body);
const run = () => makeProcessor().runOne(randomUUID());
const results: { scenario: string; status: 'PASS' | 'FAIL'; milliseconds: number }[] = [];
const metrics: Record<string, unknown> = {};
let created = false,
  rolesCreated = false;
let stopRuntime: (() => Promise<void>) | undefined;
async function seed() {
  await owner.query(`TRUNCATE bot_command_attempts,bot_commands,bot_guild_snapshots,notification_test_attempts,notification_settings,streamer_subscriptions,provider_channels,auth_session,auth_account,auth_user CASCADE;
    INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES ('fixture-user','Synthetic','discord-${actor}@users.navi.invalid',false,now(),now());
    INSERT INTO auth_session(id,user_id,token,expires_at,created_at,updated_at) VALUES ('fixture-session','fixture-user','synthetic-not-a-real-cookie',now()+interval '1 hour',now(),now());
    INSERT INTO auth_account(id,user_id,account_id,provider_id,created_at,updated_at) VALUES ('fixture-account','fixture-user','${actor}','discord',now(),now());
    INSERT INTO provider_channels(id,provider,external_id,display_name,canonical_url,verified_at,expires_at) VALUES ('source','youtube','UCaaaaaaaaaaaaaaaaaaaaaa','Synthetic streamer','https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',now(),now()+interval '1 day');
    INSERT INTO streamer_subscriptions(id,guild_id,provider_channel_id,user_identifier) VALUES ('${sub}','${guild}','source','@synthetic');
    INSERT INTO notification_settings(subscription_id,guild_id,channel_id,template,enabled,version) VALUES ('${sub}','${guild}','${channel}','{streamer} {url}',true,1);`);
  manager = true;
  executionAllowed = true;
  sends = 0;
  logs.length = 0;
  access = {
    status: async () => 'installed',
    authorize: async () => {
      if (!executionAllowed) throw new CommandError('command_forbidden');
    },
    targets: async () => ({
      channels: [{ id: channel, name: 'synthetic', canEmbed: true, canMentionEveryone: true }],
      roles: [],
    }),
    sendTest: async () => {
      sends++;
      return { status: 'sent', channelId: channel, messageId: message };
    },
  };
}
async function crashFixture(effect: boolean, expectedId: string) {
  const child = fork('scripts/lib/command-crash-fixture.ts', [], {
    execArgv: ['--import', 'tsx'],
    env: {
      ...process.env,
      DATABASE_URL: scopedUrl(botRole),
      NAVI_PHASE15E_CHILD: 'true',
      NAVI_PHASE15E_EFFECT: String(effect),
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const exited = new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    child.once('error', () => resolve());
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Isolated crash fixture startup timed out.')),
        10000,
      );
      child.once('message', (message: unknown) => {
        clearTimeout(timer);
        try {
          assert.deepEqual(message, { claimed: true, id: expectedId });
          resolve();
        } catch {
          reject(new Error('Invalid crash fixture acknowledgment.'));
        }
      });
      child.once('error', () => {
        clearTimeout(timer);
        reject(new Error('Isolated crash fixture unavailable.'));
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Isolated crash fixture exited before acknowledgment.'));
      });
    });
  } finally {
    child.kill('SIGKILL');
    await exited;
  }
}
async function check(scenario: string, operation: () => Promise<void>) {
  const started = performance.now();
  try {
    await seed();
    await operation();
    results.push({
      scenario,
      status: 'PASS',
      milliseconds: Math.round(performance.now() - started),
    });
    console.info(`PASS: ${scenario}`);
  } catch {
    results.push({
      scenario,
      status: 'FAIL',
      milliseconds: Math.round(performance.now() - started),
    });
    console.error(
      `FAIL: ${scenario}; details intentionally suppressed to protect database inputs.`,
    );
    process.exitCode = 1;
  }
}
async function expire(id: string) {
  // Owner-only fixture time travel. Never grant trigger bypass or date mutation to service roles.
  await owner.query('ALTER TABLE bot_commands DISABLE TRIGGER bot_command_immutable');
  try {
    await owner.query(
      "UPDATE bot_commands SET created_at=clock_timestamp()-interval '1 hour', expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [id],
    );
  } finally {
    await owner.query('ALTER TABLE bot_commands ENABLE TRIGGER bot_command_immutable');
  }
}
try {
  const baseline = await admin.query(
    "SELECT to_regclass('public.bot_commands') IS NOT NULL as commands_present",
  );
  metrics.normalCommandTableBefore = baseline.rows[0].commands_present;
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  await admin.query(
    `CREATE ROLE "${webRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; CREATE ROLE "${botRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
  );
  rolesCreated = true;
  for (const file of readdirSync('packages/database/migrations')
    .filter((file) => file.endsWith('.sql'))
    .sort())
    await owner.query(readFileSync(`packages/database/migrations/${file}`, 'utf8'));
  await owner.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO "${webRole}","${botRole}";
    GRANT SELECT,INSERT,UPDATE,DELETE ON auth_user,auth_session,auth_account,auth_verification,provider_channels,streamer_subscriptions,notification_settings,notification_test_attempts TO "${webRole}";
    `);
  await owner.query(commandGrantSql(name, webRole, botRole));
  await check(
    'Prepared grant file and private readiness profiles (no writes or claims)',
    async () => {
      assert.equal((await inspectCommandDatabase(web, 'web')).status, 'ok');
      assert.equal((await inspectCommandDatabase(bot, 'bot')).status, 'ok');
      assert.equal((await inspectCommandDatabase(owner, 'bot')).status, 'degraded');
      await owner.query(`GRANT CREATE ON DATABASE "${name}" TO "${botRole}"`);
      try {
        assert.equal((await inspectCommandDatabase(bot, 'bot')).status, 'degraded');
      } finally {
        await owner.query(`REVOKE CREATE ON DATABASE "${name}" FROM "${botRole}"`);
      }
      await owner.query(`GRANT SELECT ON auth_session TO "${botRole}"`);
      try {
        assert.equal((await inspectCommandDatabase(bot, 'bot')).status, 'degraded');
      } finally {
        await owner.query(`REVOKE SELECT ON auth_session FROM "${botRole}"`);
      }
      assert.equal(
        (await owner.query('SELECT count(*)::int as count FROM bot_commands')).rows[0].count,
        0,
      );
    },
  );
  await check(
    'Exact migrations, unique/index constraints and restricted service identities',
    async () => {
      const index = await owner.query(
        "SELECT indexname FROM pg_indexes WHERE tablename='bot_commands'",
      );
      for (const expected of [
        'bot_command_idempotency',
        'bot_command_due',
        'bot_command_lease',
        'bot_command_expiry',
        'bot_command_actor',
      ])
        assert(index.rows.some((row) => row.indexname === expected));
      assert.equal((await web.query('SELECT current_user as role')).rows[0].role, webRole);
      assert.equal((await bot.query('SELECT current_user as role')).rows[0].role, botRole);
      for (const query of [
        'SELECT token FROM auth_session',
        'SELECT access_token FROM auth_account',
        'CREATE TABLE public.not_allowed(id integer)',
        'DELETE FROM bot_commands',
      ])
        await assert.rejects(() => bot.query(query), { code: '42501' });
      for (const query of [
        "UPDATE bot_commands SET status='failed'",
        "INSERT INTO bot_guild_snapshots(guild_id,kind,payload,generation,stale_after) VALUES ('1','x','{}',1,now())",
        'DELETE FROM bot_command_attempts',
      ])
        await assert.rejects(() => web.query(query), { code: '42501' });
      assert.equal(
        (
          await bot.query('SELECT navi_command_requester_valid($1,$2,$3) as valid', [
            principal.sessionRef,
            principal.userId,
            actor,
          ])
        ).rows[0].valid,
        true,
      );
      const row = await enqueue();
      await assert.rejects(
        () => owner.query("UPDATE bot_commands SET status='invented' WHERE id=$1", [row.id]),
        { code: '23514' },
      );
      await assert.rejects(
        () => web.query('UPDATE bot_commands SET payload=$1 WHERE id=$2', ['{}', row.id]),
        { code: '42501' },
      );
    },
  );
  await check(
    'Dashboard handler → physical PostgreSQL → bot → acknowledgment → dashboard poll',
    async () => {
      const accepted = await commandRequest(request(apply()), guild, deps);
      assert.equal(accepted.status, 202);
      const body = await accepted.json();
      assert.equal(body.command.status, 'pending');
      assert(!('result' in body));
      assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 1);
      const states: string[] = [];
      await run();
      const result = await awaitCommand<{ version: number }>(
        body.command,
        (state) => states.push(state.status),
        async () => status(body.command.id),
        async () => {},
      );
      assert.equal(result.version, 2);
      assert(states.includes('completed'));
      assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 2);
      metrics.completedAckBytes = Buffer.byteLength(JSON.stringify(result));
    },
  );
  await check(
    'Real loopback HTTP command admission and status (synthetic identity and Discord)',
    async () => {
      const server = createServer((incoming, outgoing) => {
        void (async () => {
          const buffers: Buffer[] = [];
          for await (const chunk of incoming) buffers.push(Buffer.from(chunk));
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(',') : value);
          const method = incoming.method ?? 'GET',
            path = incoming.url ?? '/';
          const nodeRequest = new Request(`${fixtureOrigin}${path}`, {
            method,
            headers,
            ...(method === 'GET' ? {} : { body: Buffer.concat(buffers) }),
          });
          const commandId = /\/commands\/([a-f0-9-]{36})$/i.exec(path)?.[1];
          const response = await commandRequest(nodeRequest, guild, deps, commandId);
          outgoing.writeHead(response.status, Object.fromEntries(response.headers));
          outgoing.end(await response.text());
        })().catch(() => {
          outgoing.writeHead(503);
          outgoing.end('Synthetic integration handler unavailable.');
        });
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      try {
        const address = server.address();
        assert(address && typeof address === 'object');
        const base = `http://127.0.0.1:${address.port}`;
        const response = await fetch(`${base}/api/guilds/${guild}/commands`, {
          method: 'POST',
          headers: {
            origin: fixtureOrigin,
            'Content-Type': 'application/json',
            'Idempotency-Key': randomUUID(),
            cookie: 'phase15e=synthetic',
          },
          body: JSON.stringify(apply()),
        });
        assert.equal(response.status, 202);
        const accepted = await response.json();
        const before = await fetch(base + accepted.command.statusUrl, {
          headers: { cookie: 'phase15e=synthetic' },
        });
        assert.equal((await before.json()).status, 'pending');
        await run();
        const committed = await awaitCommand<{ version: number }>(
          accepted.command,
          () => {},
          (url, options) =>
            fetch(base + String(url), { ...options, headers: { cookie: 'phase15e=synthetic' } }),
          async () => {},
        );
        assert.equal(committed.version, 2);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
  await check('Unauthenticated, unauthorized and cross-guild results are rejected', async () => {
    const invalid = request();
    invalid.headers.delete('cookie');
    assert.equal((await commandRequest(invalid, guild, deps)).status, 403);
    const row = await enqueue();
    assert.equal((await status(row.id, other)).status, 403);
    manager = false;
    assert.equal((await status(row.id)).status, 403);
    assert.equal((await commandRequest(request(), guild, deps)).status, 403);
  });
  await check('Strict allowlist, hostile payloads and CSRF cannot enter queue', async () => {
    for (const payload of [
      { kind: 'http.proxy', payload: { url: 'https://discord.com' } },
      { kind: 'guild_status.refresh', payload: { token: 'synthetic-sensitive-value' } },
      {
        kind: 'notification_test.send',
        payload: { subscriptionId: sub, expectedVersion: 1, config },
      },
    ])
      assert.equal((await commandRequest(request(payload), guild, deps)).status, 400);
    const foreign = request();
    foreign.headers.set('origin', 'https://foreign.invalid');
    assert.equal((await commandRequest(foreign, guild, deps)).status, 403);
    assert.equal(
      (await owner.query('SELECT count(*)::int as count FROM bot_commands')).rows[0].count,
      0,
    );
  });
  await check('Concurrent duplicate submissions and processors execute one command', async () => {
    const key = randomUUID();
    const rows = await Promise.all(Array.from({ length: 6 }, () => enqueue(apply(), key)));
    assert.equal(new Set(rows.map((row) => row.id)).size, 1);
    await Promise.all([run(), run(), run()]);
    assert.equal((await webRepo.get(guild, principal, rows[0]!.id)).status, 'completed');
    assert.equal(
      (await owner.query('SELECT count(*)::int as count FROM bot_command_attempts')).rows[0].count,
      1,
    );
    await assert.rejects(
      () =>
        enqueue(
          { ...apply(), payload: { ...apply().payload, config: { ...config, enabled: false } } },
          key,
        ),
      { code: 'command_conflict' },
    );
  });
  await check('Execution-time permission revocation fails without settings change', async () => {
    const row = await enqueue(apply());
    executionAllowed = false;
    await run();
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'failed');
    assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 1);
  });
  await check(
    'Session revoked after admission cannot execute or poll protected results',
    async () => {
      const row = await enqueue(apply());
      await owner.query('DELETE FROM auth_session');
      await run();
      assert.equal(
        (await owner.query('SELECT status FROM bot_commands WHERE id=$1', [row.id])).rows[0].status,
        'failed',
      );
      assert.equal((await status(row.id)).status, 403);
      assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 1);
    },
  );
  await check(
    'Independent guild settings share source identity without destination leakage',
    async () => {
      const secondSub = '22222222-aaaa-aaaa-aaaa-222222222222',
        secondChannel = '666666666666666666';
      await owner.query(
        "INSERT INTO streamer_subscriptions(id,guild_id,provider_channel_id,user_identifier) VALUES ($1,$2,'source','@synthetic');",
        [secondSub, other],
      );
      await owner.query(
        "INSERT INTO notification_settings(subscription_id,guild_id,channel_id,template,enabled,version) VALUES ($1,$2,$3,'{url}',true,1)",
        [secondSub, other, secondChannel],
      );
      access.targets = async () => ({
        channels: [
          { id: channel, name: 'first', canEmbed: true, canMentionEveryone: true },
          { id: secondChannel, name: 'second', canEmbed: true, canMentionEveryone: true },
        ],
        roles: [],
      });
      const first = await enqueue(apply()),
        second = await webRepo.enqueue(other, principal, randomUUID(), {
          kind: 'notification_settings.apply',
          payload: {
            subscriptionId: secondSub,
            expectedVersion: 1,
            config: { ...config, channelId: secondChannel },
          },
        });
      await Promise.all([run(), run()]);
      assert.equal((await webRepo.get(guild, principal, first.id)).status, 'completed');
      assert.equal((await webRepo.get(other, principal, second.id)).status, 'completed');
      assert.equal(
        (await createNotificationRepository(webDb).get(guild, sub)).config?.channelId,
        channel,
      );
      assert.equal(
        (await createNotificationRepository(webDb).get(other, secondSub)).config?.channelId,
        secondChannel,
      );
      assert.equal((await status(second.id, guild)).status, 403);
    },
  );
  await check('Safe errors and logs omit synthetic secrets and command internals', async () => {
    const sentinel = 'synthetic-secret-must-not-cross-boundary';
    const row = await enqueue();
    access.status = async () => {
      throw new Error(sentinel);
    };
    await run();
    const result = await (await status(row.id)).json();
    const serialized = JSON.stringify({ result, logs });
    assert(!serialized.includes(sentinel));
    for (const field of [
      'payload',
      'sessionRef',
      'requesterUserId',
      'requesterDiscordId',
      'leaseOwner',
      'policyHash',
    ])
      assert(!(field in result));
    assert.equal(result.errorCode, 'command_unavailable');
  });
  await check('Bot offline expiration and retained pending evidence', async () => {
    const row = await enqueue();
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'pending');
    await expire(row.id);
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'expired');
    assert.equal(
      (await owner.query('SELECT status FROM bot_commands WHERE id=$1', [row.id])).rows[0].status,
      'pending',
    );
    await botRepo.recover();
    assert.equal(
      (await owner.query('SELECT status FROM bot_commands WHERE id=$1', [row.id])).rows[0].status,
      'expired',
    );
  });
  await check('Crash before effect, lease recovery and stale acknowledgment fencing', async () => {
    const row = await enqueue();
    const original = (await botRepo.claim(randomUUID()))!;
    await owner.query(
      "UPDATE bot_commands SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [row.id],
    );
    await botRepo.recover();
    const replacement = (await botRepo.claim(randomUUID()))!;
    assert.equal(replacement.leaseGeneration, 2);
    await assert.rejects(() =>
      botRepo.complete(original, { status: 'installed', observedAt: new Date().toISOString() }),
    );
    await botRepo.complete(replacement, {
      status: 'installed',
      observedAt: new Date().toISOString(),
    });
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'completed');
  });
  await check(
    'Physical PostgreSQL connection loss, transaction rollback and restoration',
    async () => {
      const client = await bot.connect();
      client.on('error', () => {});
      const pid = (await client.query('SELECT pg_backend_pid() as pid')).rows[0].pid;
      await client.query('BEGIN');
      await client.query(
        'UPDATE notification_settings SET enabled=false,version=2 WHERE subscription_id=$1',
        [sub],
      );
      const killed = await owner.query(
        'SELECT pg_terminate_backend(pid) as killed FROM pg_stat_activity WHERE pid=$1 AND datname=$2',
        [pid, name],
      );
      assert.equal(killed.rows[0]?.killed, true);
      await assert.rejects(() => client.query('COMMIT'));
      client.release(true);
      assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 1);
      const row = await enqueue(apply());
      await run();
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'completed');
    },
  );
  await check(
    'Immediate disabling invalidates older queued apply while backend offline',
    async () => {
      const row = await enqueue(apply());
      await createNotificationRepository(webDb).save(guild, sub, { ...config, enabled: false }, 1);
      await run();
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'failed');
      assert.equal(
        (await createNotificationRepository(webDb).get(guild, sub)).config?.enabled,
        false,
      );
    },
  );
  await check('Atomic settings/ack rollback when commit path is interrupted', async () => {
    const row = await enqueue(apply());
    const claimed = (await botRepo.claim(randomUUID()))!;
    await owner.query(
      "CREATE FUNCTION phase15e_fail_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='completed' THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$; CREATE TRIGGER phase15e_fail_ack BEFORE UPDATE ON bot_commands FOR EACH ROW EXECUTE FUNCTION phase15e_fail_ack()",
    );
    try {
      await assert.rejects(() => botRepo.complete(claimed, {}));
    } finally {
      await owner.query(
        'DROP TRIGGER phase15e_fail_ack ON bot_commands; DROP FUNCTION phase15e_fail_ack()',
      );
    }
    assert.equal((await createNotificationRepository(webDb).get(guild, sub)).version, 1);
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'processing');
  });
  await check(
    'Rate limits defer safely and oversized Retry-After expires without an early retry',
    async () => {
      const row = await enqueue();
      access.status = async () => {
        throw new CommandError('discord_rate_limited', 5);
      };
      await run();
      const pending = await webRepo.get(guild, principal, row.id);
      assert.equal(pending.status, 'pending');
      assert.equal(pending.retryAfterSeconds, 5);
      assert.equal(await botRepo.claim(randomUUID()), undefined);
      await owner.query(
        "UPDATE bot_commands SET due_at=clock_timestamp()-interval '1 second' WHERE id=$1",
        [row.id],
      );
      access.status = async () => {
        throw new CommandError('discord_rate_limited', 600);
      };
      await run();
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'expired');
    },
  );
  await check(
    'Ambiguous external send stays uncertain and a late receipt never authorizes retry',
    async () => {
      const row = await enqueue(test()),
        claimed = (await botRepo.claim(randomUUID()))!;
      await botRepo.markEffect(claimed);
      await owner.query(
        "UPDATE bot_commands SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
        [row.id],
      );
      await botRepo.recover();
      await botRepo.recordReceipt(claimed, { channelId: channel, messageId: message });
      await run();
      await run();
      assert.equal(sends, 0);
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'uncertain');
      assert.equal(
        (
          await owner.query('SELECT message_id FROM bot_command_attempts WHERE command_id=$1', [
            row.id,
          ])
        ).rows[0].message_id,
        message,
      );
      await assert.rejects(() =>
        owner.query("UPDATE bot_commands SET status='pending' WHERE id=$1", [row.id]),
      );
    },
  );
  await check(
    'Simulated successful test receipt is durable and replay does not send twice',
    async () => {
      const key = randomUUID(),
        row = await enqueue(test(), key);
      await run();
      assert.equal(sends, 1);
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'completed');
      assert.equal((await enqueue(test(), key)).id, row.id);
      await run();
      assert.equal(sends, 1);
      assert.equal(
        (
          await owner.query('SELECT status FROM notification_test_attempts WHERE request_id=$1', [
            key,
          ])
        ).rows[0].status,
        'sent',
      );
    },
  );
  await check('Legacy pruning preserves unresolved and command-linked test records', async () => {
    const row = await enqueue(test());
    await owner.query("UPDATE notification_test_attempts SET created_at=now()-interval '9 days'");
    await createNotificationRepository(webDb).pruneTests();
    assert.equal(
      (await owner.query('SELECT count(*)::int as count FROM notification_test_attempts')).rows[0]
        .count,
      1,
    );
    assert.equal((await webRepo.get(guild, principal, row.id)).status, 'pending');
  });
  await check(
    'Rollback admission pause retains status access, queued evidence and direct disabling',
    async () => {
      const row = await enqueue();
      deps.environment.BOT_COMMAND_ADMISSION_ENABLED = false;
      try {
        assert.equal((await commandRequest(request(), guild, deps)).status, 503);
        assert.equal((await status(row.id)).status, 200);
        await createNotificationRepository(webDb).save(
          guild,
          sub,
          { ...config, enabled: false },
          1,
        );
      } finally {
        deps.environment.BOT_COMMAND_ADMISSION_ENABLED = true;
      }
      assert.equal((await webRepo.get(guild, principal, row.id)).status, 'pending');
    },
  );
  await check(
    'Actual opt-in command loop startup and graceful stop with synthetic Discord only',
    async () => {
      const row = await enqueue();
      stopRuntime = await startBotCommands(
        { enabled: true, databaseUrl: scopedUrl(botRole), ...policy },
        access,
        (entry) => logs.push(entry),
      );
      const until = Date.now() + 10000;
      while ((await webRepo.get(guild, principal, row.id)).status !== 'completed') {
        assert(Date.now() < until);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      await stopRuntime();
      stopRuntime = undefined;
      assert.equal(sends, 0);
      assert(!JSON.stringify(logs).includes('synthetic-not-a-real-cookie'));
      assert(logs.some((entry) => entry.event === 'command_completed'));
    },
  );
  await check(
    'Measured local command overhead and retention size (synthetic metadata)',
    async () => {
      const timings: number[] = [],
        rssBefore = process.memoryUsage().rss;
      for (let index = 0; index < 50; index++) {
        const started = performance.now();
        const row = await enqueue();
        await run();
        assert.equal((await webRepo.get(guild, principal, row.id)).status, 'completed');
        timings.push(performance.now() - started);
      }
      const before = queries;
      for (let index = 0; index < 10; index++) await run();
      const idleStatements = (queries - before) / 10;
      const size = await owner.query(
        "SELECT pg_total_relation_size('bot_commands')::bigint as command_bytes, pg_total_relation_size('bot_command_attempts')::bigint as attempt_bytes, avg(pg_column_size(c))::int as average_row_bytes FROM bot_commands c",
      );
      timings.sort((a, b) => a - b);
      Object.assign(metrics, {
        sampleCommands: 50,
        p50Milliseconds: timings[24],
        p95Milliseconds: timings[47],
        idleStatementsPerStep: idleStatements,
        estimatedIdleStatementsPer30Days: idleStatements * 864000,
        sqlStatementsThroughDrizzle: queries,
        rssBeforeBytes: rssBefore,
        rssAfterBytes: process.memoryUsage().rss,
        retention: size.rows[0],
        poolMaximums: { web: 3, bot: 3, owner: 2, admin: 1 },
      });
    },
  );
  for (const effect of [false, true]) {
    await check(
      `Owned command process SIGKILL and restart (${effect ? 'marked effect quarantined' : 'unstarted work recovered'})`,
      async () => {
        const row = await enqueue(effect ? test() : read);
        await crashFixture(effect, row.id);
        await owner.query(
          "UPDATE bot_commands SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
          [row.id],
        );
        await run();
        assert.equal(
          (await webRepo.get(guild, principal, row.id)).status,
          effect ? 'uncertain' : 'completed',
        );
        assert.equal(sends, 0);
        if (!effect)
          assert.equal(
            (await owner.query('SELECT lease_generation FROM bot_commands WHERE id=$1', [row.id]))
              .rows[0].lease_generation,
            2,
          );
      },
    );
  }
  for (const script of ['scripts/check-command-queue.ts', 'scripts/check-reliability.ts']) {
    await check(`Existing SQL regression: ${script} (isolated database only)`, async () => {
      const child = spawnSync(process.execPath, ['--import', 'tsx', script], {
        env: { ...process.env, DATABASE_URL: isolatedUrl },
        encoding: 'utf8',
        timeout: 30000,
      });
      assert.equal(child.status, 0);
      assert(child.stdout.includes('PASS:'));
    });
  }
  metrics.normalCommandTableAfter = (
    await admin.query("SELECT to_regclass('public.bot_commands') IS NOT NULL as commands_present")
  ).rows[0].commands_present;
  assert.equal(metrics.normalCommandTableBefore, metrics.normalCommandTableAfter);
} catch {
  console.error(
    'FAIL: isolated Phase 15E setup or boundary check. Verify local CREATEDB/CREATEROLE privileges and PostgreSQL connectivity; sensitive errors suppressed.',
  );
  process.exitCode = 1;
} finally {
  await stopRuntime?.();
  await Promise.all([web.end(), bot.end(), owner.end()]);
  if (created) {
    try {
      assert(/^navi_phase15e_[a-f0-9]{32}$/.test(name));
      await admin.query(`DROP DATABASE "${name}"`);
      console.info('PASS: disposable Phase 15E database removed.');
    } catch {
      console.error('FAIL: disposable database cleanup.');
      process.exitCode = 1;
    }
  }
  if (rolesCreated) {
    try {
      await admin.query(`DROP ROLE "${webRole}","${botRole}"`);
      console.info('PASS: disposable NOLOGIN roles removed.');
    } catch {
      console.error('FAIL: disposable role cleanup.');
      process.exitCode = 1;
    }
  }
  await admin.end();
  mkdirSync('.local/phase15e', { recursive: true });
  writeFileSync(
    '.local/phase15e/integration-results.json',
    JSON.stringify(
      {
        date: '2026-10-25',
        results,
        metrics,
        exitCode: process.exitCode ?? 0,
        boundary:
          'Physical local PostgreSQL; exact migrations in a new database; effective NOLOGIN service roles via SET ROLE; synthetic session/Discord adapters, no real Discord or provider traffic.',
      },
      null,
      2,
    ),
  );
}
