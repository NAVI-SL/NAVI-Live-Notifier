# Discord OAuth login diagnosis

**2026-10-20 follow-up:** the same origin mismatch recurred. [Current permanent login-page recovery and safe error handling](DISCORD_LOGIN_ORIGIN_FIX.md) now canonicalizes development aliases, distinguishes failures and verifies a fresh real consent/callback. The dated manual correction and earlier test counts below remain historical; exact-Origin protections are still enforced.

Verified **2026-10-17 (Asia/Colombo)** against the running local application, real Discord authorization, PostgreSQL, existing configuration and automated tests.

## Precise root cause

The failing page was opened at `http://127.0.0.1:3000/login`, while the effective `WEB_ORIGIN` was `http://localhost:3000`. Those are different browser origins even when they reach the same machine. `apps/web/src/lib/auth-handler.ts` invokes `assertOrigin` before calling Better Auth. The exact-origin check in `errors.ts` rejects the request with **403 `invalid_origin`**. `AuthButton` displays its generic authentication/connection error for this response.

The existing development script binds to `127.0.0.1`, so Next.js advertises an address that differs from the configured authentication origin. The binding itself is valid; the browser must use the configured hostname. Passing environment validation cannot detect that a person opened a different browser address.

This reproduced failure happens **before** an authorization request is sent to Discord or a callback is received. It is not a rejected Discord authorization code, client-secret error, missing migration or PostgreSQL failure. No evidence supported changing OAuth code, widening trusted origins, disabling CSRF checks or replacing authentication.

## Evidence and correction

1. Reopened the existing browser tab at `127.0.0.1:3000/login` and clicked the existing login button. The reported error appeared without navigating to Discord.
2. Reproduced the login POST with the same hostname and Origin: **403**, safe response error `invalid_origin`.
3. Sent the equivalent request using `http://localhost:3000`: **200**, with an authorization destination on Discord, only `identify guilds`, a nonempty state and callback `http://localhost:3000/api/auth/callback/discord`. State and cookie values were not printed.
4. Opened the existing browser tab at `http://localhost:3000/login` and started a fresh login. Discord showed the expected NAVI identity/server-list consent page, rather than an invalid-client or redirect error.
5. The user completed Discord consent. The browser returned to **`http://localhost:3000/dashboard`**, showing the authenticated workspace and **four manageable Discord servers**.
6. Queried PostgreSQL using boolean-only existence checks, without selecting credentials: an allowed Discord account with a stored provider access token exists, and an unexpired session associated with an allowed Discord account exists. Both returned **true**. The authenticated dashboard independently demonstrates successful session use.

**Fix applied:** used the configured canonical browser origin and documented the development-server address trap. No source-code or environment changes were necessary. Existing credentials, Portal settings, sessions and access checks were not weakened or recreated. The real successful login naturally created/updated its normal authentication records.

For future use, open **[http://localhost:3000/login](http://localhost:3000/login)** while `WEB_ORIGIN=http://localhost:3000`. If intentionally choosing a different hostname later, configure one canonical `WEB_ORIGIN`, register its exact callback in Discord, restart the web process and start a fresh login from that same origin. Never transfer callback codes or cookies between hostnames. Discord's [OAuth2 documentation](https://docs.discord.com/developers/topics/oauth2) describes the registered redirect and state contract.

## Server logs, Better Auth and Discord API observations

The existing `apps/web/.next/dev/logs/next-development.log` contained no auth request records or error markers during inspection. `next.config.mjs` explicitly disables incoming request logging; Better Auth's logger is also disabled in `auth-factory.ts`. Thus these logs cannot establish individual callback or upstream HTTP status codes. Logging was not enabled because raw callback URLs can contain authorization codes and state.

The effective public application ID matches the inspected NAVI application. Better Auth retains the fixed server-owned base origin/callback, minimal `identify guilds` scopes, database-backed browser-bound state, encrypted OAuth token storage and database sessions. The POST at the correct origin successfully exercised the actual Drizzle/PostgreSQL verification storage. Real consent/callback/dashboard and guild retrieval then succeeded.

Raw Discord token/user/guild response bodies and individual upstream status codes were deliberately not captured, replayed or logged. Successful code exchange/profile resolution are inferred from the authenticated callback outcome and persisted account; successful guild retrieval is demonstrated by the dashboard's authorized server list. No claim is made that individual upstream HTTP responses were directly inspected. No arbitrary provider request or duplicate authorization-code exchange was needed after success.

## Actual checks

| Check                                          | Result                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run env:check:auth`                       | **PASS**, exit 0 with current local configuration; no secret values printed.                                                                  |
| First sandboxed PostgreSQL check               | **BLOCKED** by sandbox networking; a sanitized diagnostic reported `EACCES`. Its connection failure is not evidence that PostgreSQL was down. |
| `npm run db:check` outside sandbox restriction | **PASS**, exit 0 against the configured PostgreSQL service.                                                                                   |
| Incorrect-origin login POST                    | **403 `invalid_origin`**, expected security rejection; reproduces the reported failure.                                                       |
| Configured-origin login POST                   | **PASS**, 200 and correct public authorization parameters.                                                                                    |
| Real Discord consent and callback              | **PASS** after user consent; authenticated dashboard and manageable guild list rendered.                                                      |
| Boolean account/session persistence checks     | **PASS** against external PostgreSQL; account/token-presence and unexpired-session checks true.                                               |
| `npm run check` outside sandbox restriction    | **PASS**, exit 0: workspace/tools type checks, ESLint, Prettier and **141 tests in 15 files**.                                                |
| `npm run build` outside sandbox restriction    | **PASS**, exit 0: shared packages, Next.js, bot and worker.                                                                                   |

An attempt to start an additional development server exited 1 because the existing server already owned port 3000 and the Next.js development lock. The existing server was reused; it was neither killed nor replaced. This was not an authentication failure.

Existing automated coverage includes actual Better Auth with mocked Discord, successful/failed/cancelled authorization, state and scope constraints, logout/session expiry, protected-route and cross-origin authorization, and embedded PostgreSQL adapter tests. These tests passed, but this debugging session did not manually repeat logout, cancelled consent, 24-hour expiry, provider-rate-limit behavior or alternate-account authorization changes. Production HTTPS, other origins and future credential rotation still require their own acceptance checks. No bot installation, notification send, monitoring or next-phase work was performed.

## Files changed

- `README.md`: practical guidance for the confirmed hostname mismatch.
- `docs/OAUTH_LOGIN_DEBUG.md`: diagnosis, correction, evidence and verification limits.
- `docs/DISCORD_CONFIGURATION_REVIEW.md`: pointer distinguishing the earlier setup snapshot from this successful live login.
- `docs/PROGRESS.md`: current results.

**Decision: reported login failure resolved at the configured localhost origin. No application-code defect was established.**
