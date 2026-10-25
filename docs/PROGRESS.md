# NAVI Live Notifier — progress

## Phase 16A — private GitHub branch preparation — 2026-10-25

[Sync report](PHASE_16A_GITHUB_SYNC_REPORT.md): prepared `feature/phase-15-cloud-architecture` from latest main with 126 reviewed staged files (84 additions, 42 modifications), no commit/push/merge. Preserved Git history, portable examples/isolated ports and privacy redactions. Independent 537 tests, type/lint/format, production builds, 27 disposable PG scenarios and five Redis probes PASS; full/production audits zero; bounded source/index/history/client scans clear. Original source and SQL migrations 0000–0006 unchanged. No normal database migration, queue activation, real notification, monitoring or deployment. GO for reviewed private upload only after approval; public/deployment readiness remains NO-GO.

## Phase 15F — cloud deployment preparation — 2026-10-25

[Cloud plan and approval gates](PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md). Prepared mode-aware canonical DB target/TLS/scope preflight, reviewed command-role SQL, private dependency/privilege readiness, opt-in bot role guard, Render prestart/PG templates and co-hosted service/webhook-only edge examples. HTTP/consumer/monitoring defaults remain unchanged and disabled where applicable. Normal migration 0007 remains absent. No cloud access/provisioning, production credential/DNS change, real Gateway/monitoring/send or Git operation.

Full checks **537 tests/43 files PASS**, TypeScript/lint/format and native builds PASS; final container/security evidence recorded in the plan. **27 isolated PG cases**, five local Redis probes, 14 original +13 webhook-only proxy checks PASS; dependency audits zero. Local release preflight remains intentionally not-ready. **NO-GO for the complete free/no-card 24/7 stack or activation/deployment/public release.** Review one paid always-on VM or keep local beta; no spending/host selection approved. Stop after Phase 15F.

## Phase 15E — reliability/security/integration validation — 2026-10-25

[Validation report](PHASE_15E_VALIDATION_REPORT.md). Added reproducible isolated-database, crash-fixture and Redis probes, without application/runtime configuration changes. Exact migration 0007 ran only in a newly created disposable local DB with separate effective NOLOGIN admission/consumer roles. **26 real local SQL/HTTP/processor scenarios PASS**, including physical connection loss and owned child-process crashes; five local Redis probes and 14 isolated proxy checks PASS. Normal command table remains absent; test DB/roles removed. Discord/session identity is simulated; no real notifications, Gateway login, monitoring, cloud changes, credential change, commit or push.

Final full suite **509 tests/42 files PASS**, TypeScript/lint/format and production builds PASS. [Sanitized evidence](evidence/phase15e-results.json). Full/production npm audits zero findings. Measured idle consumer: six SQL statements/3-second step, projecting **5.184 million statements/30 days**, with continuous compute beyond Neon Free's 100 CU-hours at 0.25 CU. **GO only for separately approved Phase 15F preparation; activation/deployment/public release NO-GO.** No free/no-card continuous backend or real cloud/integration capacity is verified.

## Phase 15D — dashboard commands and acknowledgments — 2026-10-23

[Implementation, flags, grants and rollback](PHASE_15D_IMPLEMENTATION.md). Added opt-in database command admission/status APIs, dashboard acknowledgment recovery, fresh advisory snapshots and a disabled-by-default bot consumer using existing REST, leases and route locks. HTTP remains the default; direct DB-only disabling, private broker, worker delivery and existing monitoring are preserved. Admission can be paused without losing status access. No normal migration, configured app startup, real message, cloud/credential/grant change or Git operation.

**509 tests/42 files PASS**, including 34 new cases; TypeScript, zero-warning lint, formatting and final production builds PASS. Local independent PostgreSQL command/reliability suites, PostgreSQL/Redis health and zero-finding full/production dependency audits PASS. [Sanitized evidence](evidence/phase15d-results.json). Normal public.bot_commands remains absent; isolated schemas were removed. Final app listeners: zero; only local PostgreSQL/Redis containers running. Real Discord/cloud/continuous-runtime validation is not claimed. **GO only for separately approved Phase 15E validation; activation/release NO-GO.**

## Phase 15C — secure PostgreSQL commands — 2026-10-22

[Implementation, migration and handoff](PHASE_15C_IMPLEMENTATION.md), [sanitized evidence](evidence/phase15c-results.json). Implemented strict command contracts, authenticated admission adapter, durable queue/attempt/snapshot schema, idempotent transactional reservation, bounded claims/leases/retries/expiry, current actor/session/scope checks, shared bot REST adapter and safe receipt/uncertain handling. Settings and acknowledgment are atomic; existing broker, monitoring, normal dedupe and immediate disable stay operationally unchanged. Conservative soft references and retained unresolved/command evidence preserve data.

**475 tests/39 files PASS**, including 43 added cases; TypeScript/lint/format/native production builds, actual independent PostgreSQL command concurrency/fencing and existing reliability checks PASS. Migration `0007_phase15c_commands.sql` tested only in embedded/disposable databases, not applied to the development database. Drizzle recheck clean; full/production audits zero findings. New factories are inert until explicitly called; no dashboard or startup cutover, worker start, real message, cloud/credential/grant change, commit or push. Restricted-role fixture exposed required UPDATE(id) row-lock privilege and passes without OAuth-table access.

**GO for separately approved local Phase 15D integration; activation/release NO-GO.** Service-role provisioning, runtime wiring, cloud/Linux/external Discord validation, retention/erasure and operator reconciliation remain gates. No Phase 15D/E/F implementation or automatic continuation.

## Phase 15A/B — migration audit and command design — 2026-10-22

[Architecture audit](PHASE_15A_ARCHITECTURE_AUDIT.md), [queue design/migration plan](PHASE_15B_COMMAND_QUEUE_DESIGN.md), [verification and approval boundary](PHASE_15AB_VERIFICATION_REPORT.md). **A/B complete for review only; C onward awaits approval. Deployment remains NO-GO.** All six private bot routes and worker/operator callers inspected. Proposed typed PostgreSQL commands replace dashboard HTTP calls; automatic worker delivery/private broker remain unchanged. Required states include pending/processing/completed/failed plus explicit uncertainty/expiry/cancellation. Preserve immediate DB-only disable, version conflicts, atomic settings+ack and test reservation+enqueue, current actor revalidation and unresolved/deduplication evidence.

Documentation only: no source/schema/env/dependency/deployment/data change, migration, configured service startup or real send. Existing local architecture is preserved. Fresh **432 tests/38 files**, TypeScript/lint/format/production builds, actual local PostgreSQL claim/lock/recovery and zero-finding full/production dependency audits PASS. Separate focused run: 151 tests/six files PASS. These are foundation checks; proposed commands, cloud deployment and new real integrations remain unverified. Prior cloud design remains a proposal. No Phase 15C–F implementation occurred.

## Phase 15 — cloud architecture review — 2026-10-22

[Architecture comparison, hosting evidence and migration plan](PHASE_15_CLOUD_ARCHITECTURE_REVIEW.md): **proposal only; deployment remains NO-GO**. Recommend a PostgreSQL dashboard command/ack layer with execution-time authorization and uncertainty handling; retain current worker delivery/private broker and co-host bot/worker as separate supervised processes. No architectural implementation occurred.

No verified indefinite card-free always-on host: alwaysdata's detailed Services page is paid-only despite broader homepage wording; Railway credit is not established as sufficient; Render sleeps. Continuous Neon compute estimates 180 CU-hours/30 days versus 100 Free; current pricing and older FAQ storage figures conflict. Ten YouTube sources reach the ten-minute stale-alert cutoff; current beta allowlist still caps five guilds. Resource estimates are hypotheses, not production measurements.

Fresh evidence: **151 existing tests / six files PASS**, actual local PostgreSQL claim/lock/recovery PASS with temporary schema cleaned, documentation formatting PASS. Prior 432-test/build/audit baseline is historical. No runtime startup, Discord sends, migrations, credential/environment/infrastructure/access changes, deployment or later phase.

## Render Free deployment preparation — 2026-10-22

[Readiness report](RENDER_DEPLOYMENT_READINESS.md), [exact commands and setup](../deployment/render/README.md), [sanitized evidence](evidence/render-preparation-results.json). **NO-GO for the complete requested split Free topology:** the broker is intentionally loopback-only, Free instances cannot receive private-network traffic, and sleeping/instance-hour limits prevent dependable continuous bot/worker monitoring. Prepared a review-only dashboard Blueprint and separate secret-free environment templates; did not expose internal APIs or add artificial keepalive traffic. No application behavior, schema, dependencies, saved data or actual environment configuration changed.

Actual checks: **432 tests / 38 files**, TypeScript/lint/format/native builds, Linux image build, isolated real Next public-bind HTTP liveness and SIGTERM, local PostgreSQL reliability, Redis PING, Compose model and zero-finding full/production dependency audits pass. Eight new synthetic compatibility cases cover verified pg TLS options, beta/HTTPS config, loopback broker restrictions, Redis TLS-vs-REST URI validation and webhook-secret requirements. Real Render/Neon/Upstash operation, callback setup, sustained availability/capacity and controlled livestream delivery remain blocked/unverified. No deployment, purchase, credential/Portal/DNS change, bot/worker startup or Discord message; no next phase started.

## Phase 14D — controlled testing isolation and configuration — 2026-10-22

[Configuration](PHASE_14D_CONFIGURATION_REPORT.md), [test plan](PHASE_14D_TEST_PLAN.md), [validation](PHASE_14D_VALIDATION_REPORT.md) and [evidence](evidence/phase14d-results.json): **public launch remains NO-GO**. Owner confirmed the saved test server and separate YouTube/Kick destinations. Applied matching local beta guild scope, disabled local monitoring and set only the two approved settings to No mention with new versions/cutoff; destinations/templates/enabled states and the entire delivery ledger are preserved. Preflight now rejects non-public/reserved origin profiles and disabled monitoring. Added a pure read-only offline dry-run and fail-closed worker argument guard so unsupported `--dry-run` cannot silently start monitoring.

**424 tests / 37 files**, TypeScript/lint/format/native and Docker builds, real PostgreSQL reliability, Redis health, 14 proxy checks and zero-finding full/production dependency audits pass. Scoped dry-run has no planning blockers, preserves the uncertain row and leaves all 14 checked relations unchanged; it never authorizes live execution. npm listing warning remains. Release preflight still fails on public HTTPS origins and intentionally disabled monitoring; all app ports remain stopped. Fresh approved OAuth/install/livestream/receipt/soak, callbacks, external alerts, encrypted offsite recovery, capacity/cost and policy gates remain manual. No worker/automatic monitoring startup, real message, broadcast, external subscription change, production credential/infrastructure change or Phase 15 work.

## Phase 14C — runtime and real-world validation — 2026-10-22

[Runtime](PHASE_14C_RUNTIME_REPORT.md), [integrations](PHASE_14C_INTEGRATION_REPORT.md), [readiness](PHASE_14C_RELEASE_READINESS.md) and [evidence](evidence/phase14c-results.json): **public launch remains NO-GO**. Actual website HTTP checks and Discord Gateway/REST readiness pass during a bounded run, including one graceful bot restart. Official saved YouTube/Kick identity resolution matches both stored IDs; current guild membership, 12 sendable channels, 9 eligible roles and both saved destination permissions pass read-only. Worker-env schema/Redis access and probe-owned PostgreSQL connection recovery pass. Full suite **395 tests / 36 files**, type/lint/format/native/Docker builds, actual SQL/proxy checks and zero-finding full/production audits pass; npm listing warning remains.

The owner explicitly declined worker startup/real sends. A separate workspace combined dev group, possibly from VS Code, subsequently appeared and briefly reported all-service readiness with fresh worker heartbeats. It was not started by this validation. After identifying its `--kill-others` launcher and informing the owner, the verified combined group was stopped to preserve the no-worker/no-send instruction; web/bot also stopped, PostgreSQL/Redis remain healthy. No new delivery updates were found and the uncertain YouTube row remains unchanged. Final app health is intentionally unavailable; brief readiness does not establish controlled LIVE delivery or sustained operation. Scope/HTTPS, complete onboarding, new approved broadcasts/receipts, external alerts, offsite DR, capacity/cost and policy gates remain open. No app/config/credential change, initiated notification, public activation or Phase 15 work.

