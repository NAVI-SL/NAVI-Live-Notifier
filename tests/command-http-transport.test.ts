import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandError } from '@navi/core';
vi.mock('server-only', () => ({}));
const runtime = vi.hoisted(() => ({
  commands: { submit: vi.fn(), status: vi.fn() },
  notifications: { save: vi.fn(), test: vi.fn(), disable: vi.fn() },
  environment: { WEB_ORIGIN: 'https://navi.example', BOT_COMMAND_ADMISSION_ENABLED: true },
}));
vi.mock('../apps/web/src/lib/runtime', () => ({ getRuntime: () => runtime }));
import { PUT } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/route';
import { POST as TEST } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/test/route';
import { POST as DISABLE } from '../apps/web/src/app/api/guilds/[guildId]/notifications/[subscriptionId]/disable/route';
import { GET as STATUS } from '../apps/web/src/app/api/guilds/[guildId]/commands/[commandId]/route';
const guildId = '111111111111111111',
  subscriptionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  key = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const context = { params: Promise.resolve({ guildId, subscriptionId }) };
const request = (data: unknown, method = 'POST') =>
  new Request('https://navi.example/api', {
    method,
    headers: {
      Origin: 'https://navi.example',
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  runtime.environment.BOT_COMMAND_ADMISSION_ENABLED = true;
  runtime.commands.submit.mockResolvedValue({ id: key, status: 'pending', expiresAt: new Date() });
});
describe('existing notification routes in queue mode', () => {
  it('submits a versioned save and returns acceptance without calling the legacy service', async () => {
    const config = { channelId: guildId, roleId: null, template: '{url}', enabled: true };
    const response = await PUT(request({ config, version: 1 }, 'PUT'), context);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      accepted: true,
      command: { id: key, status: 'pending' },
    });
    expect(runtime.commands.submit).toHaveBeenCalledWith(expect.any(Headers), guildId, key, {
      kind: 'notification_settings.apply',
      payload: { subscriptionId, expectedVersion: 1, config },
    });
    expect(runtime.notifications.save).not.toHaveBeenCalled();
  });
  it('uses the test nonce and saved version without invoking the old sender or test reservation', async () => {
    expect((await TEST(request({ requestId: key, version: 2 }), context)).status).toBe(202);
    expect(runtime.commands.submit).toHaveBeenCalledWith(expect.any(Headers), guildId, key, {
      kind: 'notification_test.send',
      payload: { subscriptionId, expectedVersion: 2 },
    });
    expect(runtime.notifications.test).not.toHaveBeenCalled();
  });
  it('never silently falls back after a store failure', async () => {
    runtime.commands.submit.mockRejectedValue(new CommandError('command_unavailable'));
    expect((await TEST(request({ requestId: key, version: 2 }), context)).status).toBe(503);
    expect(runtime.notifications.test).not.toHaveBeenCalled();
  });
  it('keeps disable immediate during admission pause, with no command or broker operation', async () => {
    runtime.environment.BOT_COMMAND_ADMISSION_ENABLED = false;
    runtime.notifications.disable.mockResolvedValue({ version: 3, config: { enabled: false } });
    expect((await DISABLE(request({ version: 2 }), context)).status).toBe(200);
    expect(runtime.notifications.disable).toHaveBeenCalledWith(
      expect.any(Headers),
      guildId,
      subscriptionId,
      2,
    );
    expect(runtime.commands.submit).not.toHaveBeenCalled();
    expect((await TEST(request({ requestId: key, version: 2 }), context)).status).toBe(503);
  });
  it('keeps status polling available during pause and forwards only scoped IDs and headers', async () => {
    runtime.environment.BOT_COMMAND_ADMISSION_ENABLED = false;
    runtime.commands.status.mockResolvedValue({ id: key, status: 'uncertain', result: null });
    const response = await STATUS(new Request('https://navi.example/status'), {
      params: Promise.resolve({ guildId, commandId: key }),
    });
    expect(await response.json()).toMatchObject({ status: 'uncertain' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(runtime.commands.status).toHaveBeenCalledWith(expect.any(Headers), guildId, key);
  });
});
