# Phase 6 audit — automatic livestream detection and delivery

Audit date: **2026-10-17 (Asia/Colombo)**.

**Decision: FAIL / HOLD for Phase 6 acceptance.** The existing automated suite and production builds pass. Two additional isolated probes reproduce application defects, and live acceptance prerequisites are incomplete. This is not a claim that the official integrations are infeasible. Phase 7 was not started.

## Scope and evidence boundaries

Reviewed the canonical `DEVELOPMENT_ROADMAP.md`, requirements, API research, architecture, database schema, security/risk and decision records, original roadmap, Phase 4/5 contracts and audit context, Phase 6 implementation record, progress, README, current worker/provider/webhook code, bot broker/sender, shared configuration/renderer, database repositories/migrations and relevant regression tests. Current user-authorized Phase 6 scope takes precedence over historical idle-worker/no-delivery descriptions. The broader original queue/history/Gateway proposals are not treated as implemented features or new work authorized by this audit.

Official documentation was retrieved again during this audit. Actual checks used the installed project dependencies. The external PostgreSQL examination was **read-only**; no migration, configuration change, live subscription or Discord message was performed. No credentials were printed. The audit added no application features or fixes. Supplemental probes are in the ignored local file `.local/phase06-audit-probes.ts`; the findings below include their reproduction steps so the report does not depend on that local artifact being retained.

**Evidence classes:** simulated upstream responses and Discord REST mocks; actual embedded PostgreSQL SQL execution; actual loopback HTTP; actual external database connectivity/schema inspection; actual unauthenticated Kick HTTPS connectivity. These are distinct. There was **no actual YouTube/Kick livestream experiment, provider webhook delivery or automatic Discord message verification**.

## Features verified

| Area                            | Verified behavior and limits                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube official integration    | Fixed official channels/playlistItems/videos endpoints, server-side API key, channel ownership checks on returned videos, public LIVE/start/no-end filtering, canonical watch URL. Feed events are hints. Discovery completeness/Premiere exclusion remain unverified (M04).                                                                                            |
| Kick official integration       | App client credentials, stable broadcaster lookup, targeted active-livestream endpoint, subscription inventory/restoration, hosted public key. Current response fields match official schema. Runtime token/subscription authorization has not been tested with real credentials.                                                                                       |
| Registered identities           | Shared `provider_channels` identities and per-guild subscriptions are reused. YouTube channel ID and Kick broadcaster ID drive lookup; numeric IDs use lossless parsing. Kick slugs refresh from the stable ID. Expired source metadata is excluded.                                                                                                                    |
| Offline-to-live and baseline    | Simulated public starts for both providers create deliveries; first-observation/already-live and pre-baseline/stale starts are suppressed. Upcoming/ended/private YouTube fixtures do not notify. Re-enable recovery has a confirmed gap (M03).                                                                                                                         |
| PostgreSQL preferences          | Embedded SQL tests exercise settings, enabled subscription/preference, current settings version, destination and expiry checks. Current external database lacks the Phase 6 tables (M01).                                                                                                                                                                               |
| Multi-server fan-out            | Simulated one-source/two-guild tests send independently to both destinations. One source observation and shared pre-send proof avoid per-guild provider polling. Existing guild authorization/tenant regressions pass.                                                                                                                                                  |
| Persistent duplicate prevention | Session hashes and unique `(session_id,guild_id,channel_id)` admission survive reconstructed repository/monitor use in embedded PostgreSQL. Repeated live observations do not create new messages. Interrupted sending becomes uncertain; ambiguous sends are not blindly retried. No permanent exactly-once claim.                                                     |
| Titles, URLs and rendering      | Actual provider title/watch URL flow into the shared live renderer; sample tests retain their TEST label. Canonical URL validation, content bounds and safe mention allowlists remain enforced. Custom templates may omit fields or truncate long substitutions as already documented. Real message rendering in Discord is unverified.                                 |
| Discord delivery path           | Existing bot broker/service, current guild channel/role checks, bounded REST requests, deterministic nonce and `enforce_nonce` are reused. All successful automatic-delivery assertions use mocked Discord POSTs. No actual delivery PASS is assigned.                                                                                                                  |
| Webhook authenticity            | Generated-key tests verify Kick RSA/SHA-256 signed construction, tampering, timestamp skew, unknown subscriptions and rotation. YouTube tests verify callback binding, pending topic/lease, HMAC, XML/channel checks and durable-receipt failure responses. Loopback tests exercise UTF-8 and oversized-body rejection. Concurrent hint persistence is defective (M02). |
| Failures and rate limits        | Provider requests have timeouts/body limits/no redirects; safe credential/network/quota categories and persisted cooldown/budget admission exist. Simulations cover quota rejection, timeout and definite Discord 429 versus uncertain acknowledgment. Actual provider limits/delays remain unverified; capacity mismatch in M05.                                       |
| Worker lifecycle                | Separate process entry point, opt-in default, nonoverlapping ticks, shutdown signal handlers, interval cancellation and resource-close paths exist. Bot/worker smoke runs pass in scaffold mode. Enabled entry-point startup/shutdown and independent-process recovery are not established by those smoke runs (N02).                                                   |
| Missing/invalid configuration   | Example/auth configuration checks pass without printing values. HTTPS-origin/secret and service credential-boundary tests pass. Missing provider credentials fail safely per provider; validation does not certify deployment readiness or require at least one usable provider.                                                                                        |
| Security/regressions            | Existing auth/session/guild/install/streamer/settings/mention/error tests pass. Credentials remain server-side; worker receives broker credentials but no bot/OAuth/session token through configuration selection. Reverse-proxy HTTPS/throttling and real permission changes require operator verification.                                                            |

