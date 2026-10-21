import { betterAuth, type DBAdapterInstance } from 'better-auth';
import type { AuthEnvironment } from '@navi/config';
import { createOAuthRecovery } from './oauth-recovery';

export function discordIdentity(email: string): string | null {
  return /^discord-(\d{17,20})@users\.navi\.invalid$/.exec(email)?.[1] ?? null;
}

export function createNaviAuth(
  environment: AuthEnvironment,
  database: DBAdapterInstance,
  recovery = createOAuthRecovery(environment),
) {
  return betterAuth({
    appName: 'NAVI Live Notifier',
    baseURL: environment.WEB_ORIGIN,
    basePath: '/api/auth',
    secret: environment.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: [environment.WEB_ORIGIN],
    socialProviders: {
      discord: {
        clientId: environment.DISCORD_CLIENT_ID,
        clientSecret: environment.DISCORD_CLIENT_SECRET,
        redirectURI: `${environment.WEB_ORIGIN}/api/auth/callback/discord`,
        disableDefaultScope: true,
        scope: ['identify', 'guilds'],
        prompt: 'consent',
        refreshAccessToken: recovery.refreshAccessToken,
        overrideUserInfoOnSignIn: true,
        mapProfileToUser: (profile) => ({
          // Better Auth requires email; no actual email scope or mail delivery is used.
          email: `discord-${profile.id}@users.navi.invalid`,
          emailVerified: false,
        }),
      },
    },
    user: {
      validateUserInfo: ({ source }) => {
        const id = source.oauth?.profile?.id;
        if (
          source.oauth?.providerId !== 'discord' ||
          typeof id !== 'string' ||
          !environment.DISCORD_ALLOWED_USER_IDS.includes(id)
        ) {
          return { error: 'account_not_allowed' };
        }
      },
    },
    account: {
      encryptOAuthTokens: true,
      storeAccountCookie: false,
      storeStateStrategy: 'database',
      skipStateCookieCheck: false,
      accountLinking: { enabled: false },
    },
    session: {
      expiresIn: 60 * 60 * 24,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: environment.WEB_ORIGIN.startsWith('https://'),
      trustedProxyHeaders: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: { '/sign-in/social': { window: 60, max: 20 } },
    },
    logger: { disabled: true },
    telemetry: { enabled: false },
    onAPIError: { errorURL: `${environment.WEB_ORIGIN}/login?error=oauth` },
  });
}
export type NaviAuth = ReturnType<typeof createNaviAuth>;
