# Phase 02 implementation audit

Audit date: **2026-10-16 (Asia/Colombo)**.

**Recommendation: FAIL for an unqualified Phase 2 completion gate.** The existing suite and production builds pass, and no cross-guild authorization bypass or browser credential disclosure was demonstrated. Three major recovery/concurrency findings remain. Passing the current tests does not establish the missing behaviors.

Findings: **0 critical, 3 major, 4 minor improvements**, plus explicitly unverified acceptance evidence. These severities describe implementation impact; npm advisory severity is reported separately.

## Scope and method

Reviewed all existing Markdown documents in `docs/`: planning index, requirements, API research, architecture, schema, security/risks, original roadmap, decisions, planning audit, Phase 1 audit, canonical development roadmap, Phase 2 authentication contract and progress. Also reviewed the root README, application/shared-package source, framework/tooling configuration, environment templates and ignore rules, authentication SQL/migration metadata, dependency graph and all five test files.

The user's Phase 2 instructions and Better Auth selection control this review. `DEVELOPMENT_ROADMAP.md` supersedes the original roadmap's phase numbering. Historical provider-feasibility findings remain future integration gates. No YouTube/Kick, notification settings, detection, queues or delivery features are required to pass this authentication audit.

Current official Discord, Better Auth and node-postgres documentation was checked; relevant sources appear with the findings. Installed Better Auth 1.7.10 source was inspected where library behavior affected a conclusion.

Only this audit report is authored. Application code, dependencies, migrations, existing planning documents and private environment files were not intentionally changed. Checks regenerated ignored build/type artifacts. Audit probes ran from standard input with synthetic credentials and mocked provider responses; they were not added to the permanent suite. The temporary production HTTP server was stopped. No real Discord authorization, installation, message or database mutation was attempted.

## Actual test results

Runtime: **Node.js 25.3.0, npm 11.15.0, Windows**. Node 24 LTS is recommended by the project but was not independently exercised. Execution outside Windows sandbox restrictions was used for builds/tests and local HTTP checks. The read-only DB check also failed on an unrestricted retry, so its result is not attributed solely to sandbox networking.

| Check executed                                       | Actual result                                       | Limits                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                      | **PASS, exit 0**                                    | Shared/app/tooling TypeScript, ESLint with zero warnings, Prettier and Vitest                                                             |
| Vitest within `check`                                | **PASS: 5 files, 27 tests**                         | Real auth engine; mocked Discord; one embedded PostgreSQL integration test. No browser E2E or coverage percentage measured                |
| `npm run build`                                      | **PASS, exit 0**                                    | Shared packages, Next.js 16.4.2 production build, bot and worker; no build warnings                                                       |
| Bot and worker source smoke commands                 | **PASS**                                            | Both initialized and terminated without external connections; no Gateway or live status lookup tested                                     |
| `npm run env:check:example`                          | **PASS, exit 0**                                    | Scaffold/template fields only; not auth readiness                                                                                         |
| `npm run env:check:auth`                             | **FAIL, exit 1; expected unconfigured environment** | Missing auth secret, client ID/secret, allowed-user IDs and internal service secret; only field names reported                            |
| `npm run db:check`                                   | **FAIL, exit 1**, including unrestricted retry      | Redacted PostgreSQL connection failure; no working external database verified                                                             |
| `npm audit --json`                                   | **FAIL, exit 1**                                    | Four moderate package findings; zero high/critical                                                                                        |
| `npm audit --omit=dev --json`                        | **FAIL, exit 1**                                    | Same four moderate findings; see N02                                                                                                      |
| Production server and 13 HTTP probes                 | **PASS**                                            | Synthetic HTTPS origin configuration over loopback HTTP; no actual TLS termination or authenticated browser flow                          |
| Refresh outage/rate-limit probes                     | **Defect reproduced**                               | Real Better Auth + memory adapter + mocked token endpoint: both 503 and 429 became 401, with no retry delay; local session remained valid |
| Concurrent refresh probe                             | **Gap reproduced**                                  | Two simultaneous expired-token requests made two refresh exchanges using the same refresh credential; permissive mock accepted both       |
| Idle pool error probe                                | **Defect reproduced at event boundary**             | Zero `error` listeners; synthetic pool error escaped emission. Actual backend-loss integration test unavailable                           |
| Real Discord / Developer Portal / external migration | **NOT EXECUTED**                                    | Required credentials/account configuration absent; Docker, `psql` and `redis-cli` unavailable                                             |

