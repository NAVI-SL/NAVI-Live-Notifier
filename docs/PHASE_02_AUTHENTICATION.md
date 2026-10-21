# Phase 2 — Discord authentication and installation

Phase 2 delivery record and current Portal setup. Subsequent dashboard and authentication-recovery changes are documented in [PHASE_03_DASHBOARD.md](PHASE_03_DASHBOARD.md); its implementation details supersede the earlier recovery behavior below. Historical audits remain unchanged.

Better Auth **1.7.10** was explicitly selected by the user on 2026-10-16. Production uses its Drizzle adapter and PostgreSQL; tests use the official memory adapter and embedded PostgreSQL. No production memory/session fallback exists.

## Local setup

For the current Portal observations, environment gaps and setup steps, use the [Discord configuration review](DISCORD_CONFIGURATION_REVIEW.md). The steps below describe the original Phase 2 state; later migrations and explicit test sends are documented in the Phase 4/5 records.

1. Run `npm ci`, then `npm run build:shared` from the repository root.
2. Keep local DB/Redis settings in the existing root `.env`. Copy `.env.web.example` to `.env.web` and `.env.bot.example` to `.env.bot`; populate values locally. Existing `.env` is not overwritten by this implementation.
3. Set `WEB_ORIGIN=http://localhost:3000` with no trailing slash. Use that exact browser origin, not `127.0.0.1`, for login. Production requires an HTTPS origin; `next start` uses production mode and needs HTTPS termination for authenticated use.
4. Generate **two different** random secrets, each at least 32 characters: `BETTER_AUTH_SECRET` and `BOT_INTERNAL_SECRET`. For each, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` locally. Store the internal secret in both web and bot files; never place the bot token or OAuth client secret in public variables.
5. Set `DISCORD_ALLOWED_USER_IDS` to the comma-separated Discord user IDs permitted to use this personal development app. Empty allowlists fail configuration validation. This does not replace server permission checks.
6. Start PostgreSQL (`npm run services:up` if Docker is installed), verify `npm run db:check`, review all existing migrations, then run `npm run db:migrate` against your development database. The initial migration creates four authentication tables; subsequent Phase 4/5 migrations create registration and notification settings/test tables.
7. Run `npm run env:check:auth`, then `npm run dev`. The worker needs only DB/Redis URL configuration and remains idle. The bot status API runs when its token is configured; it binds only `127.0.0.1:4001`. The web app uses `BOT_INTERNAL_URL=http://127.0.0.1:4001`.

The configuration loader selects only each service's permitted fields and does not populate `process.env`. Service-specific files override the shared root file; explicitly supplied shell variables take precedence. Separate files are preferred. A shared local file remains a compatibility convenience, not OS-level isolation: processes running as the same local user can read repository files, and manually exporting all secrets into a common parent shell also shares them. Production must inject only each process's own variables.

## Discord Developer Portal

