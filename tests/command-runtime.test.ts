import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandDiscordAccess } from '../apps/bot/src/command-processor';
const fixture = vi.hoisted(() => ({
  query: vi.fn(),
  close: vi.fn(),
  factory: vi.fn(),
  repository: vi.fn(),
  processor: vi.fn(),
  runOne: vi.fn(),
  coordinate: vi.fn(),
  readiness: vi.fn(),
}));
vi.mock('@navi/database', () => ({
  createDatabase: fixture.factory,
  createCommandRepository: fixture.repository,
  inspectCommandDatabase: fixture.readiness,
}));
vi.mock('../apps/bot/src/command-processor', () => ({ createCommandProcessor: fixture.processor }));
import { startBotCommands, stopBotResources } from '../apps/bot/src/command-runtime';
const discord = {} as CommandDiscordAccess;
const enabled = {
  enabled: true as const,
  databaseUrl: 'postgresql://synthetic:synthetic@localhost/isolated',
  allowedUsers: ['111111111111111111'],
  allowedGuilds: ['222222222222222222'],
};
beforeEach(() => {
  vi.clearAllMocks();
  fixture.query.mockResolvedValue({ rows: [] });
  fixture.close.mockResolvedValue(undefined);
  fixture.runOne.mockResolvedValue(false);
  fixture.readiness.mockResolvedValue({ status: 'ok' });
  fixture.factory.mockReturnValue({
    pool: { query: fixture.query },
    db: {},
    withAccountLock: fixture.coordinate,
    close: fixture.close,
  });
  fixture.repository.mockReturnValue({ synthetic: true });
  fixture.processor.mockReturnValue({ runOne: fixture.runOne });
});
describe('opt-in bot startup adapter (simulated dependencies)', () => {
  it('still closes Gateway and broker after a command-store close failure', async () => {
    const gateway = vi.fn(async () => {}),
      broker = vi.fn(async () => {});
    await expect(
      stopBotResources([
        async () => {
          throw new Error('synthetic store close failure');
        },
        gateway,
        broker,
      ]),
    ).rejects.toThrow('Bot resource shutdown failed.');
    expect(gateway).toHaveBeenCalledOnce();
    expect(broker).toHaveBeenCalledOnce();
  });
  it('does not construct a DB or processor with the default disabled flag', async () => {
    await (
      await startBotCommands({ enabled: false }, discord, vi.fn())
    )();
    expect(fixture.factory).not.toHaveBeenCalled();
    expect(fixture.processor).not.toHaveBeenCalled();
  });
  it('uses the existing coordinator and shared Discord adapter, then closes safely', async () => {
    const log = vi.fn(),
      stop = await startBotCommands(enabled, discord, log);
    expect(fixture.query).toHaveBeenCalledWith('SELECT id FROM bot_commands LIMIT 0');
    expect(fixture.processor).toHaveBeenCalledWith(
      { synthetic: true },
      discord,
      fixture.coordinate,
      log,
    );
    await stop();
    expect(fixture.close).toHaveBeenCalledTimes(1);
    expect(fixture.runOne).toHaveBeenCalledTimes(1);
  });
  it('closes on missing migration and emits only a sanitized startup error', async () => {
    fixture.query.mockRejectedValue(new Error('synthetic sensitive database error'));
    await expect(startBotCommands(enabled, discord, vi.fn())).rejects.toThrow(
      'Bot command database initialization failed. Check migration and role grants.',
    );
    expect(fixture.processor).not.toHaveBeenCalled();
    expect(fixture.close).toHaveBeenCalledTimes(1);
  });
  it('refuses command startup with an administrative or overprivileged role', async () => {
    fixture.readiness.mockResolvedValue({ status: 'degraded' });
    await expect(startBotCommands(enabled, discord, vi.fn())).rejects.toThrow(
      'Bot command database initialization failed.',
    );
    expect(fixture.processor).not.toHaveBeenCalled();
    expect(fixture.close).toHaveBeenCalledOnce();
  });
});
