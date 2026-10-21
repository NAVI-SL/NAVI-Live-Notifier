# Phase 04 — streamer registration audit

Audit date: **2026-10-17 (Asia/Colombo)**.

**Decision: PASS for the scoped local Phase 4 implementation, with four minor findings and outstanding live acceptance.** No critical or major implementation defect was demonstrated. This is not a live-service readiness sign-off and does not authorize Phase 5.

Findings: **0 critical, 0 major, 4 minor**. Three minor behaviors were independently reproduced. Dependency advisories and unavailable external-service evidence are reported separately from new application defects.

## Scope and method

Reviewed the requirements and current phase instructions; architecture, API research, schema, security/risk and decision records; canonical and historical roadmaps; progress and previous phase/planning audits; authentication/dashboard contracts; and the Phase 4 registration contract. The current roadmap and explicit user instructions control scope rather than historical phase numbering or unapproved future proposals.

Inspected the registration input parser, official provider adapters, confirmation/authorization service, Next route handlers, runtime wiring, dashboard page/component/styles, privacy/terms notices, configuration selection, PostgreSQL/Drizzle schema/repository/migration/metadata, maintenance command, package manifests/lockfile and relevant existing auth/guild/bot/worker code. Reviewed the permanent tests and ran the requested checks. Current official API documentation was retrieved again, as cited below.

Three temporary audit tests exercised the real hydrated registration component and actual provider adapter with synthetic HTTP responses. They reproduced edge cases without a production auth bypass or real provider requests. The temporary test file was removed after verification; only this audit report is retained. Application code, dependencies, migrations and existing planning/progress documents were not modified. Builds regenerate ignored artifacts. No external migration, pruning, login, installation or notification was performed.

## Actual test evidence

Runtime: **Node.js 25.3.0/npm 11.15.0 on Windows**. Necessary test/build/network commands ran outside Windows sandbox restrictions. Node 24 LTS was not separately tested.

| Check                                    | Actual result                        | What this establishes / limits                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                          | **PASS, exit 0**                     | Shared/workspace/tooling TypeScript, ESLint with zero warnings, Prettier and Vitest.                                                                                                                                                                             |
| Permanent automated suite                | **PASS: 12 files, 103 tests**        | Includes existing auth/session/guild/install/dashboard/recovery tests and Phase 4 provider, service/HTTP, embedded PostgreSQL and hydrated UI tests.                                                                                                             |
| `npm run build`                          | **PASS, exit 0**                     | Shared packages, Next.js production build, bot and worker. Registration APIs/pages and notices compile successfully.                                                                                                                                             |
| Additional audit probes                  | **3/3 reproductions passed**         | Tests asserted the faulty behavior described in N01–N03; this is evidence of those defects, not proof those behaviors are correct. Temporary file removed.                                                                                                       |
| `npm run env:check:example`              | **PASS, exit 0**                     | Valid scaffold example configuration; not authentication/provider readiness.                                                                                                                                                                                     |
| `npm run smoke --workspace=@navi/bot`    | **PASS, exit 0**                     | Disconnected initialized/scaffold behavior; no messages.                                                                                                                                                                                                         |
| `npm run smoke --workspace=@navi/worker` | **PASS, exit 0**                     | Idle initialized/scaffold behavior; no monitoring jobs.                                                                                                                                                                                                          |
| Production browser-bundle inspection     | **No provider code/setting matches** | `.next/static` had zero matching files for the Kick token endpoint, YouTube channel endpoint, `KICK_CLIENT_SECRET` and `YOUTUBE_API_KEY`. One file includes Better Auth's generic `BETTER_AUTH_SECRET` setting-name getter; that name is not a credential value. |
| `npm run env:check:auth`                 | **FAIL, exit 1**                     | Missing/invalid `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS.0`, `BOT_INTERNAL_SECRET`. Only field names were reported.                                                                                         |
| `npm run db:check`                       | **FAIL, exit 1**                     | Configured external PostgreSQL connection failed with a redacted diagnostic. No external migration or CRUD was attempted.                                                                                                                                        |
| `npm audit --omit=dev --json`            | **FAIL, exit 1**                     | Four known moderate package findings in the Drizzle Kit/esbuild chain, zero high/critical. No dependency change or forced downgrade was made.                                                                                                                    |