## Phase 14B — final blocker resolution — 2026-10-22

[Implementation](PHASE_14B_IMPLEMENTATION.md), [validation](PHASE_14B_VALIDATION_REPORT.md), [manual plan](PHASE_14B_MANUAL_TEST_PLAN.md) and [evidence](evidence/phase14b-results.json): **public launch remains FAIL / NO-GO**. Exact health cause is connection refusal/no listeners on configured web/bot/worker ports, while PostgreSQL auth readiness and Redis pass. Actual website-only development startup passes four read-only HTTP checks and is stopped afterward. Added safe health reasons/statuses, explicit liveness/readiness classification, private four-table auth readiness and database-only console alert/recovery transitions. **395 tests / 36 files**, TypeScript/lint/format/native and Docker builds, 3 Linux tooling tests, 9 isolated image HTTP cases, 14 proxy assertions, actual SQL reliability and reused-archive 14-relation restore pass. Full/production audits report zero findings; npm override listing still exits 1.

Release preflight still fails on absent beta scope/agreement and public HTTPS origins. Read-only uncertain-row investigation finds no conclusive receipt or log correlation; the row is unchanged and never requeued. Bot/worker remain stopped, with no real send or public/infrastructure/credential change. Fresh approved onboarding/livestreams, continuous operation, authentic external callbacks, external alerts, encrypted offsite recovery, capacity/cost and policy/support/deletion gates remain manual. No Phase 15 started. Earlier entries below are historical snapshots.

## Phase 14 — independent final readiness audit — 2026-10-22

[Final audit](PHASE_14_FINAL_READINESS_AUDIT.md) and [sanitized evidence](evidence/phase14-final-readiness-audit-results.json): **FAIL / NO-GO for public launch**. Independently rerun 383 tests / 36 files, TypeScript/lint/format/native builds, local Docker build/runtime, 14 proxy assertions, actual PostgreSQL integrity/concurrency, Redis and 14-relation scratch restore pass. Full/production package audits report zero findings; npm's override listing warning remains. All 185 snapshotted source/configuration files are unchanged.

New read-only evidence corroborates one historical live-style Discord message per platform and official metadata for an ended YouTube broadcast. This partially improves earlier missing-receipt evidence; it does not close fresh controlled livestream acceptance. One YouTube `uncertain` outcome is preserved for operator reconciliation. Actual app health and release preflight fail; complete onboarding, continuous runtime, authentic public callbacks, external alert receipt, offsite recovery, measured hosting/capacity and policy/support/deletion acceptance remain open. No real sends, live service startup, production changes or access expansion occurred. Earlier entries below are dated snapshots.

## Phase 14 — release blocker remediation — 2026-10-22

[Remediation](PHASE_14_REMEDIATION.md) and [evidence](evidence/phase14-remediation-results.json): corrected stale inherited esbuild resolution with a narrow patched override/lock and normalized untrusted forwarded-host headers in Nginx. Full/production audits now report **zero findings**. Added three actual loader/config/generation/SQL regressions and a 14-case network-isolated TLS/proxy command; Docker builds run the tooling guard. **383 tests / 36 files**, TypeScript/lint/format/native builds and guarded Linux image PASS. Production-only image resolves patched 0.28.2. PostgreSQL independent reliability and reused-archive isolated restore PASS with source unchanged. npm's workspace `ls` range warning remains disclosed; use clean locked installs and guards.

**Wider release remains NO-GO:** actual application endpoints/preflight still fail; real onboarding/two-platform receipts, approved continuous runtime, authentic public callbacks, external alerting, encrypted offsite/host-loss recovery, measured hosting/cost and public-policy gates remain open. No real bot/worker startup or Discord message, public installation/deployment, credential/permission/access change, existing data reset or application migration change.

## Phase 14 — release blockers review — 2026-10-22

[Current blocker review](PHASE_14_RELEASE_BLOCKERS.md) and [sanitized evidence](evidence/phase14-release-blockers-results.json) supersede older unavailable-service results for this local run. Docker's engine was initially absent; after owner confirmation that no senders auto-start and startup approval, Desktop reported already running and original PostgreSQL/Redis were healthy. No reset or existing volume/data deletion. Actual PostgreSQL concurrency, seven migration hashes/three unique indexes, a fresh isolated 14-relation restore, Linux image build/synthetic HTTP guards and read-only provider/bot membership checks pass. **380 tests / 35 files**, TypeScript, lint, formatting and native builds pass outside the sandbox; its initial Vitest cache EPERM prevented test collection.

**Wider launch remains NO-GO.** Actual configured web/bot/worker endpoints are unavailable; beta scope/HTTPS preflight and four moderate full/production dependency advisories remain failing gates. Real two-platform receipts, complete onboarding, continuous runtime/external alert delivery, encrypted offsite/host-loss recovery, measured hosting/API capacity and policy/contact acceptance remain unverified. No real sender/worker startup, message, public preparation/deployment, credential/access change or dependency/application-code change. Controlled broadcasts still require exact target/send approval; Docker startup approval does not authorize messages.

## Discord login origin repair — 2026-10-20

Reproduced the current browser at 127.0.0.1 versus configured localhost: login POST **403 `invalid_origin`**, canonical-origin POST **200** with matching callback/scopes. Environment and actual auth database/schema were healthy. Added same-port development loopback canonicalization on the login GET page, safe distinct auth messages/structured failure logs and zero-row auth DB preflight; wrong-Origin mutations stay forbidden. NAVI allowlist denial now has a distinct public code without changing authorized users. Callback errors drop arbitrary descriptions; state/cookies/encryption/current guild checks preserved.

**Real browser consent/callback and authenticated workspace verified**, recent unexpired session presence true. **380 tests / 35 files PASS**, TypeScript/lint/format/native builds and client secret scan PASS. See [root cause, changes and boundaries](DISCORD_LOGIN_ORIGIN_FIX.md) and [safe evidence](evidence/login-origin-fix-results.json). No actual credential/environment/permission/access change, manual database deletion or notification send. Broader Phase 14/wider-public NO-GO remains; no new phase started.

## Phase 14 — infrastructure recovery and controlled beta validation — 2026-10-20

User authorized recovery/testing while retaining public NO-GO and explicit approval for actual messages. The unrestricted initial probe found Docker/Linux engine and original PostgreSQL/Redis containers already healthy; no service reset or existing volume restart/removal was needed. Actual PostgreSQL connectivity and independent concurrency/cooldown/advisory-lock/reconstructed-delivery tests now PASS. Seven applied migration hashes match; three required unique indexes valid; zero orphan settings. A private local dump restored into a new scratch DB with all 14 application/migration relations matching, source unchanged and scratch cleaned. A separate Redis fixture recovered AOF data after restart; original services/volumes untouched.

Existing Linux production image now builds; Node 24.22.0/nonroot checks, offline bot/worker scaffolds and nine synthetic-config network-isolated website HTTP checks PASS. Container stop exit 143 is recorded, not claimed as zero-exit/full worker drain. Native **357 tests / 32 files**, TypeScript/lint/format/build, read-only provider connectivity, bundle scan and Drizzle journal check PASS. Four moderate advisories remain after review; no dependency change retained, manifest/lockfile hashes match. Actual web/bot/worker health and public-release preflight still fail; actual sends/consent/webhooks/soak remain unverified.

See [complete verification](PHASE_14_VERIFICATION_REPORT.md), [dependency review](PHASE_14_DEPENDENCY_REVIEW.md), [controlled broadcast plan](CONTROLLED_LIVESTREAM_VERIFICATION.md) and [sanitized evidence](evidence/phase14-results.json). Archive is ignored and ACL-restricted but unencrypted/local, not offsite recovery. Exact target/send approvals, public policy/support/deletion, TLS/monitoring/capacity and production recovery gates remain open. **Wider launch NO-GO; actual controlled-beta acceptance BLOCKED.** No credentials, deployment/access settings, existing data or application behavior changed; no actual messages/subscriptions/invitations. No subsequent phase started.

## Phase 13 — monitoring and stabilization — 2026-10-20

Explicitly authorized local stabilization following the Phase 12 audit; unmet release gates are not waived. No actual external-release feedback or production metrics was available. Fixed streamer mutation/refresh error conflation and REST-only bot readiness. Gateway lifecycle now feeds private readiness, including terminal invalidation. Worker health adds tick age, bounded process counters, commit-based detection/persisted broker-ack timing, cached provider reservations and safe minute summaries. Finite health CLI adds console-only incident/recovery transitions. Authentication/guild scope, webhook verification, safe mentions, provider validation, retry/uncertainty and durable deduplication preserved.

**357 tests / 32 files PASS**, TypeScript/lint/format and native builds PASS; nine fresh synthetic-config compiled-web HTTP checks PASS. Real read-only provider connectivity and browser secret scan PASS. Actual PostgreSQL/reliability and service-health checks fail; Docker Linux image build BLOCKED. Release preflight still fails missing scope/HTTPS; four moderate advisories remain. See [implementation](PHASE_13_IMPLEMENTATION.md), [results](PHASE_13_STABILIZATION_REPORT.md), [health report](PRODUCTION_HEALTH_REPORT.md) and [evidence](evidence/phase13-results.json).

**Wider launch NO-GO.** Real external onboarding, two-platform receipts/latency, actual runtime/restore/alerts, measured capacity and policy/contact/deletion/feedback gates remain open. No production environment, infrastructure, credentials, deployment settings, access lists or spending changed. No actual messages, invitations or subscriptions. No new dependencies, environment keys or migration; Phase 14 not started.

## Phase 12 — controlled release preparation — 2026-10-20

Prepared for at most **five approved external servers**, not activation. Optional `BETA_GUILD_IDS` caps five total distinct guilds including internal tests; web picker/authorization/install and worker source/fan-out/send-time lookup enforce it. Existing account allowlist/current Discord checks remain. Unset scope preserves personal private mode and fails new read-only `release:check`. No actual account/server list or environment changed.

Fixed Phase 11 M01 retained YouTube candidate starvation: verify up to 100 IDs in sequential batches of ≤50; failed later batch commits no observation. Budget now covers four calls/source/cycle with 20% reserve (1/5/10 sources nominally 60/300/600s at 7200). Real coverage/Premiere/freshness/latency remain unverified. Kick success path, current LIVE verification, queue/deduplication and sender retained. Web lookup long Retry-After/400 invalid_client errors corrected. Added existing-login Add to Discord link, private `/support`, feedback template and release/runbook documentation; contacts/legal/privacy publication remain pending.

**348 tests / 31 files PASS**, TypeScript/lint/format and native builds PASS; nine synthetic-config native HTTP rendering/auth-guard cases PASS. Actual PostgreSQL/service/Docker checks BLOCKED, provider connectivity/client scan PASS; four moderate advisories remain. Real consent/install/both-platform receipts, restore/alerts/soak still unverified. Read [plan](PHASE_12_RELEASE_PLAN.md), [actual results](PHASE_12_TEST_REPORT.md), [beta guide](BETA_USER_GUIDE.md), [monitoring/rollback gates](RELEASE_MONITORING.md) and [feedback template](BETA_FEEDBACK_TEMPLATE.md).

**NO-GO for external activation.** Public Bot, production settings, credentials, DNS/billing, invitations and actual messages unchanged. No dependency/migration or Phase 13. Source capacity still requires real verification; no spending authorized.

## Phase 11 — public launch preparation — 2026-10-18

Prepared launch readiness/checklist, operations/scaling and user guidance plus review-only Privacy Policy, Terms and data deletion procedure. The owner clarified the next launch is **private beta**, maximum **10 Discord servers/10 unique streamers globally**, **US$0/month hosting preferred**, with **US$15–25/month contingency not approved for spending**. NAVI Live Notifier is the service name; Sri Lanka is provisional. Legal operator identity, governing law, public contacts, website and effective dates remain explicit placeholders. No personal contact/address was published.

