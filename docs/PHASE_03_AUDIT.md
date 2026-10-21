# Phase 03 — dashboard implementation audit

Audit date: **2026-10-16 (Asia/Colombo)**.

**Recommendation: PASS for the scoped local Phase 3 implementation, with minor corrections and explicit verification limits.** No critical or major defect was demonstrated. This is not acceptance of a live Discord deployment, a complete accessibility certification, or authorization to start Phase 4.

Findings: **0 critical, 0 major, 4 minor**. Two minor UI findings were reproduced; the other two record coverage and existing operational follow-ups.

## Scope and method

Reviewed the approved requirements and current implementation contracts, architecture, schema proposal, security controls, decision records, canonical development roadmap, progress records and Phase 2 audit. Earlier roadmap/schema/provider proposals were distinguished from the user's authorized Phase 3 scope. Reviewed current dashboard pages/components/styles, authentication/session/authorization services, API handlers, bot status service, database coordination/recovery code, test files and tooling configuration.

The phase supplies server selection and a protected read-only dashboard. Streaming Channels, Notifications and Settings navigation is required; streamer registration, notification preferences, settings mutations, detection and delivery are deliberately excluded. Their absence is not a missing Phase 3 requirement. No domain settings records exist to leak or modify; this audit verifies access to the settings page and current server identity/status.

Verification combined the permanent automated suite, production build/HTTP probes, source inspection and browser inspection of isolated fixtures. Fixtures rendered the real `DashboardNav`, `ServerSelection`, `ServerWorkspace`, loading and dashboard-error components with the real stylesheet. A synthetic wrapper/account and pathname context supplied their layout inputs. The fixture server did not mount application authentication routes or bypass production authorization.

Only this report is authored. No application fix, dependency change, migration or Phase 4 feature was implemented. Builds regenerate ignored artifacts. Temporary fixture files, browser tab and audit servers were cleaned up; the pre-existing service occupying port 3000 was left untouched.

## Actual verification results

Runtime: **Node.js 25.3.0/npm 11.15.0 on Windows**. Node 24 LTS was not separately tested. Builds/tests and loopback HTTP checks ran outside Windows sandbox restrictions where necessary.