## Automated test results

| Command/check                                               | Actual result in this audit                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` — first sandbox attempt                     | **FAIL, exit 1** at Vitest startup: all 18 suites failed to load because sandbox temporary-file rename operations returned `EPERM`; no tests executed. TypeScript, lint and formatting had completed successfully. This is not counted as 18 application test failures or a passing aggregate check. |
| `npm test` — approved outside-sandbox rerun                 | **PASS, exit 0: 189 tests / 18 files.** Includes 23 Phase 6 tests across `monitoring.test.ts` and `monitoring-webhooks.test.ts`.                                                                                                                                                                     |
| Separate `npm run typecheck`                                | **PASS**, all shared/application/tool TypeScript checks.                                                                                                                                                                                                                                             |
| Separate `npm run lint`                                     | **PASS**, zero warnings.                                                                                                                                                                                                                                                                             |
| `npm run format:check`                                      | **PASS**, including the completed audit document.                                                                                                                                                                                                                                                    |
| `npm run build` — first sandbox attempt                     | **FAIL, exit 1**: Turbopack could not create a required local package junction, access denied.                                                                                                                                                                                                       |
| `npm run build` — approved outside-sandbox rerun            | **PASS, exit 0**: shared packages, Next.js 16.4.2 production build, bot and worker.                                                                                                                                                                                                                  |
| `npm run smoke --workspace=@navi/worker` and bot equivalent | **PASS**, scaffold/disconnected initialization only. No provider call, active monitor or Discord send.                                                                                                                                                                                               |
| `npm run env:check:example`, `npm run env:check:auth`       | **PASS**, configuration validation only; neither verifies live OAuth or provider access.                                                                                                                                                                                                             |
| Supplemental embedded SQL probes                            | **Reproduced M02 and M03** with assertions against current code; no network or real Discord side effects. These are defect reproductions, not additional passing acceptance tests added to the 189-test total.                                                                                       |
| `npm audit --json` and `npm audit --omit=dev --json`        | Both **FAIL, underlying audit exit 1**, four moderate package findings; zero high/critical. Sanitizing wrapper exit 0 is not an audit PASS. Packages: `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`, `esbuild`.                                                                |

The current automated tests use PGlite with the actual five SQL migration files, mocked provider/Discord responses and generated signing keys. They prove substantial local behavior, not multi-process PostgreSQL locks, real credentials, stream discovery or delivery latency. No code was changed to make the existing tests pass.

## Real API and infrastructure results

| Check                                                    | Actual result                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run monitor:check -- --connectivity` in sandbox     | **FAIL, exit 1** for public-key connectivity; authenticated provider checks skipped.                                                                                                                                                      |
| Same read-only command outside network restrictions      | **PASS, exit 0** for official Kick hosted public key over HTTPS and RSA key format. YouTube/Kick authenticated checks **SKIPPED**, not passed.                                                                                            |
| Worker configuration presence, values not disclosed      | Monitoring disabled; YouTube key, Kick credential pair, broker secret, public callback origin and webhook secret absent. No secret file changed.                                                                                          |
| `npm run db:check` outside sandbox                       | **PASS, exit 0**, external PostgreSQL reachable now. This supersedes the earlier implementation-time connection-refused result for current connectivity only.                                                                             |
| Read-only external catalog queries                       | **FAIL for Phase 6 readiness**: none of `monitor_sources`, `monitor_sessions`, `live_deliveries`, `monitor_receipts`, `monitor_limits` exists in `public`; `monitor_sources.baseline_at` also absent. No migrations applied during audit. |
| Authenticated YouTube videos/playlist behavior           | **NOT EXECUTED**: worker API key absent.                                                                                                                                                                                                  |
| Kick token, target lookup, subscription and signed event | **NOT EXECUTED** with actual app credentials; worker credential pair/callback configuration absent. Hosted-key success does not verify these.                                                                                             |
| Real streams / automatic Discord messages                | **NOT EXECUTED / MANUAL VERIFICATION REQUIRED**. No valid live observation, deployed Phase 6 schema or enabled worker setup was available. No real delivery claim.                                                                        |
| External restart, contention, HTTPS ingress              | **NOT VERIFIED**. No service deployment or Portal/tunnel changes were performed.                                                                                                                                                          |

