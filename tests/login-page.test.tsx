import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const state = vi.hoisted(() => ({ host: '127.0.0.1:3000', values: {} as Record<string, string> }));
vi.mock('@navi/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@navi/config')>()),
  loadRootEnvironment: () => state.values,
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: state.host }) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import LoginPage from '../apps/web/src/app/login/page';
beforeEach(() => {
  state.host = '127.0.0.1:3000';
  state.values = {
    NODE_ENV: 'development',
    WEB_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://localhost/synthetic',
    BETTER_AUTH_SECRET: 'synthetic-auth-secret-at-least-thirty-two-characters',
    DISCORD_CLIENT_ID: '111111111111111111',
    DISCORD_CLIENT_SECRET: 'FAKE_PRIVATE',
    DISCORD_ALLOWED_USER_IDS: '222222222222222222',
    BOT_INTERNAL_SECRET: 'synthetic-broker-secret-at-least-thirty-two-characters',
  };
});
it('redirects the actual development login page to the configured canonical origin', async () => {
  await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
    'redirect:http://localhost:3000/login',
  );
});
it('shows missing configuration distinctly and disables sign-in without revealing settings', async () => {
  delete state.values.DISCORD_CLIENT_ID;
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('not configured correctly');
  expect(html).not.toContain('Login with Discord');
  expect(html).not.toContain('FAKE_PRIVATE');
});
it('renders sanitized callback denial at the configured origin and never reflects descriptions', async () => {
  state.host = 'localhost:3000';
  const html = renderToStaticMarkup(
    await LoginPage({ searchParams: Promise.resolve({ error: ['oauth', 'account_not_allowed'] }) }),
  );
  expect(html).toContain('not approved');
  expect(html).toContain('Login with Discord');
  expect(html).not.toContain('FAKE_PRIVATE');
  const unknown = renderToStaticMarkup(
    await LoginPage({ searchParams: Promise.resolve({ error: 'FAKE_PRIVATE' }) }),
  );
  expect(unknown).not.toContain('FAKE_PRIVATE');
});