Reviewed onboarding, authorized native Install NAVI URL, multi-guild isolation, provider sharing, quotas, SQL capacity/retention and operations. Landing currently has Login with Discord and no Add to Discord CTA. Existing allowlist/private bot are retained for beta. Read-only application API confirms matching ID/private state/Guild Install and reports description/Privacy/Terms links absent; manual Portal review and fresh consent remain pending. No Portal, credentials, settings, production configuration or notification behavior changed; no messages/subscriptions/deployment/purchases performed.

Added `tests/launch-capacity.test.ts`: isolated PGlite plus simulated provider/broker responses, 10 shared sources × 10 guilds → 100 unique sent records, one definite 429 (101 attempts), no early retry or repeated send on reconstruction, safe mentions and bounded shared observations. This is fan-out correctness, not production resource/throughput or real livestream evidence. Final checks PASS: **336 tests / 30 files**, TypeScript, zero-warning lint and formatting; native builds PASS. Full results are recorded in [Phase 11 readiness](PHASE_11_LAUNCH_READINESS.md). Actual DB/external SQL and container build remain blocked; service health degraded; read-only provider connectivity/client scan pass; four moderate dependency findings remain. Phase 10's known YouTube candidate-starvation defect remains a required correction.

**Public release NO-GO; private-beta acceptance also pending.** Preparation is complete for review, not deployment or access expansion. Read [checklist](PUBLIC_LAUNCH_CHECKLIST.md), [operations/scaling](OPERATIONS_AND_SCALING.md), [user guide](USER_GUIDE.md), [policy draft](PRIVACY_POLICY_DRAFT.md), [terms draft](TERMS_OF_SERVICE_DRAFT.md) and [deletion procedure](DATA_DELETION_PROCESS.md). No phase beyond 11 started.

## Kick rich livestream notifications — 2026-10-18

Implemented screenshot-inspired green Kick embeds with current broadcaster profile/name, title, category/cover, stream image, branding and two supported channel-URL link buttons. Reuses existing active-stream API and shared pre-send confirmation with no extra Kick lookups; missing metadata has safe fallbacks. Existing saved template, mention/permission controls, destination/enabled state and persistent delivery/deduplication remain. Kick automatic sends now require existing Embed Links permission. Added authorized sample dashboard card and compatibility with older text-only preview responses. No new lifecycle tracking: message IDs/offline-edit support absent, so no offline message/edit or guessed VOD. `npm run check` PASS: **335 tests / 29 files**, TypeScript/lint/format; production builds, isolated PostgreSQL reliability checks and client scan PASS. Real Chrome sample preview verified; no real Discord send, save, credential/permission change or deployment. See [changed files, screenshot comparison and verification limits](KICK_NOTIFICATION_EMBEDS.md).

## Everyone permission investigation and refresh — 2026-10-18

Read-only Discord inspection confirmed the warning is accurate: NAVI's three assigned roles lack Mention Everyone/Administrator, with no applicable granting override in either saved YouTube/Kick destination; normal sending allowed, no timeout. Preserved the correct permission evaluator. Added explicit Refresh permissions with fresh authorized API/broker reads, preserved mention drafts, completion status and channel-level instructions explaining disabled Save. No real grants, settings saves, sends, credentials or deployment changes. `npm run check` PASS: **316 tests / 28 files**, TypeScript/lint/format; production builds PASS; browser verified refresh retains everyone and reports current denial. Simulated grant→refresh→save and full permission precedence tests pass. See [cause, changed files and remaining manual action](EVERYONE_PERMISSION_REFRESH.md).

## Unified notification mention dropdown — 2026-10-18

Replaced the separate YouTube everyone checkbox with No mention / @everyone / existing roles in the current dropdown for both platforms. Existing fields support canonical single-mention compatibility: old everyone opt-ins display immediately, role-only settings remain, mixed legacy settings prefer everyone without rewriting rows on read. Everyone requires current destination permission, is explicit-only and never pings on preview/test. Authorization, template/metadata safety, sender/nonce, YouTube/Kick monitoring and deduplication preserved. `npm run check` PASS: **300 tests / 27 files**, TypeScript/lint/format; production builds and actual isolated PostgreSQL reliability checks PASS. Real Chrome validated both controls and the unsaved permission-error state, then restored the original choice without saving. No new migration, real messages, credential/permission changes or deployment. See [mention contract and changed files](NOTIFICATION_MENTIONS.md).

## Subsequent YouTube local detection correction — 2026-10-18

Confirmed a 15-minute new-video discovery gap despite frequent checks of existing candidates. With no public callback configured, an 84-second completed broadcast on the correct registered channel was absent from candidates; no YouTube session or delivery existed, so deduplication was not blocking it. Effective worker key validated through actual official API 200 responses. YouTube now discovers IDs every budgeted poll (one source: 60 seconds), with a three-call quota calculation and safe API/source/startup diagnostics. Kick discovery/status, LIVE classification, queue and sender behavior remain unchanged. `npm run check` PASS: **286 tests / 26 files**, TypeScript/lint/format; all production builds PASS. Actual worker health later shows database/YouTube/Kick OK but bot unavailable, overall 503/degraded. No real message sent by this investigation, no credential/settings/database changes or public deployment. See [diagnosis, evidence limits and approved real-test steps](YOUTUBE_MONITORING_DEBUG.md). Private-beta acceptance gates remain open.

## Subsequent Discord rate-limit correction — 2026-10-18

Traced duplicate user-guild authorization reads and Strict Mode channel/role effect replay. Actual Discord guild-list responses exhausted the bucket (`remaining=0`, `reset-after=1`); final browser reads returned 200, not an observed upstream 429. Added safe structured endpoint/bucket/status diagnostics, concurrent request sharing, short display caches, bounded pacing before fresh permission checks, accurate SDK global/sublimit Retry-After and manual-refresh cooldown without an automatic request loop. Protected server access and all notification configuration/send permission checks remain fresh. Real Chrome Notifications/Overview navigation and saved channel/role controls verified; no messages or settings changed. `npm run check` PASS: **275 tests / 26 files**, TypeScript/lint/format; production builds PASS. See [evidence, changed files and limits](DISCORD_RATE_LIMIT_FIX.md). Historical real 429 attribution, multi-replica coordination and real notification soak remain unverified; beta release gates unchanged.

## Subsequent local workspace repair — 2026-10-18

Resolved Notifications workspace failure: actual PostgreSQL 42703 from the missing `notification_settings.mention_everyone` column, mapped to API 503. Verified intended local target, created an ignored pre-migration safety backup and applied the existing approved migration through 0006. No credentials/preferences changed. PostgreSQL and Redis now respond; existing session/token unexpired. Fixed the confirmed stale recovery action by using Next.js `retry` instead of boundary-only `reset`, and corrected misleading generic Discord copy. Real Chrome retry now renders saved Kick/YouTube settings and current Discord channel/role controls. `check` PASS: **263 tests / 25 files**, TypeScript/lint/format; production build and actual isolated PostgreSQL reliability checks PASS. See [diagnosis and limits](WORKSPACE_LOADING_DEBUG.md). Older infrastructure-unavailable records below remain dated evidence; this repair does not close the other beta/live-delivery gates or begin another phase.

Current assessment: **2026-10-18 (Asia/Colombo), Phase 10 — Private Beta Preparation and Real-World Monitoring**. Preparation complete for review; activation **BLOCKED / NO-GO**. Read [beta plan](PHASE_10_BETA_PLAN.md), [actual tests](PHASE_10_TEST_REPORT.md), [operations](OPERATIONS_RUNBOOK.md) and [rollback](ROLLBACK_PLAN.md). No deployment, real notification or public launch occurred. Entries below are dated history.

## Phase 10 current preparation

- Added read-only `beta:health` operator command with bounded authenticated health probes, finite sampling, cancellation, structured redacted UTC error/status output and safe exit codes. No automatic recovery, retries, subscriptions, sends or external collector introduced.
- Final `npm run check` PASS, exit 0: TypeScript, zero-warning lint, formatting and **261 tests / 24 files**, including 12 new operational safety/loopback/CLI tests. All native production builds PASS.
- Read-only YouTube/Kick auth/key/inventory and Discord application private/client-ID match PASS; existing bot REST health OK, allowlist present. Client scan clean: 19 assets/12 candidate fields. Environment/template and disconnected smoke checks PASS; Compose model PASS.
- Actual health CLI reports degraded: web unavailable, bot OK, worker disabled; two bounded samples terminate with exit 1 as designed. Database ECONNREFUSED and isolated external integration command exit 1. Docker engine absent; web HTTPS/public callback settings absent. No real livestream, receipt, latency, soak, restart persistence or backup restore verified.
- Four moderate dependency advisories remain, no high/critical. Phase 9 major acceptance gates not closed. Exact approved guild/channels/broadcaster names are pending; no sends or route/credential/Portal changes made.
- Prepared controlled tests, private access/Portal/HTTPS steps, incident/rollback/backup guidance and source hash evidence. No production infrastructure/DNS/billing change, Public Bot enablement, access expansion or phase beyond Phase 10.

## Phase 9 current verification

- `npm run check` PASS, exit 0: TypeScript, zero-warning lint, formatting, **249 tests / 23 files**. `npm run build` PASS for shared packages, Next.js, bot and worker.
- Example/auth environment checks, disconnected bot/worker smoke checks and production Compose model validation PASS. Client asset scan: 19 files, 12 configured candidate fields, no exact secret matches.
- Real Chrome checks passed for compiled home/login navigation, unavailable-database error recovery, unauthenticated dashboard/server notification redirects and privacy navigation. Ten native HTTP checks passed, including expected 401/403/404 and database-outage 500. These used synthetic credentials with HTTP development auth posture; successful real OAuth/production HTTPS is not claimed.
- Actual read-only YouTube channels authentication, Kick app-token/inventory/hosted key and Discord bot identity/application comparison PASS. Configured client ID matches the existing private application. Existing bot private REST health returns 200/ok; no fresh Gateway visual/reconnect claim.
- `npm run test:postgres` FAIL exit 1; connection diagnosis ECONNREFUSED. Docker image build FAIL exit 1 because Docker Linux engine pipe is absent. Actual migrations through 0006, external persistence/restart/restore, container startup/TLS and process recovery remain BLOCKED.
- Dependency advisory command FAIL exit 1: four moderate Drizzle/esbuild-chain findings, zero high/critical. No dependency or credential changed.
- Monitoring remains disabled, worker absent and public callback configuration absent. No approved live targets/accounts were supplied during this run. No real message, controlled stream start or external webhook receipt verified. Full private beta acceptance remains NO-GO; no production deployment occurred.
- Maintained additions: `PHASE_09_TEST_REPORT.md`, `RELEASE_READINESS.md`, sanitized `evidence/phase09-results.json` and secret-free Chrome screenshot. Updated current progress/roadmap/index pointers; no application feature implemented.

Historical progress record begins below (original date 2026-10-16).

## Phase 1 historical scope

**Phase 1: Project Initialization and Environment Setup**, as explicitly authorized by the latest user request. The older roadmap calls API experiments Phase 1 and foundations Phase 2; the latest named task list controls this delivery. Existing planning documents and audit are preserved. Their pending decisions and feasibility findings are not marked resolved or approved by implication.

Status: **initialization complete; Phase 2 not started**. Live backing-service validation remains unavailable on this machine, as recorded below.

## Added foundation

- npm workspaces with `apps/web`, `apps/bot`, `apps/worker` and shared config/core/database/TypeScript packages.
- Next.js App Router placeholder and minimal website-only liveness response; loopback development/start binding.
- A disconnected discord.js client with only Guilds intent and mentions disabled, plus separate idle worker startup. No login or external API calls.
- Strict TypeScript, ESLint, Prettier, Vitest, environment schemas, root `.env.example`, `.gitignore`, local PostgreSQL/Redis Compose services and setup instructions.
- PostgreSQL tooling using Drizzle and node-postgres, empty schema, lazy pool and read-only connection check. No application tables or migrations.

The separate bot application follows the current task's explicit layout. Its eventual ownership relative to the worker (earlier architecture groups Discord behavior inside the worker) remains a future integration decision. No credentials or live data are used to settle that decision in this phase.