The PostgreSQL tests execute the real auth and Phase 4 SQL migrations and real Drizzle queries in PGlite. They verify stored values across repository instances, not persistence across an external PostgreSQL server restart. The UI tests hydrate React in jsdom; they are not a live authenticated browser session or visual device test. Neither a passing production build nor a mocked HTTP lookup establishes real account/API eligibility.

## Verification against the requested criteria

| Criterion                                | Finding and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. YouTube handle/channel URL resolution | **Supported by code and automated fixtures.** Bare/@ handles, channel IDs and HTTPS handle/channel URLs resolve with the appropriate filter. International encoded handles and malformed/unsupported URLs are covered. Canonical `/channel/UC…` links are derived from the resolved stable ID. Legacy `/c/`, `/user/` and video URLs are intentionally rejected with useful guidance. Live lookups remain unverified.                                                                                         |
| 2. Kick username/channel URL resolution  | **Supported by code and fixtures.** Bare usernames and allowed kick.com/www URLs normalize to a bounded slug. The adapter requests that slug and validates the returned slug/ID. Large numeric IDs are parsed losslessly and stored as text. No unsupported profile-name field is assumed.                                                                                                                                                                                                                    |
| 3. Official APIs and credentials         | **Correct documented endpoint/authentication choices.** See official verification below. Server-side app credentials are not replaced by scraping or an undocumented cookie-based API.                                                                                                                                                                                                                                                                                                                        |
| 4. PostgreSQL persistence                | **Embedded PostgreSQL evidence passes.** Separate global identities and guild subscriptions store stable IDs, original trimmed identifiers, preferences and UTC timestamps. SQL constraints/FKs/indexes and production repository wiring are present. External deployment remains unverified.                                                                                                                                                                                                                 |
| 5. Duplicate prevention                  | **Pass in automated coverage.** Unique `(provider, external_id)` and `(guild_id, provider_channel_id)` constraints, transactional handling and duplicate-to-409 mapping prevent handle/URL aliases from creating extra subscriptions. Existing and fresh competing adds are tested; real independent-process contention is not established by PGlite.                                                                                                                                                         |
| 6. Add/remove/enable/disable             | **Core operations pass.** Real repository tests cover both boolean states, removal, preservation of another guild's preference and last-reference identity deletion. Hydrated UI exercises the full control sequence. N01 concerns recovery after a committed operation, not the database mutation itself.                                                                                                                                                                                                    |
| 7. Discord server authorization          | **Current checks are enforced in reviewed code.** Each registration operation calls the guild authorizer and current identity check; authorization uses database-backed sessions, development allowlist and fresh Discord owner/Administrator/Manage Guild permissions. Writes/deletes use both guild and subscription ID. Missing-session/denied/revoked access and cross-guild resource attempts are covered at component/service/repository boundaries. N04 records the missing complete integration path. |
| 8. Invalid input/API failure handling    | **Core handling passes, with N02/N03 improvements.** Fixed official origins, no fetching of user URLs, redirect rejection, eight-second provider deadlines, 1 MiB response bounds, bounded mutation JSON, safe error codes, lookup limits and common 429/quota behavior are present. Invalid input, empty account results, malformed/oversized JSON, network errors and ordinary cooldowns are tested.                                                                                                        |
| 9. Frontend secret protection            | **No disclosure demonstrated.** Runtime is server-only; browser imports of database DTOs are type-only. Environment selection excludes provider secrets from bot/worker and no `NEXT_PUBLIC_*` provider field is used. API responses contain public identity data and signed confirmation only; provider/DB failures are redacted. Build inspection supports this boundary, but is not an exhaustive audit with populated real credentials.                                                                   |
| 10. Existing functionality               | **Available regression checks pass.** Existing real-engine mocked Discord login/logout/state/session tests, guild authorization/install/status, dashboard and recovery coverage remain green. Bot/worker smoke behavior is preserved. Real browser/Portal behavior remains unverified because configuration is incomplete.                                                                                                                                                                                    |

