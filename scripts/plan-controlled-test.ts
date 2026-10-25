import { readFileSync } from 'node:fs';
import { loadRootEnvironment, readWorkerEnvironment } from '@navi/config';
import { createDatabase } from '@navi/database';
import {
  controlledTestPlan,
  readTestScope,
  type TestRoute,
  type TestDelivery,
} from './lib/controlled-test-plan';

let database: ReturnType<typeof createDatabase> | undefined;
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !args[0]?.startsWith('--scope-file=')))
    throw new Error();
  const scope = args[0]
    ? readTestScope(JSON.parse(readFileSync(args[0].slice('--scope-file='.length), 'utf8')))
    : undefined;
  const environment = readWorkerEnvironment(loadRootEnvironment('worker'));
  database = createDatabase(environment.DATABASE_URL);
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const routes =
      await client.query<TestRoute>(`SELECT s.id AS "subscriptionId", s.provider_channel_id AS "sourceId", p.provider, s.guild_id AS "guildId",
      n.channel_id AS "channelId", s.enabled, coalesce(n.enabled,false) AS "notificationsEnabled", n.role_id AS "roleId", coalesce(n.mention_everyone,false) AS "mentionEveryone"
      FROM streamer_subscriptions s JOIN provider_channels p ON p.id=s.provider_channel_id
      LEFT JOIN notification_settings n ON n.subscription_id=s.id AND n.guild_id=s.guild_id`);
    const deliveries =
      await client.query<TestDelivery>(`SELECT m.source_id AS "sourceId", d.guild_id AS "guildId", d.channel_id AS "channelId", d.status,
      to_char(m.started_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startedAt"
      FROM live_deliveries d JOIN monitor_sessions m ON m.id=d.session_id`);
    const plan = controlledTestPlan(routes.rows, deliveries.rows, scope);
    await client.query('COMMIT');
    console.info(JSON.stringify({ event: 'controlled_test_plan', ...plan }));
    if (plan.blockers.length) process.exitCode = 1;
  } finally {
    // ROLLBACK is harmless after COMMIT and clears a failed read-only transaction.
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
} catch {
  console.error(
    JSON.stringify({
      event: 'controlled_test_plan',
      code: 'check_scope_file_and_database',
      liveExecutionAuthorized: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await database?.close();
}