## Verification

Actual runtime: Node.js 25.3.0 and npm 11.15.0 on Windows. Node 24 LTS is the recommended local target. Node 24 itself was not available for a separate test run.

| Check                                     | Actual result                                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation and lockfile      | Passed; all workspace packages linked and `package-lock.json` generated                                                                                                            |
| `npm run check`                           | Passed, exit 0: shared/app/tooling TypeScript, ESLint with zero warnings, Prettier verification, Vitest                                                                            |
| Vitest                                    | **2 test files passed, 8 tests passed**; environment requirements/protocols/redaction, disconnected bot intents/mentions, worker scaffold, website liveness and lazy database pool |
| `npm run build`                           | Passed, exit 0: shared packages, Next.js production build, bot and worker TypeScript builds                                                                                        |
| `npm run env:check:example`               | Passed, exit 0; validates template without service connections or creating `.env`                                                                                                  |
| Bot and worker source startup             | Both `npm run smoke --workspace=...` commands passed with local URL environment values; no service connections                                                                     |
| Compiled bot and worker startup           | Both `node apps/.../dist/index.js --smoke` commands passed                                                                                                                         |
| Production website startup and HTTP       | Passed: `GET /` returned 200 with project name; `GET /api/health` returned 200 with scaffold status and `Cache-Control: no-store`; test server stopped afterward                   |
| Drizzle configuration/empty-schema export | Passed, exit 0 using `npm exec --workspace=@navi/database -- drizzle-kit export --config=drizzle.config.ts`; no SQL/migration generated and no DB connection                       |
| `npm audit --omit=dev --json`             | Passed, exit 0: **0 production vulnerabilities**                                                                                                                                   |
| Full dependency audit                     | Exit 1: **4 moderate development-only findings**, no high/critical findings; see below                                                                                             |
| `npm run db:check`                        | Exit 1: local PostgreSQL connection failed at the documented development endpoint; the check reported a redacted error and terminated                                              |
| Docker/Compose and live Redis             | Not verified: `docker`, `psql` and `redis-cli` are not on PATH; no working local backing services were supplied                                                                    |

Tests initially hit Windows execution-sandbox temporary-file rename restrictions. Running the final check outside that sandbox passed. HTTP checks likewise passed after placing the test server/client outside sandbox network isolation. These are verification-environment limitations, not disabled project checks. An initial shared literal-type inference error and Next config module-loading error were corrected before the passing runs.

The dependency audit initially reported high/critical development findings. Vitest was updated to compatible patched 4.1.12; an unused Next ESLint preset chain was removed in favor of standard ESLint/TypeScript rules. Remaining findings are Drizzle Kit → legacy esbuild-kit loader → esbuild (GHSA-67mh-4wv8-2f99), counted across four dependent packages. npm offers a breaking Drizzle Kit downgrade, which was not applied. No Drizzle Studio or esbuild serving endpoint is configured. This development-tool debt remains documented, not represented as fixed.

No domain schema, migration, real credential, `.env`, cloud resource, provider subscription or Discord message was created. Original planning files and audit remain unchanged; the original eight planning hashes match the earlier audit baseline.

## Changed-file summary

- Root: npm workspace manifest/lockfile, ESLint/Vitest/tooling TypeScript configuration, Prettier/EditorConfig, `.nvmrc`, `.env.example`, `.gitignore`, `compose.yaml`, and local setup `README.md`.
- `apps/web`: package/configuration, Next App Router layout/page/styles and liveness route.
- `apps/bot`: package/TypeScript configuration, disconnected client factory and lifecycle entry point.
- `apps/worker`: package/TypeScript configuration, scaffold factory and lifecycle entry point.
- `packages/tsconfig`, `packages/config`, `packages/core`: shared strict configuration, per-service environment validation/loading, common service status and process shutdown support.
- `packages/database`: Drizzle configuration, lazy PostgreSQL factory, read-only connectivity script and empty schema marker.
- `scripts/check-env.ts`, `tests/environment.test.ts`, `tests/scaffold.test.ts`: environment validation CLI and eight basic smoke/validation tests.
- This progress record; existing reviewed planning/audit documents were not rewritten.

## Follow-up required before later integration

Start local development PostgreSQL/Redis via the README, then rerun `npm run db:check` and inspect `docker compose ps`. No live database/Redis behavior is claimed by the passing unit tests. Resolve the relevant planning-audit decisions before adding OAuth2, domain migrations, queues or provider/delivery behavior. This phase's authorization covers initialization only.

## Deferred

Discord OAuth2/install flows, live bot connection, provider APIs and feasibility experiments, webhooks, source resolution, polling, notification delivery, queue processing, domain schema and tenant policies. The planning audit's critical and major findings remain open; none are bypassed by introducing application behavior in this phase.

## Phase 2 — Discord OAuth2 authentication and bot installation

Current status: **implementation and automated verification complete; live Discord and external PostgreSQL acceptance pending configuration**. Phase 3 has not started. This entry supersedes the Phase 1 current-scope/status statements above, which remain historical evidence.

The user explicitly selected Better Auth on 2026-10-16. Official Discord and Better Auth documentation was checked for scopes, redirects, guild permissions, installation and adapter/session behavior. Current phase numbering is in `DEVELOPMENT_ROADMAP.md`; setup, security choices and source links are in `PHASE_02_AUTHENTICATION.md`.

### Delivered

- Better Auth Discord authorization-code login and logout, browser-bound one-use state, fixed redirect/return destinations, `identify guilds` only and a personal Discord-ID allowlist.
- PostgreSQL/Drizzle-backed 24-hour absolute sessions, encrypted provider access/refresh tokens, HttpOnly/SameSite cookies and HTTPS Secure cookies. The library-native opaque session token schema replaces the earlier draft's proposed custom hashed-token scheme; this technical decision is explicit in the authentication document.
- Safe identity endpoint, protected dashboard/server pages, fresh backend owner/Administrator/Manage Guild checks, and rejection of unauthorized direct guild IDs. No browser-supplied permissions are trusted.
- Server-authorized installation redirects with permission mask 19456 and backend installation verification through a bearer-authenticated loopback bot service. Unavailable/invalid credentials and API failures preserve unknown status.
- Provider timeout/error handling and Retry-After cooldowns; process-local auth rate limits. Public Better Auth token/account endpoints are blocked.
- Four authentication tables and a reviewed SQL migration, selective per-process environment loading, service-specific templates and redacted malformed-URL errors. Existing private `.env` was preserved.

### Actual Phase 2 verification

Runtime: Node.js 25.3.0/npm 11.15.0 on Windows. Node 24 was not separately tested. Some checks required execution outside Windows sandbox restrictions; no checks were disabled.

| Check                                             | Result                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                   | TypeScript, ESLint with zero warnings, Prettier and Vitest passed; **5 test files, 27 tests passed**                                                                                                                                                                                                                          |
| `npm run build`                                   | Shared packages, Next.js production build, bot and worker passed without build warnings                                                                                                                                                                                                                                       |
| OAuth/session tests                               | Actual Better Auth engine with mocked Discord: successful login/logout, denied/cancelled/token failures, allowlist, state tampering/binding/replay/expiry, session expiry, minimal scopes and fixed redirects                                                                                                                 |
| Authorization/install tests                       | Permissions including BigInt, protected requests, unauthorized IDs, permission removal, CSRF origin, minimal install URL, broker authentication, installation states, upstream errors/rate limits                                                                                                                             |
| PostgreSQL adapter/migration                      | Embedded PostgreSQL applied actual migration SQL; production Drizzle adapter completed mocked OAuth, persisted encrypted tokens, read an authenticated session, used the decrypted token server-side and deleted the session on logout                                                                                        |
| Local Next.js HTTP checks                         | `/`, `/login`, `/api/health` returned 200; `/api/me` and `/api/guilds` returned 401 without a session; both dashboard routes redirected 307 to login; private token API returned 404. Used synthetic credentials, no provider requests                                                                                        |
| `npm run env:check:example`                       | Passed; no services contacted                                                                                                                                                                                                                                                                                                 |
| Full and `--omit=dev` npm audits                  | Exit 1: four moderate findings in Drizzle Kit → esbuild-kit → esbuild, zero high/critical. Better Auth's optional Drizzle Kit peer now includes this CLI chain in the production dependency graph. This supersedes Phase 1's production-clean result. No affected tooling server is configured; no breaking downgrade applied |
| Live Discord/browser consent and bot installation | Not executed: real OAuth credentials, bot token and test-account configuration were not supplied                                                                                                                                                                                                                              |
| External PostgreSQL/Compose deployment            | Not executed: no Docker/psql tools or working external PostgreSQL were available. Embedded PostgreSQL is adapter evidence, not deployment evidence                                                                                                                                                                            |

### Files created and modified

- `apps/web/src/lib`: auth factory/runtime/public-handler boundary, Discord REST client, safe errors, guild authorization and testable API handlers; page-session redirects.
- `apps/web/src/app`: auth/identity/guild/install routes, login, dashboard, per-server status and access/error pages; homepage/styles; `src/components/auth-buttons.tsx`.
- `apps/web/package.json`, `next.config.mjs`: Better Auth/adapter/database dependencies, server-only boundaries and response/logging settings. Next generated `apps/web/AGENTS.md` during the HTTP smoke run.
- `apps/bot/src/status-server.ts` and `index.ts`: loopback status broker, Discord REST membership checks and lifecycle cleanup. Worker startup only changes environment loading.
- `packages/database/src/{schema,index,check}.ts`, Drizzle config, authentication SQL and migration metadata.
- `packages/config/src/index.ts`, `scripts/check-env.ts`, root/web manifests and lockfile, `.env.example`, `.env.web.example`, `.env.bot.example`, `.gitignore`.
- Auth, guild and embedded PostgreSQL tests; environment regression tests. Root README, current roadmap, this progress record, Phase 2 authentication document and relevant planning architecture/schema/decision notes. Historical audit reports were preserved.

### Remaining acceptance and boundaries

Configure the Discord Developer Portal and local secrets as documented, start PostgreSQL, inspect/apply the migration, then verify real browser consent, denial/logout and real bot installation/removal in your test server. The personal allowlist is intentional; public/multi-instance rollout requires reviewed access policy, shared rate limiting and separate-host service authentication/transport. The current bot broker supports one local machine only.

No YouTube/Kick integration, detection, streamer management, notification settings, queues or message sending was added. Earlier provider feasibility/audit findings remain outstanding for future phases. Stop at Phase 2.

The final `npm run env:check:auth` exited 1 as expected for the unconfigured local environment, reporting only missing field names: `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS`, and `BOT_INTERNAL_SECRET`. No secret values were printed. Bot and worker source smoke commands both exited 0 without external connections. The temporary HTTP smoke server was stopped after verification.

## Phase 3 — Discord Server Selection and Web Dashboard

Date: 2026-10-16 (Asia/Colombo). **Implementation complete with available automated and local verification; live provider/database limitations remain explicit. Phase 4 is not started.** This is the current scope, superseding historical phase status statements above.

### Delivered

- Protected dashboard layout with account/logout controls, sidebar navigation, skip link and responsive desktop/mobile styles.
- Server selection cards with Discord name/icon (safe CDN URL and initials fallback), verified installed/not-installed/unavailable badges, empty state and six-server pagination. Only manageable servers are included; installation lookups are limited to three concurrent requests for the current page.
- Individually protected Overview, Streaming Channels, Notifications and Settings pages under each server ID. Every leaf checks session/allowlist and current Discord manager permissions; layout reuse or client navigation cannot grant access. No cross-request permission cache.
- Truthful configuration readiness: bot connectivity can be verified; channel registration and notification preferences remain unavailable and delivery remains inactive. No settings writes, domain schema or provider integration was added.
- Loading, unauthorized-access, error/retry and unavailable connection states. Ordinary navigation anchors issue fresh requests; unknown bot status offers refresh rather than asserting absence.
- Phase 2 audit prerequisites corrected: safe refresh-error classification and token cooldown, sanitized idle/checked-out DB error handling, and PostgreSQL-backed per-account coordination around protected token reads. Details and evidence limits are in `PHASE_03_DASHBOARD.md`. The original audit remains historical; this is not a formal re-audit PASS.

