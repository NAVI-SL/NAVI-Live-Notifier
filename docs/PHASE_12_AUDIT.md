# Phase 12 — controlled release audit

Audit date: **2026-10-20, Asia/Colombo**. **Overall assessment: FAIL / HOLD. Phase 13 recommendation: NO-GO.** The automated application baseline passes. A controlled external release has not been activated or demonstrated; required real integration, operations and policy acceptance gates remain open. Completing preparation is not evidence of release success.

## Scope and evidence

Reviewed the requirements, API research, architecture, schema, decisions, roadmap, progress records, prior audits, Phase 12 release/test reports, deployment/checklist/runbook documents, beta guide, feedback template, policy/deletion drafts and evidence inventory. Inspected current authentication/authorization, registration, notification settings/sender, monitoring repository/provider/scheduler/webhook/runtime, Gateway, configuration, deployment and regression-test code.

Fresh results are recorded in [sanitized audit evidence](evidence/phase12-audit-results.json). Command logs remain in ignored `.local/phase12-audit-*.log`; they are not production deployment records. All **21 source/config/test hashes** in the [Phase 12 implementation evidence](evidence/phase12-results.json) still match. This supports reviewing its earlier nine local HTTP checks, but does not turn them into fresh or external-user checks. Historical audits retain their original findings; current dispositions appear below.

No application code, real environment files, credentials, Portal settings, deployment settings, infrastructure or database records were intentionally changed. No actual bot/monitoring worker was started, real Discord message sent, webhook subscription created, external user invited or Phase 13 feature implemented. Offline scaffold smoke modes are explicitly distinguished from running services.

## Fresh automated and diagnostic results

Local Windows Node/npm execution; native compilation does not validate the proposed Linux image.

| Check                                                     | Actual result                                                                                                                | Assessment / evidence boundary                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                           | TypeScript workspace/tools checks, ESLint with zero warnings, Prettier and **348 tests in 31 files pass**, Vitest 8.21s      | **PASS**; includes unit, simulated API/security/UI and embedded-SQL integration fixtures                             |
| `npm run build`                                           | Shared packages, Next.js website, bot and worker compile successfully; exit 0                                                | **PASS native production builds**, not deployment                                                                    |
| `npm run env:check:auth`                                  | Exit 0                                                                                                                       | **PASS schema validation**, does not contact Discord or database                                                     |
| `npm run env:check:example`                               | Exit 0                                                                                                                       | **PASS example validation**, not configured production secrets                                                       |
| Bot and worker workspace `smoke` commands                 | Both exit 0, `mode: scaffold`                                                                                                | **PASS initialization only**; no Gateway, polling or delivery                                                        |
| `npm run release:check`                                   | Exit 1, `ready:false`, `liveVerification:false`                                                                              | **FAIL readiness**: guild scope absent/agreement false, HTTPS web and webhook origins false                          |
| `npm run db:check`                                        | Exit 1, sanitized PostgreSQL connection failure                                                                              | **BLOCKED database acceptance**, not a passing connection/migration test                                             |
| `npm run test:postgres`                                   | Exit 1, isolated PostgreSQL reliability check fails                                                                          | **BLOCKED actual PostgreSQL integration**; embedded SQL cannot substitute for independent process/locking acceptance |
| `npm run beta:health`                                     | Exit 1, degraded; web/bot/worker unavailable at **03:55:11.239 UTC**                                                         | **FAIL current local health**; does not establish the status of any unconfigured remote deployment                   |
| `npm run monitor:check -- --connectivity`                 | Exit 0; hosted Kick RSA key, authenticated YouTube `channels` HTTP 200, Kick app token/read-only subscription inventory pass | **PASS actual read-only provider connectivity**; no current LIVE, incoming webhook or Discord receipt verified       |
| `npx tsx scripts/check-client-secrets.ts`                 | Exit 0; 19 compiled assets, 12 configured candidate fields, zero matches                                                     | **PASS bounded exact-value scan**; not a full secret/encoded-value/image audit                                       |
| Production Compose model, tools profile, `config --quiet` | Exit 0                                                                                                                       | **PASS model validation**, not running containers or resolved-secret inspection                                      |
| Production Compose `build web`                            | Exit 1; Docker Desktop Linux engine named pipe unavailable                                                                   | **BLOCKED image/container/TLS/startup checks**                                                                       |
| `npm audit --omit=dev --json`                             | Exit 1; **4 moderate**, zero high/critical                                                                                   | **FAIL advisory check**, see minor findings; no automatic dependency changes                                         |

The first consolidated test log completed successfully; its full suite was observed before this report was added. Documentation formatting is checked separately after adding this audit. No maintained full browser end-to-end runner was found; hydrated component tests and native HTTP checks are narrower evidence.

