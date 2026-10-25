import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { RateLimitError } from 'discord.js';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandError, readCommand } from '@navi/core';
import {
  schema,
  createCommandRepository,
  createCommandAdmission,
  createNotificationRepository,
  type CommandRepository,
} from '@navi/database';
import {
  createCommandProcessor,
  type CommandDiscordAccess,
  type CommandCoordinator,
} from '../apps/bot/src/command-processor';
import { createCommandDiscordAccess } from '../apps/bot/src/command-discord';
import { createBotNotifications } from '../apps/bot/src/notifications';
import { ids, notificationDiscordFixture } from './notification-fixtures';
import { commandRequest } from '../apps/web/src/lib/command-http';

const guild = '111111111111111111',
  other = '222222222222222222',
  actor = '333333333333333333',
  actor2 = '444444444444444444',
  channel = '555555555555555555',
  message = '666666666666666666';
const subscription = '11111111-aaaa-aaaa-aaaa-111111111111';
const principal = { userId: 'user', discordId: actor, sessionRef: 'session' };
const policy = { allowedUsers: [actor, actor2], allowedGuilds: [guild, other] };
const headers = new Headers({ origin: 'https://navi.example' });
const config = { channelId: channel, roleId: null, template: '{streamer} {url}', enabled: true };
const pg = new PGlite();
const db = drizzle(pg, { schema });
let repo: CommandRepository;
let access: CommandDiscordAccess;
const coordinate: CommandCoordinator = async (_id, operation) => operation(() => {});
const read = () => ({ kind: 'guild_status.refresh', payload: {} });
const test = () => ({
  kind: 'notification_test.send',
  payload: { subscriptionId: subscription, expectedVersion: 1 },
});
const apply = () => ({
  kind: 'notification_settings.apply',
  payload: { subscriptionId: subscription, expectedVersion: 1, config },
});
const enqueue = (input: unknown = read(), key: string = randomUUID()) =>
  repo.enqueue(guild, principal, key, input);
const state = async (id: string) =>
  (await db.select().from(schema.botCommands).where(eq(schema.botCommands.id, id)))[0]!;
