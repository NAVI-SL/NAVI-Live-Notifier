import { randomUUID } from 'node:crypto';
import { createDatabase, createCommandRepository, inspectCommandDatabase } from '@navi/database';
import type { readBotCommandEnvironment } from '@navi/config';
import { createCommandProcessor, type CommandDiscordAccess } from './command-processor.js';

/** A database close failure must not strand the Gateway or private broker. */
export async function stopBotResources(operations: readonly (() => Promise<unknown>)[]) {
  let failed = false;
  for (const stop of operations) {
    try {
      await stop();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error('Bot resource shutdown failed.');
}

/** Explicit opt-in lifecycle. A single owner drains one command at a time; DB leases fence peers. */
export function startCommandLoop(
  processor: { runOne(owner: string): Promise<boolean> },
  log: (entry: Record<string, unknown>) => void = () => {},
) {
  const owner = randomUUID();
  let stopped = false,
    wake: (() => void) | undefined;
  const running = (async () => {
    while (!stopped) {
      try {
        await processor.runOne(owner);
      } catch {
        log({ service: 'bot_commands', event: 'command_loop_unavailable' });
      }
      if (!stopped)
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          wake = () => {
            clearTimeout(timer);
            resolve();
          };
        });
    }
  })();
  return async () => {
    stopped = true;
    wake?.();
    await running;
  };
}

export async function startBotCommands(
  environment: ReturnType<typeof readBotCommandEnvironment>,
  discord: CommandDiscordAccess,
  log: (entry: Record<string, unknown>) => void,
) {
  if (!environment.enabled) return async () => {};
  const database = createDatabase(environment.databaseUrl);
  try {
    // Read-only readiness probe; never apply migrations or grants at runtime.
    await database.pool.query('SELECT id FROM bot_commands LIMIT 0');
    if ((await inspectCommandDatabase(database.pool, 'bot')).status !== 'ok')
      throw new Error('Command role readiness failed.');
    const repository = createCommandRepository(database.db, environment);
    const stop = startCommandLoop(
      createCommandProcessor(repository, discord, database.withAccountLock, log),
      log,
    );
    return async () => {
      await stop();
      await database.close();
    };
  } catch {
    await database.close();
    throw new Error('Bot command database initialization failed. Check migration and role grants.');
  }
}
