# Phase 14 — release blockers review

## Subsequent remediation status — 2026-10-22

[Remediation report](PHASE_14_REMEDIATION.md) and [new evidence](evidence/phase14-remediation-results.json) supersede the earlier same-day snapshot below. **Wider release remains NO-GO.** Dependency audits now pass; the actual locked loader and production image use patched esbuild 0.28.2. A reproduced forwarded-host proxy defect is corrected. No real sender, public installation or deployment was activated.

| Original issue               | Current resolution / evidence                                                                                                                                                                 | Remaining acceptance                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. PostgreSQL/service health | Actual connection, concurrency/locking/recovery PASS; Redis healthy; source data preserved                                                                                                    | Actual web/bot/worker endpoints remain unavailable; approved runtime/soak required                                                                                                  |
| 2. Docker                    | Guarded Linux image build PASS, 3 tooling tests, 9 synthetic web cases; 14 actual local TLS/proxy checks PASS after forwarded-host correction                                                 | Full actual secret-mounted topology, public callbacks and intended Oracle host remain unverified                                                                                    |
| 3. Live notifications        | Simulated reliability/security and independent PostgreSQL checks PASS; no speculative detection/sender changes                                                                                | Real new YouTube/Kick broadcast-to-observed-receipt matrix still BLOCKED                                                                                                            |
| 4. Onboarding                | Existing secure installation/login/guild guards preserved; no new application defect reproduced                                                                                               | Complete fresh real onboarding/revocation/multi-server acceptance still BLOCKED                                                                                                     |
| 5. Recovery                  | Existing protected archive restored into new scratch DB: 14 relations match, source unchanged, scratch removed                                                                                | Encrypted offsite/key/retention/host-loss/rollback acceptance remains open                                                                                                          |
| 6. Operations                | Honest private health/console alert behavior retained                                                                                                                                         | External alert destination/receipt and continuous approved runtime/soak remain open                                                                                                 |
| 7. Hosting/cost              | No host purchased/configured; planning assumptions unchanged                                                                                                                                  | Owner approval, measured capacity/API latency, complete cost and policy acceptance remain open                                                                                      |
| 8. Dependencies              | **Resolved current advisory install:** full/production audits exit 0, zero findings; actual loader/transforms/Drizzle generation+SQL and Linux runtime verified; no unrelated version upgrade | `npm ls` still exits 1 with a workspace-override range warning; use pinned lock/`npm ci` and new regression/build guards. No claim of fixed npm metadata or complete image CVE scan |

Full checks: **383 tests / 36 files PASS**, TypeScript/lint/format/native builds PASS. Prior four-moderate/380-test values below describe the initial review, not current remediation. See the new report for exact commands, earlier failed harness attempts, the npm caveat and precise manual steps.

## Initial review snapshot (retained history)

Reviewed **2026-10-22, Asia/Colombo**. **Wider public launch: NO-GO.** Local infrastructure, independent PostgreSQL reliability, isolated restore, native builds and Linux image checks now pass. Real two-platform Discord receipts, complete controlled onboarding, continuous operations, production recovery and measured hosting capacity remain incomplete. Four moderate dependency findings remain. Passing local checks does not close those release gates.

Current machine-readable evidence: [phase14-release-blockers-results.json](evidence/phase14-release-blockers-results.json). Raw command logs, synthetic environment files and the protected data archive stay in ignored `.local/phase14-release-review*`; they must not be uploaded or published.

## Scope and evidence chronology

Reviewed the approved requirements, API research, architecture/schema/security decisions, roadmap, progress, Phase 13 implementation/stabilization/final audit, prior audit records, subsequent Phase 14 recovery/dependency/broadcast plan, deployment/checklist/runbook/rollback/capacity documents and current source/tests. Inspected Better Auth configuration and request guards, guild authorization and installation URL generation, bot broker/REST health, worker monitoring/telemetry and database admission/claim/uniqueness/recovery paths. No application defect requiring a new code patch was established.