Production HTTP results:

- `GET /`, `/login`, `/api/health`: **200**.
- `GET /api/me`, `/api/guilds`, `/api/guilds/REDACTED_DISCORD_ID`: **401** without a session.
- `GET /dashboard` and `/dashboard/REDACTED_DISCORD_ID`: **307** to `/login?error=session`.
- `GET /api/auth/get-access-token`: **404**.
- Cross-origin POSTs to login, logout and guild installation: **403**.
- Same-origin installation POST without a session: **401**.
- All API responses in these probes used `Cache-Control: no-store`.

## Verified strengths and architecture consistency

| Requested area              | Assessment                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login/logout                | Real Better Auth engine tests cover successful authorization-code login and persisted session, denied consent, failed exchange and session deletion on logout                                                                                                 |
| Sessions                    | Database-backed sessions, 24-hour absolute expiry, refresh disabled, cookie data cache disabled, signed HttpOnly/SameSite=Lax cookie; Secure selected for HTTPS. Expired-session rejection is tested                                                          |
| Guild retrieval/permissions | Fixed official API URL, page limit and timeout; owner or Administrator/Manage Guild via BigInt. Server returns a safe guild subset and reauthorizes selected IDs                                                                                              |
| Installation/status         | Separate authorized POST generates official guild-install URL, permission mask 19456, no Administrator, selected-guild UI lock. Bot-only token checks membership over REST; failures preserve unknown status                                                  |
| Unauthorized access         | Session and personal allowlist checks precede guild access; current guild permissions are fetched again. Tests cover direct unauthorized IDs and permission removal; status lookup is not called for unauthorized guilds                                      |
| OAuth state/redirects       | Database state and signed browser binding remain enabled; missing/tampered/replayed/expired state tests pass. Provider, scopes and return destinations are server-owned; explicit base URL avoids forwarded-host origin inference                             |
| Credential boundary         | Provider tokens are encrypted in stored accounts and retrieved only server-side. Public account/token endpoints are blocked; safe identity endpoint omits credentials. Selective environment loading avoids injecting other services' keys into `process.env` |
| Components/database         | Web owns user authentication; bot owns bot-token REST lookup behind a loopback bearer API; worker remains idle. Four native auth tables, constraints and migration match implemented scope; embedded PostgreSQL exercises the Drizzle adapter                 |

