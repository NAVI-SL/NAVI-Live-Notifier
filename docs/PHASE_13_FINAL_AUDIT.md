# Phase 13 — final stabilization audit

Date: **2026-10-20, Asia/Colombo**. **Overall assessment: FAIL / HOLD. Unrestricted public installation and wider public launch: NO-GO.** The automated baseline and targeted stabilization corrections pass. Real end-to-end delivery, production operations, recovery, policy and external-user acceptance remain incomplete. This audit does not begin Phase 14 or authorize changing restrictions or infrastructure.

## Scope and evidence boundaries

Reviewed approved requirements, API research, architecture, database/security decisions, roadmap, progress, implementation and prior audit/release reports, deployment/checklist/runbook/rollback documents, policy/deletion drafts, beta guidance and the evidence inventory. Inspected the current web authentication/guild authorization/registration/settings paths, bot Gateway/REST/broker health, worker provider/monitor/webhook/runtime/telemetry, SQL ledger/constraints and tests. Read all 63 top-level documentation files for current/historical status and evidence references.

All **15 runtime/test source hashes** from [Phase 13 implementation evidence](evidence/phase13-results.json) still match. Six deployment inputs also match their recorded earlier hashes: `Dockerfile`, `compose.production.yaml`, `deployment/start.mjs`, `deployment/healthcheck.mjs`, `deployment/nginx.conf`, `deployment/database-permissions.sql`. Native builds produce ignored local outputs; no immutable deployed image, production hostname or release record has been demonstrated.

Fresh sanitized results are in [final audit evidence](evidence/phase13-final-audit-results.json); command logs are ignored `.local/phase13-audit-*.log`. Historical tests and owner reports are identified separately. No credentials, raw provider responses, cookies, OAuth codes or personal beta data are included.

Only this audit and supporting evidence are added. No application code, environment/credentials, deployment/Portal settings or data was intentionally changed. No actual bot/monitoring worker was started, real Discord message sent, platform subscription created, external user invited or public deployment performed.

## Tests executed

Native Windows execution. Embedded SQL and mock providers/senders are not a replacement for independent PostgreSQL workers or real platform receipts.