const run = () => createCommandProcessor(repo, access, coordinate).runOne(randomUUID());
function httpFixture() {
  const authorize = vi.fn(async () => {});
  const commands = createCommandAdmission({
    repository: repo,
    origin: 'https://navi.example',
    session: async () => ({
      session: { id: principal.sessionRef, userId: principal.userId },
      user: { id: principal.userId, email: `discord-${actor}@users.navi.invalid` },
    }),
    authorize,
  });
  const deps = { commands, environment: { WEB_ORIGIN: 'https://navi.example' } };
  const request = (body: unknown = read(), key = randomUUID()) =>
    new Request('https://navi.example/api/commands', {
      method: 'POST',
      headers: {
        origin: 'https://navi.example',
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    });
  return { deps, request, authorize };
}
async function expireLease(id: string) {
  await pg.query(
    "UPDATE bot_commands SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [id],
  );
}
async function expireCommand(id: string) {
  // Owner-only fixture time travel; application roles cannot alter immutable timestamps.
  await pg.exec('ALTER TABLE bot_commands DISABLE TRIGGER bot_command_immutable');
  try {
    await pg.query(
      "UPDATE bot_commands SET created_at=clock_timestamp()-interval '1 hour', expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [id],
    );
  } finally {
    await pg.exec('ALTER TABLE bot_commands ENABLE TRIGGER bot_command_immutable');
  }
}
beforeAll(async () => {
  for (const file of readdirSync('packages/database/migrations')
    .filter((x) => x.endsWith('.sql'))
    .sort())
    await pg.exec(readFileSync(`packages/database/migrations/${file}`, 'utf8'));
}, 20000);
afterAll(async () => pg.close());
beforeEach(async () => {
  await pg.exec(`TRUNCATE bot_command_attempts,bot_commands,bot_guild_snapshots,notification_test_attempts,notification_settings,streamer_subscriptions,provider_channels,auth_session,auth_account,auth_user CASCADE;
    INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES ('user','Fixture','discord-${actor}@users.navi.invalid',false,now(),now()),('other-user','Fixture','discord-${actor2}@users.navi.invalid',false,now(),now());
    INSERT INTO auth_session(id,user_id,token,expires_at,created_at,updated_at) VALUES ('session','user','synthetic-session-value',now()+interval '1 hour',now(),now()),('other-session','other-user','synthetic-other-value',now()+interval '1 hour',now(),now());
    INSERT INTO auth_account(id,account_id,provider_id,user_id,created_at,updated_at) VALUES ('account','${actor}','discord','user',now(),now()),('other-account','${actor2}','discord','other-user',now(),now());
    INSERT INTO provider_channels(id,provider,external_id,display_name,canonical_url,verified_at,expires_at) VALUES ('source','youtube','UCaaaaaaaaaaaaaaaaaaaaaa','Fixture','https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',now(),now()+interval '1 day');
    INSERT INTO streamer_subscriptions(id,guild_id,provider_channel_id,user_identifier) VALUES ('${subscription}','${guild}','source','@fixture');
    INSERT INTO notification_settings(subscription_id,guild_id,channel_id,template,enabled,version) VALUES ('${subscription}','${guild}','${channel}','{streamer} {url}',true,1);`);
  repo = createCommandRepository(db, policy);
  access = {
    status: vi.fn(async () => 'installed' as const),
    authorize: vi.fn(async () => {}),
    targets: vi.fn(async () => ({
      channels: [{ id: channel, name: 'test', canEmbed: true, canMentionEveryone: true }],
      roles: [],
    })),
    sendTest: vi.fn(async () => ({
      status: 'sent' as const,
      channelId: channel,
      messageId: message,
    })),
  };
});
describe('dashboard HTTP acknowledgments with embedded SQL', () => {
  it('returns 202 while bot offline; duplicate admission returns same command, then completed data', async () => {
    const { deps, request } = httpFixture(),
      key = randomUUID();
    const first = await commandRequest(request(apply(), key), guild, deps);
    expect(first.status).toBe(202);
    const accepted = await first.json();
    expect(accepted).toMatchObject({ accepted: true, command: { status: 'pending' } });
    expect(accepted.result).toBeUndefined();
    expect(first.headers.get('location')).toBe(accepted.command.statusUrl);
    const again = await commandRequest(request(apply(), key), guild, deps);
    expect((await again.json()).command.id).toBe(accepted.command.id);
    const pending = await commandRequest(
      new Request('https://navi.example/status'),
      guild,
      deps,
      accepted.command.id,
    );
    expect((await pending.json()).status).toBe('pending');
    await run();
    const completed = await commandRequest(
      new Request('https://navi.example/status'),
      guild,
      deps,
      accepted.command.id,
    );
    expect(await completed.json()).toMatchObject({ status: 'completed', result: { version: 2 } });
  });
  it('rechecks current web access and prevents cross-guild result access', async () => {
    const { deps, request, authorize } = httpFixture();
    const accepted = await (await commandRequest(request(), guild, deps)).json();
    expect(
      (
        await commandRequest(
          new Request('https://navi.example/status'),
          other,
          deps,
          accepted.command.id,
        )
      ).status,
    ).toBe(403);
    authorize.mockRejectedValue(new CommandError('command_forbidden'));
    expect(
      (
        await commandRequest(
          new Request('https://navi.example/status'),
          guild,
          deps,
          accepted.command.id,
        )
      ).status,
    ).toBe(403);
  });
  it('rejects revoked sessions, invalid schemas, CSRF and disabled transport without broker fallback', async () => {
    const { deps, request } = httpFixture();
    expect(
      (await commandRequest(request({ kind: 'arbitrary', payload: {} }), guild, deps)).status,
    ).toBe(400);
    const foreign = request();
    foreign.headers.set('origin', 'https://foreign.example');
    expect((await commandRequest(foreign, guild, deps)).status).toBe(403);
    expect((await commandRequest(request(), guild, { ...deps, commands: undefined })).status).toBe(
      404,
    );
    await pg.exec("DELETE FROM auth_session WHERE id='session'");
    expect((await commandRequest(request(), guild, deps)).status).toBe(403);
  });
  it('revalidates backend management permission after admission', async () => {
    const { deps, request } = httpFixture();
    const accepted = await (await commandRequest(request(apply()), guild, deps)).json();
    access.authorize = vi.fn(async () => {
      throw new CommandError('command_forbidden');
    });
    await run();
    const response = await commandRequest(
      new Request('https://navi.example/status'),
      guild,
      deps,
      accepted.command.id,
    );
    expect(await response.json()).toMatchObject({
      status: 'failed',
      errorCode: 'command_forbidden',
    });
    expect((await createNotificationRepository(db).get(guild, subscription)).version).toBe(1);
  });
  it('returns uncertain without creating or retrying another send', async () => {
    const { deps, request } = httpFixture();
    const accepted = await (await commandRequest(request(test()), guild, deps)).json();
    access.sendTest = vi.fn(async () => {
      throw new Error('synthetic lost response');
    });
    await run();
    await run();
    const response = await commandRequest(
      new Request('https://navi.example/status'),
      guild,
      deps,
      accepted.command.id,
    );
    expect((await response.json()).status).toBe('uncertain');
    expect(access.sendTest).toHaveBeenCalledTimes(1);
  });
  it('pauses new admission while retaining scoped status reads and durable records for rollback', async () => {
    const { deps, request } = httpFixture();
    const accepted = await (await commandRequest(request(), guild, deps)).json();
    const paused = {
      ...deps,
      environment: { ...deps.environment, BOT_COMMAND_ADMISSION_ENABLED: false },
    };
    expect((await commandRequest(request(), guild, paused)).status).toBe(503);
    const pending = await commandRequest(
      new Request('https://navi.example/status'),
      guild,
      paused,
      accepted.command.id,
    );
    expect((await pending.json()).status).toBe('pending');
    expect((await state(accepted.command.id)).status).toBe('pending');
  });
  it('shows expired unstarted work when bot is offline without rewriting queue evidence', async () => {
    const row = await enqueue();
    await expireCommand(row.id);
    expect((await repo.get(guild, principal, row.id)).status).toBe('expired');
    expect((await state(row.id)).status).toBe('pending');
  });
  it('serves only fresh, scoped snapshots and does not confuse them with authorization', async () => {
    expect(await repo.snapshot(guild, 'notification_targets.refresh')).toBeNull();
    await enqueue({ kind: 'notification_targets.refresh', payload: {} });
    await run();
    expect(await repo.snapshot(guild, 'notification_targets.refresh')).toMatchObject({
      channels: [{ id: channel }],
    });
    await expect(
      repo.snapshot('999999999999999999', 'notification_targets.refresh'),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
    await pg.exec(
      "UPDATE bot_guild_snapshots SET stale_after=clock_timestamp()-interval '1 second'",
    );
    expect(await repo.snapshot(guild, 'notification_targets.refresh')).toBeNull();
  });
});
describe('strict admission and isolation', () => {
  it.each([
    { kind: 'send_anything', payload: {} },
    { kind: 'guild_status.refresh', payload: { token: 'secret' } },
    {
      kind: 'notification_test.send',
      payload: { subscriptionId: subscription, expectedVersion: 0 },
    },
    {
      kind: 'notification_test.send',
      payload: { subscriptionId: subscription, expectedVersion: 1, config },
    },
    {
      kind: 'notification_settings.apply',
      payload: {
        subscriptionId: subscription,
        expectedVersion: 1,
        config: { ...config, template: '@everyone' },
      },
    },
    { kind: 'guild_status.refresh', payload: {}, requesterDiscordId: actor },
  ])('rejects invalid or credential-bearing payload %#', async (input) => {
    expect(() => readCommand(input)).toThrow('invalid_command');
    await expect(enqueue(input)).rejects.toMatchObject({ code: 'invalid_command' });
    expect(await db.select().from(schema.botCommands)).toHaveLength(0);
  });
  function admission(manager = true, signedIn = true) {
    return createCommandAdmission({
      repository: repo,
      origin: 'https://navi.example',
      session: async () =>
        signedIn
          ? {
              session: { id: 'session', userId: 'user' },
              user: { id: 'user', email: `discord-${actor}@users.navi.invalid` },
            }
          : null,
      authorize: async () => {
        if (!manager) throw new CommandError('command_forbidden');
      },
    });
  }
  it('requires session, current manager permission and same-origin submission', async () => {
    await expect(
      admission(false).submit(headers, guild, randomUUID(), read()),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
    await expect(
      admission(true, false).submit(headers, guild, randomUUID(), read()),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
    await expect(
      admission().submit(
        new Headers({ origin: 'https://attacker.example' }),
        guild,
        randomUUID(),
        read(),
      ),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
    const result = await admission().submit(headers, guild, randomUUID(), read());
    expect(result.status).toBe('pending');
    expect(result).not.toHaveProperty('sessionRef');
  });
  it('rejects forged session binding and foreign subscription', async () => {
    await expect(
      repo.enqueue(guild, { ...principal, userId: 'other-user' }, randomUUID(), read()),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
    await expect(repo.enqueue(other, principal, randomUUID(), apply())).rejects.toMatchObject({
      code: 'subscription_not_found',
    });
  });
  it('does not expose another actor or guild result', async () => {
    const row = await enqueue();
    await expect(repo.get(other, principal, row.id)).rejects.toMatchObject({
      code: 'command_forbidden',
    });
    await expect(
      repo.get(
        guild,
        { userId: 'other-user', discordId: actor2, sessionRef: 'other-session' },
        row.id,
      ),
    ).rejects.toMatchObject({ code: 'command_forbidden' });
  });
  it('deduplicates concurrent admission and rejects changed body/actor', async () => {
    const key = randomUUID();
    const rows = await Promise.all([enqueue(apply(), key), enqueue(apply(), key)]);
    expect(rows[0]!.id).toBe(rows[1]!.id);
    await expect(
      enqueue(
        { ...apply(), payload: { ...apply().payload, config: { ...config, enabled: false } } },
        key,
      ),
    ).rejects.toMatchObject({ code: 'command_conflict' });
    await expect(
      repo.enqueue(
        guild,
        { userId: 'other-user', discordId: actor2, sessionRef: 'other-session' },
        key,
        apply(),
      ),
    ).rejects.toMatchObject({ code: 'command_conflict' });
  });
  it('reserves test ledger atomically and preserves the guild cooldown', async () => {
    await enqueue(test());
    await expect(enqueue(test())).rejects.toMatchObject({ code: 'test_notification_rate_limited' });
    expect(await db.select().from(schema.botCommands)).toHaveLength(1);
    expect(await db.select().from(schema.notificationTestAttempts)).toHaveLength(1);
  });
});
describe('ownership, expiry and recovery', () => {
  it('claims once under concurrency and fences old generations', async () => {
    const row = await enqueue();
    const claims = await Promise.all([repo.claim(randomUUID()), repo.claim(randomUUID())]);
    const original = claims.find(Boolean)!;
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expireLease(row.id);
    await repo.recover();
    const next = (await repo.claim(randomUUID()))!;
    expect(next.leaseGeneration).toBe(2);
    await expect(
      repo.complete(original, { status: 'installed', observedAt: new Date().toISOString() }),
    ).rejects.toMatchObject({ code: 'command_lease_lost' });
    expect(await repo.renew(original)).toBe(false);
  });
  it('expires pending commands without external calls', async () => {
    const row = await enqueue();
    await expireCommand(row.id);
    await run();
    expect((await state(row.id)).status).toBe('expired');
    expect(access.status).not.toHaveBeenCalled();
  });
  it('bounds crash recovery to three attempts', async () => {
    const row = await enqueue();
    for (let index = 0; index < 3; index++) {
      expect(await repo.claim(randomUUID())).toBeDefined();
      await expireLease(row.id);
      await repo.recover();
    }
    expect((await state(row.id)).status).toBe('failed');
    expect(await repo.claim(randomUUID())).toBeUndefined();
  });
  it('quarantines interrupted possible sends and never reclaims them', async () => {
    const row = await enqueue(test());
    const claimed = (await repo.claim(randomUUID()))!;
    await repo.markEffect(claimed);
    await expireLease(row.id);
    await repo.recover();
    await run();
    expect((await state(row.id)).status).toBe('uncertain');
    expect((await db.select().from(schema.notificationTestAttempts))[0]!.status).toBe('uncertain');
    expect(access.sendTest).not.toHaveBeenCalled();
  });
  it('fails closed on policy mismatch and revoked session', async () => {
    const row = await enqueue();
    const different = createCommandRepository(db, {
      allowedUsers: [actor],
      allowedGuilds: [guild],
    });
    await createCommandProcessor(different, access, coordinate).runOne(randomUUID());
    expect((await state(row.id)).status).toBe('failed');
    const next = await enqueue();
    await pg.exec("DELETE FROM auth_session WHERE id='session'");
    await run();
    expect((await state(next.id)).status).toBe('failed');
    expect(access.status).not.toHaveBeenCalled();
  });
  it('prevents immutable identity/payload and terminal outcome changes', async () => {
    const row = await enqueue();
    await expect(
      pg.query('UPDATE bot_commands SET guild_id=$1 WHERE id=$2', [other, row.id]),
    ).rejects.toThrow('immutable_command');
    await run();
    await expect(
      pg.query("UPDATE bot_commands SET status='pending',result=NULL WHERE id=$1", [row.id]),
    ).rejects.toThrow('immutable_command');
  });
});
describe('processor safety and acknowledgments', () => {
  it('completes read with sanitized result/snapshot and survives duplicate dispatch', async () => {
    const key = randomUUID(),
      row = await enqueue(read(), key);
    await run();
    await enqueue(read(), key);
    await run();
    expect(access.status).toHaveBeenCalledTimes(1);
    const result = await repo.get(guild, principal, row.id);
    expect(result.status).toBe('completed');
    expect(await db.select().from(schema.botGuildSnapshots)).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('synthetic-session');
  });
  it('rechecks actor authority and destination before settings apply', async () => {
    const row = await enqueue(apply());
    access.authorize = vi.fn(async () => {
      throw new CommandError('command_forbidden');
    });
    await run();
    expect((await state(row.id)).errorCode).toBe('command_forbidden');
    expect((await createNotificationRepository(db).get(guild, subscription)).version).toBe(1);
  });
  it('commits settings and ack atomically, and respects immediate disable/version changes', async () => {
    const row = await enqueue(apply());
    await run();
    expect((await state(row.id)).status).toBe('completed');
    expect((await createNotificationRepository(db).get(guild, subscription)).version).toBe(2);
    const queued = await enqueue({
      ...apply(),
      payload: { ...apply().payload, expectedVersion: 2 },
    });
    await createNotificationRepository(db).save(
      guild,
      subscription,
      { ...config, enabled: false },
      2,
    );
    await run();
    expect((await state(queued.id)).errorCode).toBe('notification_settings_changed');
    expect((await createNotificationRepository(db).get(guild, subscription)).config!.enabled).toBe(
      false,
    );
  });
  it('rolls back settings if acknowledgment persistence fails', async () => {
    const row = await enqueue(apply());
    await pg.exec(
      `CREATE FUNCTION test_reject_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='completed' THEN RAISE EXCEPTION 'synthetic persistence failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_reject_ack BEFORE UPDATE ON bot_commands FOR EACH ROW EXECUTE FUNCTION test_reject_ack();`,
    );
    try {
      await run();
      expect((await createNotificationRepository(db).get(guild, subscription)).version).toBe(1);
      expect((await state(row.id)).status).not.toBe('completed');
    } finally {
      await pg.exec(
        'DROP TRIGGER test_reject_ack ON bot_commands; DROP FUNCTION test_reject_ack()',
      );
    }
  });
  it('returns one verified test receipt using the saved config/key', async () => {
    const row = await enqueue(test());
    await run();
    await run();
    expect(access.sendTest).toHaveBeenCalledTimes(1);
    expect(access.sendTest).toHaveBeenCalledWith(
      guild,
      expect.objectContaining({ requestId: row.idempotencyKey, config }),
    );
    expect((await repo.get(guild, principal, row.id)).result).toEqual({
      status: 'sent',
      channelId: channel,
      messageId: message,
    });
  });
  it('records uncertain when response is lost, with no blind retry', async () => {
    const row = await enqueue(test());
    access.sendTest = vi.fn(async () => {
      throw new Error('SECRET-do-not-log');
    });
    const logs: unknown[] = [];
    await createCommandProcessor(repo, access, coordinate, (x) => logs.push(x)).runOne(
      randomUUID(),
    );
    await run();
    expect((await state(row.id)).status).toBe('uncertain');
    expect(access.sendTest).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logs)).not.toContain('SECRET');
  });
  it('retains completed state if a later status refresh fails', async () => {
    const row = await enqueue(apply());
    await run();
    vi.spyOn(repo, 'get').mockRejectedValueOnce(new CommandError('command_unavailable'));
    await expect(repo.get(guild, principal, row.id)).rejects.toThrow();
    expect((await repo.get(guild, principal, row.id)).status).toBe('completed');
  });
  it('honors Retry-After without retry loops and expires delays beyond TTL', async () => {
    const row = await enqueue();
    access.status = vi.fn(async () => {
      throw new CommandError('discord_rate_limited', 45);
    });
    await run();
    await run();
    expect(access.status).toHaveBeenCalledTimes(1);
    expect((await state(row.id)).retryAfterSeconds).toBe(45);
    expect((await state(row.id)).status).toBe('pending');
    const second = await enqueue();
    access.status = vi.fn(async () => {
      throw new CommandError('discord_rate_limited', 600);
    });
    await run();
    expect((await state(second.id)).status).toBe('expired');
  });
  it('handles database admission/claim failures without effect or SQL leakage', async () => {
    const broken = {
      ...repo,
      claim: async () => {
        throw new Error('postgresql://SECRET');
      },
    };
    const logs: unknown[] = [];
    expect(
      await createCommandProcessor(broken, access, coordinate, (x) => logs.push(x)).runOne(
        randomUUID(),
      ),
    ).toBe(false);
    expect(access.sendTest).not.toHaveBeenCalled();
    expect(JSON.stringify(logs)).not.toContain('SECRET');
    const admission = createCommandAdmission({
      repository: {
        ...repo,
        enqueue: async () => {
          throw new Error('postgresql://SECRET');
        },
      },
      origin: 'https://navi.example',
      session: async () => ({
        session: { id: 'session', userId: 'user' },
        user: { id: 'user', email: `discord-${actor}@users.navi.invalid` },
      }),
      authorize: async () => {},
    });
    await expect(admission.submit(headers, guild, randomUUID(), read())).rejects.toMatchObject({
      message: 'command_unavailable',
    });
  });
  it('preserves unresolved and command-linked records during legacy pruning', async () => {
    const row = await enqueue(test());
    await run();
    await pg.exec("UPDATE notification_test_attempts SET created_at=now()-interval '8 days'");
    await createNotificationRepository(db).pruneTests();
    expect(await db.select().from(schema.notificationTestAttempts)).toHaveLength(1);
    expect((await state(row.id)).status).toBe('completed');
  });
});
describe('failure boundaries, receipts and private identity function', () => {
  it('does not send when durable effect marking fails', async () => {
    const row = await enqueue(test());
    vi.spyOn(repo, 'markEffect').mockRejectedValueOnce(new CommandError('command_unavailable'));
    await run();
    expect(access.sendTest).not.toHaveBeenCalled();
    expect((await state(row.id)).status).toBe('pending');
  });
  it('does not send when ownership cannot be renewed', async () => {
    await enqueue(test());
    vi.spyOn(repo, 'renew').mockRejectedValueOnce(new CommandError('command_unavailable'));
    await run();
    expect(access.sendTest).not.toHaveBeenCalled();
  });
  it('quarantines acknowledged sends if receipt commit fails', async () => {
    const row = await enqueue(test());
    vi.spyOn(repo, 'complete').mockRejectedValueOnce(new CommandError('command_unavailable'));
    await run();
    await run();
    expect((await state(row.id)).status).toBe('uncertain');
    expect(access.sendTest).toHaveBeenCalledTimes(1);
  });
  it('blocks deleted/inaccessible destinations before the send boundary', async () => {
    const row = await enqueue(test());
    access.targets = vi.fn(async () => ({ channels: [], roles: [] }));
    await run();
    expect((await state(row.id)).status).toBe('failed');
    expect((await state(row.id)).effectStartedAt).toBeNull();
    expect(access.sendTest).not.toHaveBeenCalled();
  });
  it('uses actual renderer/sender with safe mentions and a validated receipt', async () => {
    const fixture = notificationDiscordFixture();
    fixture.state.canMentionEveryone = true;
    fixture.rest.post.mockResolvedValue({ id: message, channel_id: ids.channel } as { id: string });
    const receipt = await fixture.bot.sendTestWithReceipt(ids.guild, {
      requestId: randomUUID(),
      identity: {
        provider: 'youtube',
        displayName: 'Fixture',
        canonicalUrl: 'https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',
      },
      config: { ...config, channelId: ids.channel, mentionEveryone: true },
    });
    expect(receipt.messageId).toBe(message);
    expect(fixture.rest.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.objectContaining({
          allowed_mentions: { parse: [], roles: [], users: [], replied_user: false },
        }),
      }),
    );
  });
  it('exposes identity validity without granting token/table access', async () => {
    await pg.exec(`CREATE ROLE command_fixture;
      GRANT USAGE ON SCHEMA public TO command_fixture;
      GRANT EXECUTE ON FUNCTION navi_command_requester_valid(text,text,text) TO command_fixture;
      SET ROLE command_fixture;`);
    try {
      expect(
        (
          await pg.query<{ valid: boolean }>(
            "SELECT navi_command_requester_valid('session','user',$1) AS valid",
            [actor],
          )
        ).rows[0]!.valid,
      ).toBe(true);
      await expect(pg.query('SELECT token FROM auth_session')).rejects.toThrow('permission denied');
      await expect(pg.query("UPDATE bot_commands SET status='completed'")).rejects.toThrow(
        'permission denied',
      );
    } finally {
      await pg.exec('RESET ROLE; DROP OWNED BY command_fixture; DROP ROLE command_fixture');
    }
  });
});
describe('bounded admission and late receipt evidence', () => {
  it('limits each actor and canonicalizes duplicate UUID keys', async () => {
    const key = randomUUID();
    const first = await enqueue(read(), key);
    expect((await enqueue(read(), key.toUpperCase())).id).toBe(first.id);
    for (let i = 1; i < 10; i++) await enqueue();
    await expect(enqueue()).rejects.toMatchObject({ code: 'command_capacity' });
  });
  it('records a late valid receipt without changing uncertain state or resending', async () => {
    const row = await enqueue(test()),
      claimed = (await repo.claim(randomUUID()))!;
    await repo.markEffect(claimed);
    await expireLease(row.id);
    await repo.recover();
    await repo.recordReceipt(claimed, { channelId: channel, messageId: message });
    expect((await state(row.id)).status).toBe('uncertain');
    expect((await db.select().from(schema.botCommandAttempts))[0]!.messageId).toBe(message);
    await run();
    expect(access.sendTest).not.toHaveBeenCalled();
  });
  it.each(['settings', 'test'])(
    'processes %s acknowledgments under a role without auth-table access',
    async (kind) => {
      const settings = await enqueue(kind === 'settings' ? apply() : test());
      await pg.exec(`CREATE ROLE consumer_fixture;
      GRANT USAGE ON SCHEMA public TO consumer_fixture;
      GRANT EXECUTE ON FUNCTION navi_command_requester_valid(text,text,text) TO consumer_fixture;
      GRANT SELECT,INSERT,UPDATE ON bot_commands,bot_command_attempts,bot_guild_snapshots,notification_settings,notification_test_attempts TO consumer_fixture;
      GRANT SELECT ON provider_channels,streamer_subscriptions TO consumer_fixture;
      GRANT UPDATE(id) ON provider_channels,streamer_subscriptions TO consumer_fixture;
      SET ROLE consumer_fixture;`);
      try {
        await run();
        expect((await state(settings.id)).status).toBe('completed');
        await expect(pg.query('SELECT access_token FROM auth_account')).rejects.toThrow(
          'permission denied',
        );
      } finally {
        await pg.exec('RESET ROLE; DROP OWNED BY consumer_fixture; DROP ROLE consumer_fixture');
      }
    },
  );
});
describe('targeted official Discord adapter', () => {
  it('preserves submission authorization rate limits without copying exception data', async () => {
    const admission = createCommandAdmission({
      repository: repo,
      origin: 'https://navi.example',
      session: async () => ({
        session: { id: 'session', userId: 'user' },
        user: { id: 'user', email: `discord-${actor}@users.navi.invalid` },
      }),
      authorize: async () => {
        throw { status: 429, retryAfter: 72, message: 'SECRET' };
      },
    });
    await expect(admission.submit(headers, guild, randomUUID(), read())).rejects.toMatchObject({
      message: 'discord_rate_limited',
      retryAfter: 72,
    });
    expect(await db.select().from(schema.botCommands)).toHaveLength(0);
  });
  it('accepts the current guild owner without management role bits', async () => {
    const rest = {
      get: vi.fn(async (path: string) =>
        path.endsWith('/roles')
          ? [{ id: guild, permissions: '0' }]
          : path.includes('/members/')
            ? { user: { id: actor }, roles: [] }
            : { id: guild, owner_id: actor },
      ),
      post: vi.fn(),
    };
    await createCommandDiscordAccess(rest, createBotNotifications(rest)).authorize(guild, actor);
  });
  it('preserves SDK rate-limit timing without persisting its private URL', async () => {
    const rest = {
      get: vi.fn(async () => {
        throw new RateLimitError({
          timeToReset: 1501,
          retryAfter: 1501,
          limit: 1,
          method: 'GET',
          hash: 'fixture',
          url: 'https://discord.com/SECRET',
          route: '/guilds/:id',
          majorParameter: 'global',
          global: true,
          sublimitTimeout: 0,
          scope: 'shared',
        });
      }),
      post: vi.fn(),
    };
    await expect(
      createCommandDiscordAccess(rest, createBotNotifications(rest)).status(guild),
    ).rejects.toMatchObject({ message: 'discord_rate_limited', retryAfter: 2 });
    expect(rest.post).not.toHaveBeenCalled();
  });
  it.each(['32', '8', '0'])(
    'checks actor roles/owner with Guilds-only REST access (%s)',
    async (bits) => {
      const rest = {
        get: vi.fn(async (path: string) =>
          path.endsWith('/roles')
            ? [{ id: guild, permissions: bits }]
            : path.includes('/members/')
              ? { user: { id: actor }, roles: [] }
              : { id: guild, owner_id: actor2 },
        ),
        post: vi.fn(),
      };
      const adapter = createCommandDiscordAccess(rest, createBotNotifications(rest));
      if (bits === '0')
        await expect(adapter.authorize(guild, actor)).rejects.toMatchObject({
          code: 'command_forbidden',
        });
      else await adapter.authorize(guild, actor);
      expect(rest.get).toHaveBeenCalledWith(`/guilds/${guild}/members/${actor}`);
    },
  );
});