The native opaque session-token column differs from the original proposed custom hash schema, but this is explicitly disclosed in the Phase 2 contract and matches [Better Auth's session model](https://better-auth.com/docs/concepts/session-management). It is not an undisclosed schema defect. The synthetic Discord-ID email is an internal identity key; public profile/account mutation and linking endpoints are not exposed.

Official checks confirm that identity/guild access uses `identify guilds`, that the user guild response supplies ownership/permissions, and that simple bot installation is separate from the authorization-code login flow. See [Discord user resource](https://docs.discord.com/developers/resources/user), [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2), and [Better Auth Discord setup](https://better-auth.com/docs/authentication/discord). Ordinary users generally fit the documented 200-guild response; the implementation's bounded pagination is acceptable.

## Critical issues

**None demonstrated.** This is a scoped code/test audit, not proof of the absence of vulnerabilities. No live credentials were used and no real browser/provider deployment was verified.

## Major issues

### M01 — Transient token/account failures are misclassified as invalid authorization

**Severity: Major. Locations:** `apps/web/src/lib/guild-service.ts:44–58`, `apps/web/src/lib/page-session.ts:5–6`; installed Better Auth `dist/api/routes/account.mjs`, `getValidAccessToken`.

The broad catch around account lookup and access-token retrieval turns every exception into `401 discord_reauthentication_required`. An account database outage follows the same path. The installed library additionally converts token-refresh exceptions into `FAILED_TO_GET_ACCESS_TOKEN`, so simply preserving an outer HTTP status will not fully solve the problem.

**Reproduction:** An audit-only fixture completed mocked OAuth using the real auth engine, expired the stored access token, and returned either 503 or 429 with `Retry-After: 30` from Discord's token endpoint. Both calls returned application status 401, no retry delay, and a still-valid local session. A simulated account lookup outage also became 401. Dashboard pages consequently redirect to sign-in instead of offering service recovery. A subsequent request can immediately attempt refresh again after the provider 429.

The existing user-guild REST cooldown does not cover the token endpoint. This fails the requested API failure/rate-limit handling contract without granting unauthorized access. [Discord rate-limit guidance](https://docs.discord.com/developers/topics/rate-limits) requires respecting provider retry timing.

**Recommended correction:** Distinguish confirmed missing/revoked authorization from database faults, provider transport/5xx errors and token-endpoint 429. Preserve safe retry metadata before the library erases it, using a supported integration boundary. Keep valid local sessions during transient outages; return a retryable application error and enforce the provider cooldown. Reauthentication should be reserved for actual credential failure.

**Closure evidence:** Real-engine tests for expired-token refresh success, revoked credentials, token endpoint 429/503/network failure and account DB failure. Assert status/retry delay, no immediate retry during cooldown, session preservation and correct dashboard recovery behavior.

### M02 — Idle PostgreSQL errors have no pool listener

**Severity: Major. Locations:** `packages/database/src/index.ts:10–16`, `apps/web/src/lib/runtime.ts:12–14`.

The long-lived authentication pool has no `error` listener. An idle socket can fail between requests after a PostgreSQL restart or network interruption. Route-level catches cannot handle an asynchronously emitted pool error.

**Reproduction:** A lazy pool had zero error listeners. Emitting a synthetic pool error synchronously escaped the emitter; the probe caught it externally to avoid terminating the audit. This demonstrates the missing handler, not an actual database restart. [node-postgres documents](https://node-postgres.com/apis/pool#error) that idle-client failures propagate through this event and an unhandled event can crash the Node process.

**Recommended correction:** Install a pool error handler that records a sanitized operational error and allows dependency recovery without rethrowing from the event handler. Keep request errors fail-closed and distinguish liveness from dependency readiness. Avoid logging raw connection/error objects containing credentials.

**Closure evidence:** A bounded child-process regression demonstrates an idle pool error does not terminate the application or leak a sentinel secret. When external PostgreSQL is available, interrupt an established idle connection, then verify the web process survives and later DB requests recover.

### M03 — Planned refresh coordination is absent

**Severity: Major. Locations:** `docs/05-security-and-risks.md`, OAuth refresh control; `apps/web/src/lib/guild-service.ts:44–58`; `apps/web/src/lib/auth-factory.ts`; installed Better Auth `getValidAccessToken`.

The security plan calls for refresh locking/version checks. NAVI delegates each request independently to `getAccessToken`; the inspected library path reads the account, refreshes and updates it without an encompassing per-account lock or credential version check. The current schema/config adds no coordination.

**Reproduction:** After mocked login, two simultaneous server-list requests with an expired access token produced **two token exchanges using the same refresh credential**. Both succeeded against a permissive mock. No claim is made that Discord rejected either request: real refresh-token reuse/rotation behavior was not tested. The demonstrated gap is duplicate concurrent refresh and the missing documented control; a rotating provider can cause failed requests or competing credential updates.

**Recommended correction:** Coordinate refresh by account across all execution contexts in the supported web topology, re-read credentials after acquiring coordination, and persist rotated credentials consistently. Define bounded waiting and failure recovery; do not mistake a request-local promise for cross-context protection. Align the security contract with the chosen mechanism.

**Closure evidence:** Simultaneous expired-token requests cause one necessary refresh and reuse its result. Test a single-use rotating-token mock, failure/cooldown release, and recovery without overwriting newer credentials. Verify actual Discord behavior separately when configured.

## Minor improvements

### N01 — Broaden targeted security and integration coverage

**Severity: Minor beyond the mandatory M01–M03 regressions.** The 27 tests are meaningful, but there are no browser tests or assertions for production Secure/host-only cookie behavior, forged session cookies, session fixation/rotation, current-session allowlist removal, auth request-limit exhaustion, successful multi-page guild fetching, or timeout cancellation. The existing state-binding test checks a missing cookie, despite a title also referring to a wrong cookie. Embedded PostgreSQL executes the SQL directly; it does not exercise Drizzle Kit's migration journal, deployment connection settings or restart persistence.

Add focused tests for these contracts and avoid treating mocked provider success as browser/Portal evidence. ESLint still lacks React Hooks/Next/accessibility rules; its passing result establishes only the configured rules. This is not a demonstrated hook or accessibility defect.

### N02 — Keep the moderate dependency chain visible

**Severity: Minor project exposure; npm severity Moderate.** Both audit modes report `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils` and nested esbuild as four affected packages in one chain. Better Auth's optional Drizzle Kit peer brings it into npm's production graph. The advisory concerns esbuild's development serving API; no such server is configured. See [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

Track a compatible remediation and revisit before exposing tooling servers. Do not claim a clean production audit or apply the suggested breaking downgrade without compatibility review.

### N03 — Bound the library-managed OAuth network path explicitly

**Severity: Minor.** Guild reads and the internal broker have application deadlines, but NAVI config supplies no equivalent deadline for library-managed code exchange, identity fetch or token refresh. The inspected provider/helper calls do not supply a timeout signal. This is an absence of a NAVI deadline, not a claim that platform transport can never time out.

Choose supported timeout/cancellation handling for OAuth operations and test stalled-provider recovery. Retain fixed official destinations and secret-safe errors. [Better Auth provider options](https://better-auth.com/docs/concepts/oauth) describe supported provider extension boundaries; avoid a global fetch override in production.

### N04 — Validate the complete operational configuration consistently

**Severity: Minor.** Auth checking validates web configuration, but bot secrets remain optional in `readBotEnvironment`; a configured bot token with a missing internal secret fails later at server startup. The checker does not detect mismatched web/bot shared secrets or ports. The web database can be overridden by `.env.web`, while migration tooling loads database/root configuration, allowing operators to check/migrate a different target accidentally.

Add safe consistency diagnostics or precise setup checks for these relationships, reporting field names rather than values. No misconfigured real credential pair was inspected or demonstrated during this audit.

## Missing acceptance evidence and unverified assumptions

| Gap                                    | Required evidence / disposition                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real OAuth and browser cookies         | Configure the exact Portal redirect; exercise consent, denial, expiry and logout in a browser. Verify HTTPS cookies when deploying HTTPS; HTTP smoke probes do not prove TLS behavior |
| Real installation and isolation        | Use two controlled guilds, install/remove the actual bot, verify status, attempt a wrong guild and downgrade the manager while a session is active                                    |
| Actual refresh/revocation behavior     | Exercise expired access credentials, rotated refresh tokens and revoked authorization using the configured app; current probes intentionally use mocks                                |
| External PostgreSQL migration/recovery | Supply a working service, run the reviewed migration through the normal runner, restart the app and test database interruption/recovery. Current connectivity check fails             |
| Runtime/clean setup                    | Verify Node 24 and a genuinely clean install/CI environment; this audit used the existing Node 25 workspace                                                                           |
| Multi-process/public deployment        | Process-local limits, loopback broker and same-user filesystem boundaries are expressly local-development choices; no distributed security/readiness claim is warranted               |

These are evidence gaps, not invented proof of failed live Discord behavior. The canonical roadmap reports live validation separately; any deferral should remain explicit. No new requirement for hosting, notification delivery or provider integrations is introduced.

## Corrections and final gate

1. Correct M01's refresh/account error classification and token-endpoint cooldown behavior.
2. Handle idle pool failures under M02 and preserve sanitized diagnostics.
3. Implement and verify the planned account refresh coordination under M03.
4. Add the regression evidence for each correction; rerun type checks, lint, builds and tests.
5. Complete live acceptance checks when configured, or retain an explicit bounded deferral without marking them passed. Address N01–N04 according to their stated scope and exposure.

**Final recommendation: FAIL — correct M01–M03 before treating Phase 2 as fully accepted or building further features on its authentication recovery path.** The core architecture and authorization boundaries are appropriate, and the existing automated checks pass. The failure is based on reproduced recovery/concurrency gaps, not merely missing credentials or a demand for production infrastructure. No corrections were implemented and Phase 3 was not started.