| Command / scenario                                       | Actual result                                                                                                             | Assessment                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run check`                                          | Exit 0; TypeScript workspace/tools checks, zero-warning lint, formatting; **357 tests / 32 files pass**, Vitest **7.77s** | **PASS automated**                                                                                         |
| `npm run build`                                          | Exit 0; shared packages, Next.js web/dashboard, bot and worker build                                                      | **PASS native production build**, not deployed/container-tested                                            |
| `npm run release:check`                                  | Exit 1, `ready:false`, `liveVerification:false`; guild scope absent/agreement false, HTTPS web/webhook origins false      | **FAIL release readiness**; configuration shape/agreement only                                             |
| `npm run db:check`                                       | Exit 1, sanitized PostgreSQL connection failure                                                                           | **BLOCKED actual database integrity/readiness**                                                            |
| `npm run test:postgres`                                  | Exit 1, isolated PostgreSQL reliability check fails                                                                       | **BLOCKED independent database/locking/recovery verification**                                             |
| `npm run beta:health`                                    | Exit 1; web/bot/worker unavailable at **04:14:35.997 UTC**; `health_alert` emitted with `delivery:console_only`           | **FAIL current local availability; PASS local unhealthy-transition reporting**, not external alert receipt |
| `npm run monitor:check -- --connectivity`                | Exit 0; hosted Kick RSA key, authenticated YouTube `channels` HTTP 200, Kick app token/read-only subscription inventory   | **PASS real read-only connectivity**; no actual LIVE/webhook/message verification                          |
| `npx tsx scripts/check-client-secrets.ts`                | Exit 0; **19 assets**, **12 candidate fields**, zero matches                                                              | **PASS known-value bundle scan**, not exhaustive secret/image inspection                                   |
| Production Compose tools-profile model, `config --quiet` | Exit 0                                                                                                                    | **PASS model/syntax**                                                                                      |
| Production Compose `build web`                           | Exit 1; Docker Desktop Linux engine named pipe unavailable                                                                | **BLOCKED Linux image/container/TLS/proxy/startup acceptance**                                             |
| `npm audit --omit=dev --json`                            | Exit 1; **4 moderate**, zero high/critical                                                                                | **FAIL advisory check**, unchanged Drizzle/esbuild chain                                                   |

No maintained full-browser end-to-end runner was found. Current automated coverage includes hydrated React interaction, authentication adapters, embedded SQL migrations/constraints, synthetic provider/broker integration, loopback health servers, recovery/uncertainty, multi-guild isolation, mentions, rate limits and webhook rejection. It does not establish actual external consent/install, independent PostgreSQL concurrency, real outages or public HTTPS.

### Earlier local HTTP and real integration evidence reviewed

The Phase 13 implementation recorded nine successful checks against a compiled Next process using **synthetic credentials and unreachable synthetic PostgreSQL**: home/support/privacy/terms 200; unauthenticated dashboard 307; guild API 401; hidden OAuth token API 404; wrong-origin install 403; same-origin unauthenticated install 401. These are reviewed **earlier local HTTP results, not rerun during this audit**, and not successful authentication/installation or database persistence.

`OAUTH_LOGIN_DEBUG.md` records historical owner consent/dashboard access, with limitations on logout/install verification. User reports that Kick and sample notifications worked are useful history, but no current controlled two-platform stream-start → independently observed Discord receipt/latency/count matrix is supplied. The sample Kick preview image is explicitly labelled sample/no message sent. No actual restore, received operational alert, controlled external-feedback acknowledgment or sustained production soak record was found. Do not infer these from API authentication, a `sent` row or a passing mock.

## Requirement assessment

BLOCKED/UNVERIFIED are unmet release acceptance gates; they do not prove the feature itself is defective.

| Requirement                             | Verified evidence                                                                                                                                  | PASS/FAIL for complete acceptance                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Website/dashboard reliability        | Build, protected-route/component/loading/error tests; earlier nine compiled HTTP guards/rendering cases                                            | **FAIL / BLOCKED production**; automated baseline PASS, actual configured web unavailable, no uptime/real authenticated journey                 |
| 2. Discord OAuth2 and installation      | Better Auth state/browser binding, deny/cancel/session/logout/refresh tests; explicit native install POST/303 URL/origin/current-guild guards      | **FAIL / UNVERIFIED real external login/logout/install**; existing automated controls PASS                                                      |
| 3. Real YouTube/Kick detection          | Current official-provider adapters and simulated LIVE checks; real read-only API auth PASS                                                         | **FAIL / UNVERIFIED actual starts/callbacks/coverage**, not a verified notification experiment                                                  |
| 4. Discord delivery and deduplication   | Persistent source/session hash and unique session/guild/channel destination; current permissions, nonce, repeat/burst/uncertainty fixtures         | **FAIL / UNVERIFIED actual receipt counts**; logical dedup/safe retry regressions PASS                                                          |
| 5. Worker stability/restart             | Nonoverlapping ticks, bounded shutdown, leadership/claim/attempt fences, reconstructed monitor and terminal Gateway health regressions             | **FAIL / BLOCKED real process/DB recovery and soak**, simulated cases PASS                                                                      |
| 6. PostgreSQL integrity/backup recovery | Embedded migrations/composite FKs/constraints/isolation tests, restore/rollback instructions                                                       | **FAIL / BLOCKED actual DB and UNVERIFIED restore**; no backup usability/RPO/RTO claim                                                          |
| 7. Multi-server authorization/isolation | Fresh identity/account allowlist, current owner/Admin/Manage Guild check, optional scoped guilds, tenant queries/FKs; revoked/foreign access tests | **PASS automated security; FAIL full real-cohort acceptance**, actual scope unset and live two-server matrix absent                             |
| 8. Limits/webhook security              | Durable budgets/cooldowns/Retry-After, safe bucket/global logs, raw-body signatures/timestamps/replay/topic/lease tests                            | **PASS simulated security; FAIL live operational acceptance**, real proxy/callback failures untested                                            |
| 9. Logging/health/incidents             | Combined actual-entry-point REST/Gateway health, worker tick/metrics/quota, console alert/recovery tests and actual local degraded alert           | **PASS implementation; FAIL operational monitoring**, no continuously running services/collector/received alert/incident exercise               |
| 10. Earlier issue closure               | Retained YouTube candidate batching, web error edges and Phase 13 refresh/readiness fixes pass regressions                                         | **FAIL all-issues-closed claim**; major release/policy/recovery gates still OPEN                                                                |
| 11. Actual beta feedback/problems       | Prepared intake/template/troubleshooting and honest unresolved-risk reports                                                                        | **FAIL / UNVERIFIED actual feedback intake/response**, no controlled external cohort case records supplied                                      |
| 12. Unrestricted installation readiness | Private account restrictions and max-five optional guild scope deliberately retained; native install path tested                                   | **FAIL / NO-GO**; no public installation decision, measured public envelope, completed restricted beta or ready public policy/support lifecycle |

## Critical issues

**No new critical application/security defect demonstrated.** The reviewed source/tests do not show a proven authentication bypass, unauthorized cross-guild operation or exposed credential. This is not a penetration-test certificate or confirmation that every historical critical/major release gate is resolved. The four npm findings are moderate; missing live verification is a separate acceptance problem.

## Major findings and required corrections

### M01 — Current external onboarding and actual two-platform receipts remain unverified

Historical owner consent and user-reported Kick success do not establish the current external flow, both platforms, saved preferences, mention permissions or per-destination received-message counts. No real stream was started or Discord message sent by this audit. Registration and stream identity resolution have automated/past API evidence, not fresh actual database-backed onboarding here.

**Required:** restore approved local services, privately approve exact users/guilds/sources/channels, then complete fresh consent/logout/install/status, two-server configuration/revocation and new controlled YouTube/Kick starts. Record first official LIVE, start and independently observed receipt times/content/counts, repeat/reconnect behavior, restart and web/browser-off monitoring. Keep uncertainty/dedup records intact; do not reset the ledger or replay ended broadcasts to create a PASS.

### M02 — Runtime, database, Linux/TLS and recovery acceptance is still blocked

Fresh DB/reliability and configured service-health checks fail. The Docker Linux engine is unavailable; default review secret/certificate/key paths are absent. Existing Compose/Nginx/files are **local-review preparation**, not deployed evidence. Actual migrations/runtime roles, durable settings/ledger across independent process restart, backup restore/rollback and TLS/proxy/private-route behavior remain unverified. No file was found in the default `backups/` inventory; this says nothing about other locations, and even a historical archive's presence would not prove recovery.

**Required:** restore intended local dependencies with volumes preserved; pass actual PostgreSQL migration/role/isolation/concurrency checks and Linux startup/health/signal tests. Rehearse isolated restore and compatible-artifact rollback, recover/reconcile dedup history and deletion exclusions before resume, and record measured recovery outcomes. Identify a release artifact/host/HTTPS origin and obtain approval before any public infrastructure changes. No production capacity or recovery SLA is certified.

### M03 — Monitoring improvements are not an operational incident-response system

Phase 13 correctly closes the REST-only bot-readiness gap in the actual entry point and adds safe private metrics. Those runtime paths have not been exercised against an actual continuously running bot/worker in this audit. Existing CLI alerts go only to console, sampled finitely; no approved collector, unattended schedule, responding operator/received alert or incident-response drill is established.

Counters reset per worker process; delivery outcome counts include claims/requeues and are not unique received messages. First-detection timings exclude baseline sessions and are newly committed observations, while broker-ack timing is not independently measured receipt latency. Quota rows are local reservations with their stored day/cooldown, not complete cloud-project consumption. Public web liveness and a private auth-table query do not prove every API/schema path; Docker restart policy handles exits, not automatic healing of live unhealthy processes.

**Required:** after runtime restoration, privately observe Gateway and heartbeat failures/recovery; install approved protected collection/supervision, verify safe external alert receipt and operator response, and complete supervised outage/soak/backup-expiry/certificate monitoring. Measure real latency and usage rather than publishing synthetic 30001ms fixture values as production metrics.

### M04 — Beta access preparation does not establish unrestricted public readiness

Fresh preflight rejects absent `BETA_GUILD_IDS` and missing HTTPS origins. Account allowlists and current Discord permissions remain; unset guild scope preserves personal mode, not a validated public admission policy. Matching config loaded by a CLI does not prove that all running processes have restarted with it. Max five scoped guilds is an intentionally limited beta, not a reviewed unrestricted capacity/access design. Historical private application settings must not be treated as freshly verified Portal configuration; no Portal change or completed external installation occurred here.

**Required:** complete the restricted cohort gates first, configure approved consistent scope and measured source ceiling coherently, verify running-process authorization and active routes, and record owner decisions for any future wider admission strategy/Discord public installation. Keep current restrictions until explicitly authorized. Removing lists or enabling Public Bot is not a substitute for readiness, and neither is performed by this audit.

### M05 — Discovery coverage, quota, latency and hosting envelope remain unaccepted

Retained candidate starvation is corrected for at most 100 YouTube IDs in two batches; 50/51/100, repeated detection, later-batch error and reconstructed-worker regressions pass. This does not verify never-discovered/discarded videos, Premiere discrimination, indexing delay, long-scheduled/short broadcasts or actual provider event recovery. Worst-case four-call polling budgets nominal one/five/ten YouTube source cadence at 60/300/600 seconds for budget 7200; delay at ten sources can exceed ten-minute freshness. Send confirmation and other clients' shared project usage need measurement.

The 10-source/10-guild burst fixture uses embedded SQL, synthetic providers/sender and a no-op coordinator. It verifies logical behavior, not independent PostgreSQL lock contention, real Discord bucket load, VM resources or a permitted ten-guild release. The current controlled cohort remains at most five configured guilds and no externally verified source capacity.

**Required:** measure source coverage/misses, API/project quota, CPU/RAM/disk/connections/queue age and real receipt latency at the proposed small starting workload before expansion. Document supported behavior and measured limits. US$0 hosting preference and US$15–25 unapproved contingency are planning inputs, not a chosen provider or verified operating cost; do not spend or assume sleeping/free compute satisfies continuous worker/Gateway/storage needs.

### M06 — Policy, support, deletion and actual beta feedback remain incomplete

Public notices still describe personal local development; support explicitly says contacts are unconfirmed. Draft legal operator, website, support/deletion and retention fields intentionally remain placeholders. Shared-source historical delivery/candidate/hash retention and backup erasure/restore handling remain unresolved or untested. The feedback template creates no active recipient/form/case store, and no external report/acknowledgment or controlled-cohort incident evidence is supplied.

**Required:** confirm only intended public identity/contact/URLs, obtain relevant review without claiming unverified compliance, and test reachable intake/acknowledgment, request authorization, scoped erasure/shared-guild preservation and backup exclusions. Rehearse incident/feedback handling and record actual private-beta observations with safe references. Never invent an operator identity, publish personal contacts or fabricate zero incidents/feedback from absent data.

## Minor issues and residual risks

1. **Four moderate dependency advisories:** `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, nested `esbuild`. No affected public tooling server is demonstrated. Resolve compatibly or record explicit bounded risk acceptance; the historically offered breaking downgrade is not a verified safe correction. Scan the actual eventual Linux image.
2. **Health configuration remains a maintenance risk:** the generic bot handler supports REST-only fallback when no Gateway callback is supplied, although the real entry point is correctly wired and covered by source/tests. Preserve this wiring in future entry points and add runtime smoke verification after dependency restoration; SDK lifecycle state is not new heartbeat-ack instrumentation.
3. **Existing hardening limits:** floating/unscanned images, partial CSP, process-local rate/cache state and host-local Gateway ownership are not verified multi-host controls. HTTPS preflight checks URL shape/a few loopback names, not certificate validity or public routability.
4. **Evidence/version boundaries:** there is no demonstrated immutable deployed release artifact. Keep dated results, code hashes, environment descriptions and simulated/real labels together. Earlier reports correctly retain their original failed gates; do not reclassify them merely because newer tests pass.