| Check                                    | Actual result                                                                    | Evidence and limits                                                                                                                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`                          | **PASS, exit 0**                                                                 | Shared/app/tooling TypeScript, ESLint with zero warnings, Prettier, Vitest                                                                                                                                                                             |
| Vitest                                   | **PASS: 8 files, 49 tests**                                                      | Real auth engine with mocked Discord, dashboard route/service/render tests, embedded PostgreSQL auth adapter test, database recovery boundaries                                                                                                        |
| `npm run build`                          | **PASS, exit 0**                                                                 | Shared packages, Next.js 16.4.2 production build, bot and worker; no build warnings                                                                                                                                                                    |
| Production HTTP startup                  | **PASS on port 3010**                                                            | Initial port-3000 attempt failed with EADDRINUSE; using another port required no application change                                                                                                                                                    |
| Public HTTP pages                        | **PASS**                                                                         | Home, login, login error state, access-denied page and liveness route returned 200                                                                                                                                                                     |
| Protected HTTP pages                     | **PASS**                                                                         | Server picker, page-two selection, overview, Streaming Channels, Notifications and Settings returned 307 to login without a session                                                                                                                    |
| Protected API/private auth surface       | **PASS**                                                                         | Identity/guild/status APIs returned 401; private token endpoint returned 404                                                                                                                                                                           |
| CSRF/session tampering                   | **PASS**                                                                         | Cross-origin login/logout/install POSTs returned 403; forged session signature returned 401                                                                                                                                                            |
| Intentional DB outage                    | **Fail-closed behavior observed**                                                | Synthetic signed cookie and deliberately unavailable audit DB produced API 503 and dashboard HTTP 500. Outage HTML contained neither workspace content nor the synthetic auth secret/DB URL. This did not prove hydrated error-boundary retry recovery |
| Browser fixture navigation               | **PASS for rendered links**                                                      | Desktop server selection and all four navigation destinations; mobile Settings navigation and return to server selection. Real nav/component HTML, no authenticated application/browser E2E                                                            |
| Responsive visual inspection             | **PASS at normal desktop and 390-pixel iframe width; minor short-height defect** | Mobile nav remains visible, cards/sections adapt. At 1000×450, logout falls below the visible sticky sidebar; N02                                                                                                                                      |
| Loading/error/empty fixture presentation | **PASS for rendering**                                                           | Visible loading message/skeleton, generic error with retry/return links, zero-server explanation and refresh link. Static fixture retry callback was intentionally inert                                                                               |
| `npm run env:check:auth`                 | **FAIL, exit 1: local configuration not ready**                                  | Missing/invalid auth secret, Discord client ID/secret, allowed-user entry and internal secret; only field names reported                                                                                                                               |
| `npm run db:check`                       | **FAIL, exit 1**                                                                 | Redacted failure connecting to configured external PostgreSQL; no migration attempted                                                                                                                                                                  |
| `npm audit --omit=dev --json`            | **FAIL, exit 1**                                                                 | Four known moderate package findings, zero high/critical; N04                                                                                                                                                                                          |

The production audit instance used synthetic credentials, an HTTPS origin string and loopback HTTP transport, with its database explicitly pointed at an unavailable test endpoint. It proves route/error behavior, not actual TLS termination, real identity retrieval or successful external DB sessions. The actual local configuration was checked separately and remained invalid/unavailable as shown above.

## Assessment against the requested checks

### 1. Discord login and protected routes

The real Better Auth engine tests pass successful login/logout, denied/failed OAuth, state binding/tampering/replay/expiry, session expiry and encrypted provider-token storage. Protected routes check database-backed sessions and the personal allowlist. A forged cookie was also rejected by the production HTTP API.

Each dashboard leaf calls `dashboardGuild` or `dashboardSelection`; protection is not delegated solely to the shared layout. This matters because layouts can persist during navigation. Request-local React cache does not create a cross-request permission grant; [React documents cache invalidation per server request](https://react.dev/reference/react/cache). Real Developer Portal consent and a live browser login remain unverified.

### 2. Authorized server retrieval and selection

The backend fetches Discord guilds using the server-side user token and filters ownership, Administrator or Manage Guild with BigInt arithmetic. It returns only safe server information. Selection sorts and paginates six manageable servers per page, with at most three concurrent status lookups for the visible page.

Tests verify filtering, pagination, route selection and account/session denial. Browser fixture selection reaches the selected server's overview. The official [Discord user resource](https://docs.discord.com/developers/resources/user#get-current-user-guilds) supports the identity/guild scopes and ownership/permission fields used here.

### 3. Bot installation status

Installed/not-installed/unavailable labels match the three backend states. A known absent bot offers the existing authorized installation POST. Unknown status offers refresh and does not falsely assert installation or absence. API failures remain unknown.

Tests cover membership success, Unknown Guild/Missing Access, generic upstream failure, broker authentication and unavailable broker behavior. The web process does not possess the bot token; the loopback broker performs the Discord REST lookup. These tests do not prove a real bot token, Portal application pairing, installation or removal.

### 4. Cross-server settings access

All four server pages independently reauthorize the supplied guild ID. The Settings test rejects an unauthorized direct ID; every leaf is also tested after manager permission removal and session loss. Status lookup is not performed after failed guild authorization. No browser-supplied permission value or installation query flag grants access.

The settings section is read-only in this phase. Future resource-level settings/channel/route isolation must receive its own tests when those records and writes exist.

### 5. Desktop/mobile navigation

The actual navigation component produced server-scoped Overview, Streaming Channels, Notifications and Settings links, with the expected current section. Clicking desktop links in the fixture reached each destination. In a 390-pixel iframe, Settings and return-to-selection navigation worked and the mobile structure remained usable.

Normal anchors issue fresh page requests. They avoid using a retained client-side selection as authorization. Short-height desktop reachability needs N02; fixture navigation is not a substitute for testing the fully hydrated authenticated application.

### 6. Loading, error, empty and unauthorized states

Loading markup contains no private server information. Empty selection explains required Discord permissions and provides refresh. Generic error presentation offers retry and safe navigation without raw provider exceptions. Access-denied content is generic; backend 401/403 behavior and leaf redirects are tested.

The fixture showed these components, but did not exercise a real Suspense transition or click-to-recover error boundary. The production DB-outage probe demonstrated safe HTTP failure, not successful recovery after restoring the database. N03 describes the missing interaction evidence. The [Next.js error-boundary contract](https://nextjs.org/docs/app/api-reference/file-conventions/error) is consistent with the current client error components; it does not replace runtime recovery testing.

### 7. Tests, lint, types, builds and architecture

All required available code checks pass. The original Phase 2 error-classification and idle-error defects have targeted passing regressions. Protected token reads now use per-account PostgreSQL advisory coordination; the test executes the coordination algorithm against emulated lock responses and real Better Auth refresh behavior. It does not execute native advisory-lock SQL across PostgreSQL processes.

The implementation retains web authentication ownership, bot-token confinement, an idle worker and four native auth tables. No Phase 4 functionality or new dependency was found. Historical audit FAIL statements are preserved; this Phase 3 recommendation does not retroactively certify every live Phase 2 acceptance item.

## Critical issues

**None demonstrated in the reviewed scope.** No authentication bypass, unauthorized server disclosure, credential leak or destructive side effect was observed. This is not a penetration-test or absence-of-vulnerabilities guarantee.

## Major issues

**None demonstrated for the scoped local Phase 3 implementation.** Missing live credentials/database evidence is recorded as a verification limit rather than invented runtime failure of Discord integration.

## Minor issues and recommended corrections

### N01 — Server-card accessible names omit installation status

**Severity: Minor. Location:** `apps/web/src/components/server-selection.tsx:28`.

The entire card is a link with `aria-label="Open SERVER"`. During browser accessibility inspection, the three links exposed only their Open/name labels; the visible installed/not-installed/unavailable badges were absent from those accessible link entries. Keyboard/screen-reader users cannot obtain the status from the card's focused name.

**Correction:** Include the installation label in the accessible name, associate the badge through `aria-describedby`, or let appropriate visible content supply the name. Preserve a clear server-selection action.

**Acceptance:** Accessibility inspection distinguishes all three statuses while identifying which server opens; add a rendered accessibility-name/description regression.

### N02 — Sticky sidebar can hide logout in short desktop viewports

**Severity: Minor. Location:** `apps/web/src/app/globals.css:115–123`, sidebar account styles.

The desktop sidebar has `height: 100dvh` and sticky positioning without its own overflow scrolling. In a 1000×450 fixture viewport, the account/logout area extended below the viewport. Wheel-scrolling the page to its bottom left the sticky navigation in place and logout outside the visible frame. The account wrapper used the same classes as the application; this is a reproduced layout issue, not a live session failure. Keyboard focus recovery was not established.

**Correction:** Make the constrained sidebar scrollable, reduce its contents at short heights, or use a non-sticky fallback. Keep navigation and logout reachable without depending on browser focus auto-scrolling.

**Acceptance:** At desktop-width short heights and browser zoom, every navigation/account action can be reached with pointer and keyboard; existing normal-desktop/mobile layouts remain usable.

### N03 — Coverage does not establish hydrated UI recovery or full browser login

**Severity: Minor coverage improvement; live acceptance remains explicitly pending. Locations:** `tests/dashboard.test.tsx`, auth tests and browser-validation workflow.

The suite verifies services and server-rendered page functions with mocked runtime/headers/navigation. It does not exercise the real dashboard layout through a complete authenticated browser flow, icon-load failure after hydration, actual loading transitions, error reset/recovery, or browser cookie attributes under TLS. The pagination concurrency assertion uses page two with only two results, so it does not stress the three-worker limit on a full six-card page.

**Correction:** Add targeted interaction coverage and a full-page concurrency case. When configured, record real login → select → navigate → logout, permission removal during a session, and recovery after restoring a failed dependency. Do not label fixture-only interaction as authenticated E2E.

**Acceptance:** Tests or a reproducible manual record establish these specific behaviors. No coverage percentage or unsupported accessibility certification should be inferred from the existing passing count.

### N04 — Existing dependency and operational follow-ups remain open

**Severity: Minor within the current local exposure.** npm reports four moderate packages in one Drizzle Kit → esbuild-kit → esbuild advisory chain, including in the production dependency graph through Better Auth's optional peer. No affected tooling server is configured. See [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

Retain the exposure restriction and select a compatible remediation rather than an unreviewed breaking downgrade. Auth cooldowns remain process-local, initial OAuth exchange/profile requests lack NAVI-specific deadlines, complete configuration-consistency diagnostics remain limited, and Node 24/clean deployment validation is outstanding. These were already disclosed; no new public/multi-host readiness is implied.

## Unverified acceptance evidence

- Real Discord consent, denial/logout, two-guild installation/removal and manager revocation in a browser: configuration is not ready, so these were not executed.
- External PostgreSQL migration, persistence, backend restart and cross-process advisory-lock behavior: configured connection check failed. Embedded PostgreSQL and emulated locks do not establish this evidence.
- HTTPS termination/cookie behavior and complete hydrated error recovery: loopback HTTP/static fixtures do not prove them.
- Full accessibility, browser/device matrix, Node 24 and clean-install CI: not executed by this audit.

## Final recommendation

**PASS for Phase 3's scoped local dashboard implementation and available code checks, with N01–N04 tracked for correction.** Core authorization, selection, status rendering and server-scoped navigation are supported by the reviewed code and passing evidence. The two reproduced UI issues are minor and do not demonstrate an authorization or session compromise.

Live Discord/external PostgreSQL acceptance remains pending, not passed. Correct the UI findings, extend the specific missing interaction checks, and complete the live validation before claiming end-to-end readiness. This audit neither implements nor automatically authorizes Phase 4.