- Create/select one application in the [Discord Developer Portal](https://discord.com/developers/applications).
- OAuth2 redirect: **`http://localhost:3000/api/auth/callback/discord`** for local development. Register the exact HTTPS equivalent before using another origin. Enter the application ID and OAuth client secret into `.env.web`.
- Create the bot user and place its bot token only in `.env.bot`. For owner-only testing, leave **Public Bot disabled**. The installing account must be permitted by Discord to install the app.
- Enable **Guild Install**. The generated installation URL uses the `bot` scope, guild context, selected `guild_id`, and `disable_guild_select=true`. Discord includes application-command scope with bot installation, but no slash commands are registered.
- Permission integer **19456** = View Channel + Send Messages + Embed Links. **Do not select Administrator.** These are intended notification permissions; no messages are sent yet.
- Leave privileged Message Content, Presence and Server Members intents disabled. No Gateway session is opened in this phase.
- Leave **Requires OAuth2 Code Grant** disabled for the simple installation flow. Installation is separate from dashboard login; there is no trusted install-success callback. Return to NAVI and refresh status after installing.

Official contract: [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2), [permissions](https://docs.discord.com/developers/topics/permissions), [current-user guilds](https://docs.discord.com/developers/resources/user#get-current-user-guilds).

## Authentication and session security

Login requests only `identify guilds`; default email scope is disabled. Because Better Auth requires an email-shaped field, the provider's stable Discord ID maps to `REDACTED_CONTACT`. This is a non-routable internal identity key, never presented as a real/verified email, and no email/password or linking feature is exposed. Better Auth validates the provider identity against the personal allowlist on each OAuth sign-in; application routes recheck that allowlist on session use.

Better Auth generates and validates the one-use OAuth state using its database verification storage and browser-bound cookie. The provider redirect URI and post-login/error destinations are fixed by the server. Browser-provided provider/scopes/return URLs are ignored by the public login handler. CSRF origin checks are mandatory on login, logout and installation POSTs. Forwarded host headers do not determine the auth origin.

Sessions expire absolutely after **24 hours**, without sliding refresh or a cookie session-data cache. Each protected page/API checks the database-backed session. Cookies are HttpOnly, SameSite=Lax, host-only and Secure for HTTPS origins. Logout deletes the current session and clears its cookie; it does not remove the bot or other sessions. The server never sends provider access/refresh tokens to the browser. The mounted auth handler exposes only sign-in, the Discord callback and sign-out; library account/token/session-inspection APIs are not public application routes.

Provider tokens are encrypted by Better Auth before storage, using the configured auth secret. Session storage uses the library's native opaque token column plus signed cookie verification; it does **not** implement the earlier draft's custom hashed session-token model. This deliberate library-native schema choice avoids maintaining a custom authentication adapter and is recorded here for review. Database access and auth-secret protection remain essential. Keep `BETTER_AUTH_SECRET` stable across restarts; changing it invalidates existing signatures/encrypted token access unless a separately reviewed rotation is implemented.

See [Better Auth Discord](https://better-auth.com/docs/authentication/discord), [sessions](https://better-auth.com/docs/concepts/session-management), [Next.js integration](https://better-auth.com/docs/integrations/next), and [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle).

## Guild authorization and installation verification

`/dashboard` and `/dashboard/GUILD_ID` validate sessions on the server. `/api/me` returns a safe identity subset. `/api/guilds` retrieves Discord guilds using the server-side user access token and returns only owner/Administrator/Manage Guild entries. Permissions are parsed with BigInt. No client-supplied permission value is accepted.

`GET /api/guilds/GUILD_ID` and `POST /api/guilds/GUILD_ID/install` always fetch current permissions again. A browser-supplied guild ID alone grants no access. Missing sessions produce 401; unauthorized guild/account access produces 403. Status is checked only after authorization. There is no stale guild-permission cache.

The bot service checks `GET /guilds/GUILD_ID` using its token. Unknown Guild/Missing Access mean not installed; credential failures, rate limits, network failures and other errors mean **unknown**, never a false successful install. Its loopback API checks a constant-time bearer credential and returns only status. The browser never receives that credential or the bot token. Web-to-bot requests are bounded by timeouts; the Discord REST client rejects rate-limited requests for this read path. User guild requests honor Retry-After and return structured 429 responses with a cooldown; failed APIs do not authorize access.

Installation is a fresh, authorized POST returning a 303 redirect to the official Discord URL. The selected guild is locked in the UI as a convenience, but only a subsequent backend Discord read establishes installation. The UI refresh action reauthorizes and verifies status; query parameters claiming success are ignored.

## Verification limits and operational notes

Automated tests mock Discord while exercising the actual auth engine, including login, cancelled/failed authorization, state binding/replay/expiry, encrypted tokens, session expiry/logout, scope/redirect constraints, direct unauthorized access, permission changes, install URLs, status boundaries and rate limits. Embedded PostgreSQL runs the real auth SQL and Drizzle adapter. These do not replace a real Developer Portal/browser consent test.

No real Discord credentials were supplied during implementation. A live browser login, bot installation and external PostgreSQL migration therefore require the configuration above and remain manual acceptance items. Both full and production-only npm audits report four moderate findings in Drizzle Kit's legacy esbuild chain. Better Auth's optional Drizzle Kit peer includes that CLI dependency chain in npm's production graph. No affected tooling server is exposed, and the offered breaking downgrade was not applied. Authentication rate limits and user-token cooldowns are process-local for this personal deployment; distributed/public scaling requires a shared limiter first.

Historical Phase 2 scope ended before Phase 3. Current Phases 3–5 add dashboard, registration, notification preferences and explicit test sends. Livestream detection, webhook processing, generic queues and automatic sending remain unimplemented; Phase 6 is not started.