### Actual verification

Runtime: Node.js 25.3.0/npm 11.15.0, Windows. No dependency or lockfile change. Execution outside Windows sandbox restrictions was used for checks/builds and loopback HTTP inspection.

| Check                             | Result                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                   | **PASS, exit 0**: TypeScript, ESLint with zero warnings, Prettier and Vitest                                                                                                                                                                                                                                                                        |
| Vitest                            | **8 test files, 49 tests passed**; 22 tests added beyond the Phase 2 suite                                                                                                                                                                                                                                                                          |
| New dashboard tests               | Rendered selection/status/empty/configuration states, safe icons, navigation scoping, six-server paging/concurrency, all four leaf pages, permission revocation, removed allowlist access, unauthorized guild IDs and missing sessions                                                                                                              |
| Authentication recovery tests     | Real Better Auth engine with mocked Discord: successful single-use refresh rotation, simultaneous expired-token requests produce one exchange, revoked grant produces 401, network/503 failures produce 503 without deleting the session, 429 preserves delay and prevents repeated exchanges, account DB failure is not converted to invalid login |
| Database recovery tests           | Child process survives idle pool error without printing the sentinel secret; lock cleanup on operation failure; broken/unlock-failed connections discarded; checked-out connection loss fails the request closed. PostgreSQL advisory responses are emulated in these tests                                                                         |
| Existing embedded PostgreSQL test | Still passes real auth migration SQL, Drizzle adapter, encrypted tokens and session login/logout; it does not execute the new native advisory-lock SQL                                                                                                                                                                                              |
| `npm run build`                   | **PASS, exit 0**: shared packages, Next production routes, bot and worker; no build warnings                                                                                                                                                                                                                                                        |
| Production HTTP                   | **12 checks passed**: public home/login/health 200; picker and all four server pages redirect unauthenticated requests to login, including page 2; identity/guild/status APIs return 401; no fixture server data exposed                                                                                                                            |
| Responsive inspection             | Desktop and 390-pixel iframe fixture views visually inspected. Real selection/workspace components and CSS, synthetic wrapper/sidebar. Cards stack and navigation remains visible; not live authenticated E2E or a complete accessibility audit                                                                                                     |
| `npm run env:check:example`       | **PASS, exit 0**; no services contacted                                                                                                                                                                                                                                                                                                             |
| `npm audit --omit=dev --json`     | **Exit 1**: four known moderate Drizzle Kit/esbuild-chain findings, zero high/critical. No affected tooling server exposed; no breaking downgrade applied                                                                                                                                                                                           |

A temporary fixture generator/server was kept under ignored `.local/`, with synthetic server/account names and no production route or auth bypass. The temporary browser tab, fixture server and production HTTP test server were closed/stopped. Private environment files were preserved. Initial test-fixture typing/lint errors and a redundant test-transform warning were corrected before the final passing checks.

### Files created and modified

Created:

- `apps/web/src/app/dashboard/layout.tsx`, `loading.tsx`, and server-specific `streaming-channels/page.tsx`, `notifications/page.tsx`, `settings/page.tsx`.
- `apps/web/src/app/error.tsx`; `apps/web/src/components/dashboard-nav.tsx`, `guild-icon.tsx`, `server-selection.tsx`, `server-workspace.tsx`.
- `apps/web/src/lib/dashboard-data.ts`, `dashboard-model.ts`, `oauth-recovery.ts`.
- `packages/database/src/account-lock.ts`.
- `tests/dashboard.test.tsx`, `auth-recovery.test.ts`, `database-recovery.test.ts`.
- `docs/PHASE_03_DASHBOARD.md`.

Modified:

- Dashboard root/server overview pages, dashboard error boundary and global stylesheet.
- Web auth factory, runtime and guild service; shared database pool factory.
- `vitest.config.ts`, `tsconfig.tools.json` for TSX regression tests.
- Root README, docs index, architecture scope note, current roadmap, Phase 2 setup cross-reference, decision update and this progress record.

### Remaining limitations

Real Discord consent/logout, bot installation/removal and two-guild browser testing still require the configured Portal application and credentials. External PostgreSQL connection/migration, real cross-process advisory lock contention, backend interruption/recovery and Node 24 validation remain unverified; this phase does not claim those checks passed. In-flight provider exchanges cannot be atomically committed with a lost PostgreSQL lock connection; no exactly-once refresh guarantee is claimed for that failure mode.

Cooldowns are process-local, and the bot broker is loopback-only. Public/multi-host rollout needs a separately reviewed deployment and limiter design. Initial OAuth exchange/profile deadlines, broader browser/accessibility tests, complete config-consistency diagnostics and the moderate tooling advisories remain follow-up items. Historical provider feasibility findings remain open.

No YouTube/Kick registration, livestream detection, notification preferences or actual message delivery was implemented. Stop at Phase 3.

## Phase 4 — YouTube and Kick Streamer Registration

Date: **2026-10-17 (Asia/Colombo)**. The user's explicit Phase 4 instruction authorizes this implementation after the Phase 3 audit. **Implemented for local development; stopped after Phase 4.** Phase 5 is not authorized. Live acceptance remains blocked by local service/credential setup.

### Implemented behavior

- Protected server-specific Streaming Channels page with platform selection, bounded identifier input, official account resolution, public identity preview and explicit confirmation; list/add/enable/disable/remove controls with loading, success, empty and safe error states.
- YouTube public `channels.list` by handle or stable ID; Kick public channel lookup by slug using a server-side client-credentials app token. Current official API references and unresolved live limits are recorded in [the Phase 4 contract](PHASE_04_STREAMER_REGISTRATION.md). No scraping, Google OAuth, delegated Kick login or unsupported endpoint was substituted.
- Shared stable `provider_channels` and separate `streamer_subscriptions`; database uniqueness prevents alias/racing duplicates per guild. Guild/subscription predicates enforce isolation. Kick integer IDs are parsed losslessly. Configurable global development cap defaults to 10 sources, including disabled subscriptions; registry writes/cap checks are serialized in short transactions.
- Every read/lookup/write uses current Discord session, allowlist and manager authorization. Exact-Origin checks, bounded streamed JSON, fixed provider origins, redirect rejection, provider deadlines/response bounds, safe errors, per-user lookup limits and provider cooldowns protect the registration boundary. Actor/guild-bound signed ten-minute receipts prevent browser substitution of resolved identity fields.
- Minimal privacy/terms notices and explicit lookup consent address planning-audit M11's notice timing. Metadata expires after 29 days; expired identities/subscriptions are pruned on list/add or by a standalone command. Daily maintenance and backup/deletion handling remain documented operator duties, including while the application is stopped. No maintenance scheduler is installed or implied.
- Enabled registrations are visibly **not monitored**. Bot installation-status responsibilities and idle worker behavior are preserved. No detection, event/webhook subscriptions, polling, preferences or message delivery were implemented. The Phase 3 short-height sidebar issue is corrected with desktop overflow scrolling; broader accessibility/live-browser follow-ups are not declared closed.

### Actual verification

Runtime: **Node.js 25.3.0/npm 11.15.0 on Windows**. Required process/network checks used execution outside Windows sandbox restrictions where necessary. Existing secret files were not modified, real provider calls were not made, and no external database migration/cleanup was attempted.

