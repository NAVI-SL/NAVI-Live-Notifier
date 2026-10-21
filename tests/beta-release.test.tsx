import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readAuthEnvironment, readMonitoringEnvironment } from '@navi/config';
import Home from '../apps/web/src/app/page';
import Support from '../apps/web/src/app/support/page';

it('validates the same optional five-guild beta scope for web and worker without enabling it by default', () => {
  const auth = {
    WEB_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://localhost/navi',
    BETTER_AUTH_SECRET: 'synthetic-auth-secret-at-least-thirty-two-characters',
    DISCORD_CLIENT_ID: '111111111111111111',
    DISCORD_CLIENT_SECRET: 'synthetic',
    DISCORD_ALLOWED_USER_IDS: '222222222222222222',
    BOT_INTERNAL_SECRET: 'synthetic-broker-secret-at-least-thirty-two-characters',
  };
  const ids = Array.from({ length: 6 }, (_, index) => String(333333333333333330n + BigInt(index)));
  expect(readAuthEnvironment(auth).BETA_GUILD_IDS).toBeUndefined();
  expect(readMonitoringEnvironment({}).BETA_GUILD_IDS).toBeUndefined();
  for (const parse of [
    (value: string) => readAuthEnvironment({ ...auth, BETA_GUILD_IDS: value }),
    (value: string) => readMonitoringEnvironment({ BETA_GUILD_IDS: value }),
  ]) {
    expect(parse(ids.slice(0, 5).join(',')).BETA_GUILD_IDS).toEqual(ids.slice(0, 5));
    for (const value of [
      ids.join(','),
      `${ids[0]},${ids[0]}`,
      'invalid-private-sentinel',
      `${ids[0]},`,
      ' ',
    ]) {
      expect(() => parse(value)).toThrow('BETA_GUILD_IDS');
      try {
        parse(value);
      } catch (error) {
        expect(String(error)).not.toContain('private-sentinel');
      }
    }
  }
});

it('routes Add to Discord through login and explains safe private feedback without exposing a public contact', () => {
  const home = renderToStaticMarkup(<Home />);
  expect(home).toContain('href="/login">Add to Discord');
  expect(home).toContain('href="/support"');
  const support = renderToStaticMarkup(<Support />);
  expect(support).toContain(
    'Public support and data-deletion contact details have not yet been confirmed.',
  );
  expect(support).toContain('Never send passwords');
  expect(support).not.toContain('mailto:');
});