- **Phase 13 evidence, October 20:** DB/container checks were blocked and real acceptance/operations remained unverified. These are dated findings, not proof that PostgreSQL or Docker is permanently broken.
- **Later October 20 evidence:** [infrastructure verification](PHASE_14_VERIFICATION_REPORT.md) closed local SQL/restore/Redis/Linux-image gates. [Login repair](DISCORD_LOGIN_ORIGIN_FIX.md) subsequently verified real owner consent/callback and an authenticated workspace after correcting a development-origin mismatch. Neither record verifies installation, fresh logout/revocation or actual livestream delivery.
- **Fresh October 22 evidence:** the first unrestricted Docker probe found the Linux engine pipe absent; Desktop could not report running status. Startup was initially rejected by automatic approval review because it could restart message-sending containers. The owner then confirmed that no bot/worker containers auto-start and approved startup. The ensuing `docker desktop start --detach --timeout 45` reported **already running**; subsequent probes found the original PostgreSQL and Redis healthy. Recovery is observed; this record does not establish which action started Desktop or why it had stopped. No reset/reinstall/volume deletion was performed.
- Current actual web/bot/worker health remains unavailable. They were not started merely to improve a health score: the enabled worker can send to saved routes, and real sends still require separate approval. Current API authentication and existing guild membership are read-only evidence, not an observed notification.

No new critical exploit, data loss or authentication bypass was demonstrated. The following **major acceptance blockers** remain, with the dependency issue separately classified as **moderate security severity**. Unverified behavior is not labelled a confirmed application defect.

## 1. PostgreSQL integration and service health

**Disposition:** local PostgreSQL/Redis **PASS**; complete application availability **FAIL**.

**Root cause / missing evidence:** a stopped/unreachable local Docker engine prevented its container services from being reached initially. After engine availability returned, the existing database worked without credential changes or migrations. PostgreSQL connectivity and independent connection tests pass; all **7 migration hashes match**, monitoring schema reads pass, **3 required unique indexes are valid**, and there are **0 orphan notification settings**. Redis responds PONG, AOF is enabled, and its last write/rewrite/RDB-save statuses are OK. Original named data volumes remain attached. This does not explain every older outage or validate production roles/TLS.

At **2026-10-22T04:19:32.244Z**, `beta:health` reported web, bot and worker **unavailable**, with a console-only alert. These results establish unavailable configured endpoints, not a Discord outage or broken database password.

- **Severity / impact:** **Major** while the complete runtime is unavailable; configuration cannot be exercised end to end and monitoring cannot deliver alerts. The earlier local SQL-test blocker is closed for this run.
- **Recommended solution:** retain the existing volumes/configuration; document normal Docker startup and separately supervised web/bot/worker startup. Keep the real worker stopped until the complete destination/send scope is approved. Do not reset data or rotate credentials to address a stopped service.
- **Tests required:** repeat `db:check` and `test:postgres`; verify live process ownership, auth-schema readiness, Gateway readiness, worker tick freshness, actual settings across restart, and an approved database outage/recovery exercise. Test runtime-role denials on the intended deployment separately.
- **Acceptance criteria:** database/schema/index checks remain healthy; no integration scratch schemas remain; web/bot/worker return the expected readiness with a single Gateway owner and fresh worker ticks; approved restart tests preserve settings/ledger and do not duplicate normal alerts. Database-only health is insufficient.
- **Manual action:** **Yes** for actual sender/worker startup, approved destinations and supervised restart/soak. Local SQL verification required no credential/data changes.

## 2. Docker validation and deployment boundary

**Disposition:** local model/build/synthetic runtime **PASS**; full production topology/TLS acceptance **BLOCKED**.

**Root cause / missing evidence:** Docker Desktop availability is a host prerequisite. Today's missing engine pipe differs from a sandbox permission denial. After owner-confirmed startup approval, `compose.production.yaml config --quiet`, image rebuild and network-isolated runtime checks pass. The tested image is Linux **amd64**, Node **24.22.1**, running as UID **1000**; it contains none of the checked root credential files or `.local`/backup directories. Bot/worker scaffold smoke checks pass. Nine synthetic website HTTP cases pass. This is not a native Oracle ARM64 or complete Nginx/TLS/secret-mounted deployment test.