## Critical issues

**None demonstrated within this audit's evidence.** This does not certify an absence of vulnerabilities in untested live configurations.

## Major issues and required corrections

### M01 — Deployment and live acceptance prerequisites are incomplete

**Severity: Major acceptance blocker; infrastructure/evidence gap.**

The database is reachable, but read-only catalog inspection finds no Phase 6 tables. The worker is disabled and lacks provider/broker/webhook configuration. Enabling it now would not establish usable monitoring. All end-to-end automatic delivery assertions are simulated, and the scoped requirement for actual platform connectivity where available has only public-key evidence. Earlier Phase 5 manual delivery gates are not automatically closed by Phase 6 tests.

**Required correction:** operator reviews/applies `0003_phase06_monitoring.sql` and `0004_phase06_baseline.sql` through the existing migration workflow, verifies deployed schema, privately configures the intended worker/provider/broker setup and starts bot/worker. Webhook tests additionally need an exact public HTTPS origin, secret and Kick Developer webhook configuration. Then perform the controlled acceptance matrix below. Do not recreate the database or change existing credentials as an audit shortcut. Missing live evidence is not a code test failure, but blocks an overall PASS.

### M02 — A concurrent poll can discard a committed YouTube webhook hint

**Severity: Major confirmed correctness defect.** Locations: `apps/worker/src/monitor.ts:54–63`, `packages/database/src/monitoring.ts:69–70,133–155`.

The poll reads candidates into a snapshot, awaits external requests and later replaces the entire database candidate array with `observed.keep`. Meanwhile `receipt()` can commit a new video ID and its deduplication receipt. The final poll update overwrites the new ID. Discovery has a similar snapshot replacement. The receipt remains stored, so a repeated identical callback is ignored and cannot restore the lost candidate. Fifteen-minute playlist reconciliation can occur after the ten-minute send freshness window.

**Reproduction:** initialize one synthetic YouTube source with candidate A and a future discovery schedule. During the mocked `providers.observe`, call the real repository `receipt()` with candidate B, then return `keep: [A]`. Run a monitor tick. Embedded SQL confirms one durable receipt but only `[A]` remains; B is lost. Probe output: `receiptDurable:true,candidateLost:true`.

**Required correction:** reconcile polling results atomically against current candidate state, removing only entries actually checked/resolved while preserving newer hints; use a generation/version or durable pending-hint mechanism and preserve wake-ups. Avoid holding a transaction across provider HTTP. Add deterministic interleaving regressions for hints arriving during both observation and discovery, duplicate callback retries and restart recovery.

### M03 — Disable/re-enable can revive a queued pre-activation notification

**Severity: Major confirmed semantics defect.** Locations: `packages/database/src/monitoring.ts:103–107,213–242`; `packages/database/src/streamers.ts:94–106`.

Admission checks subscription activation time, but pre-send `payload()` only checks current enabled state, settings version/channel and ownership. Toggling a streamer subscription changes its `updatedAt`, without changing notification settings version. If a pending notification survives a disable/re-enable before consumption, the old event becomes eligible again, contrary to the documented no-backfill/already-live activation policy. Route locks serialize changes but do not preserve the activation check across them.