## Official API assumptions rechecked

- YouTube `GET https://www.googleapis.com/youtube/v3/channels`, `part=snippet`, and exactly one `forHandle` or `id` filter match the official method. Handle lookup accepts the optional `@`; the method costs one quota unit. Public reads can use an API key; no Google user authorization is required for this registration lookup. [YouTube channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list), [YouTube API setup](https://developers.google.com/youtube/data/getting-started).
- Kick's app-token endpoint is `POST https://id.kick.com/oauth/token`, form encoded with client ID/secret and `grant_type=client_credentials`. It is an app-token acquisition/renewal flow, not a user refresh-token flow. [Official token documentation](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow).
- Kick's current official OpenAPI explicitly permits **AppAccessToken** for `GET /public/v1/channels`; the delegated alternative specifies `channel:read`. Slug lookup is supported, with maximum slug length 25. The selected operation therefore does not need a streamer OAuth redirect or PKCE flow. [Kick official OpenAPI](https://api.kick.com/swagger/doc.json).
- Account resolution establishes public identity only. It does not demonstrate stream ownership, online status, future webhook subscription eligibility, practical quotas or detection coverage. No such guarantee is displayed by the registration UI.

## Critical issues

None demonstrated within the scoped Phase 4 implementation.

## Major issues

None demonstrated within the scoped Phase 4 implementation. Unavailable live credentials/services are acceptance evidence gaps, recorded below rather than misrepresented as passing tests or proven code defects.

## Minor findings and recommended corrections

### N01 — A failed list refresh leaves stale controls after a successful mutation

**Location:** `apps/web/src/components/streamer-manager.tsx:82`, `:96`, `:105`.

The component reports mutation success and then awaits a separate list request inside the same generic error handler. The audit probe returned PATCH 200 for `enabled=false`, followed by GET 503. The UI simultaneously displayed “preference updated” and “operation failed”, while still showing “Enabled for future monitoring” and a Disable button. The same structure can leave a successfully removed entry visible. The explicit Refresh list button permits recovery, and database isolation/correctness is unaffected, so this is minor at the current registration-only stage.

**Correction:** Distinguish a committed write from a failed refresh. Update the affected item optimistically after confirmed success, or clearly label the list stale and show “Saved; refresh failed”. Provide refresh-specific recovery, and show sign-in guidance only for authentication failures rather than appending a Sign in link to every error.

**Acceptance:** Hydrated tests cover successful add/PATCH/DELETE followed by failed GET, a network-ambiguous mutation, and eventual successful refresh, without falsely indicating that a committed operation failed or displaying a stale state as authoritative.

### N02 — Retry-After is shortened when the provider asks for more than 24 hours

**Location:** `apps/web/src/lib/streamer-providers.ts:82`.

The upper clamp to 86,400 seconds also sets the actual provider cooldown. A synthetic 429 with `Retry-After: 172800` returned a one-day delay, and a second user-triggered lookup after 86,401 seconds made another HTTP request before the original two-day wait elapsed. The adapter remains bounded and there is no automatic retry loop; however, it should not shorten a valid provider-directed wait. Retry-After can specify a delay in seconds or an HTTP date. [HTTP Retry-After semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3).

**Correction:** Retain the full valid blocked-until instant. Bound display/poll intervals separately if necessary; after a display interval expires, recheck the original deadline without sending an early provider request.

**Acceptance:** Seconds and HTTP-date cases beyond one day never produce an early upstream retry; malformed/missing headers still use a safe fallback.

### N03 — Known client-credential errors can be reported as generic outages

**Location:** `apps/web/src/lib/streamer-providers.ts:67`, `:115`.

Credential-specific classification currently relies on HTTP 401/403. A synthetic token endpoint response `400 {"error":"invalid_client"}` produced `503 platform_unavailable`, so the UI offered a generic retry instead of the existing credential-repair guidance. Kick documents token endpoint 400 errors, but this audit did not observe a real invalid-credentials response and does not assert that Kick always uses this exact body/status. No raw error description or credential was exposed.

**Correction:** Interpret recognized OAuth token error codes such as `invalid_client` in the token adapter and map them to safe configuration/authentication guidance. Keep unknown errors generic and never return raw descriptions.

**Acceptance:** Synthetic invalid-client cases, persistent 401/403, unavailable upstream, malformed token response and rate-limit cases retain distinct safe classifications without additional uncontrolled retries.

### N04 — Complete registration integration and recovery coverage is missing

**Locations:** `tests/streamer-service.test.ts`, `tests/streamer-ui.test.tsx`, `tests/streamer-persistence.test.ts`.

The current boundaries are tested separately: HTTP/service tests mock the guild authorizer and repository; PostgreSQL tests call the real repository directly; hydrated UI tests mock fetch. Existing auth/guild tests are valuable, but no single registration test composes a real session/guild service, real registration repository and route handler through resolution, confirmation and CRUD. UI duplicate/not-found/session fixtures are largely exercised through lookup failure; they do not cover every mutation failure or refresh recovery. Cross-process PostgreSQL locks and real browser navigation remain outside this evidence.

**Correction:** Add one integration flow using the real auth/guild service and embedded database with mocked official provider HTTP; verify manager revocation between resolve and confirm and cross-guild mutation denial. Add N01–N03 regressions, then record real two-guild/browser/provider acceptance once configured. Add external PostgreSQL contention/restart evidence before depending on it for Phase 5 processing.

**Acceptance:** Authorized resolution-to-persistence and subsequent enable/disable/remove work through the composed stack; expired/revoked users and foreign subscription IDs produce no unauthorized database/provider action. Keep mock/embedded results distinct from live acceptance.

## Unresolved issues and operational gates

1. **Live acceptance unavailable.** Actual auth validation and PostgreSQL connectivity failed as recorded above. Real Discord consent/logout, Google/Kick lookups, two-guild CRUD, external migration/durable restart and browser permission-revocation scenarios were not executed. Configure services/credentials and record actual results before claiming end-to-end readiness.
2. **Retention requires operator maintenance.** The documented 29-day expiry cascades through registrations; reads hide expired identities and list/add/CLI paths prune them. There is no scheduler or deletion while every process is off. Before real-data use, establish and verify daily cleanup, deletion and backup/restore handling. Do not treat the notice/CLI as automatic compliance. Future monitoring must explicitly reconcile metadata refresh/expiry with persistent subscriptions. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).
3. **Known moderate dependency chain remains.** Four package findings arise from Drizzle Kit → esbuild-kit → esbuild, including the production graph through the optional peer dependency. No affected development tooling server is configured. Retain that exposure restriction and choose a compatible remediation; an unreviewed breaking downgrade is not an audit fix. [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
4. **Local-process limitations remain.** Provider tokens/lookup cooldowns are in-memory and reset on restart; this is not a distributed quota ledger. Node 24, clean-install CI, real browser/mobile visual QA and full accessibility certification were not established by this audit. Earlier audit follow-ups remain unless specifically corrected in Phase 4; notably, new registration interaction tests do not close every dashboard accessibility/recovery finding.
5. **Phase 5 feasibility remains open.** Public identity lookup does not prove YouTube stream discovery/coverage or Kick event authorization/delivery behavior. Resolve the relevant feasibility and notification-semantic gates through a separately authorized phase. No detection, event subscription, queue or delivery work was implemented during this audit.

## Final recommendation

**PASS for Phase 4's scoped local implementation and available automated acceptance.** The core registration flow, official API choices, stable/shared identity design, guild isolation, CRUD, duplicate prevention and secret boundaries are supported by source review and passing evidence. N01–N04 are minor corrections/coverage improvements, not demonstrated authorization bypasses or data-corruption defects.

Track and correct those findings, complete the blocked live acceptance, and establish the maintenance/provider feasibility gates before claiming live or Phase 5 operational readiness. This audit does not automatically begin or approve Phase 5.