- **Severity / impact:** **Major deployment gate**. Native compilation alone does not establish proxy routing, secret readability, process supervision or real host compatibility.
- **Recommended solution:** keep the existing separate-process deployment and private loopback broker/database boundaries. When a host is approved, validate its exact architecture, mounted secrets, HTTPS callbacks, ingress rejection and immutable image/rollback artifacts. Do not expose services or invent public credentials to complete a local check.
- **Tests required:** complete local review topology with approved synthetic secrets/TLS; Nginx syntax, HTTPS/Host handling, webhook routing, private-route exclusion, health probes, restart policies and graceful termination. Verify the intended ARM64 build/runtime on the chosen host, image scanning and capacity separately.
- **Acceptance criteria:** reproducible clean image and full intended topology; only approved ingress reachable; private probes authenticate; TLS/callback tests pass; immutable artifact and compatible rollback identified. Current network-none fixtures are a partial pass only.
- **Manual action:** **Yes** for host/TLS/secret choices and any deployment approval. No production changes were made.

## 3. Actual YouTube and Kick livestream notifications

**Disposition:** API authentication and simulated detection/delivery **PASS**; real end-to-end receipt acceptance **BLOCKED**.

**Root cause / missing evidence:** no current controlled record ties a new official LIVE transition for each platform to independently observed Discord receipts, title/URL/content, counts, latency and repeat/restart outcomes. Historical owner reports, screenshot samples, authenticated API responses and a database `sent` state are not substitutes. Today's YouTube channels request, Kick hosted RSA key and Kick app-token/read-only subscription inventory pass; none verifies an actual LIVE event or signed callback.

- **Severity / impact:** **Major core-functionality acceptance blocker**. Missed discovery, freshness/indexing effects, wrong source identity, unsafe retries or destination-specific failures remain possible until observed.
- **Recommended solution:** execute the existing [controlled verification plan](CONTROLLED_LIVESTREAM_VERIFICATION.md), preserving stable source IDs, monitoring baseline, SQL delivery uniqueness and conservative uncertain outcomes. Privately approve every enabled route sharing each source before starting the actual worker. Do not clear sent/uncertain records or replay ended broadcasts to produce a pass.
- **Tests required:** new offline-to-LIVE YouTube and Kick starts; upcoming/offline rejection; repeated hints/polls; same-session reconnect; approved two-destination fan-out; restart after an observed send; browser/web closed; real signed callbacks after approved HTTPS setup. Use simulations for destructive faults and intentional rate limits.
- **Acceptance criteria:** one normal received alert per provider-session/configured destination, zero unauthorized messages/mentions, correct streamer/title/platform/link/available images, persisted delivery/settings, no duplicate after repeat/restart, and recorded UTC stream/LIVE/detection/receipt times. Account for baseline suppression and provider discovery/freshness limitations explicitly. Never promise exactly-once transport delivery.
- **Manual action:** **Yes**: exact account/guild/channel/source/time-window/send approval, controlled broadcasts and observed receipts. Docker startup approval does **not** authorize these sends. No real Discord messages were sent in this review.

## 4. Discord installation and dashboard onboarding

**Disposition:** automated guards and current read-only bot identity/membership **PASS**; complete current onboarding **BLOCKED**.

**Root cause / missing evidence:** the latest owner login repair has actual historical consent/workspace evidence, but there is no fresh complete login/logout/install/status/configuration/revocation journey for an approved external participant. Today's bot REST identity matches the configured application, and the bot is installed in **1 of 1** checked existing configured guilds. That verifies membership, not a newly completed installation or Gateway connection. No Portal settings were changed or freshly inspected here.