## Earlier finding disposition

| Finding                                                                                         | Current disposition                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Phase 10/11 retained YouTube candidate starvation                                               | **Corrected in Phase 12; regression PASS**, bounded retained set only                                               |
| Earlier web Retry-After truncation / invalid-client category                                    | **Corrected in Phase 12; regression PASS**                                                                          |
| Phase 12 registration mutation-followed-by-refresh failure                                      | **Corrected in Phase 13; hydrated recovery/rejection tests PASS**                                                   |
| REST-only bot health gap                                                                        | **Corrected in actual Phase 13 entry point; lifecycle/combined-health tests PASS**, actual runtime still unverified |
| Phase 13 telemetry and transition-alert implementation                                          | **PASS automated**, safe local unhealthy console alert observed; operational receipt/persistence not established    |
| Phase 12 real journey/receipts, runtime/restore, admission, policy, capacity and feedback gates | **OPEN**, M01–M06 above; no blanket critical/major closure or release sign-off                                      |

## Final decision and reassessment

**Automated stabilization baseline: PASS. Complete stabilization/release acceptance: FAIL / HOLD. Unrestricted installation and wider public launch: NO-GO.** No newly demonstrated critical exploit is required to reach NO-GO: the real-service, receipt, recovery, access, operations and policy acceptance gates are themselves unmet.

Reassess after restoring local dependencies, proving real migrations/restart/restore/alerts, completing the approved external and two-platform receipt matrix, validating measured scope/capacity, finalizing reachable support/deletion/policy/feedback processes and recording owner risk decisions. Rerun affected checks against an identified candidate artifact. Any public installation/deployment/access expansion remains a separate explicit approval. Only audit documentation/evidence changed; no Phase 14 or production action was performed.