### Existing HTTP evidence reviewed, not rerun

The Phase 12 implementation report records nine actual loopback HTTP checks against a compiled Next process with **synthetic credentials and deliberately unavailable synthetic PostgreSQL**: `/`, `/support`, `/privacy`, `/terms` return 200; unauthenticated dashboard 307; guild API 401; hidden token API 404; cross-origin install 403; same-origin unauthenticated install 401. All nine passed. These prove rendering and selected negative guards under those inputs, **not OAuth consent, authenticated dashboard persistence, successful installation, public HTTPS or an external release**.

## Requirement verification

PASS below is limited to the stated evidence. BLOCKED/UNVERIFIED requirements count as unmet for release sign-off, rather than as demonstrated application defects.

| Requirement                               | Verified evidence                                                                                                                                  | Result and remaining acceptance                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Production website/dashboard           | Native build, UI/route tests; earlier nine HTTP cases                                                                                              | **PASS automated; BLOCKED production.** No approved host/domain, live TLS/ingress or deployed artifact evidence; configured web health unavailable                                                                                       |
| 2. Approved external OAuth/logout/install | Better Auth state/browser-binding/session/logout/recovery tests; native install POST, authorization URL and origin guards                          | **PASS simulated; BLOCKED real external journey.** Historical owner consent in `OAUTH_LOGIN_DEBUG.md` is not current external login/logout/install. Private testing configuration preserved; Portal was not changed or freshly inspected |
| 3. Multi-server permissions/isolation     | Fresh session/account allowlist and Discord management authorization; scoped repository queries/composite settings FK; guild/isolation tests       | **PASS automated; UNVERIFIED real cohort.** Rejects an approved user's unapproved managed guild and revoked management rights. Actual restricted two-server read/write/revocation matrix still needed                                    |
| 4. YouTube/Kick registration              | Official API adapters, stable identity parsing, confirmation, duplicate/CRUD/persistence fixtures; read-only provider authentication passes        | **PASS automated/connectivity; UNVERIFIED current real registration persistence** while actual PostgreSQL is unavailable                                                                                                                 |
| 5. Real livestream notifications          | Provider → isolated SQL → monitor → mock sender and formatting tests pass                                                                          | **UNVERIFIED real YouTube and Kick receipts.** User reports of working Kick/sample sends are historical; preview artwork and simulated sends are not observed current-build deliveries                                                   |
| 6. Duplicate prevention                   | Unique `(session_id,guild_id,channel_id)`, persistent claims/states, attempt fencing and uncertainty handling; repeat/restart/burst fixtures       | **PASS automated; BLOCKED independent PostgreSQL/process and real receipt counts.** No exactly-once Discord guarantee claimed                                                                                                            |
| 7. Failures/webhooks/retries/limits       | Invalid-signature/replay, durable Retry-After, 429/network/uncertainty and provider error regressions                                              | **PASS simulated; UNVERIFIED real callback/proxy/outage behavior.** No deliberate load or rate-limit attack against providers                                                                                                            |
| 8. Monitoring/logging/health              | Safe structured logging, health handlers, runtime drain and Gateway lifecycle tests; separate service commands and Compose probes                  | **PASS implementation fixtures; FAIL current local probes.** No operational collector, received alert or continuous-monitoring/soak record                                                                                               |
| 9. Database backups/recovery              | Migration/constraint fixtures and backup/restore/rollback runbooks                                                                                 | **BLOCKED / UNVERIFIED.** Actual DB checks fail; no completed isolated restore, measured RPO/RTO or restored-ledger replay reconciliation evidence                                                                                       |
| 10. Controlled beta restrictions          | Optional five-guild parser, web picker/install/authorization and worker sources/fan-out/send-time filtering; queued foreign job suppressed in test | **PASS configured fixtures; FAIL actual release readiness.** Real `BETA_GUILD_IDS` absent; consistent scope and coherent restart not established                                                                                         |
| 11. Privacy/support/deletion              | `/support` and development notices render; review drafts and scoped manual process exist                                                           | **FAIL external availability/readiness.** Contacts/legal/website/retention placeholders remain; no tested complete deletion/backup lifecycle or public request receipt                                                                   |
| 12. Feedback/incidents/unresolved issues  | Safe intake template, reporting guide and dated unresolved-risk reports                                                                            | **PASS preparation; UNVERIFIED actual beta feedback.** No approved active intake/acknowledgment, external cohort cases or real monitoring incident register supplied                                                                     |

## Critical findings

**None newly demonstrated.** Reviewed tests/source show no proven authorization bypass, cross-server disclosure or credential leak. This is a bounded code/test audit, not a penetration-test certification. No high/critical npm advisory was returned; absence of those advisories does not close operational or policy gates.