Code inspection confirms an explicit Discord authorization URL with `bot applications.commands`, `integration_type=0`, selected guild and minimum permission **19456**. It does not depend on Discord's default Install Link. Identity/login scopes remain `identify guilds`; tokens are encrypted server-side; state/browser checks, fixed callback/origin, account allowlist, current guild ownership/Admin/Manage Guild authorization and optional guild scope remain enforced. The real origin mismatch was repaired earlier, not recreated here.

- **Severity / impact:** **Major onboarding/access acceptance blocker**; public/external installation cannot be claimed from URL/component tests or already-installed membership.
- **Recommended solution:** keep existing private-install/access restrictions. Review the Portal's exact callback and Guild Install settings with the owner, then test using specifically approved users/guilds. If private application policy prevents an external installation, record the limitation and obtain a separate policy/installation decision; do not enable Public Bot automatically.
- **Tests required:** consent/success/cancel/error/logout/expired session; canonical local origin and intended HTTPS callback; native install action, existing and new installation status; manageable-server selection; two-server saved configuration; direct unauthorized IDs and revoked permissions. Verify refresh/caching never grants stale write authority.
- **Acceptance criteria:** observed complete approved journey, bot status independently verified, no Administrator/privileged intent expansion, unauthorized accounts/guilds denied, and settings isolated after refresh/restart. Existing membership alone does not satisfy new-install acceptance.
- **Manual action:** **Yes** for browser consent, approved test accounts/guilds, Portal review and any installation-policy approval. No browser session was reused or exported in this review.

## 5. Backup, restoration and rollback

**Disposition:** fresh local backup/isolated restore **PASS**; production disaster recovery **BLOCKED**.

**Root cause / missing evidence:** a new protected local archive restored successfully into a uniquely named scratch database. All **14 checked application/migration relations' row counts/content digests match**, archive copy checksum matches, original source is unchanged and the scratch database is removed. The measured create/restore/compare interval was **0.926 seconds**; this excludes the full backup/offsite/decryption/recovery workflow and is not production RTO. Zero restore-test databases and integration schemas remain. Existing backups were preserved.

The archive is **not encrypted or offsite**. ACL protection does not cover host loss, key recovery, retention/deletion exclusions or reconciliation of messages sent since backup. A verified local restore is progress; describing all backup recovery as untested would now be incorrect.

- **Severity / impact:** **Major data/recovery gate**. Losing settings, encrypted auth material or recent delivery records can cause outage or duplicate catch-up after rollback.
- **Recommended solution:** choose approved encrypted off-host storage, retention, separate stable auth-secret/key backup and recovery owner; retain compatible immutable app artifacts. Restore into a new isolated database, validate grants/deletion exclusions and reconcile actual Discord/delivery history before resuming monitoring. Never restore over active data or bulk-reset uncertain jobs.
- **Tests required:** scheduled backup and expiry alert, off-host retrieval/decryption/key access, least-privilege restore, migration/grant validation, simulated host loss and compatible-artifact rollback with deduplication reconciliation.
- **Acceptance criteria:** successful protected off-host restore of representative data, source preserved, measured end-to-end RPO/RTO meeting an owner-approved target, verified keys/grants/deletion exclusions, and no blind resend after restoring older history. Proposed daily/24-hour RPO and four-hour RTO remain targets, not guarantees.
- **Manual action:** **Yes** for storage/key/retention decisions and production recovery/rollback rehearsal. The fresh scratch drill was local only; no active database was overwritten.

## 6. Monitoring and operational alert delivery

**Disposition:** implementation/regressions and local unhealthy transition **PASS**; external alerting and continuous operations **BLOCKED**.

**Root cause / missing evidence:** `scripts/lib/beta-health.ts` deliberately emits `delivery: console_only`. Its finite CLI samples and private bot/worker health/telemetry are not an unattended, externally delivered incident-response system. Actual configured services are unavailable today. No approved external alert destination, collector, operator acknowledgment or sustained production soak is demonstrated.