| Check                         | Actual result                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`               | **PASS, exit 0**: TypeScript, ESLint with zero warnings, Prettier and automated tests.                                                                                                                                                                                                                                                           |
| Vitest                        | **PASS: 12 files, 103 tests**; 54 cases beyond the Phase 3 suite.                                                                                                                                                                                                                                                                                |
| Provider/input tests          | YouTube handle/ID lookup, international/URL inputs, Kick username resolution and exact large ID retention; invalid/SSRF formats, empty/unavailable accounts, missing credentials, malformed/oversized responses, network errors, 429 cooldown, exhausted quota, cached/concurrent/expired Kick tokens and one 401 renewal. HTTP is mocked.       |
| Authorization/API tests       | Fresh checks on list/resolve/add/change/remove, missing sessions, denied/revoked access, actor/guild/expiry/signature binding, supplied-ID substitution, bounded body/CSRF/consent/PATCH validation, rate limiting, duplicates and redacted failures.                                                                                            |
| PostgreSQL registration tests | Real auth and Phase 4 SQL applied to embedded PGlite; actual Drizzle repository queries verify shared identities, original identifier persistence across repository instances, two-guild isolation, existing/fresh racing duplicates, DB uniqueness, enable/disable/remove, last-reference deletion, expiry cascade and global source cap/reuse. |
| Hydrated UI tests             | Actual React component in jsdom exercises resolve → confirm → list → disable → enable → remove, safe rendering, changed-input/platform/cancel behavior, loading and retry/session/not-found/duplicate errors. No real browser or live OAuth claim.                                                                                               |
| `npm run build`               | **PASS, exit 0**: shared packages, Next.js production build including registration API/page and notices, bot and worker.                                                                                                                                                                                                                         |
| `npm run db:generate`         | **PASS**: created/reviewed Phase 4 migration; subsequent run reports no schema changes. Generated migration renamed descriptively with matching Drizzle journal; embedded tests apply that exact SQL.                                                                                                                                            |
| `npm run env:check:example`   | **PASS, exit 0**; scaffold validation only. Provider options/cap separately validated by unit tests and runtime parser.                                                                                                                                                                                                                          |
| Bot and worker smoke commands | **PASS, exit 0** for both; report initialized/scaffold and perform no provider/delivery work.                                                                                                                                                                                                                                                    |
| Browser bundle inspection     | No provider token/lookup endpoints or provider credential-setting names in `.next/static`. Existing Better Auth generic code contains `BETTER_AUTH_SECRET` as a setting name; no secret value disclosure was demonstrated.                                                                                                                       |
| `npm run env:check:auth`      | **FAIL, exit 1**: missing/invalid `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS.0`, `BOT_INTERNAL_SECRET`. Values were not printed.                                                                                                                                                              |
| `npm run db:check`            | **FAIL, exit 1**: configured external PostgreSQL is unreachable; redacted diagnostic. External migration/CRUD was not claimed.                                                                                                                                                                                                                   |
| `npm audit --omit=dev --json` | **FAIL, exit 1**: four known moderate findings in Drizzle Kit's legacy esbuild chain; zero high/critical. No additional finding from Phase 4 additions, and no forced breaking downgrade.                                                                                                                                                        |

An initial test run had one outdated Phase 3 assertion expecting registration to be unavailable (99 passed/1 failed); it was corrected to expect the channel registry and truthful unmonitored state. Intermediate type/format checks caught optional-field typing and generated-metadata formatting issues; these were fixed before the final passing checks above.

### Files created

- `apps/web/src/lib/streamer-input.ts`, `streamer-providers.ts`, `streamer-service.ts`, `streamer-http.ts`: validation, official HTTP adapters, authorization/confirmation and HTTP contract.
- `apps/web/src/app/api/guilds/[guildId]/streamers/route.ts`, `resolve/route.ts`, `[subscriptionId]/route.ts`: registration API endpoints.
- `apps/web/src/components/streamer-manager.tsx`: interactive registration/CRUD dashboard.
- `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`: local notices and platform links.
- `packages/database/src/streamers.ts`, `prune-streamers.ts`: scoped repository and redacted maintenance CLI.
- `packages/database/migrations/0001_phase04_streamers.sql`, `meta/0001_snapshot.json`: domain migration and Drizzle snapshot.
- `tests/streamer-providers.test.ts`, `streamer-service.test.ts`, `streamer-persistence.test.ts`, `streamer-ui.test.tsx`: API/security/persistence/hydrated UI coverage.
- `docs/PHASE_04_STREAMER_REGISTRATION.md`: current contract, official API evidence, setup, lifecycle operations and limitations.

### Files modified

- Root `package.json`, `package-lock.json`, `apps/web/package.json`, `packages/database/package.json`: `lossless-json` 4.3.2 runtime dependency, jsdom 29.1.1/types for hydrated tests, cleanup script and lockfile.
- `packages/config/src/index.ts`: web-only provider fields, optional provider validation and bounded source limit; bot/worker do not receive provider secrets.
- `packages/database/src/schema.ts`, `src/index.ts`, `migrations/meta/_journal.json`: identity/subscription tables, constraints/exports and migration entry.
- `apps/web/src/lib/runtime.ts`, `dashboard-data.ts`: production service/repository wiring and protected registration reads.
- `apps/web/src/components/server-workspace.tsx`, `apps/web/src/app/dashboard/[guildId]/streaming-channels/page.tsx`: real channel registry replaces the placeholder; overview copy updated.
- `apps/web/src/app/layout.tsx`, `globals.css`: notice navigation, responsive registration styles and short-height sidebar scrolling.
- `.env.example`, `.env.web.example`: optional server-side platform credentials and source-limit examples; no real secrets.
- `tests/dashboard.test.tsx`, `tests/environment.test.ts`: Phase 4 route expectations and provider configuration/isolation coverage.
- `README.md`, `docs/README.md`, `02-api-research.md`, `03-architecture.md`, `04-database-schema.md`, `05-security-and-risks.md`, `07-decisions.md`, `DEVELOPMENT_ROADMAP.md`, `PHASE_03_DASHBOARD.md`, and this progress file: current scope/setup/contracts. Historical audit findings and the original roadmap are preserved.

### Remaining acceptance and risks

Real Discord login/two-guild browser actions, Google/Kick credentialed lookups and external PostgreSQL migration/CRUD remain unverified until configuration/services are supplied. Independent-process PostgreSQL lock contention/restart behavior and Node 24 remain untested. jsdom interaction coverage is not mobile-browser visual or full accessibility certification. Existing auth/provider feasibility/audit follow-ups remain where unrelated to registration.

Kick app eligibility and practical limits need account-specific verification. Account resolution does not validate future webhook permissions or stream detection. YouTube discovery/coverage and notification semantics remain future gates. Local in-memory limits reset with process restart and need a shared design before public/multi-host use. Metadata physical deletion depends on the documented operator maintenance while offline; backup/deletion and policy review remain explicit gates before real-data/public operation.

Stop after Phase 4. No Phase 5 work was started.

## Phase 5 — Discord Notification Settings and Configuration

Date: **2026-10-17 (Asia/Colombo)**. The user's subsequent instruction authorizes configuration, previews and explicit test messages as Phase 5, overriding older detection-phase numbering. **Implemented for local development and stopped after Phase 5.** No Phase 6, automatic YouTube/Kick detection, provider event subscriptions or automatic message delivery was started.

### Implemented functionality

- Protected per-server Notifications page with a separate destination, message template, optional safe role mention and enabled preference for each existing streamer subscription. YouTube and Kick entries can use different channels. Saved settings, loading/empty/success/error states, unavailable channels/roles and removed-bot repair guidance are provided.
- Current writable ordinary text channels and eligible roles are retrieved through the existing private bot broker. The bot evaluates BigInt base permissions and everyone/combined-role/member overwrites. It revalidates the target guild, channel and mentionable unmanaged role before each explicit test. No Administrator/Mention Everyone permission, new OAuth scope or Gateway connection was introduced.
- Shared validation/rendering for `{streamer}`, `{platform}`, `{title}`, `{url}`. Server-authorized previews use clearly labelled sample data and send nothing. Templates reject unsupported braces, raw mentions and invalid controls. Dynamic metadata cannot add pings. Test messages have explicit allowed_mentions, no users/everyone/reply mentions, optional selected role only, suppressed embeds and a bounded Unicode-safe body.
- PostgreSQL `notification_settings` reuses the existing subscription model with a composite guild/subscription FK, enabled=false default and optimistic versions. Registration removal/expiry cascades settings. A successful save returns the committed row directly; new UI controls do not require a subsequent GET to show it.
- Exact-Origin, bounded JSON and current session/allowlist/Discord manager checks protect every backend operation. Subscription and channel/role IDs from the browser are not authority. The bot alone retains its token; web holds only the existing shared loopback credential. Installation status and new notification operations share one bot REST client for local rate-limit coordination.
- Explicit labelled test sends use saved settings, a database-backed 30-second per-server admission limit, seven-day request binding/deduplication and pending/sent/failed/uncertain outcomes. Replayed admitted requests are not sent again. No automatic retry/resumption is performed; unknown acceptance and failed outcome persistence surface uncertainty. Discord's bounded nonce protection is additional protection, not a permanent exactly-once promise.
- Safe restrictive disable accepts no new destination/role/template values and works after bot removal, while still checking the user's current management access. Explicit tests remain available for disabled preferences, with their real-message/role-mention behavior disclosed.
- Existing daily pruning also removes expired test history. Privacy/terms, migration instructions and architecture records reflect the new data and explicit sends. No new external dependency or unrelated redesign was added; the database package declares its existing shared `@navi/core` workspace dependency.

### Actual verification

Runtime: **Node.js 25.3.0/npm 11.15.0 on Windows**. Required test/build/network execution used appropriate Windows process access. Existing secret files were not changed. All Discord message operations in tests were mocked; the real loopback adapter test used a mocked Discord REST implementation. No message was sent to a real Discord server during development.

| Check                             | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                   | **PASS, exit 0**: shared/workspace/tooling TypeScript, ESLint with zero warnings, Prettier and automated tests.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Vitest                            | **PASS: 15 files, 141 tests**; 38 cases added beyond Phase 4. Existing OAuth/session/install/dashboard/registration/recovery tests remain green.                                                                                                                                                                                                                                                                                                                                                                                         |
| Shared safety and bot tests       | Template/type/variable/control validation; mention neutralization and explicit allowlists; Unicode/message length; overwrite precedence, Administrator/timeout/type filtering; writable text channel and eligible role selection; forged/revoked channels/roles; authenticated broker, actual loopback POST forwarding and nonce-labelled messages.                                                                                                                                                                                      |
| Composed notification integration | Actual guild-authorization service with simulated auth/user-guild responses; real SQL/Drizzle in PGlite; actual web route/service → broker handler → bot permission service → mocked Discord POST. Verifies different platform destinations, restore, cross-guild access/FK rejection, missing/revoked sessions, malicious IDs, preview isolation, Origin/template/version checks, saved-only test sends, replay/competing claims/cooldown, channel/role/bot removal, safe disable, uncertainty/history expiry and registration cascade. |
| Hydrated UI tests                 | jsdom React interaction covers channel loading/selection, save/restore, preview, explicit test, dirty-state gating, empty/unavailable states, recovery, safe disable without a bot, stale-preview clearing, role/session and uncertain-result guidance. This is not real browser/TLS/Discord E2E.                                                                                                                                                                                                                                        |
| `npm run build`                   | **PASS, exit 0**: shared packages, Next.js production routes/pages, bot and worker.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm run db:generate`             | **PASS**: created migration; subsequent invocation reports no schema changes. Reviewed SQL was renamed to `0002_phase05_notifications.sql` with matching journal entry; referenced composite unique index moved before FK creation. Final SQL passes embedded PostgreSQL application.                                                                                                                                                                                                                                                    |
| `npm run env:check:example`       | **PASS, exit 0**; scaffold validation only, no live services contacted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Bot/worker smoke commands         | **PASS, exit 0** for both; initialized/scaffold without Gateway login, monitoring or sends.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Built frontend scan               | Zero `.next/static` files matched `DISCORD_BOT_TOKEN`, `BOT_INTERNAL_SECRET` or the internal guild broker path. No bot secret disclosure demonstrated.                                                                                                                                                                                                                                                                                                                                                                                   |
| `npm run env:check:auth`          | **FAIL, exit 1**: missing/invalid `BETTER_AUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS.0`, `BOT_INTERNAL_SECRET`. Only names were printed.                                                                                                                                                                                                                                                                                                                                                      |
| `npm run db:check`                | **FAIL, exit 1**: configured external PostgreSQL is unreachable. No real migration, pruning or persistent live settings/test send was attempted.                                                                                                                                                                                                                                                                                                                                                                                         |
| `npm audit --omit=dev --json`     | **FAIL, exit 1**: four existing moderate Drizzle Kit/esbuild-chain findings, zero high/critical. No new external package was introduced or forced breaking remediation applied. The earlier offline lockfile command's empty advisory result is not treated as vulnerability evidence.                                                                                                                                                                                                                                                   |

Intermediate checks found a test-only ES2024 string-method typing mismatch, a control-character-regex lint error and formatting omissions; these were corrected before the final passing checks. Generated migration ordering was corrected before its embedded SQL test. Production builds do not establish live authentication, Discord permissions, delivery or external PostgreSQL readiness.

### Files created

- `packages/core/src/notifications.ts`: shared DTOs, typed safe errors, template/identity/target validation and sample rendering.
- `packages/database/src/notifications.ts`, `packages/database/migrations/0002_phase05_notifications.sql`, `migrations/meta/0002_snapshot.json`: scoped settings repository, versioning, test admission/outcomes and reviewed schema migration.
- `apps/bot/src/notifications.ts`: current guild/role/channel/member reads, overwrite evaluation and safe explicit Discord POST.
- `apps/web/src/lib/notification-broker.ts`, `notification-service.ts`, `notification-http.ts`: private bot client, authorized settings/preview/test/disable logic and bounded HTTP adaptation.
- `apps/web/src/app/api/guilds/[guildId]/notifications/route.ts`, `targets/route.ts`, `[subscriptionId]/route.ts`, `[subscriptionId]/preview/route.ts`, `[subscriptionId]/test/route.ts`, `[subscriptionId]/disable/route.ts`: protected API endpoints.
- `apps/web/src/components/notification-manager.tsx`: settings editor and preview/test/recovery states.
- `tests/notification-fixtures.ts`, `notification-safety.test.ts`, `notifications.test.ts`, `notification-ui.test.tsx`: shared fixtures, permission/safety, composed persistence/authorization/test-send and hydrated interaction coverage.
- `docs/PHASE_05_NOTIFICATION_SETTINGS.md`: current implementation/API/security/lifecycle/setup contract and official references.

### Files modified

- `packages/core/src/index.ts`; `packages/database/src/schema.ts`, `src/index.ts`, `src/prune-streamers.ts`, `package.json`, `migrations/meta/_journal.json`; root `package-lock.json`: shared exports, new tables/composite index, test retention and workspace dependency metadata.
- `apps/bot/src/index.ts`, `status-server.ts`: shared REST client/service bootstrap and bounded/authenticated broker POST/GET support.
- `apps/web/src/lib/runtime.ts`, `errors.ts`, `dashboard-data.ts`, `dashboard-model.ts`: runtime wiring, safe notification errors, protected reads and current scope copy.
- `apps/web/src/app/dashboard/[guildId]/notifications/page.tsx`, `src/components/server-workspace.tsx`, `src/app/globals.css`: real protected editor, overview copy and responsive input/preview styles.
- `apps/web/src/app/privacy/page.tsx`, `terms/page.tsx`, `.env.example`: actual test behavior, settings/history disclosure and bot capability comment; no secret values.
- `tests/dashboard.test.tsx`: notification-page runtime fixture while preserving session/authorization regressions.
- `README.md`, `docs/README.md`, `03-architecture.md`, `04-database-schema.md`, `05-security-and-risks.md`, `07-decisions.md`, `DEVELOPMENT_ROADMAP.md`, `PHASE_04_STREAMER_REGISTRATION.md` and this progress file: current setup, scope and evidence. Historical audit files remain unchanged.

### Remaining risks and acceptance

Live Discord browser login, actual channel/role eligibility, real labelled message/mention behavior and two-guild workflows remain unverified until local credentials/services are configured. External PostgreSQL deployment, restart and independent-process contention, Node 24, clean-install CI and real device/accessibility QA are not claimed. Embedded tests and mock provider requests are labelled accordingly.

Permissions can change after a point-in-time check; Discord's POST response remains authoritative. Tests already initiated cannot be recalled by later disabling settings. A new explicit attempt after an uncertain result can duplicate an accepted message, so operator inspection is required; no permanent exactly-once assertion is made. Test UUID deduplication and cooldown data have a seven-day retention window. Daily cleanup and backup/deletion remain operator duties while offline.

