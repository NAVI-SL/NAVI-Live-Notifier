# Discord login origin recovery and safe errors

Verified **2026-10-20, Asia/Colombo** against the existing running local website, PostgreSQL, real Discord consent/callback and automated tests. This is a focused repair, not a new phase or public-release authorization.

## Confirmed root cause, before changes

The actual browser was open at **`http://127.0.0.1:3000/login`**, displaying the reported generic error. The web service correctly loaded a valid configuration whose `WEB_ORIGIN` uses **`http://localhost:3000`**. These are distinct browser origins. The existing exact-Origin check rejected **POST `/api/auth/sign-in/social` with HTTP 403 `invalid_origin`**, before Discord authorization/code exchange. The client discarded that safe code and showed a generic connection/authentication error.

Equivalent POST at the configured origin returned **200**, with a Discord authorization URL whose client ID matched configuration, `identify guilds` scopes, nonempty state and redirect URI matching **`/api/auth/callback/discord`**. Only booleans/status codes were recorded; no authorization URL/state/cookie/code/token value was printed. This reproduces the earlier manual-origin issue in [the historical diagnosis](OAUTH_LOGIN_DEBUG.md); changing the browser address once did not prevent recurrence.

All required web auth variables were present and validation passed: `WEB_ORIGIN`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS`, and existing broker secret. Read-only zero-row queries verified the four authentication tables/columns and PostgreSQL connectivity. Existing unexpired session/account presence was true. There was no evidence for rotating credentials, applying migrations, disabling authorization or changing Discord permissions.

Existing development logs contained no useful request/error classification for this failure. Actual projected HTTP diagnostics established the status/code. New server failure records contain only static event/stage/safe code/status; their presence was verified after the repair. No raw log, SQL parameter, request URL/query, provider response, authorization value or user/member list was copied.

## Changes and security

- The **development login GET page** redirects known loopback aliases on the **same configured port** to the server-owned `WEB_ORIGIN` login URL. Production, arbitrary hosts/ports and untrusted return locations are not canonicalized. It does not inspect or forward credentials from an alias.
- **Wrong-Origin POST remains 403** and is rejected before database/provider work. Trusted origins, state/browser binding, fixed callback/provider/scopes, secure production cookies, encrypted provider credentials and current guild authorization are retained.
- A zero-row, server-side auth-schema availability check runs for legitimate login/logout/callback operations. Known preflight failure yields `authentication_database`; configuration initialization failure yields `authentication_configuration`. No application data is selected by this query or schema automatically repaired.
- Public messages distinguish configuration, database, cancelled consent, unapproved beta account, expired/invalid state, rate limiting, OAuth/service failure and network failure. Arbitrary provider descriptions are never rendered or logged. A failed logout is not displayed as success.
- The unchanged allowlist gate now returns **`account_not_allowed`**, distinguishing NAVI beta denial from Discord **`access_denied`** cancellation; account IDs/access grants are unchanged.
- Callback error locations are reduced to a fixed login path and whitelisted code; raw `error_description` and arbitrary query values are removed. Required state/session cookies, rate deadlines and no-store/no-referrer handling are preserved. Successful callback destinations remain server-owned.
- Client errors offer a manual Return to sign-in link. No automatic retry loop, credentials in browser bundles, broad localhost trust expansion or new provider/bot permission is introduced.

## Actual verification

| Check                           | Result and boundary                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before-fix browser and POST     | **Reproduced** generic error on 127.0.0.1; POST 403 `invalid_origin`                                                                                                    |
| Configured-origin initiation    | **PASS actual**, 200 and correct public authorization parameters/state presence; no token exchange replay                                                               |
| Environment/database            | **PASS actual**, presence/validation and auth-schema checks; no values or rows disclosed                                                                                |
| After-fix GET alias             | **PASS actual**, 307 to configured localhost login; canonical page 200                                                                                                  |
| Wrong-Origin mutation after fix | **PASS security**, still 403 `invalid_origin`                                                                                                                           |
| Real browser login              | **PASS actual**: reloaded original tab canonicalizes; button reaches expected NAVI identity/server-list consent; callback completes and authenticated workspace renders |
| Session persistence             | **PASS actual booleans**, recent unexpired session and stored Discord credential-field presence; token values not selected/printed                                      |
| Server safe diagnostics         | **PASS actual**, projected `authentication_failure` / `invalid_origin` record present; earlier raw logs not exposed                                                     |
| Full check                      | **PASS**, `npm run check` exit 0: **380 tests / 35 files**, Vitest **8.21s**, TypeScript, zero-warning lint and formatting                                              |
| Production builds               | **PASS native**, `npm run build` exit 0: shared/web/bot/worker                                                                                                          |
| Browser known-value secret scan | **PASS**, no configured secret matches in rebuilt client assets; scope is exact-value checking                                                                          |

Twenty-three new regressions cover page-level redirect wiring, same-port/development limits, malicious/production hosts, missing config, safe callback messages, DB preflight, wrong-Origin rejection, provider error/cookie/Retry-After handling and interactive button messages. Existing real Better Auth with mocked Discord tests still verify successful session creation/encryption/logout, failure/cancellation, state replay/expiry, protected routes, fixed scopes/callback and allowlist denial. Initial UI tests needed correction to mock the web workspace's actual Better Auth installation; all final checks pass.

The browser automation wait timed out during consent navigation; subsequent observed workspace and fresh-session checks confirmed completion, and consent was not replayed. Individual token/profile HTTP status bodies were not captured: successful code exchange/profile resolution are inferred from the completed current login and persisted session. No bot installation or notification was performed. The original user tab remains authenticated.

## Files and remaining verification

Runtime: `apps/web/src/app/login/page.tsx`, `components/auth-buttons.tsx`, `lib/auth-handler.ts`, `lib/auth-factory.ts`, `lib/runtime.ts`, `app/api/auth/[...all]/route.ts`; new `lib/login-origin.ts`, `lib/auth-messages.ts`, `lib/auth-failures.ts`.

Tests: new `tests/login-diagnostics.test.ts`, `tests/auth-buttons.test.tsx`, `tests/login-page.test.tsx`; updated `tests/auth.test.ts`. Documentation: this report, progress and historical OAuth diagnosis pointer; [sanitized evidence](evidence/login-origin-fix-results.json). Dashboard proof is private/ignored `.local/login-dashboard-verified.png`.

No actual environment, credentials, allowlists, Discord permissions, dependencies or migration changed. No manual database deletion/reset or notification send occurred; only normal OAuth verification/session lifecycle was exercised. Production HTTPS/other origins, real unauthorized-account/cancelled-login/logout scenarios and injected real database/provider outages were **not manually repeated**; automated coverage is explicitly separate. Wider public launch remains **NO-GO** under the Phase 14 gates.
