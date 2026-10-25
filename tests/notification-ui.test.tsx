// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTIFICATION_TEMPLATE, renderKickPreview } from '@navi/core';
import { NotificationManager } from '../apps/web/src/components/notification-manager';
import type { NotificationRow } from '@navi/database';
import { ids } from './notification-fixtures';
const subscriptionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const initial = {
  subscriptionId,
  provider: 'youtube' as const,
  displayName: '<YouTube Channel>',
  canonicalUrl: 'https://www.youtube.com/channel/UC' + 'a'.repeat(22),
  subscriptionEnabled: true,
  config: null,
  version: 0,
};
const config = {
  channelId: ids.channel,
  roleId: null,
  template: DEFAULT_NOTIFICATION_TEMPLATE,
  enabled: false,
};
const targets = {
  channels: [{ id: ids.channel, name: 'youtube-live' }],
  roles: [{ id: ids.role, name: 'Alerts' }],
};
const fetcher = vi.fn<typeof fetch>();
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function render(rows: NotificationRow[] = [initial]) {
  await act(async () => {
    root.render(<NotificationManager guildId={ids.guild} initial={rows} />);
  });
}
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === label,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
async function choose(suffix: string, value: string) {
  const select = container.querySelector<HTMLSelectElement>(`[id$="-${suffix}"]`)!;
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
describe('hydrated notification settings', () => {
  it('recovers a committed queued save after status refresh fails, without a second save', async () => {
    const commandId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const statusUrl = `/api/guilds/${ids.guild}/commands/${commandId}`;
    let lost = true,
      puts = 0;
    fetcher.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/commands'))
        return Response.json(
          {
            accepted: true,
            command: {
              id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              status: 'pending',
              statusUrl: `/api/guilds/${ids.guild}/commands/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee`,
            },
          },
          { status: 202 },
        );
      if (url.endsWith('/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'))
        return Response.json({
          id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          status: 'completed',
          result: targets,
        });
      if (init?.method === 'PUT') {
        puts++;
        return Response.json(
          { accepted: true, command: { id: commandId, status: 'pending', statusUrl } },
          { status: 202 },
        );
      }
      if (url === statusUrl) {
        if (lost) throw new Error('synthetic status outage');
        return Response.json({
          id: commandId,
          status: 'completed',
          result: { ...initial, config, version: 1 },
        });
      }
      throw new Error('Unexpected route');
    });
    await act(async () => {
      root.render(<NotificationManager guildId={ids.guild} initial={[initial]} commandMode />);
    });
    await choose('channel', ids.channel);
    await click('Save settings');
    expect(container.textContent).toContain('pending');
    expect(container.textContent).not.toContain('Settings saved.');
    expect(
      sessionStorage.getItem(
        `navi-command:/api/guilds/${ids.guild}/notifications/${subscriptionId}`,
      ),
    ).toContain(commandId);
    lost = false;
    await click('Check command status');
    expect(container.textContent).toContain('Settings saved.');
    expect(puts).toBe(1);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('127.0.0.1'))).toBe(false);
  });
  it('allows immediate disabling while a queue acknowledgment is still pending', async () => {
    const queuedId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    let release!: (response: Response) => void;
    fetcher.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/targets')) return Response.json(targets);
      if (init?.method === 'PUT')
        return Response.json(
          {
            accepted: true,
            command: {
              id: queuedId,
              status: 'processing',
              statusUrl: `/api/guilds/${ids.guild}/commands/${queuedId}`,
            },
          },
          { status: 202 },
        );
      if (url.endsWith('/commands/' + queuedId))
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      if (url.endsWith('/disable'))
        return Response.json({ ...initial, config: { ...config, enabled: false }, version: 3 });
      throw new Error('Unexpected route');
    });
    await render([{ ...initial, config: { ...config, enabled: true }, version: 1 }]);
    const save = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Save settings',
    )!;
    await act(async () => {
      save.click();
    });
    const disable = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Disable saved notifications',
    )!;
    expect(disable.disabled).toBe(false);
    await click('Disable saved notifications');
    expect(container.textContent).toContain('Notifications disabled');
    // The old completion is evidence of its commit, not authority to overwrite newer disabled settings.
    await act(async () => {
      release(
        Response.json({
          id: queuedId,
          status: 'completed',
          result: { ...initial, config: { ...config, enabled: true }, version: 2 },
        }),
      );
    });
    expect(container.textContent).toContain('Notifications disabled');
  });
  it.each([true, false])(
    'renders an accessible Kick sample embed with rich response=%s, without sending, then clears it on edit',
    async (rich) => {
      const kickRow = {
        ...initial,
        provider: 'kick' as const,
        canonicalUrl: 'https://kick.com/tester',
        displayName: 'Navi_Gaming',
        config,
        version: 1,
      };
      fetcher.mockResolvedValueOnce(Response.json(targets));
      await render([kickRow]);
      fetcher.mockResolvedValueOnce(
        Response.json({
          content: '[NAVI TEST — SAMPLE DATA] sample configured text',
          sample: true,
          ...(rich ? { kick: renderKickPreview(config, kickRow) } : {}),
        }),
      );
      await click('Preview message');
      const preview = container.querySelector('.kick-preview')!;
      expect(preview.textContent).toContain('🔴 [LIVE] Navi_Gaming');
      expect(preview.textContent).toContain('Sample livestream title (test data)');
      expect(preview.textContent).toContain('VALORANT');
      expect(
        preview.querySelector('[aria-label="Sample livestream preview image"]'),
      ).not.toBeNull();
      const links = [...preview.querySelectorAll('a')].filter((link) =>
        link.textContent?.includes('Watch'),
      );
      expect(links).toHaveLength(2);
      expect(
        links.every(
          (link) => link.href === 'https://kick.com/tester' && link.rel === 'noopener noreferrer',
        ),
      ).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(String(fetcher.mock.calls[1]![0])).toContain('/preview');
      await choose('role', ids.role);
      expect(container.querySelector('.kick-preview')).toBeNull();
    },
  );
  it.each(['youtube', 'kick'] as const)(
    'refreshes %s permissions without losing the everyone draft and allows saving after a grant',
    async (provider) => {
      fetcher.mockResolvedValueOnce(Response.json(targets));
      await render([{ ...initial, provider, config, version: 1 }]);
      await choose('role', 'everyone');
      expect(container.textContent).toContain(
        'Save Settings is disabled because @everyone is selected',
      );
      expect(container.textContent).toContain('Edit Channel → Permissions');
      expect(container.textContent).toContain('Administrator is not needed');
      let finish!: (r: Response) => void;
      fetcher.mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      await click('Refresh permissions');
      expect(String(fetcher.mock.calls.at(-1)![0])).toContain('/targets?fresh=1');
      expect(container.querySelector<HTMLSelectElement>('[id$="-role"]')!.value).toBe('everyone');
      expect(
        [...container.querySelectorAll('button')].find((b) => b.textContent === 'Save settings')!
          .disabled,
      ).toBe(true);
      await act(async () =>
        finish(
          Response.json({
            ...targets,
            channels: [{ ...targets.channels[0], canMentionEveryone: true }],
          }),
        ),
      );
      expect(container.textContent).not.toContain('NAVI lacks Mention Everyone permission');
      expect(container.textContent).toContain('Permissions refreshed from Discord');
      expect(container.querySelector<HTMLSelectElement>('[id$="-role"]')!.value).toBe('everyone');
      expect(
        [...container.querySelectorAll('button')].find((b) => b.textContent === 'Save settings')!
          .disabled,
      ).toBe(false);
      const saved = { ...config, mentionEveryone: true };
      fetcher.mockResolvedValueOnce(
        Response.json({ ...initial, provider, config: saved, version: 2 }),
      );
      await click('Save settings');
      expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body))).toEqual({
        config: saved,
        version: 1,
      });
      expect(container.textContent).toContain('Settings saved');
      expect(container.querySelector<HTMLSelectElement>('[id$="-role"]')!.value).toBe('everyone');
    },
  );
  it('keeps the selected mention on a rate-limited refresh and does not retry automatically', async () => {
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await render([{ ...initial, config, version: 1 }]);
    await choose('role', 'everyone');
    fetcher.mockResolvedValueOnce(
      Response.json(
        { error: 'discord_rate_limited' },
        { status: 429, headers: { 'Retry-After': '5' } },
      ),
    );
    await click('Refresh permissions');
    expect(container.querySelector<HTMLSelectElement>('[id$="-role"]')!.value).toBe('everyone');
    expect(container.textContent).toContain('Retry in 5 seconds');
    expect(
      [...container.querySelectorAll('button')].find(
        (b) => b.textContent === 'Refresh permissions',
      )!.disabled,
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('coalesces Strict Mode effect replay into one target request', async () => {
    let finish!: (response: Response) => void;
    fetcher.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await act(async () => {
      root.render(
        <StrictMode>
          <NotificationManager guildId={ids.guild} initial={[initial]} />
        </StrictMode>,
      );
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => finish(Response.json(targets)));
    expect(container.textContent).toContain('#youtube-live');
  });
  it('disables manual refresh until Retry-After expires without retrying automatically', async () => {
    vi.useFakeTimers();
    fetcher.mockResolvedValueOnce(
      Response.json(
        { error: 'discord_rate_limited' },
        { status: 429, headers: { 'Retry-After': '1' } },
      ),
    );
    await render();
    const refresh = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Refresh channels and roles',
    )!;
    expect(container.textContent).toContain('Retry in 1 second.');
    expect(refresh.disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(refresh.disabled).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await click('Refresh channels and roles');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('offers everyone immediately after No mention for both platforms, off by default, with permission validation', async () => {
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await render([
      initial,
      { ...initial, subscriptionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', provider: 'kick' },
    ]);
    await choose('channel', ids.channel);
    const selects = container.querySelectorAll<HTMLSelectElement>('[id$="-role"]');
    for (const select of selects) {
      expect([...select.options].map((o) => o.text)).toEqual([
        'No mention',
        '@everyone',
        '@Alerts',
      ]);
      expect(select.value).toBe('');
    }
    expect(container.querySelectorAll('[id$="-everyone"]')).toHaveLength(0);
    await choose('role', 'everyone');
    expect(container.textContent).toContain('NAVI lacks Mention Everyone permission');
    expect(
      container.querySelector<HTMLSelectElement>('[id$="-role"]')!.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      [...container.querySelectorAll('button')].find((b) => b.textContent === 'Save settings')!
        .disabled,
    ).toBe(true);
  });
  it('requires an explicit dropdown selection to save everyone and restores the confirmed preference', async () => {
    fetcher.mockResolvedValueOnce(
      Response.json({
        ...targets,
        channels: [{ ...targets.channels[0], canMentionEveryone: true, canEmbed: true }],
      }),
    );
    await render();
    await choose('channel', ids.channel);
    const select = container.querySelector<HTMLSelectElement>('[id$="-role"]')!;
    expect(select.value).toBe('');
    await choose('role', 'everyone');
    fetcher.mockResolvedValueOnce(
      Response.json({ ...initial, config: { ...config, mentionEveryone: true }, version: 1 }),
    );
    await click('Save settings');
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body)).config.mentionEveryone).toBe(true);
    expect(select.value).toBe('everyone');
    expect(container.textContent).toContain('Preview and test messages never ping @everyone');
  });
  it('restores saved settings and permits safe disable while the bot is absent', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ error: 'bot_not_installed' }, { status: 409 }));
    await render([{ ...initial, config: { ...config, enabled: true }, version: 1 }]);
    expect(container.textContent).toContain('Saved channel unavailable');
    expect(container.querySelector('textarea')!.value).toBe(DEFAULT_NOTIFICATION_TEMPLATE);
    fetcher.mockResolvedValueOnce(Response.json({ ...initial, config, version: 2 }));
    await click('Disable saved notifications');
    expect(container.textContent).toContain('Notifications disabled');
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body))).toEqual({ version: 1 });
  });
  it.each(['youtube', 'kick'] as const)(
    'restores legacy %s everyone settings and saves mutually exclusive dropdown choices',
    async (provider) => {
      const available = {
        ...targets,
        channels: [{ ...targets.channels[0], canMentionEveryone: true }],
      };
      fetcher.mockResolvedValueOnce(Response.json(available));
      await render([
        {
          ...initial,
          provider,
          config: { ...config, roleId: ids.role, mentionEveryone: true },
          version: 1,
        },
      ]);
      const select = container.querySelector<HTMLSelectElement>('[id$="-role"]')!;
      expect(select.value).toBe('everyone');
      expect(container.textContent).toContain('can notify the entire server');
      expect(container.textContent).not.toContain('off by default');
      await choose('role', ids.role);
      await choose('role', 'everyone');
      expect(
        [...container.querySelectorAll('button')].find(
          (b) => b.textContent === 'Send test notification',
        )!.disabled,
      ).toBe(false);
      let version = 1;
      for (const value of [ids.role, '', 'everyone']) {
        await choose('role', value);
        const savedConfig = {
          ...config,
          roleId: value && value !== 'everyone' ? value : null,
          ...(value === 'everyone' ? { mentionEveryone: true } : {}),
        };
        fetcher.mockResolvedValueOnce(
          Response.json({ ...initial, provider, config: savedConfig, version: ++version }),
        );
        await click('Save settings');
        const sent = JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body)).config;
        expect(sent.roleId).toBe(savedConfig.roleId);
        expect(sent.mentionEveryone === true).toBe(value === 'everyone');
        expect(select.value).toBe(value);
      }
      await act(async () => root.render(null));
      fetcher.mockResolvedValueOnce(Response.json(available));
      await render([
        { ...initial, provider, config: { ...config, mentionEveryone: true }, version },
      ]);
      expect(container.querySelector<HTMLSelectElement>('[id$="-role"]')!.value).toBe('everyone');
    },
  );
  it('loads eligible channels, saves, previews and explicitly sends a test using saved settings', async () => {
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await render();
    expect(container.textContent).toContain('#youtube-live');
    expect(container.querySelector('youtube')).toBeNull();
    expect(container.textContent).toContain(
      'Automatic delivery requires an enabled, independently running monitoring worker',
    );
    await choose('channel', ids.channel);
    fetcher.mockResolvedValueOnce(Response.json({ ...initial, config, version: 1 }));
    await click('Save settings');
    expect(container.textContent).toContain('Settings saved');
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body))).toEqual({ config, version: 0 });
    fetcher.mockResolvedValueOnce(
      Response.json({ content: '[NAVI TEST] sample <content>', sample: true }),
    );
    await click('Preview message');
    expect(container.querySelector('pre')!.textContent).toBe('[NAVI TEST] sample <content>');
    expect(container.querySelector('content')).toBeNull();
    fetcher.mockResolvedValueOnce(Response.json({ status: 'sent', replayed: false }));
    await click('Send test notification');
    expect(container.textContent).toContain('Test message accepted by Discord');
    const payload = JSON.parse(String(fetcher.mock.calls[3]![1]!.body));
    expect(payload.version).toBe(1);
    expect(payload.requestId).toMatch(/^[a-f\d-]{36}$/);
    expect(payload).not.toHaveProperty('config');
  });
  it('shows empty and missing-channel states without sending automatically', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ channels: [], roles: [] }));
    await render([]);
    expect(container.textContent).toContain('No registered streamers');
    expect(container.textContent).toContain('No writable text channels');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('displays loading and retryable bot errors, then recovers channel retrieval', async () => {
    let finish!: (response: Response) => void;
    fetcher.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render();
    expect(container.textContent).toContain('Loading Discord text channels');
    await act(async () => finish(Response.json({ error: 'bot_not_installed' }, { status: 409 })));
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('no longer installed');
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await click('Refresh channels and roles');
    expect(container.textContent).toContain('#youtube-live');
  });
  it('keeps committed settings after save without relying on a second GET and clears stale previews on edits', async () => {
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await render();
    await choose('channel', ids.channel);
    fetcher.mockResolvedValueOnce(Response.json({ ...initial, config, version: 1 }));
    await click('Save settings');
    expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockResolvedValueOnce(Response.json({ content: 'Preview sample' }));
    await click('Preview message');
    await choose('role', ids.role);
    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).toContain('Save changes before sending a test');
    expect(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent === 'Send test notification',
      )!.disabled,
    ).toBe(true);
  });
  it('shows safe role/session and uncertain-delivery errors', async () => {
    fetcher.mockResolvedValueOnce(Response.json(targets));
    await render();
    await choose('channel', ids.channel);
    fetcher.mockResolvedValueOnce(
      Response.json({ error: 'notification_role_unavailable' }, { status: 409 }),
    );
    await click('Save settings');
    expect(container.querySelector('[role="alert"]')!.textContent).toContain(
      'no longer mentionable',
    );
    fetcher.mockResolvedValueOnce(Response.json({ ...initial, config, version: 1 }));
    await click('Save settings');
    fetcher.mockResolvedValueOnce(
      Response.json({ error: 'test_delivery_uncertain' }, { status: 503 }),
    );
    await click('Send test notification');
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('could duplicate');
    fetcher.mockResolvedValueOnce(Response.json({ error: 'login_required' }, { status: 401 }));
    await click('Preview message');
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('session expired');
  });
});