The bot broker remains single-host/loopback-only. Existing moderate tooling advisories and registration-specific Phase 4 minor findings remain open; this phase avoids the post-save refresh pattern and adds composed coverage for notifications without claiming unrelated registration fixes. Future automatic-send coordination, effective activation/baseline semantics, provider discovery coverage and event authorization remain separate design/feasibility gates. No automatic detection or delivery is enabled.

Stop after Phase 5; wait for review. No Phase 6 work was started.

## Discord Developer Portal configuration review — 2026-10-17

Reviewed the authenticated existing NAVI application and local environment against current official Discord documentation. See [configuration review and operator instructions](DISCORD_CONFIGURATION_REVIEW.md). Confirmed public application/client ID `REDACTED_DISCORD_ID`, Guild Install enabled, confidential client, code grant off and all privileged intents off. Confirmed missing OAuth redirect and default Guild Install containing only `applications.commands`; Public Bot and User Install are enabled despite the personal testing scope. The existing website's explicit bot install URL already uses the correct scope and permission mask.

No Portal setting, credential, application code, database migration or Discord message was changed. Required local auth values and bot token are absent; PostgreSQL connectivity fails. No live or post-configuration login/install/delivery acceptance is claimed.

Actual checks: typecheck/lint/format passed in `npm run check`; its initial test run was blocked by sandbox EPERM renaming temporary files before any tests executed. Retried `npm test` outside that restriction: **141 tests / 15 files passed**, exit 0. Production build, example environment check and bot/worker smoke commands passed, exit 0. Auth environment check and PostgreSQL connection check failed, exit 1, for the documented setup gaps. Automated Discord integration uses mocked API responses; SQL integration uses PGlite. Source regression checks pass; live readiness fails pending configuration and manual acceptance. No subsequent phase was started.

## Discord OAuth login debugging — 2026-10-17

The current environment validates and PostgreSQL connects outside sandbox restrictions. Reproduced the reported login error at `http://127.0.0.1:3000`: the login POST returns **403 invalid_origin** because `WEB_ORIGIN` is `http://localhost:3000`. The error occurs before contacting Discord. The same POST at localhost returns 200 with the expected scopes and callback. Opened the existing browser at localhost, started a fresh login and the user completed Discord consent: the callback returned to the authenticated dashboard with four manageable servers. Boolean-only SQL checks confirmed a persisted allowed Discord account and active session, without selecting tokens/cookies.

Resolved by using the configured canonical browser origin; no application-code, secret or Portal changes were required. Added README troubleshooting and [the detailed diagnosis](OAUTH_LOGIN_DEBUG.md). Existing exact-origin/state checks remain intact. Server incoming-request and Better Auth logging are disabled, so no raw callback/upstream-status evidence is claimed. Initial sandbox DB failure was EACCES; the actual external connection passed after retry outside that restriction.

`npm run check` **PASS**, exit 0, including typecheck, lint, formatting and **141 tests / 15 files**. `npm run build` **PASS**, exit 0. Current auth environment and external PostgreSQL checks **PASS**. Real login/callback/session use and guild retrieval **PASS**. Logout, cancelled authorization, expiry, provider rate limits and production HTTPS were covered only by existing automated tests where applicable, not manually repeated here. No installation/send or subsequent-phase work was performed.

## Phase 5 audit corrections — 2026-10-17

User-authorized follow-up to `PHASE_05_AUDIT.md`, without Phase 6 authorization. The repository now returns the transaction's actual inserted/updated notification snapshot and version after commit; save and restrictive disable no longer perform a post-commit read. Guild authorization, target validation, optimistic versions and the existing broker/renderer remain unchanged.

Added 19 focused regressions: save/disable HTTP success with later reads unavailable, immutable returned versions across edits, stale writes, acknowledgment/result-storage failure, failed-send storage failure, pending-row replay through a fresh service, actual SDK permission/channel/role/guild/payload/server/rate errors and malformed/oversized public/broker bodies. Current phase-status documentation was reconciled across the index, architecture, database schema, decisions, roadmap and Phase 2–5 contracts. Historical audits retain their original results; the Phase 5 audit now identifies resolved findings and current remaining gates.

Dependency review confirms four moderate package findings descend from one legacy esbuild CORS advisory. Current stable Drizzle Kit 0.31.11 still carries the chain. The offered Kit 0.18.1 downgrade is incompatible with the current toolchain; targeted override attempts did not produce a patched installed tree and were removed. No dependency override/version change is retained, no audit-force downgrade was applied, and the advisories remain open. No esbuild serve/Studio service is configured; this exposure restriction is not a vulnerability fix.

Actual results: focused notification tests **57 passed / 3 files**; full `npm run check` **160 passed / 15 files**, TypeScript/lint/format exit 0; production build exit 0; auth environment and external PostgreSQL checks exit 0. Updated external transaction/snapshot probe passed and confirmed fixture rollback without persistent registrations/settings. Production-only npm audit remains **FAIL, exit 1**, four moderate and no high/critical findings. See the revised Phase 5 audit for current verification and manual acceptance checklist.

No credentials, Portal configuration, bot installation or real Discord message changed. Manual real-channel/role/save/reload/delivery, two-guild permission revocation and committed restart acceptance still require the operator's chosen test setup. Automated corrections pass; overall Phase 5 acceptance remains on hold for those gates and the retained dependency risk. Phase 6 was not started.

## Phase 6 — automatic YouTube/Kick detection and delivery — 2026-10-17

The user explicitly authorized Phase 6 after the earlier audit/correction records. This supersedes their older unauthorized-phase status; it does not fabricate closure of Phase 5 manual acceptance. Read [the Phase 6 implementation record](PHASE_06_IMPLEMENTATION.md) for the exact official API contract, setup, changed files and limitations. Phase 7 remains unstarted.

### Implemented

- Independent opt-in worker polls shared stable platform identities, processes authenticated webhook hints, periodically refreshes public metadata/candidates and reconciles Kick event subscriptions. Uses official YouTube channels/playlists/videos and Kick channels/users-livestreams/events/public-key APIs; no scraping, search polling, invented endpoints or streamer OAuth bypass.
- PostgreSQL `monitor_sources`, `monitor_sessions`, `monitor_receipts`, `monitor_limits` and `live_deliveries`, with reviewed `0003_phase06_monitoring.sql`/`0004_phase06_baseline.sql`, unique session/guild/destination delivery admission, persisted baseline/schedules/cooldowns and queue recovery. The concrete personal-development queue uses PostgreSQL rather than adding BullMQ. Provider metadata payloads/receipt hashes are cleaned on an hourly worker pass; hashed deduplication keys persist while the shared source exists.
- Actual LIVE proof precedes notification admission and is rechecked before sending. Shared fan-out confirmation, current settings/version/expiry, enabled subscription/preference and existing bot-side channel/role checks govern sends. Existing shared renderer/broker/Discord REST service now supports real title/URL rendering while preserving sample tests and safe mentions/nonce behavior.
- Per-route PostgreSQL coordination covers send initiation versus save/disable/remove, including a lost-lock guard before POST. Pending jobs survive worker reconstruction; orphan sending or ambiguous acknowledgment becomes uncertain, with no blind resend. Definitive rate limits/pre-send checks can retry under bounds. Already-live, pre-activation and stale catch-up messages are suppressed.
- New `.env.worker.example` and safe `monitor:check` tooling. Worker can receive provider credentials and its private broker secret, never the bot token or OAuth/session secrets. Web copy/notices now state worker prerequisites and retained data without claiming the worker is running.

### Actual verification

| Check                            | Actual result                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final `npm run check`            | **PASS, exit 0**: TypeScript, lint, formatting and **189 tests / 18 files**; includes **23 new Phase 6 tests** with simulated platforms/Discord and actual embedded SQL/loopback HTTP.                                                                      |
| Final `npm run build`            | **PASS, exit 0**: shared packages, production Next.js, bot and worker.                                                                                                                                                                                      |
| Bot and worker smoke commands    | **PASS**, exit 0; no external calls/sends.                                                                                                                                                                                                                  |
| `npm run monitor:check`          | **PASS**, exit 0 for disabled/default local monitoring configuration.                                                                                                                                                                                       |
| Read-only official connectivity  | Kick hosted public key returned a valid RSA key over HTTPS. Authenticated YouTube and Kick checks **SKIPPED**: neither web nor worker provider credentials are configured. No actual stream or message verified.                                            |
| SQL generation                   | **PASS**, final generate reports no changes. Both new migrations execute in embedded PostgreSQL tests.                                                                                                                                                      |
| External migration attempt       | **FAIL**. Drizzle CLI and direct existing migrator could not connect: **ECONNREFUSED 127.0.0.1:5432**, including outside sandbox restrictions. No real database recreation/reset, successful migration or external restart/coordination experiment claimed. |
| Production-only dependency audit | **FAIL, audit exit 1**: four pre-existing moderate Drizzle/esbuild-chain findings; zero high/critical. No forced downgrade applied.                                                                                                                         |

Intermediate fixture typing, generated-snapshot formatting and stale UI copy expectations were corrected before the final passing run. No simulated test is labelled real-world livestream or Discord verification.

### Remaining setup and limitations

Restore the intended PostgreSQL service and apply reviewed migrations; populate the existing/new worker service file privately, set matching broker/provider credentials and explicitly enable monitoring. HTTPS callback origin/secret are absent; configure a narrow TLS reverse proxy and the Kick app webhook before real webhook tests. No credentials, Portal settings or real Discord messages were changed during implementation.

YouTube feed/playlist discovery cannot guarantee arbitrary go-live coverage and Premiere exclusion is not certified. Worker budgets, bounded candidates and offline freshness policy can suppress/miss events. Upstream unsubscribe cleanup is an operator action; active Kick subscriptions reconcile hourly and inactive sources are ignored. Real controlled streams, signed delivery over external HTTPS, two-guild notifications/mentions, worker restart/process contention and permission/removal races remain manual acceptance. Existing tooling advisories and retention/backup duties remain open. Code/automated evidence does not establish deployment readiness. Stop after Phase 6; no Phase 7 was started.

## Phase 7 — reliability, duplicate prevention and recovery — 2026-10-17

The user's explicit Phase 7 instruction supersedes older unauthorized/unstarted status statements. Implemented within the existing PostgreSQL queue, independent worker and bot-owned sender. See [PHASE_07_IMPLEMENTATION.md](PHASE_07_IMPLEMENTATION.md) for changed files, exact state/retry/health contracts, API references and manual tests. Phase 8 is not started.

### Reliability improvements

- Retained persistent session/destination uniqueness and transactional SKIP LOCKED claims; added valid attempt/version checks and attempt-matched completion. Current leadership is checked around provider observation/dispatch and route coordination before send. Pending jobs survive reconstruction; orphan/ambiguous sends stay uncertain with no blind resend.
- Corrected Phase 6 M02: webhook hint generations and atomic current-row discovery merging prevent a poll from discarding a committed hint or an update to a known ID. Corrected M03: current activation timestamps prevent disable/re-enable from reviving an old queued alert.
- Added safe bounded preflight retries, exponential fallback and decimal/date Retry-After handling; malformed/unacknowledged POST outcomes remain uncertain. Preserved destination/role/permission checks, safe mentions and canonical live payloads. Structured outcomes carry safe reasons/attempts; invalid Google keys now classify as rejected credentials with cooldown.
- Replaced fixed YouTube polling with budget-derived cadence and oldest-due ordering. Ten sustained sources at the default budget nominally poll every 225 seconds, leaving 20% worker headroom; no discovery or latency guarantee is claimed. Same provider session keys suppress hours-long/reconnected duplicate starts across guilds.
- Added private bot/worker health, explicit schema startup readiness, nonoverlapping runtime ticks, abort/drain/connection cleanup and 30-second shutdown watchdog. Public ingress still exposes only signed webhook paths. No new dashboard or platform was added.

### Actual verification