- **Severity / impact:** **Major operational gate**; an unattended failed worker, disconnected Gateway, expired backup or exhausted quota may go unnoticed.
- **Recommended solution:** after runtime/send approval, select protected independent supervision/collection and an explicitly approved alert channel. Collect availability, Gateway readiness, completed worker ticks, durable queue age/outcomes, quota/cooldowns, disk/backup age and certificate expiry. Keep private diagnostic endpoints private. No new alert transport was implemented merely to bypass missing operator configuration.
- **Tests required:** controlled web/DB/Gateway/worker failure and recovery; suppressed repeated alerts and observed recovery alert; alert transport outage; stale heartbeat, quota exhaustion, backup-age and disk/certificate cases; approved two-hour then 24-hour soak.
- **Acceptance criteria:** monitored processes run independently of a browser; the named operator actually receives and acknowledges safe incident/recovery alerts within an agreed deadline. Process-local counters must not be reported as durable unique-message totals, broker acknowledgment as human receipt latency, or Docker exit restart policy as unhealthy-process auto-healing.
- **Manual action:** **Yes** for alert destination/contact/transport approval and receipt/soak verification. No operational or test Discord alert was sent by this review.

## 7. Hosting capacity, quotas and costs

**Disposition:** planning only; verified operating envelope **BLOCKED**.

**Root cause / missing evidence:** no approved production host/domain, resource measurements, always-on deployment or sustained real delivery/quota matrix exists. Local Windows and Linux image success do not establish an Oracle host's capacity or cost. Synthetic ten-source/ten-guild tests verify logic, not a production service limit. Current release preparation conservatively allows at most **five total scoped guilds** and **ten shared sources**, but actual `BETA_GUILD_IDS` is unset; preflight correctly rejects external admission. Begin with the approved personal test scope, not the ceiling.

- **Severity / impact:** **Major availability/cost gate**. Under-sizing, sleeping services, provider quotas, storage growth or accidental paid resources can invalidate the assumed service.
- **Recommended solution:** retain the approved **US$0/month target** and **US$15–25/month contingency that is not spending approval**. Compare eligible free always-on compute with a fully priced fallback including storage/backups, egress/IPv4, domain/taxes and operations. The earlier Linux **2 vCPU/4 GB RAM/30–40 GB SSD** sizing remains an unmeasured hypothesis. Keep the existing single-host private broker topology unless a separate architecture review approves a change.
- **Tests required:** representative 1/5-guild and 1/5/10-source runs with independent PostgreSQL connections, concurrent starts, bot bucket waits, dashboard load and approved soak. Measure RSS/CPU/disk/DB connections, p95 request/queue latency, real discovery/receipt time and actual project quota usage. Do not deliberately flood real APIs.
- **Acceptance criteria:** owner-approved host/region/architecture and itemized monthly cost; resource headroom and sustainable API budget; stable settings/ledger after restart; documented admission and latency targets met at the selected initial cohort. Lower the source ceiling if cadence/freshness fails. No admission at a numerical cap solely because a config validator accepts it.
- **Manual action:** **Yes** for host/budget/domain selection, account entitlements, resource provisioning and measured live workload. No purchase, DNS, billing or infrastructure change is authorized here.

Current official cost constraints, checked October 22:

- Oracle's specific Always Free page lists **1,500 A1 OCPU-hours / 9,000 GB-hours per month**, equivalent to **2 OCPUs / 12 GB** for Always Free tenancies. Eligibility, home-region stock, reclamation conditions and actual tenancy limits must be reviewed; an older generic 3,000/18,000 allowance must not be assumed for this account. This is a candidate entitlement, not a selected host or guaranteed zero total bill. [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
- Render's free web tier can sleep after 15 idle minutes and its free PostgreSQL expires after 30 days. It is not an adequate assumption for this entire continuous stack. [Render free-tier limitations](https://render.com/docs/free).

