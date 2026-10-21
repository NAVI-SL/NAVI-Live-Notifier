import { EventEmitter } from 'node:events';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ActivityType, Events, GatewayIntentBits, type Client } from 'discord.js';
import { createBot, BOT_PRESENCE } from '../apps/bot/src/application';
import { createGateway } from '../apps/bot/src/gateway';
import { acquireGatewayLease, gatewayLockPort } from '../apps/bot/src/gateway-lease';

afterEach(() => vi.useRealTimers());
function fixture() {
  const events = new EventEmitter();
  const client = Object.assign(events, {
    login: vi.fn(async () => 'synthetic-token'),
    destroy: vi.fn(async () => {}),
    user: { setPresence: vi.fn() },
  });
  return { client, gatewayClient: client as unknown as Client };
}
describe('Discord Gateway presence and ownership', () => {
  it('uses only Guilds with online Watching livestreams and no automatic mentions', async () => {
    const bot = createBot();
    expect(bot.options.intents.bitfield).toBe(GatewayIntentBits.Guilds);
    expect(bot.options.presence).toMatchObject({
      status: 'online',
      activities: [{ name: 'livestreams', type: ActivityType.Watching }],
    });
    expect(bot.options.allowedMentions?.parse).toEqual([]);
    await bot.destroy();
  });
  it('logs in once, reapplies presence on ready, and lets the SDK resume without another login', async () => {
    const { client, gatewayClient } = fixture();
    const log = vi.fn();
    const gateway = createGateway(gatewayClient, 'synthetic-token', log);
    await Promise.all([gateway.start(), gateway.start()]);
    expect(client.login).toHaveBeenCalledTimes(1);
    client.emit(Events.ClientReady);
    expect(client.user.setPresence).toHaveBeenCalledWith(BOT_PRESENCE);
    client.emit(Events.ShardDisconnect, { reason: 'FAKE_SECRET' });
    client.emit(Events.ShardReconnecting);
    client.emit(Events.ShardResume);
    client.emit(Events.Error, new Error('FAKE_SECRET'));
    client.emit(Events.ShardError, new Error('FAKE_SECRET'));
    expect(client.login).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain('FAKE_SECRET');
    await Promise.all([gateway.stop(), gateway.stop()]);
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(client.listenerCount(Events.ClientReady)).toBe(0);
  });
  it('reports Gateway readiness across disconnect, resume, invalidation and shutdown without another login', async () => {
    const { client, gatewayClient } = fixture();
    const gateway = createGateway(gatewayClient, 'FAKE_TOKEN', () => {});
    expect(gateway.health()).toMatchObject({ status: 'degraded', state: 'starting' });
    await gateway.start();
    expect(gateway.health().status).toBe('degraded');
    client.emit(Events.ClientReady);
    expect(gateway.health()).toMatchObject({ status: 'ok', state: 'ready' });
    client.emit(Events.ShardDisconnect);
    expect(gateway.health().status).toBe('degraded');
    client.emit(Events.ShardReconnecting);
    expect(gateway.health().state).toBe('reconnecting');
    client.emit(Events.ShardResume);
    expect(gateway.health().status).toBe('ok');
    client.emit(Events.Invalidated);
    expect(gateway.health()).toMatchObject({ status: 'degraded', state: 'invalidated' });
    client.emit(Events.ShardResume);
    expect(gateway.health().state).toBe('invalidated');
    await gateway.stop();
    client.emit(Events.ClientReady);
    expect(gateway.health()).toMatchObject({ status: 'degraded', state: 'stopped' });
    expect(client.login).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(gateway.health())).not.toContain('FAKE_TOKEN');
  });
  it('sanitizes login failures and signals fatal invalidation without starting another session', async () => {
    const { client, gatewayClient } = fixture();
    const fatal = vi.fn();
    client.login.mockRejectedValue(new Error('FAKE_TOKEN'));
    const gateway = createGateway(gatewayClient, 'synthetic-token', () => {}, fatal);
    await expect(gateway.start()).rejects.toThrow('Gateway startup unavailable.');
    client.emit(Events.Invalidated);
    expect(fatal).toHaveBeenCalledTimes(1);
    await gateway.stop();
    expect(client.login).toHaveBeenCalledTimes(1);
  });
  it('bounds initial connection time without retrying IDENTIFY itself', async () => {
    vi.useFakeTimers();
    const { client, gatewayClient } = fixture();
    client.login.mockImplementation(() => new Promise(() => {}));
    const gateway = createGateway(gatewayClient, 'synthetic-token', () => {});
    const failure = expect(gateway.start()).rejects.toThrow('Gateway startup unavailable.');
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    await gateway.stop();
    expect(client.login).toHaveBeenCalledTimes(1);
  });
  it('rejects overlapping local ownership and automatically permits a subsequent process after release', async () => {
    const token = 'synthetic-gateway-test-' + process.pid;
    expect(gatewayLockPort('Bot ' + token)).toBe(gatewayLockPort(token));
    const first = await acquireGatewayLease(token, 0);
    try {
      await expect(acquireGatewayLease(token, 0)).rejects.toThrow('already owns');
    } finally {
      await first.release();
    }
    const second = await acquireGatewayLease(token, 0);
    await second.release();
    await second.release();
  });
});
