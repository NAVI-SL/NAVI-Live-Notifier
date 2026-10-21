// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamerManager } from '../apps/web/src/components/streamer-manager';
const guildId = '111111111111111111';
const account = {
  provider: 'youtube' as const,
  externalId: 'UC' + 'a'.repeat(22),
  displayName: '<Channel>',
  canonicalUrl: 'https://youtube.com/channel/UC' + 'a'.repeat(22),
  userIdentifier: '@handle',
};
const subscription = {
  ...account,
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  enabled: true,
  verifiedAt: new Date().toISOString(),
};
let root: Root, container: HTMLDivElement;
const fetcher = vi.fn<typeof fetch>();
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<StreamerManager guildId={guildId} initial={[]} />);
  });
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function click(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === label,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
async function type(value: string) {
  const input = container.querySelector<HTMLInputElement>('#streamer-identifier')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
describe('interactive channel registration dashboard', () => {
  it('keeps a committed registration successful when its list refresh fails, and recovers by GET only', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ account, confirmation: 'receipt' }));
    await type('@handle');
    await submit();
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockRejectedValueOnce(new Error('offline'));
    await click('Confirm and register');
    expect(container.textContent).toContain('Channel registered');
    expect(container.textContent).toContain('Your change was saved');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).not.toContain('Confirm account');
    const commits = fetcher.mock.calls.filter(([, init]) => init?.method === 'POST').length;
    fetcher.mockResolvedValueOnce(Response.json({ subscriptions: [subscription] }));
    await click('Refresh list');
    expect(container.textContent).not.toContain('Your change was saved');
    expect(container.textContent).toContain('Enabled subscription');
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(commits);
  });
  it('retains saved enable/remove changes during refresh failure without falsely reporting mutation failure', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ subscriptions: [subscription] }));
    await click('Refresh list');
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ error: 'login_required' }, { status: 401 }));
    await click('Disable');
    expect(container.textContent).toContain('Disabled');
    expect(container.textContent).toContain('Your change was saved');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockRejectedValueOnce(new Error('offline'));
    await click('Remove');
    expect(container.textContent).toContain('No channels registered');
    expect(container.textContent).toContain('Subscription removed');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('keeps a failed mutation distinct from a committed mutation and does not refresh after rejection', async () => {
    fetcher.mockResolvedValueOnce(Response.json({ subscriptions: [subscription] }));
    await click('Refresh list');
    fetcher.mockResolvedValueOnce(Response.json({ error: 'guild_forbidden' }, { status: 403 }));
    await click('Disable');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'no longer have permission',
    );
    expect(container.textContent).toContain('Enabled subscription');
    expect(container.textContent).not.toContain('Your change was saved');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('resolves, confirms, lists, disables, enables and removes a channel', async () => {
    expect(container.textContent).toContain('No channels registered');
    expect(container.textContent).toContain('Registration alone does not activate notifications');
    fetcher.mockResolvedValueOnce(Response.json({ account, confirmation: 'signed-receipt' }));
    await type('@handle');
    await submit();
    expect(container.textContent).toContain('Confirm account');
    expect(container.querySelector('channel')).toBeNull();
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      platform: 'youtube',
      identifier: '@handle',
      acceptPolicy: true,
    });
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ subscriptions: [subscription] }));
    await click('Confirm and register');
    expect(container.textContent).toContain('Channel registered');
    expect(container.textContent).toContain('Worker status not verified');
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body))).toEqual({
      confirmation: 'signed-receipt',
    });
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(
        Response.json({ subscriptions: [{ ...subscription, enabled: false }] }),
      );
    await click('Disable');
    expect(container.textContent).toContain('Disabled');
    expect(fetcher.mock.calls[3]![1]!.method).toBe('PATCH');
    expect(JSON.parse(String(fetcher.mock.calls[3]![1]!.body))).toEqual({ enabled: false });
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ subscriptions: [subscription] }));
    await click('Enable');
    expect(container.textContent).toContain('Enabled subscription');
    fetcher
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ subscriptions: [] }));
    await click('Remove');
    expect(container.textContent).toContain('No channels registered');
  });
  it('clears confirmation when the input or platform changes, and supports cancellation', async () => {
    fetcher.mockResolvedValue(Response.json({ account, confirmation: 'receipt' }));
    await type('@handle');
    await submit();
    await type('@another');
    expect(container.textContent).not.toContain('Confirm account');
    fetcher.mockResolvedValueOnce(Response.json({ account, confirmation: 'receipt' }));
    await submit();
    await click('Cancel');
    expect(container.textContent).not.toContain('Confirm account');
    const select = container.querySelector('select')!;
    await act(async () => {
      select.value = 'kick';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('Kick username');
  });
  it('shows lookup loading, API errors, duplicates, retry guidance and expired-session errors', async () => {
    let finish!: (value: Response) => void;
    fetcher.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await type('@handle');
    await submit();
    expect(container.textContent).toContain('Working…');
    expect(container.querySelector('input')!.disabled).toBe(true);
    await act(async () =>
      finish(
        Response.json(
          { error: 'platform_rate_limited' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Retry in 30 seconds');
    for (const [error, text] of [
      ['streamer_not_found', 'No public channel'],
      ['duplicate_subscription', 'already registered'],
      ['login_required', 'session has expired'],
    ]) {
      fetcher.mockResolvedValueOnce(Response.json({ error }, { status: 400 }));
      await submit();
      expect(container.querySelector('[role="alert"]')!.textContent).toContain(text);
    }
    expect(container.querySelector('input')!.disabled).toBe(false);
  });
});