Current YouTube scheduling uses four-call worst-case budgeting: at allowance 7,200/day and 80% polling allocation, nominal intervals are 60/300/600 seconds for 1/5/10 YouTube sources. This is arithmetic, not measured latency; at ten sources, delays can exceed the ten-minute freshness window. Other clients/registration/diagnostics may share project quota. Kick and Discord returned rate limits remain authoritative. Shared monitoring reduces provider polling but does not remove per-destination send/permission-check cost.

## 8. Dependency security advisories

**Disposition:** current advisory gate **FAIL**; no unsafe automatic repair applied.

**Root cause / missing evidence:** fresh full and `--omit=dev` audits both return **four moderate / zero high / zero critical** findings. One underlying esbuild advisory is inherited through `drizzle-kit 0.31.11` → `@esbuild-kit/esm-loader 2.6.5` → `@esbuild-kit/core-utils 3.3.2` → nested `esbuild 0.18.20`. The production tree includes Drizzle tooling through Better Auth; omitting dev dependencies does not eliminate it. Registry metadata still reports Drizzle Kit **0.31.11**. The suggested automatic downgrade is **0.18.1**, a semver-major compatibility change, not an accepted safe fix.

- **Severity / impact:** **Moderate security finding**, unresolved release security gate. The maintainer describes cross-origin access to esbuild's serve endpoint; no exposed affected serve endpoint or NAVI exploit was demonstrated. Package presence still requires review and is not waived by that reachability observation. Affected versions are through 0.24.2, patched from 0.25.0. [Maintainer advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).
- **Recommended solution:** track a compatible upstream/tooling resolution or a narrowly scoped reproducible repair in an isolated copy. Do not repeat the already ineffective overrides, remove working migration tooling, force a downgrade or claim a zero-audit fix without checking the actual tree. Keep affected serve tooling unexposed; scan the intended immutable image. Any bounded risk acceptance must be explicit and does not close unrelated launch gates.
- **Tests required:** clean install showing the vulnerable nested version removed, full/production tree and audit checks, Drizzle configuration/check plus scratch generation/migration/restore, Better Auth regressions, complete native/Linux builds and image dependency scan.
- **Acceptance criteria:** a compatible verified patched tree/image, or a documented owner-approved bounded risk decision with exposure controls for a specifically scoped private experiment. The current wider-launch recommendation remains NO-GO; no risk waiver was inferred.
- **Manual action:** **Yes** for owner risk/release decision if remediation remains unavailable. No package manifest, lockfile or dependency was changed in this review. See [earlier compatibility investigation](PHASE_14_DEPENDENCY_REVIEW.md).

## Test results and boundaries

