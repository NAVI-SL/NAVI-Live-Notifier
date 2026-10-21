# Phase 4 — streamer registration

Implemented for personal development on **2026-10-17 (Asia/Colombo)** following the user's explicit instruction. This contract supersedes earlier statements that registration is unavailable. The subsequently authorized Phase 5 adds notification preferences, preview and explicit Discord test sends; see `PHASE_05_NOTIFICATION_SETTINGS.md`. Detection, provider event subscriptions, polling and automatic delivery remain unimplemented. Phase 6 is not authorized.

## User flow and scope

Choose a manageable Discord server → Streaming Channels. Select YouTube or Kick, enter an identifier, accept the linked privacy notice/terms, and resolve the public account. Inspect its name, platform, stable ID, canonical link and original input before confirming. Lookup alone writes no registration; editing the form clears confirmation. Loading, success, empty, duplicate, missing-credentials, expired-session and API-failure states are provided.

YouTube supports `@handle`, bare handles, canonical `UC…` IDs, HTTPS handle/channel URLs, allowed www/mobile hosts and encoded international handles. Common bare `youtube.com/…` and `www.youtube.com/…` URL forms are normalized to HTTPS. `/c/`, `/user/` and video URLs receive an unsupported-format error: this is a NAVI scope limitation, not a claim that YouTube lacks a legacy username API. Kick supports usernames and HTTPS/bare kick.com/www.kick.com channel URLs. Inputs are trimmed, bounded to 512 characters and checked before provider calls. The platform remains authoritative about account existence. [YouTube handle guidelines](https://support.google.com/youtube/answer/11585688?hl=en).

The list and all changes belong to the selected guild. Enable/disable stores eligibility for **future** monitoring; it does not activate monitoring. Removing a subscription affects only that server. The shared identity is removed when its last reference is removed. Different identifiers resolving to one stable account cannot create duplicate subscriptions in a guild. The development cap defaults to **10 global unique sources**, including disabled subscriptions; `STREAMER_SOURCE_LIMIT` can set 1–100. Reuse in another guild consumes no extra slot. This is an engineering safeguard, not a provider quota or supported detection-scale promise.

## Current official API verification

Official documentation was checked on 2026-10-17. This is documentation verification, not a credentialed platform experiment.

| Platform | Implemented request                                                                                                                            | Authentication                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube  | `GET https://www.googleapis.com/youtube/v3/channels`, `part=snippet`, exactly one of `forHandle` or `id`; quota cost one unit                  | Server-side API key for public data. No Google login, search, scrape or owner broadcast API. [Channels list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list), [API setup](https://developers.google.com/youtube/data/getting-started).                                                                                                     |
| Kick     | Form POST to `https://id.kick.com/oauth/token` with `grant_type=client_credentials`, then `GET https://api.kick.com/public/v1/channels?slug=…` | Official OpenAPI explicitly permits **AppAccessToken** for channel reads; its delegated alternative uses `channel:read`. Slugs have a documented 25-character maximum. [Token flows](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow), [channels](https://docs.kick.com/apis/channels), [official OpenAPI](https://api.kick.com/swagger/doc.json). |

Kick lookup therefore requires no streamer login, redirect or PKCE/user refresh-token flow. The web process obtains and caches an app token in memory, coalesces concurrent exchanges, renews by expiry, and allows one renewal/retry after a channel API 401. Persistent failure is returned safely. Any later delegated/private feature needs its own reviewed authorization flow. Kick's canonical slug is displayed as the account name; no unsupported profile-name field is assumed. `lossless-json` preserves broadcaster ID digits before storing them as text.

Resolution establishes public identity only: it proves neither account ownership nor livestream eligibility, online status, webhook subscription eligibility or future coverage. No universal numeric Kick HTTP quota is assumed. Private/unavailable accounts and unsupported URL forms fail clearly. Historical discovery/event feasibility experiments remain outstanding.

## Backend and security

The web process owns public-account resolution and registration CRUD. The bot still owns only installation-status operations, and the worker stays idle. Framework-independent TypeScript adapters/services connect Next route handlers to PostgreSQL; no queue or Redis dependency was introduced.

| Route                                            | Contract                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/api/guilds/:guildId/streamers`                 | GET lists subscriptions; POST accepts signed `confirmation` and creates one (201).                                                 |
| `/api/guilds/:guildId/streamers/resolve`         | POST accepts `platform`, `identifier`, `acceptPolicy: true`; returns public account details and a ten-minute confirmation receipt. |
| `/api/guilds/:guildId/streamers/:subscriptionId` | PATCH requires boolean `enabled`; DELETE removes the scoped subscription. A missing PATCH field cannot trigger deletion.           |

Every operation checks the current database session, personal account allowlist and fresh Discord owner/Administrator/Manage Guild permissions. Verification failures fail closed. The protected page also independently checks access. Queries/mutations use both guild ID and subscription ID; browser IDs and local membership records grant no access. Mutations require the exact configured Origin and reject cross-site requests. Streamed JSON bodies are bounded to 12,000 bytes; responses use `no-store`. Permission verification is point-in-time, not an atomic transaction with later Discord role changes.

Purpose-separated HMAC-SHA256 receipts under the server auth secret bind the actor, guild, expiry, resolved account and original input. Constant-time signature validation prevents browser substitution of account IDs/names/URLs. Receipts contain no credentials and stay in component memory. They are reusable only within their binding/expiry: uniqueness blocks a second existing subscription, but deletion followed by authorized recreation with a still-valid receipt is allowed. This is not OAuth's one-use state mechanism.

Only fixed official API origins are fetched; user-entered URLs are never fetched. Redirects are rejected. Each provider call has an eight-second deadline and 1 MiB response bound. Canonical IDs/slugs are validated; React escapes metadata, and no provider HTML/thumbnail proxy is rendered. Keys/tokens/raw provider or database errors are not returned to the browser. Browser bundle inspection found no provider token/lookup endpoint or provider credential-setting names; Better Auth's existing generic client code does contain an environment-key name, which is not a secret value.

The service limits lookup attempts to ten per actor per minute across guilds. A provider 429 establishes an adapter cooldown and preserves bounded Retry-After guidance. YouTube quota exhaustion uses a conservative one-hour cooldown, not an asserted reset time. Missing credentials return platform-specific 503; empty results 404; malformed input/confirmation 400; duplicates/cap exhaustion 409; session loss 401; denied access 403. Other provider/network failures use safe 502/503 responses. Retries are explicit except for the single Kick authentication retry. Token caches/limiters are in-memory for a local process and reset on restart; distributed/public use needs shared admission/quota controls.

## Schema and migration

Review `packages/database/migrations/0001_phase04_streamers.sql` and its Drizzle metadata, then apply it after the auth migration. Startup does not migrate automatically.

- `provider_channels`: global UUID, provider, stable external ID as text, public name/URL and verification/expiry/creation instants. Unique `(provider, external_id)`, expiry index, provider/nonempty-ID checks.
- `streamer_subscriptions`: UUID, Discord guild ID as text, provider-channel FK, original trimmed identifier, enabled boolean and timestamps. Unique `(guild_id, provider_channel_id)`, source index, snowflake/identifier checks and cascading source deletion.

Only public identity metadata is shared. No API exposes another guild's memberships, original identifier or preference. Short registry-write transactions serialize cap checks, insertion and last-reference removal; HTTP calls occur outside transactions. Login deletion does not erase guild-owned subscriptions. No notification route, destination-channel or delivery table is created.

## Notices, retention and deletion

Minimal `/privacy` and `/terms` pages disclose actual storage, cookies, platform requests, shared identities and deletion. The lookup form requires unchecked-by-default agreement, enforced by the HTTP handler. This addresses the timing concern in planning audit M11; it is not full provider-policy certification. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).

As a conservative Phase 4 implementation choice, public identity metadata expires **29 days after confirmation**, allowing time before the planned 30-day policy boundary. Expired entries are hidden by list reads. Authorized list requests, successful add transactions and the following standalone command delete expired identities together with all linked subscriptions/original identifiers:

```powershell
npm run db:prune-streamers
```

Run it daily while retaining real provider data, including while the web app is stopped. Review the target database first. No OS scheduler/Codex automation is installed, and deletion is not promised while every process is off. Stop retaining real API data if required maintenance cannot be met. Disabled registrations still expire. Remove and re-register to refresh before expiry; duplicate add rolls back and does not silently renew a subscription. A new subscription from another guild can refresh the shared identity.

Local deletion procedure: remove the relevant guild subscriptions through Streaming Channels and verify the list. For complete login deletion, stop services and use a parameterized administrative transaction targeting the specific `auth_user.id`; auth session/account foreign keys cascade. Also revoke the application in Discord settings, because local deletion does not remotely revoke an issued credential. Restart and verify old sessions fail. Guild-owned subscriptions remain unless separately removed. If Discord is unreachable and operator deletion is authorized, verify the intended guild ID and scope database deletion to it; do not expose a generic SQL/deletion endpoint.

No backup service is configured. Before retaining real data, exclude expired/deleted data from backups, keep development dumps for at most 24 hours, remove affected dumps on deletion, and prune/reapply deletions before serving restored data. Daily maintenance, backup expiry and account deletion are local operator duties; there is no automated policy-compliance guarantee. Full self-service account deletion, automatic maintenance scheduling and public-release policy review remain future work.

## Setup and acceptance limits

Subsequent Phase 5 note: the bot now additionally provides eligible channels/roles and explicit labelled test messages. Saved notification settings are attached to these registrations and cascade on removal/expiry. See [the Phase 5 contract](PHASE_05_NOTIFICATION_SETTINGS.md). Detection and automatic notifications remain excluded; the Phase 4 statements above describe that phase's original scope.

1. Complete the existing Discord Portal/auth setup, start PostgreSQL, review the target/migrations, then run `npm run db:migrate`.
2. Enable YouTube Data API v3 in Google Cloud. Create a server-side key restricted to that API and appropriate server network restrictions; set `YOUTUBE_API_KEY` in untracked `.env.web`. Inspect the actual project's quota.
3. Register a Kick developer application; set `KICK_CLIENT_ID` and `KICK_CLIENT_SECRET` in `.env.web`. Phase 4 consumes no Kick redirect/webhook URL. App eligibility remains an external prerequisite.
4. Optionally set `STREAMER_SOURCE_LIMIT=10`; restart after configuration changes. Unused provider credentials may be blank: only that provider's lookup is unavailable. Never place them in bot/worker files, browser code or `NEXT_PUBLIC_*` variables.
5. Review notices and arrange cleanup/deletion handling, then test lookup-confirm-CRUD for both providers in two real guilds, including logout and manager revocation.

See `PROGRESS.md` for actual command results and file inventory. Tests use mocked provider HTTP, PGlite with real SQL migrations/Drizzle queries, and hydrated React controls in jsdom. They do not establish live Discord/Google/Kick acceptance, external PostgreSQL deployment/independent-process lock contention, Node 24 behavior or real mobile-browser visual QA. Current auth configuration and external PostgreSQL availability block live acceptance. Existing moderate Drizzle tooling advisories and provider detection feasibility remain open. No monitoring guarantee is made.