## Major findings and required corrections

### M01 — Real external onboarding and two-platform delivery remain unverified

The evidence directory contains reports, dashboard/error/permission screenshots and a clearly labelled sample Kick preview, not a current controlled matrix of actual stream starts and received Discord messages. Earlier owner OAuth success does not demonstrate approved external users, fresh logout, installation/status refresh, two-server configuration or end-to-end delivery. A `sent` database state alone is not an independently observed Discord receipt.

**Required:** after explicit target/send approval and restored services, record fresh login/logout/install/status for an approved external owner; registration and saved settings across two approved guilds; newly eligible YouTube and Kick starts, correct title/URL/template/mention, UTC discovery/receipt latency and exact per-destination counts. Include repeat events, browser/web closed, worker restart and a controlled reconnect. Preserve the ledger; do not delete records or backfill ended streams to force a demonstration.

### M02 — Production runtime, persistence, recovery and alerting acceptance is blocked

Fresh actual database, health and image checks fail as documented above. There is no approved production host/domain/TLS endpoint or deployed artifact/health evidence. Docker model validation and a local build do not establish working proxy limits, webhook callbacks, runtime database roles or independent continuous processes. A prior archive observation does not prove a restorable, protected/offsite backup. No successful restore/rollback, alert receipt or sustained soak is documented.

**Required:** restore intended local dependencies without deleting volumes; verify actual PostgreSQL migrations/runtime privileges and independent-worker concurrency; build/start the reviewed Linux profile locally with approved files; test TLS/proxy/internal-route exclusion, shutdown/restart and website-independent monitoring. Complete isolated backup restore and compatible rollback, reconcile missing ledger history before resuming, and observe a safe alert through an approved destination. Public deployment/infrastructure changes still need separate approval.

### M03 — Beta scope exists in code but is not configured for external admission

`BETA_GUILD_IDS` restricts web selection/protected access/install and worker eligible sources/routes/payloads **when supplied**. Parser tests enforce 1–5 distinct IDs; the five-total-guild limit is conservative relative to five external guilds. Fresh preflight correctly rejects missing scope. Unset scope intentionally preserves existing private-owner mode; it is not a fail-closed external release mode. Preflight is a manual read-only guard, not an enforced deployment/admission service, and it compares loaded configuration rather than proving running-process agreement. No bypass of existing account/current Discord permissions was found.

**Required:** privately approve exact accounts/guilds/destinations/sources; configure matching web/worker scope and measured source cap only with approval; review existing active routes and queued/uncertain sends, coordinate process restart and verify the actual running configuration before admission. Do not enable Public Bot, expand account access or invite users merely because scope tests pass. No hot revocation of already initiated sends is promised. Public installation approval remains absent.

### M04 — Policy, accessible support and complete deletion process are not ready

The actual `/privacy` and `/terms` still describe local personal development; `/support` explicitly says public contacts are unconfirmed. Draft legal operator, support/deletion contact, website, governing-law and retention fields remain owner-required. Their deliberate placeholders are appropriate for review, but cannot satisfy external-release availability. Shared-source historical guild/delivery data, long-lived candidate/deduplication references and backup erasure/restore exclusions need reviewed retention and tested handling.

**Required:** obtain owner/platform/legal review as appropriate, confirm only intended public identity/contact/URLs, publish approved accurate notices and test request receipt, authority checks, scoped account/guild erasure, other-guild preservation, cache invalidation and backup/restore exclusions. Do not invent contact information, publish personal addresses or claim legal/platform compliance from a timer or draft.

### M05 — YouTube discovery, quota, latency and hosting capacity remain unaccepted

The retained-candidate starvation defect from Phase 11 M01 is **corrected for the bounded stored set**: current provider checks up to 100 IDs in two batches of at most 50; later-batch failure commits no observation. Regressions at 50/51/100, repeat and reconstruction pass. This does not establish discovery of never-seen/discarded videos, Premiere discrimination, upstream indexing or short/long-scheduled broadcast coverage.

Worst-case scheduling now budgets four calls/source/cycle with reserve: at budget 7200, nominal one/five/ten YouTube source cadence is 60/300/600 seconds. Ten-source cadence plus delay can exceed the ten-minute notification freshness window; shared project consumption and send-time confirmations also need measurement. The ten-source/ten-guild synthetic burst uses simulated providers/sender, embedded SQL and a no-op coordinator. It is correctness evidence, not verified Linux/PostgreSQL throughput or an approved ten-guild cohort.