| Command / scenario                                                                                                        | Fresh result                                                                                           | Assessment                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| First sandboxed `npm run check`                                                                                           | Vitest temporary SSR-cache rename EPERM; 35 suites failed to load, no tests collected                  | BLOCKED harness, not 380 application-test failures                    |
| Unrestricted `npm run check`                                                                                              | Exit 0; TypeScript, zero-warning ESLint, formatting; **380 tests / 35 files**, Vitest 18.23s           | PASS automated simulations/embedded SQL/UI/security                   |
| `npm run build`                                                                                                           | Exit 0, shared/web/bot/worker                                                                          | PASS native production compilation                                    |
| `env:check:auth`                                                                                                          | Exit 0                                                                                                 | PASS configuration shape, not OAuth exchange                          |
| `db:check`, `test:postgres`                                                                                               | Exit 0; concurrent admission/SKIP LOCKED, longest cooldown, route lock and interrupted-send quarantine | PASS actual PostgreSQL; synthetic delivery fixtures                   |
| Fresh migration/index/schema checks                                                                                       | 7 matching migration hashes, 3 valid unique indexes, schema ready, 0 orphan settings                   | PASS read-only actual DB; no migrations applied                       |
| Fresh protected backup / isolated restore                                                                                 | 14 relations match, source unchanged, scratch removed; 0.926s measured scratch interval                | PASS local actual data, not offsite/host-loss recovery                |
| Redis readiness/persistence flags                                                                                         | PONG, AOF enabled, write/rewrite/RDB status OK                                                         | PASS read-only; isolated restart passed October 20, not rerun today   |
| Production Compose model/build                                                                                            | Both exit 0                                                                                            | PASS local image, not a full deployed topology                        |
| Linux image smoke / nine synthetic HTTP cases                                                                             | Node 24.22.1, UID 1000, no checked credential files; all 9 cases pass, bot/worker scaffold exit 0      | PASS network none, synthetic credentials, no host ports               |
| Synthetic web stop and cleanup                                                                                            | Stop succeeds, process exit 143, fixture removed                                                       | PASS cleanup; not a zero-exit result or actual in-flight worker drain |
| Read-only Discord identity / existing membership                                                                          | Application ID matches; installed in 1/1 configured checked guilds                                     | PASS membership only; no install/Gateway login performed              |
| Provider connectivity                                                                                                     | Official Kick RSA key, YouTube channels auth, Kick token/subscription inventory pass                   | PASS actual read-only APIs; no LIVE/receipt claim                     |
| Browser configured-value scan                                                                                             | 19 assets, 12 candidate fields, zero leaked fields                                                     | PASS scan coverage, not exhaustive penetration testing                |
| `release:check`                                                                                                           | Exit 1: missing beta scope/agreement, missing public HTTPS web/webhook origins                         | FAIL external-release readiness; not a local-development defect       |
| `beta:health`                                                                                                             | Exit 1, all 3 configured application endpoints unavailable; console alert emitted                      | FAIL current runtime availability; no external alert receipt          |
| Full and production npm audits                                                                                            | Exit 1, 4 moderate findings each                                                                       | FAIL advisory gate                                                    |
| Real new broadcasts, Discord receipts, complete external onboarding, real signed webhooks, external alert/production soak | Not attempted                                                                                          | BLOCKED exact approvals/configuration/evidence                        |

The ad hoc integrity probe initially attempted to import a private helper and failed before database/provider execution. Only the probe was corrected to use the supported Discord REST constructor; the subsequent actual integrity/membership checks pass. This was a diagnostic-harness error, not an application defect. Native test execution likewise passed after the sandbox-only temporary-file failure; no production security control was disabled.

There is no maintained full-browser E2E runner in the current scripts. Hydrated component tests and nine actual synthetic HTTP cases are not real browser OAuth/installation or livestream acceptance.

## Required closure order and final decision

1. Preserve the now-verified local database/volumes and ledgers. Obtain complete approved send/target scope before starting actual bot/worker monitoring.
2. Complete controlled onboarding, both new broadcast-to-receipt matrices, repeat/restart/fan-out and browser-off verification using the existing plan. Record failures honestly; do not replay or erase history to pass.
3. Decide the dependency repair/risk path and measured initial cohort. Obtain separate approval for host/HTTPS/callbacks/secrets and monitoring transport; validate the full intended topology before any activation.
4. Close encrypted offsite recovery, compatible rollback, received alerts/soak, measured costs/resources/quota/latency and incident ownership.
5. Retain the earlier policy/contact/support/data-deletion/feedback gates as open until reviewed, populated and exercised. Their missing real evidence is not remedied by this infrastructure review. Keep Public Bot/access restrictions unchanged.

**Decision: NO-GO for wider public launch and for treating controlled-beta acceptance as complete. GO only for continued local validation and separately approved, supervised controlled tests.** No public launch preparation, next phase, external invitation, production infrastructure change, credential/permission/access change, real bot/monitoring-worker startup or real Discord send was performed. Application code, database contents, migration journal and dependency manifests/lockfile were preserved; only temporary integration/restore data was created and cleaned up, plus an ignored protected local backup retained.

## Changed files

Added this review and sanitized [evidence](evidence/phase14-release-blockers-results.json). Updated progress, roadmap and the production checklist with pointers that distinguish recovered local gates from still-open production acceptance. Earlier audit outcomes remain dated historical evidence. No application feature or dependency change was necessary.
