# Phase 3 — server selection and dashboard

Implemented under the user's explicit Phase 3 instruction on 2026-10-16 (Asia/Colombo). The stack remains Next.js/React/TypeScript, Better Auth and PostgreSQL/Drizzle. No new dependencies, application tables, settings mutations or provider integrations were introduced.

## Dashboard contract

`/dashboard` shows only manageable Discord servers, with names, CDN icons (initials on absence/failure), bot installation badges and selection links. Results are sorted and paginated at six cards per page. A single fresh guild list authorizes the current selection request; at most three installation lookups run concurrently, only for displayed manageable guilds. Invalid/out-of-range page values safely select a valid page. Status failures remain unavailable rather than claiming installation.

The selected workspace exposes these independently protected pages:

| Route                                    | Current behavior                                                  |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `/dashboard/:guildId`                    | Overview, current verified bot status and configuration readiness |
| `/dashboard/:guildId/streaming-channels` | Explicit unconfigured/future-registration state                   |
| `/dashboard/:guildId/notifications`      | Explicit inactive/future-preferences state; no delivery controls  |
| `/dashboard/:guildId/settings`           | Read-only server identity, manager authorization and bot status   |

The shared protected layout provides sidebar navigation, account/logout controls, a skip link and responsive desktop/mobile structure. The layout is not the authorization boundary for its descendants: **every leaf page** invokes the server-side guild service independently. React cache is used only to deduplicate within a request/render; there is no cross-request permission cache. Internal navigation uses ordinary anchors to request fresh protected output rather than prefetch and retain server-specific pages.

Every server request checks the database session, personal allowlist, and fresh Discord owner/Administrator/Manage Guild permissions. Server IDs, URL paths and client navigation state never grant access. Missing sessions redirect to login; denied account/guild access redirects to the safe access-denied page. API routes preserve 401/403 semantics. Generic error boundaries offer retry without displaying raw provider/configuration exceptions. Loading content contains no private server data.

Configuration status is intentionally truthful: installation can be verified, but streaming channels are not configured and notifications are not enabled. There is no synthetic count of active streams or deliveries, no stored settings record and no implicit configuration write. Unknown installation state offers refresh; a known absent bot offers the existing protected installation POST.

## Phase 2 audit prerequisites addressed

The historical `PHASE_02_AUDIT.md` is preserved. These are subsequent implementation corrections, not a rewrite of its original FAIL finding:

- **M01:** A supported Better Auth `refreshAccessToken` hook preserves safe provider failure metadata across the library's generic token error wrapper. Request-local AsyncLocalStorage carries only the sanitized error. Confirmed `invalid_grant` requires reauthentication; provider/network/DB failures are retryable service errors. Token-endpoint 429 retains Retry-After and enforces a cooldown keyed by a hash of app/refresh identity. No raw credentials are logged or sent to the browser. Refresh calls have an eight-second deadline and refuse redirects.
- **M02:** Both query and coordination pools handle idle error events using constant redacted diagnostics. Query deadlines are configured. The checked-out coordination client also handles connection-loss events, discards broken connections and fails the request closed.
- **M03:** Production token retrieval uses a PostgreSQL session advisory lock keyed by local account ID, then calls Better Auth to re-read/refresh/persist credentials inside that protected operation. A separate two-connection coordination pool avoids starving the five-connection auth query pool. Lock acquisition has bounded waiting; release runs on success/failure and broken connections are discarded. All protected token reads use this path, including API requests and dashboard pages.

The cooldown is shared across Next server bundles **in one process**, not distributed across machines. PostgreSQL lock behavior across real processes and backend restarts still needs an external integration run. Tests emulate advisory-lock acquisition while exercising the actual coordination algorithm and actual Better Auth refresh flow, including a single-use rotating-token provider fixture. This is not proof of live Discord rotation behavior or exactly-once token exchange across a broken database connection. Separate-host/public deployment remains out of scope.

These mechanisms use [Better Auth's documented provider refresh extension](https://better-auth.com/docs/concepts/oauth), [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS), and the [node-postgres pool error contract](https://node-postgres.com/apis/pool#error). Initial OAuth code exchange/profile lookup still use library defaults; adding explicit deadlines to those paths remains a Phase 2 minor follow-up.

## Verification and limits

See `PROGRESS.md` for actual commands and final counts. Automated coverage includes every server leaf route, session loss, allowlist removal, permission revocation, unauthorized guild IDs, bounded selection/status lookups, scoped navigation, safe icon URLs and rendered empty/configuration states. Existing real-engine login/logout/state tests and embedded PostgreSQL migration/adapter coverage remain in the suite.

Visual inspection used isolated static fixtures rendered from the real selection/workspace components and stylesheet, with a synthetic sidebar wrapper, at desktop and 390-pixel iframe width. No fixture route, fake session or auth bypass was added to the application. This is responsive visual evidence, not authenticated browser E2E or a full accessibility certification.

Real browser consent, installation/removal in two Discord guilds, external PostgreSQL migration/restart/lock contention, and Node 24 verification remain unavailable until the required local services and credentials are configured. Known moderate Drizzle tooling advisories remain disclosed; no dependency was changed in this phase.

Historical Phase 3 scope excluded registration, notification settings and sending. Current Phases 4–5 now implement registration, preferences and explicit test sends; see their dedicated contracts. Livestream detection and automatic delivery remain excluded, and Phase 6 is not started.

Subsequent Phase 4 update: the user has now authorized and implemented streamer registration. The Streaming Channels placeholder is replaced by the protected lookup/confirmation/CRUD UI and the overview points to the channel registry. See [the Phase 4 contract](PHASE_04_STREAMER_REGISTRATION.md). Detection, notification preferences and delivery remain excluded. Earlier Phase 3 verification statements describe that phase's original scope.