| Check                                | Result                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Final `npm run check`                | **PASS, exit 0**, TypeScript/lint/format and **214 tests / 19 files**; 25 additional Phase 7 regressions.                                                                                                                                                                                  |
| Final `npm run build`                | **PASS, exit 0**, shared packages, Next.js production, bot and worker.                                                                                                                                                                                                                     |
| `npm run test:postgres`              | **PASS**, actual PostgreSQL migrations, concurrent admission/claims across two pools, route advisory-lock serialization and interrupted-send/dedup recovery. Uniquely named temporary schema removed; application tables untouched by this test. Not a production process-kill experiment. |
| Reviewed development migration chain | **PASS**, additive migrations applied through the existing Drizzle migrator; Phase 7 schema readiness verified. No database reset or data-repair operation.                                                                                                                                |
| SQL generation and smoke             | **PASS**, no further generated schema differences; bot/worker disconnected scaffold smoke passes. Enabled startup failure and drain behavior have separate tests.                                                                                                                          |
| Actual Discord bot identity          | **PASS**, current REST identity check, no message sent.                                                                                                                                                                                                                                    |
| Actual Kick connectivity             | **PASS**, hosted RSA key plus app-token read-only subscription inventory. No new subscription or livestream verified.                                                                                                                                                                      |
| Actual YouTube connectivity          | **FAIL**, HTTP 400 with `API_KEY_INVALID`; corrected tool classification is `provider_credentials_rejected`, overall connectivity command exit 1. No key changed.                                                                                                                          |
| Production-only dependency audit     | **FAIL, underlying exit 1**, four existing moderate Drizzle/esbuild-chain findings; zero high/critical, no new dependency.                                                                                                                                                                 |

Intermediate missing fixture typing and changed-file formatting errors were corrected before the final passing checks. Simulated Discord/provider responses, real embedded SQL, real loopback HTTP, real PostgreSQL connections and actual read-only API access remain explicitly distinguished. No real livestream-to-Discord message was verified.

### Remaining manual work and stop boundary

Current worker monitoring remains disabled. Existing provider/broker credentials are present, but the YouTube key is invalid; HTTPS webhook origin/secret setup is absent. Their values were never printed or modified. The owner must correct the key privately, verify the intended bot broker/source/destination configuration and configure narrow public HTTPS callbacks before enabling controlled live tests. Kick authentication and Discord identity success do not prove a live start or received notification.

Manual acceptance still needs YouTube coverage/Premiere experiments, actual Kick/YouTube signed callbacks, two-guild selected-channel/role delivery, website-independent operation, real worker crash/contending-process recovery and permission-removal races. Retention/backups, upstream unsubscribe cleanup and existing moderate advisory risks remain open. Phase 6's historical FAIL/HOLD is not silently changed to PASS. Phase 7 code/checks are complete for controlled testing; no Phase 8 work began.

## Standalone Discord Gateway presence update — 2026-10-17

Implemented the user's explicit Online-presence request after Phase 7, without beginning Phase 8 or changing notification behavior. See [DISCORD_GATEWAY_PRESENCE.md](DISCORD_GATEWAY_PRESENCE.md) for the runtime contract, setup, evidence and limits.

Changed source files: `apps/bot/src/application.ts`, `apps/bot/src/index.ts`; new `apps/bot/src/gateway.ts` and `apps/bot/src/gateway-lease.ts`. Added `tests/bot-gateway.test.ts`. Updated root README, architecture, documentation index and this progress record; added the presence document. No dependency, credentials or Portal settings changed.

The bot now maintains one persistent discord.js Gateway connection using only Guilds intent and Online / Watching livestreams presence. SDK-owned reconnect/resume, sanitized lifecycle logs, bounded startup/shutdown and local OS-backed ownership avoid competing logins during development. Existing REST notification services and internal broker retain their behavior. Smoke remains disconnected.

Actual final checks:

- `npm run check`: PASS, exit 0; TypeScript, ESLint, Prettier and 219 tests / 20 files. Five new Gateway regression tests include simulated SDK events and real local ownership contention/release.
- `npm run build`: PASS, exit 0; shared packages, production Next.js, bot and worker.
- `npm run smoke --workspace=@navi/bot`: PASS, exit 0; disconnected scaffold.
- Actual Discord desktop: visually verified green Online indicator and Watching livestreams in NAVI's member card. Actual duplicate startup was rejected before login while the first process remained online.
- Actual authenticated broker health: HTTP 200, healthy. A later probe after interruption failed with no listener; starting one built bot instance restored `gateway_ready` and HTTP 200 healthy status. That bot process was left running. No message was sent by these checks.

An initial Windows reserved-port test failure was corrected by using a named pipe for Windows ownership. Two sanitized-error lint findings were corrected before the final passing check. Changed documentation was formatted separately after final edits.

Forced real network interruption, real invalid-token behavior and cross-host contention were not exercised. Reconnect events are simulated tests, not a live outage claim. This change verifies presence, not actual platform-to-Discord notification delivery. Earlier Phase 7 audit findings and manual livestream acceptance remain open.

## Phase 8 — security audit and deployment preparation — 2026-10-17–18

The user authorized Phase 8 and confirmed no production hosting/domain/database has been selected. This phase prepares locally reviewable files only; no public deployment, hosting purchase, DNS/Portal change or production credential modification occurred. No Phase 9 work began. See [PHASE_08_IMPLEMENTATION.md](PHASE_08_IMPLEMENTATION.md), [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) and [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for complete findings, changed files, commands and remaining gates.

Prepared a multi-stage nonroot Node Docker image, separate web/bot/worker services, persistent isolated PostgreSQL volume, runtime-mounted per-service secret templates, explicit serialized migrations, least-privilege runtime grant SQL, private container probes and a TLS/rate-limiting/log-redacting edge. Shared edge network namespace preserves the existing loopback-only broker. Default published ports bind host loopback for local review; Redis is not provisioned because the current worker uses PostgreSQL. Certificate issuance/renewal, actual secret values, offsite backup scheduling and alert destinations remain owner configuration.

Corrected production-relevant Phase 7 findings: required-provider readiness (M02), atomic longest cooldown (M03), typed leadership contention with unknown/standby database status before first observation (N01), applied-state completion logging (N02), and expired hosted-key refresh backoff (N03). Existing safe mentions, guild checks, uniqueness and uncertain-send behavior remain unchanged. N04's four moderate tooling-chain advisories remain unresolved; no breaking downgrade applied. Historical Phase 7 audit/real integration gates are not rewritten as PASS.

Actual checks:

| Check                                                  | Result                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final `npm run check`                                  | PASS, exit 0: TypeScript, ESLint, formatting, 231 tests / 22 files. Twelve added tests cover mounted secret boundaries, invalid production startup, HTTPS state-cookie flags, real loopback health probes, readiness/cooldown/standby/stale completion/key-cache recovery and embedded SQL runtime permissions. |
| Final `npm run build`                                  | PASS, exit 0: shared packages, Next.js production, bot and worker.                                                                                                                                                                                                                                              |
| Final browser asset secret-value scan                  | PASS, exit 0: 19 files, 12 configured secret-field candidates, no values found; names/counts only printed.                                                                                                                                                                                                      |
| Bot/worker smoke                                       | PASS, exit 0; disconnected scaffold only.                                                                                                                                                                                                                                                                       |
| Production Compose validation, including tools profile | PASS, exit 0; syntax/model only, not running services.                                                                                                                                                                                                                                                          |
| Local container build attempt                          | FAIL/BLOCKED, exit 1 even outside sandbox: Docker Desktop Linux engine pipe unavailable. No runtime/container/TLS/image-scan result claimed.                                                                                                                                                                    |
| `npm run test:postgres`                                | FAIL, exit 1; external isolated PostgreSQL check unavailable, with no 5432 listener observed. Existing migrations and role SQL pass in embedded PostgreSQL, not a real deployed database.                                                                                                                       |
| Production dependency audit                            | FAIL, exit 1: four moderate existing Drizzle/esbuild-chain findings, zero high/critical.                                                                                                                                                                                                                        |
| Manual production integration                          | NOT EXECUTED: public callbacks, browser OAuth/install, actual received live messages, container signals/outages and encrypted backup/restore drill remain open.                                                                                                                                                 |

Intermediate fixture-clock, strict fixture typing and lint findings were fixed before the final passing checks. Docker build initially hit sandbox buildx permissions; retry outside sandbox established that the actual engine is unavailable. No credentials or raw callback/token/cookie values were printed.

**Assessment:** Phase 8 preparation complete for review; production release FAIL/HOLD pending local Docker/PostgreSQL recovery and the checklist's real integration, TLS, backup, image/advisory and owner-approval gates. Proposed first host: always-on Linux, approximately 2 vCPU/4 GB RAM with persistent disk, private PostgreSQL and outbound provider/Gateway access; guide includes estimates and free-tier limitations. No provider selection or uptime promise is implied.

## Standalone YouTube rich-notification update — 2026-10-18

Implemented the explicitly requested screenshot-inspired automatic YouTube format and default-off everyone opt-in. This is not a new phase and does not close Phase 8's deployment HOLD. See [YOUTUBE_NOTIFICATION_EMBEDS.md](YOUTUBE_NOTIFICATION_EMBEDS.md) for the full contract, comparison matrix, permissions, migration/setup and manual acceptance.

Automatic YouTube messages now preserve the saved text template and include a red rich embed with a platform label, bold channel name, clickable livestream title and large API thumbnail. The existing official videos snippet supplies image metadata with no additional API request; same-video HTTPS CDN validation and a standard same-video fallback protect the image path. Kick formatting and labelled test/preview behavior remain unchanged. Native video-player overlays, bot badges and exact Discord client styling are not reproduced or claimed.

Added per-subscription `mention_everyone boolean NOT NULL DEFAULT false` through reviewed migration `0006_youtube_embed_mentions.sql` and Drizzle metadata. Existing rows remain opted out. The dashboard requires an explicit YouTube-only checkbox/save; backend manager checks, current bot channel permission and independent send-time verification govern the opt-in. Raw template mentions remain prohibited, metadata is neutralized/escaped, roles/users retain explicit restrictions, and previews/tests never ping everyone. No bot intent, install permission, role grant or real setting was changed automatically.

Delivery still uses the current PostgreSQL session/destination uniqueness, version/activation checks, claimed queue, route coordination, broker and REST sender with enforced nonce. Repeated YouTube hints across reconstructed monitors in the two-guild test send exactly one embed per destination with independent mention preferences. No blind retry or alternate delivery architecture was introduced.

Changed source: shared core notifications; bot notification sender/permission capabilities; worker provider metadata and error reasons; database schema/settings/monitoring and migration metadata; web notification manager/service/broker. Added `tests/youtube-embed.test.ts`, extended hydrated UI, authorization/persistence, permission/safety, multi-destination/deduplication tests and fixtures; external SQL check includes migration 0006. Updated README, notification/API/schema/security/index pointers and this record.

Actual results:

- Final `npm run check`: PASS, exit 0; TypeScript, ESLint, formatting and **249 tests / 23 files**, 18 additions over the Phase 8 baseline. Discord/provider events are simulated; isolated SQL and local test HTTP are real.
- Final `npm run build`: PASS, exit 0; shared packages, production Next.js, bot and worker, including the final Markdown sanitizer.
- `npm run db:generate`: PASS; additive migration generated/reviewed, final rerun reports no further schema changes. The maintained embedded PostgreSQL suites execute the migration.
- `npm run db:check`: FAIL, exit 1; configured local PostgreSQL connection unavailable. No migration applied to the real development database and no external persistence result claimed.
- Screenshot visually reviewed and automated payload structure compared for red accent, content order, linked title/URL, large thumbnail and explicit everyone prefix. No real Discord message, everyone ping or controlled YouTube start was performed; actual client rendering remains manual.

An intermediate lint-only unnecessary regex escape was corrected before final passing validation. Restore local PostgreSQL, privately verify the intended development target, review/apply migration 0006, then rebuild/restart the three processes. Grant Embed Links in the destination; grant Mention Everyone only if the administrator intentionally wants the optional ping, then refresh/select/save. Never enable mass mentions by default. Real live detection/thumbnail availability, Discord visual receipt and existing Phase 8 infrastructure/acceptance limits remain unverified.
