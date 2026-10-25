import { afterEach, describe, expect, it, vi } from 'vitest';
import { readAuthEnvironment, readBotCommandEnvironment } from '@navi/config';
import {
  awaitCommand,
  CommandPendingError,
  prepareSubmission,
  finishSubmission,
} from '../apps/web/src/lib/command-client';
import { startCommandLoop, startBotCommands } from '../apps/bot/src/command-runtime';
import type { CommandDiscordAccess } from '../apps/bot/src/command-processor';
const guild = '111111111111111111',
  actor = '222222222222222222',
  id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const command = { id, status: 'pending', statusUrl: `/api/guilds/${guild}/commands/${id}` };
const environment = {
  WEB_ORIGIN: 'https://navi.example',
  DATABASE_URL: 'postgresql://fixture:fixture@localhost/fixture',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: actor,
  DISCORD_CLIENT_SECRET: 'fixture',
  DISCORD_ALLOWED_USER_IDS: actor,
};
afterEach(() => vi.useRealTimers());
describe('transport activation and rollback defaults', () => {
  it('retains required private broker credentials in default HTTP mode', () => {
    expect(() => readAuthEnvironment(environment)).toThrow('BOT_INTERNAL_SECRET');
    expect(
      readAuthEnvironment({ ...environment, BOT_INTERNAL_SECRET: 'x'.repeat(32) })
        .BOT_COMMAND_TRANSPORT,
    ).toBe('http');
  });
  it('allows isolated PostgreSQL dashboard mode without broker credentials', () => {
    expect(
      readAuthEnvironment({
        ...environment,
        BOT_COMMAND_TRANSPORT: 'postgres',
        BETA_GUILD_IDS: guild,
      }).BOT_INTERNAL_SECRET,
    ).toBe('');
    expect(() =>
      readAuthEnvironment({ ...environment, BOT_COMMAND_TRANSPORT: 'postgres' }),
    ).toThrow('BETA_GUILD_IDS');
  });
  it('does not activate a consumer from a database URL alone', async () => {
    const config = readBotCommandEnvironment({ DATABASE_URL: environment.DATABASE_URL });
    expect(config).toEqual({ enabled: false });
    const discord = {} as CommandDiscordAccess;
    const stop = await startBotCommands(config, discord, vi.fn());
    await stop();
  });
  it('requires token, DB and explicit matching scope only when enabled', () => {
    expect(() => readBotCommandEnvironment({ BOT_COMMANDS_ENABLED: 'true' })).toThrow();
    expect(
      readBotCommandEnvironment({
        ...environment,
        BOT_COMMANDS_ENABLED: 'true',
        DISCORD_BOT_TOKEN: 'synthetic',
        BETA_GUILD_IDS: guild,
      }).enabled,
    ).toBe(true);
    expect(() => readBotCommandEnvironment({ BOT_COMMANDS_ENABLED: 'yes' })).toThrow();
  });
});
describe('acknowledgment recovery', () => {
  it('polls GET only through pending/processing/completed and returns committed result', async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const status of ['pending', 'processing', 'completed'])
      fetcher.mockResolvedValueOnce(Response.json({ id, status, result: { version: 2 } }));
    const progress = vi.fn(),
      wait = vi.fn(async () => {});
    expect(await awaitCommand(command, progress, fetcher, wait)).toEqual({ version: 2 });
    expect(wait).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.every(([url, init]) => url === command.statusUrl && !init?.method),
    ).toBe(true);
    expect(progress.mock.calls.some(([state]) => state.status === 'processing')).toBe(true);
  });
  it.each(['failed', 'expired', 'uncertain'])(
    'keeps %s terminal and never resubmits it',
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id, status }));
      await expect(awaitCommand(command, vi.fn(), fetcher)).rejects.toMatchObject({
        command: { id, status },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it('keeps a command recoverable after a status refresh outage', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('synthetic outage'));
    await expect(awaitCommand(command, vi.fn(), fetcher)).rejects.toBeInstanceOf(
      CommandPendingError,
    );
    fetcher.mockResolvedValue(
      Response.json({ id, status: 'completed', result: { committed: true } }),
    );
    expect(await awaitCommand(command, vi.fn(), fetcher)).toEqual({ committed: true });
  });
  it('bounds offline polling and respects the greater Retry-After', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json(
          { id, status: 'pending', retryAfterSeconds: 5 },
          { headers: { 'Retry-After': '7' } },
        ),
      );
    const wait = vi.fn(async () => {});
    await expect(awaitCommand(command, vi.fn(), fetcher, wait)).rejects.toBeInstanceOf(
      CommandPendingError,
    );
    expect(fetcher).toHaveBeenCalledTimes(20);
    expect(wait).toHaveBeenCalledWith(7000);
  });
  it('rejects external polling URLs and mismatched IDs', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: 'foreign', status: 'completed' }));
    await expect(
      awaitCommand({ ...command, statusUrl: 'https://other.example' }, vi.fn(), fetcher),
    ).rejects.toThrow('Invalid');
    expect(fetcher).not.toHaveBeenCalled();
    await expect(awaitCommand(command, vi.fn(), fetcher)).rejects.toBeInstanceOf(
      CommandPendingError,
    );
  });
  it('honors polling rate limits without dispatch or early manual retry', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '90' } }));
    let blocked = command;
    await expect(
      awaitCommand(
        command,
        (value) => {
          blocked = value;
        },
        fetcher,
      ),
    ).rejects.toBeInstanceOf(CommandPendingError);
    await expect(awaitCommand(blocked, vi.fn(), fetcher)).rejects.toBeInstanceOf(
      CommandPendingError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('replays an unconfirmed admission with the original nonce and key', () => {
    const url = '/synthetic/test';
    const first = prepareSubmission(url, { requestId: 'first', version: 1 });
    const second = prepareSubmission(url, { requestId: 'second', version: 1 });
    expect(second).toEqual(first);
    expect(() => prepareSubmission(url, { requestId: 'third', version: 2 })).toThrow(
      'previous submission',
    );
    finishSubmission(url);
    expect(prepareSubmission(url, { requestId: 'third', version: 2 }).key).not.toBe(first.key);
    finishSubmission(url);
  });
});
describe('bot consumer lifecycle', () => {
  it('serializes processing and drains before stopping', async () => {
    vi.useFakeTimers();
    let release!: (value: boolean) => void;
    const runOne = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const stop = startCommandLoop({ runOne });
    await vi.advanceTimersByTimeAsync(10000);
    expect(runOne).toHaveBeenCalledTimes(1);
    let stopped = false;
    const closing = stop().then(() => {
      stopped = true;
    });
    expect(stopped).toBe(false);
    release(true);
    await closing;
    await vi.advanceTimersByTimeAsync(10000);
    expect(runOne).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('survives a store outage and stops the polling timer cleanly', async () => {
    vi.useFakeTimers();
    const runOne = vi.fn().mockRejectedValue(new Error('synthetic'));
    const log = vi.fn(),
      stop = startCommandLoop({ runOne }, log);
    await vi.advanceTimersByTimeAsync(3000);
    expect(runOne).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith({
      service: 'bot_commands',
      event: 'command_loop_unavailable',
    });
    await stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