**Reproduction:** initialize baseline, admit a fresh synthetic stream, claim its delivery, disable the subscription and verify `payload()` returns undefined. Advance time and re-enable through the real repository. The unchanged delivery now returns its old payload. Probe output: `disabledSuppresses:true,reenabledReturnsOldPayload:true`. No real message was sent.

**Required correction:** validate the current subscription activation/generation at send time as well as admission, or permanently invalidate queued work when disabling. A pre-disable delivery must remain suppressed after re-enable, including after worker restart. Test this independently of settings-disable/version changes and verify a genuinely later new stream can still notify.

### M04 — YouTube discovery and Premiere feasibility gates remain open

**Severity: Major known acceptance limitation; not an invented-endpoint finding.** Locations: `apps/worker/src/providers.ts:201–265`, implementation/API research coverage sections.

Official push guidance covers uploads and metadata changes, not a guaranteed go-live signal. The worker checks recent upload candidates and retained hints, so a live video that never enters that set cannot be detected. There is no controlled evidence for scheduled, unscheduled or long-scheduled streams, or for excluding Premieres. The existing disclosure is appropriate, but does not satisfy the controlled-stream acceptance gate. [Official YouTube push guide](https://developers.google.com/youtube/data/guides/push_notifications), [video resource fields](https://developers.google.com/youtube/data/reference/rest/v3/videos).

**Required correction:** run the documented coverage/classification matrix and record misses, latency and actual fields. If official mechanisms cannot meet the intended behavior, obtain an explicit supported-scope/latency decision and document the boundary. Do not replace official APIs with scraping or assume every Premiere can be distinguished from these fields.

### M05 — Default YouTube cadence exceeds the budget at the documented source allowance

**Severity: Major operational capacity mismatch.** Locations: `apps/worker/src/monitor.ts:53–63`, `apps/worker/src/providers.ts:201–265`, `packages/config/src/index.ts:204`.

Video checks are batched within each source, not across sources. For ten YouTube sources each retaining candidates, the nominal cadence requires 14,400 videos requests/day plus 1,920 discovery requests/day (channels + playlist every 15 minutes): **16,320 units/day before confirmations, webhook bursts and retries**. This exceeds the worker's default 7,200 allowance, configured maximum 8,000, and documented regular project default. Even five such sources need about 8,160 units/day. The persistent limiter prevents overspend but then prevents checks for the rest of the day; registration's default ten-source cap does not prevent this configuration. This is a calculated sustained-candidate workload, not measured traffic for currently configured accounts. [Official quota costs and reset policy](https://developers.google.com/youtube/data/determine_quota_cost).

**Required correction:** agree and enforce a sustainable provider-specific capacity/cadence, or batch compatible video checks across shared sources with fair scheduling and headroom. Include pre-send proof and web registration usage in the budget. Add a clock-driven quota/fairness test for the supported source mix. Do not simply raise the budget beyond the actual project allocation or evade quota with extra projects.

## Minor issues and improvements

### N01 — Current documentation still mixes superseded scope statements

`docs/README.md` Approval status still says Phase 6 is unimplemented. `03-architecture.md` contains current-runtime wording about an idle worker/no monitoring after its Phase 6 header. `04-database-schema.md` similarly mixes implemented automatic-delivery tables with older unimplemented wording. The header/pointer helps, but a reader can still reach conflicting operational guidance.

**Correction:** explicitly label each obsolete paragraph historical/proposed or reconcile it with the current Phase 6 contract. Preserve dated audit results. This audit does not automatically rewrite those documents.

### N02 — Enabled lifecycle, independent locks and shutdown remain insufficiently tested

Smoke mode exits through `runScaffoldProcess`; it never enters the enabled runtime. Monitor tests substitute an in-process coordinator, so PGlite does not prove actual session advisory-lock contention or separate-process failover. `apps/worker/src/index.ts:69` awaits the whole in-flight tick before closing ingress/database, with no overall shutdown deadline; serial provider calls and up to 50 broker operations can substantially delay exit.

**Correction:** add focused enabled-entry-point startup/shutdown/error tests and a deliberate bounded-drain policy. Verify healthy and failing dependencies, port conflict, termination during an in-flight send and two real PostgreSQL processes contending/restarting. Treat interrupted sends conservatively; do not add blind retries to improve a test result.

### N03 — Four existing moderate dependency findings remain open

Both current dependency audits report the same legacy Drizzle/esbuild chain recorded in Phase 5. No high/critical findings were reported. Absence of a configured public esbuild server reduces current exposure but does not fix the advisory.

**Correction:** retain the documented restriction against exposing affected tooling servers; review/test a compatible upstream update when available. Do not force the previously rejected breaking Drizzle downgrade. No dependency changes were made during this audit.

### N04 — Webhook and retention operations need explicit operator evidence

Hosted-key cache success and generated signatures do not establish Google's actual signed distribution behavior, Kick retry skew or proxy protections. Automatic upstream unsubscribe garbage collection is absent by design. Session payload cleanup is tested, but candidate ID retention, inactive-source cleanup and retained hash/backups still need the provider-policy review already identified in planning. The application should not claim policy compliance from a 29-day payload cleanup alone.

**Correction:** verify real Google HMAC/lease delivery and Kick rotation/retries; preserve fail-closed behavior with polling recovery. Record TLS/path/body/rate restrictions in the deployed proxy, stale subscription removal steps and candidate/hash/backup lifecycle decisions. These operational gaps do not justify broadening this audit into a new feature phase.

## Current official API assumptions checked

- Kick OpenAPI currently permits app tokens for channels, user-targeted active livestreams and event subscriptions; targeted lookup uses `user_id`, and live objects contain `broadcaster_user.id`, `channel.slug`, `title`, `started_at`. Subscription inventory fields and numeric broadcaster POST match the adapter. This verifies the documented contract, not real app entitlement or response behavior. [Official schema](https://api.kick.com/swagger/doc.json).
- Kick's signature guidance specifies the message ID, timestamp and raw body construction, hosted rotating public key and RSA verification; sustained webhook failure can require resubscription. The implementation follows that design. App-token subscriptions to other broadcasters are documented. [Signature guidance](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/webhook-security.md), [event setup](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/introduction.md).
- YouTube's documented candidate/video APIs are supported public-data mechanisms; the owner-oriented broadcast API is not used. Their existence does not establish universal discovery or Premiere filtering. Hub challenge/lease/secret validation follows the intended subscription model, with actual Google signature delivery still unverified. [Playlist items](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list), [WebSub](https://www.w3.org/TR/websub/).
- Discord's enforced nonce only covers recent duplicate checks; it does not replace durable uniqueness. Explicit allowed mentions remain necessary. The current sender uses both safeguards without a permanent exactly-once assertion. [Official message API](https://docs.discord.com/developers/resources/message).

## Unverified assumptions and acceptance checklist

After the confirmed defects/capacity decision are resolved, capture redacted evidence for:

1. **Infrastructure:** reviewed migrations applied; all five tables and baseline column present; enabled worker and bot start with intended credentials; website can be stopped while worker keeps checking. Verify clean termination and restart.
2. **YouTube:** real key/project quota, known upcoming-to-live, unscheduled and long-scheduled discovery, already-live registration, metadata-only changes, ordinary/private/deleted videos and Premiere classification. Record discovery misses separately from API classifier behavior.
3. **Kick:** real app token and stable broadcaster reads, non-owner subscription, real signed webhook, missed-event polling, removed subscription restoration and repeat callbacks. Confirm UTC start correlation with the live API.
4. **Delivery:** controlled new streams produce actual title/platform/streamer/watch URL in the two intended Discord guilds/channels, with only the optional selected role mention. Personally inspect the received messages. Check duplicate callbacks/polls/restarts cause no extra message.
5. **Recovery/security:** disable/re-enable before send, changed settings, role/channel deletion, permission revocation, bot removal, actual rate-limit responses where safely observable, ambiguous acknowledgment and separate-process contention. Do not deliberately spam Discord to manufacture a rate limit.
6. **Operations:** sustainable measured API usage/headroom, HTTPS ingress constraints, actual signed YouTube distribution/lease renewal, cleanup and backup policy. No guaranteed detection latency or complete coverage until measured and accepted.

The existing registration/dashboard/settings/auth features have passing automated regression coverage; their current live/browser behavior was not re-certified by this audit. There is no requirement to implement the broader delivery-history UI, generic queue redesign or Gateway features to address these narrowly scoped findings.

## Final decision

**Automated baseline: PASS after sandbox-independent reruns. Phase 6 overall: FAIL / HOLD.** M02 and M03 are confirmed defects not caught by the existing 189 tests. M01, M04 and M05 leave deployment, real behavior and capacity acceptance incomplete. Required corrections and real integration evidence must be reviewed before an overall PASS. No application correction, credential/Portal change, schema migration or Phase 7 work was performed during this audit.