**Required:** measure representative discovery coverage, actual API headroom, CPU/RAM/disk/database usage, queue growth and receipt latency. Start validation at the proposed one guild/one YouTube/one Kick workload, expand only after acceptance, never above five scoped guilds or an actually verified source capacity. Free hosting is preferred; US$15–25 contingency is not spending approval. Continuous worker/Gateway and persistent storage suitability, actual cost and supported capacity remain unverified.

### M06 — Actual feedback and incident handling has not been exercised

`BETA_FEEDBACK_TEMPLATE.md` explicitly creates no recipient, form, issue tracker or case. The beta guide still has pending URL/private-support fields. Historical developer debugging records are useful but are not an operational external-cohort feedback/incident log. There is no evidence of an incoming beta report acknowledged by the operator or measured response/rollback handling.

**Required:** confirm a protected operator-owned intake and case retention/access policy, execute an approved report/acknowledgment rehearsal, then record actual cohort observations/incidents and resolutions using sanitized references. Keep security/private data out of public issues and repository docs. No actual cases should be invented to fill the checklist.

## Minor findings and improvements

1. **Four moderate dependency advisories remain:** `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, nested `esbuild`. No exposed affected tooling server is demonstrated. Use a tested compatible resolution or explicit bounded risk acceptance; do not force the previously offered incompatible Drizzle change. Scan the eventual Linux image as well.
2. **Streamer-list recovery UX remains:** `apps/web/src/components/streamer-manager.tsx` awaits list refresh in the same failure boundary as a successful registration/mutation, so a later GET failure can display a misleading operation error or stale list. Separate committed mutation status from refresh recovery and add focused tests in a subsequent authorized correction. Notification settings' earlier commit/error handling fix is separate and should be preserved.
3. **Historical mention prose is stale:** `05-security-and-risks.md` and `PHASE_05_NOTIFICATION_SETTINGS.md` still have dated YouTube-only exception summaries saying Kick is unchanged, while the current dropdown/core contract supports explicit everyone for both platforms. Latest `NOTIFICATION_MENTIONS.md` and tests describe current behavior. Add explicit supersession pointers when documentation corrections are authorized; do not weaken current permission/allowed-mention rules.
4. **Preflight and health are intentionally narrow:** HTTPS checks validate URL shape and exclude a few loopback names, not DNS/public routability/certificates; web liveness/private auth-table probe is not full schema readiness; bot REST identity is not Gateway health; finite health sampling and Docker health labels are not external alerting. Retain these distinctions in operational sign-off.
5. **Residual hardening:** floating/unscanned base images, partial CSP, process-local cache/rate admission and host-local Gateway ownership need review within the chosen topology. `unless-stopped` handles exits, not automatic healing of unhealthy live containers. No current exploit is demonstrated; these are not verified multi-host scaling controls.

## Prior finding disposition

| Earlier issue                                                         | Current disposition                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Phase 11 M01 retained YouTube candidate starvation                    | **Corrected in Phase 12; regression PASS**, bounded to retained 100 IDs                 |
| Earlier web long Retry-After / HTTP 400 invalid-client categorization | **Corrected; regressions PASS**; separate mutation/list-refresh UX remains              |
| Phase 11 M02 real onboarding/receipts                                 | **OPEN**, M01 above                                                                     |
| Phase 11 M03 runtime/DB/TLS/restore/alerts                            | **OPEN**, M02 above                                                                     |
| Phase 11 M04 policies/contact/deletion                                | **OPEN**, M04 above                                                                     |
| Phase 11 M05 admission/capacity                                       | **Partly addressed in code**, actual scope/activation/resource acceptance OPEN, M03/M05 |
| Phase 11 M06 coverage/quota                                           | **Accounting improved**, real coverage/headroom/freshness acceptance OPEN, M05          |

## Reassessment gates and final decision

1. Resolve current runtime/DB/container blockers and demonstrate durable settings/ledger through actual restart, isolated restore and safe rollback.
2. Approve exact targets and configuration, verify running scope/current authorization, then complete the observed external-user and two-platform receipt matrix without weakening uncertainty or deduplication handling.
3. Measure supported workload/latency/API capacity; receive operational health/backup/incident alerts and complete supervised monitoring before expanding admission.
4. Confirm accurate notices, support/deletion/intake and tested data lifecycle; record real feedback and owner decisions on remaining risks.
5. Re-run affected checks against an identified release artifact and obtain separate approval for any public installation/deployment/invitation changes.

**Automated baseline: PASS. Complete controlled-release acceptance: FAIL / HOLD. Phase 13: NO-GO until these gates are closed and reviewed.** Continued authorized corrective/local verification is appropriate. No successful public deployment, controlled external release, actual two-platform notification acceptance or Phase 13 completion is claimed.
