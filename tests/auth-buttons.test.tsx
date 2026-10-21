// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ social: vi.fn(), signOut: vi.fn() }));
vi.mock('../apps/web/node_modules/better-auth/dist/client/react/index.mjs', () => ({
  createAuthClient: () => ({ signIn: { social: api.social }, signOut: api.signOut }),
}));
import { AuthButton } from '../apps/web/src/components/auth-buttons';
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  api.social.mockReset();
  api.signOut.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
it.each([
  ['invalid_origin', 'different address'],
  ['authentication_configuration', 'not configured correctly'],
  ['authentication_database', 'sign-in database'],
  ['account_not_allowed', 'not approved'],
  ['authentication_rate_limited', 'rate limited'],
  ['invalid_code', 'Discord could not complete'],
])('shows a distinct safe %s message and permits a deliberate retry', async (code, text) => {
  api.social.mockResolvedValue({ error: { code, message: 'FAKE_PRIVATE' } });
  await act(async () => root.render(<AuthButton />));
  await act(async () => container.querySelector('button')!.click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(text);
  expect(container.textContent).not.toContain('FAKE_PRIVATE');
  expect(container.querySelector('button')?.disabled).toBe(false);
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/login');
  expect(api.social).toHaveBeenCalledTimes(1);
});
it('distinguishes transport failure and does not pretend logout succeeded', async () => {
  api.signOut.mockRejectedValue(new Error('FAKE_PRIVATE'));
  await act(async () => root.render(<AuthButton logout />));
  await act(async () => container.querySelector('button')!.click());
  expect(container.textContent).toContain('Unable to reach NAVI');
  expect(container.textContent).not.toContain('FAKE_PRIVATE');
  expect(container.querySelector('button')?.textContent).toBe('Log out');
});
