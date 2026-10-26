# Phase 11 final audit — controlled release readiness

Date: **2026-10-20, Asia/Colombo**. **Assessment: FAIL. Recommendation: NO-GO for controlled public release.** Phase 11 preparation is documented and its automated baseline passes; neither prior major-issue closure nor real release acceptance is established. The owner's current planning limit remains a **private beta of at most 10 servers and 10 unique streamers**, not authorization for public activation.

## Scope, method and evidence boundaries

Reviewed the documentation set and roadmap, with emphasis on approved requirements/current architecture, prior audit dispositions, Phase 10 blockers, Phase 11 readiness/checklist, operations/scaling, user guide, policy/deletion drafts, deployment and rollback instructions. Reviewed current authentication/guild/install, registration/settings, provider/worker, delivery/SQL, health, security and deployment code and tests. Historical proposals and dated observations are distinguished from current implementation and fresh checks.

Compared all **20 selected runtime/lockfile/deployment inputs** recorded in `evidence/phase10-audit-results.json`: **zero hash changes**. This is a selected-input comparison, not a claim that every repository file was hashed. The capacity test also matches its Phase 11 evidence hash. The candidate-starvation implementation and reported release gaps have not been corrected by Phase 11's documentation/test additions.

Fresh sanitized results are in [audit evidence](evidence/phase11-final-audit-results.json). Local test/build logs: `.local/phase11-final-audit-check.log` and `.local/phase11-final-audit-build.log`. Temporary read-only diagnostic source was removed. No runtime code, credentials, saved preferences, Portal/deployment settings or infrastructure were changed; no real Discord messages/subscriptions were created and no processes were restarted for a live experiment.

Evidence classes:

- **Automated/simulated integrations:** actual auth/application code, embedded PGlite SQL, loopback HTTP and subprocess tests, with external Discord/provider events and send responses simulated.
- **Real read-only integrations:** official provider connectivity, Discord application information and current local database/health probes. These cannot establish a livestream or received message.
- **Historical real observations:** owner-completed Discord consent/dashboard and later workspace/SQL investigations, as recorded in dated reports; not freshly repeated here.
- **Real release acceptance:** controlled broadcasts, received alerts, latency/duplicate counts, actual restart/restore and production ingress remain unverified.

## Fresh test results

Environment: Windows, **Node 25.3.0 / npm 11.15.0**. These native builds do not prove execution under the proposed Linux Node 24 image.

| Check                                                 | Actual result                                                                                                                               | Acceptance interpretation                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                       | **PASS**, exit 0; **336 tests / 30 files**, zero failed, Vitest 17.78s; workspace/tools TypeScript, zero-warning ESLint and formatting pass | Complete maintained automated suite; simulated platform/sender boundaries                                         |
| `npm run build`                                       | **PASS**, exit 0; shared packages, production Next.js website, bot and worker                                                               | Native compilation, no deployment                                                                                 |
| `npm run env:check:auth`                              | **PASS**, exit 0                                                                                                                            | Valid config shape, not an OAuth transaction                                                                      |
| `npm run env:check:example`                           | **PASS**, exit 0                                                                                                                            | Example configuration only                                                                                        |
| Bot and worker workspace `smoke`                      | **PASS**, both exit 0, scaffold mode                                                                                                        | Disconnected initialization; no Gateway login or active monitoring                                                |
| `npm run db:check`                                    | **FAIL**, exit 1                                                                                                                            | Real database gate BLOCKED                                                                                        |
| `npm run test:postgres`                               | **FAIL**, exit 1, sanitized failure                                                                                                         | External PostgreSQL temporary-schema concurrency/recovery test BLOCKED, not a passing embedded-SQL substitute     |
| Independent read-only web DB probe                    | **ECONNREFUSED**                                                                                                                            | Confirms current connection failure outside sandbox restrictions; does not diagnose schema or credential validity |
| `npm run beta:health`                                 | Exit 1, **degraded**; web/bot/worker unavailable                                                                                            | Operational diagnostic works; service readiness fails                                                             |
| `npm run monitor:check -- --connectivity`             | **PASS**, exit 0; Kick hosted RSA key, authenticated YouTube channels HTTP 200, Kick app token/read-only subscription inventory             | Real credentials/connectivity; **no livestream verified**                                                         |
| Discord application API read                          | **HTTP 200**, client ID matches, private bot true, code-grant requirement false, Guild Install reported                                     | Read-only app identity/settings subset; not consent or installed membership                                       |
| `npx tsx scripts/check-client-secrets.ts`             | **PASS**, exit 0; 19 assets, 12 configured candidate fields, no matches                                                                     | Exact-value scan only; not exhaustive encoded-secret/image security audit                                         |
| Production Compose model/tools profile                | **PASS**, exit 0                                                                                                                            | Model parses; says nothing about running containers                                                               |
| `docker compose -f compose.production.yaml build web` | **FAIL**, exit 1; Docker Desktop Linux engine named pipe absent                                                                             | Image build/start/TLS/runtime/image scanning BLOCKED                                                              |
| `npm audit --omit=dev --json`                         | **FAIL**, exit 1; four moderate, zero high/critical                                                                                         | Existing Drizzle/esbuild advisory chain remains                                                                   |
| Fresh full browser OAuth/install/onboarding           | **BLOCKED / not executed**                                                                                                                  | Services unavailable; no maintained full browser E2E runner configured. Hydrated UI tests are included above      |
| Real stream/receipt/soak/restore/alert acceptance     | **NOT VERIFIED**                                                                                                                            | No successful real experiment or new supporting receipt/restore record supplied                                   |

Actual health observation:

```json
{
  "time": "2026-10-20T03:28:03.738Z",
  "status": "degraded",
  "services": { "web": "unavailable", "bot": "unavailable", "worker": "unavailable" }
}
```

Projected configuration remains allowlisted, local web HTTP, monitoring opted in but worker unavailable, and public webhook origin/secret absent. Default local-review production secret directory/certificate/key are absent. No settings were changed to obtain a passing result, and no services were started to manufacture live acceptance. Native HTTP development is not a production HTTPS result.

## Verification of the ten requested areas

| Area                                     | Verified result                                                                                                                                                                                                                                                                                    | Overall acceptance                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Prior critical/major issues resolved  | Earlier auth recovery/locking, save snapshot, hint fencing, activation checks, worker readiness/cooldown and key-backoff corrections remain covered. Phase 10 M01–M05 and Phase 11 public access/policy/operations gates remain open.                                                              | **FAIL**: cannot assert all prior serious findings resolved                                                                             |
| 2. Discord OAuth and installation        | Auth-engine state/replay/cancel/expiry/logout, encrypted token/refresh, exact origin and fixed callback tests pass. Install NAVI authorized native POST/303 URL uses bot/applications.commands, context 0, selected guild, permissions 19456; no Administrator or default install-link dependency. | **PARTIAL**: historical actual consent success, but no fresh logout/install/status transition or intended HTTPS acceptance              |
| 3. Authorized multi-server dashboard     | Session/allowlist + fresh owner/Admin/Manage Guild checks; unauthorized IDs and revocation tests pass. Picker and per-server routes/settings are scoped; ten-guild synthetic fan-out passes.                                                                                                       | **PASS automated; real multi-account/two-server journey unverified**                                                                    |
| 4. YouTube/Kick registration             | Official fixed-origin resolvers, lossless stable IDs, actor/guild-bound confirmation, duplicate constraints and scoped add/remove/enable/disable tests pass.                                                                                                                                       | **PARTIAL**: actual read-only auth/identity history exists, but fresh two-platform UI CRUD/persistence E2E is blocked                   |
| 5. Real livestream notifications         | Simulated current-LIVE confirmation/offline/upcoming rejection and correct embed/message payloads pass.                                                                                                                                                                                            | **FAIL acceptance**: no controlled current-build real two-platform starts/Discord receipts; known YouTube defect open                   |
| 6. Duplicate prevention/recovery         | Persistent uniqueness, transactional claims, attempt/settings fencing, route locks, safe retry versus uncertainty, reconstructed-monitor and long-live/reconnect fixtures pass.                                                                                                                    | **PARTIAL**: external SQL and real process/DB/send interruption acceptance blocked; no permanent exactly-once claim                     |
| 7. Security, rates, isolation            | Auth/isolation/Origin, allowed mentions, channel overwrite/Admin permission, webhook authenticity/rotation/replay, bounded input/timeouts/Retry-After and SQL tests pass. Browser scan finds no exact secrets.                                                                                     | **PASS scoped automated; public load/real tenancy/deployed security unverified**; web lookup rate edge remains                          |
| 8. Policies/support/deletion ready       | Useful review drafts and manual procedure exist; public contacts/legal identity/URL/effective/legal clauses intentionally remain placeholders. Website still has development notices.                                                                                                              | **FAIL for publication**; no complete tested account/guild/backup erasure or active public request channel                              |
| 9. Monitoring/logs/backups/rollback work | Structured safe logs, bounded health CLI, restart configuration and detailed runbooks exist. One local custom-format backup archive exists.                                                                                                                                                        | **FAIL acceptance**: no healthy service runtime, verified restore, rollback, actual alert path or sustained operation                   |
| 10. Hosting capacity/cost documented     | 10-server/10-source private-beta ceiling; free hosting target; US$15–25 contingency not approved for spending; provisional sizing/quotas/load matrix/free-host limitations documented.                                                                                                             | **PASS planning only**: no host selected, CPU/RSS/soak measurements, verified free-tier suitability or actual operating-cost validation |

## Previous finding disposition

| Earlier finding                                                                    | Current status                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning C01: 15-minute discovery versus ten-minute freshness                      | Specific 15-minute gate corrected previously; current per-poll discovery regression passes. Broader discovery/Premiere/freshness feasibility remains open; do not certify all of the original concern closed. |
| Phase 1 malformed URL/secret-loading contract                                      | Current service-selective environment validation and regression tests retain corrections. No newly demonstrated credential leak.                                                                              |
| Phase 2 transient OAuth failures, idle-pool handler, concurrent refresh            | Recovery categorization/account coordination and pool listeners remain; relevant automated tests pass. Real refresh rotation/logout/revocation still needs separate acceptance.                               |
| Phase 5 post-commit save falsely failed                                            | Settings service returns committed repository snapshot; regression tests pass. Separate registration list-refresh issue is not fixed by it.                                                                   |
| Phase 6 hint loss/activation/cadence                                               | Generation-safe merge/reconciliation, subscription activation recheck and budgeted cadence remain in source/tests. Extra batching to correct starvation must preserve these guarantees and rebudget costs.    |
| Phase 7 readiness, cooldown shortening, standby/completion/key-refresh diagnostics | Corrections remain in source and passing tests; do not repeat their original defects as current unresolved findings.                                                                                          |
| Workspace missing migration 0006                                                   | Historical repair is documented; current unavailable DB cannot verify its state. No evidence justifies declaring it still missing or reapplying migrations blindly.                                           |
| Install NAVI origin/default-link issue                                             | Native form/explicit URL/referrer policy remain tested; current application ID matches. Actual fresh installation acceptance remains open.                                                                    |
| Phase 10 M01                                                                       | **OPEN confirmed implementation defect**, unchanged source and original isolated reproduction, M01 below. No new starvation reproduction was run during this audit.                                           |
| Phase 10 M02–M05 / Phase 9 real acceptance gates                                   | **OPEN**: controlled receipts/journey, runtime/database recovery, backups/rollback and measured YouTube coverage.                                                                                             |
| Phase 11 admission/policy/public-readiness gaps                                    | **OPEN**: preparation documents do not implement public access/admission, contacts, erasure/retention or deployment.                                                                                          |

## Critical findings

**None newly demonstrated.** No proven auth bypass, unauthorized cross-server mutation or credential disclosure was found in reviewed source/tests. This is not a penetration-test certificate or a reason to waive unresolved major release gates. No high/critical npm advisory was returned by this run; that is a separate and narrower fact.

## Major findings and required corrections

### M01 — YouTube candidate starvation remains unfixed

`packages/database/src/monitoring.ts:84` prepends discovered IDs to retained candidates; `apps/worker/src/monitor.ts:94–109` repeats discovery on every due YouTube poll; `apps/worker/src/providers.ts:299` checks only the first 50. When 50 recent uploads precede an older known/hinted candidate each cycle, retaining that candidate does not ensure it is ever checked. The Phase 10 isolated probe recorded three 50-ID checks, known candidate retained but never requested, zero sessions/deliveries. Source hashes and direct inspection confirm the same code today; this is **not resolved by the new fan-out test**.

**Required:** fair bounded checking/batching/rotation with correct quota accounting; regressions for exactly/over 50 candidates, older webhook hint, recurring discovery, reconstruction and one eligible alert per destination. Preserve ownership/LIVE validation, freshness/baseline, hint fencing and duplicate prevention. No implementation change is made during this final audit.

### M02 — Controlled live delivery and full real journey still unverified

Evidence directory contains dated JSON summaries and dashboard/error/permission/preview images, but no controlled YouTube+Kick start → received Discord message/UTC latency/count record for the current version. The inspected [Kick image (private image omitted: kick-embed-preview.png)](evidence/UPLOAD_PRIVACY_NOTE.md) explicitly labels sample data/no message sent. `phase09-results.json` excludes actual starts/messages; `phase11-results.json` labels provider/sender responses simulated. User reports that Kick and explicit tests worked are valuable history but do not close both-platform/current-format acceptance. A historical `sent` row is not an independently observed receipt.

The real OAuth success in `OAUTH_LOGIN_DEBUG.md` establishes past owner consent/dashboard access; its own limits exclude a manually repeated logout or bot installation. No fresh live acceptance was executed here. Do not claim complete onboarding, install, actual alerts, latency, no duplicates or multi-server real routing from fixtures.

**Required:** approved test-target register, fresh real login/logout/install/status, two-server registration/configuration/revocation, actual new eligible public streams on both platforms, correct saved content/embeds/mentions and per-destination receipt counts. Measure repeat/reconnect, worker restart and browser/web independence. Real sends still require approved destinations; do not purge deduplication records to force a green demonstration.

### M03 — Runtime, database, HTTPS, recovery and alert acceptance not established

Fresh DB checks fail and the independent probe reports ECONNREFUSED. Web/bot/worker are unavailable. Docker image build cannot reach the Linux engine; local-review secrets/certificates are absent. No chosen public host/origin/verified TLS/callbacks exist in reviewed configuration. Polling credentials alone do not pass webhook/HTTPS acceptance.

Runbooks correctly distinguish REST bot health from Gateway presence, web liveness from complete schema readiness, and process-exit restart policies from unhealthy-container remediation. Those distinctions are not operational proof. One archive's presence cannot establish usable/encrypted/offsite backups or restoration. No timed isolated restore, compatible-artifact rollback, sustained restart recovery or alert delivery evidence exists.

**Required:** restore intended services with volumes preserved; verify actual schema/journal through required migrations and runtime roles, independent PostgreSQL tests, settings/ledger persistence, isolated backup restore/rollback and redacted alert receipt. Test the proposed Linux container/TLS/proxy/health/signal/recovery profile with reviewed local secrets first. Do not modify DNS, public binds, production credentials, or delete volumes as an audit shortcut.

### M04 — Public policies, contact and erasure lifecycle are not publication-ready

The drafts correctly retain **owner-required placeholders** for legal operator identity, support/deletion/security contact, website, effective version, governing-law/legal clauses and retention details. Sri Lanka is provisional, not a legal conclusion. Do not fill these with invented identities or personal contact information. Their draft status is intentional; it nevertheless blocks claiming a public-ready policy set.

Live read-only application metadata still reports **no description, Privacy Policy URL or Terms URL**; Guild Install and private status are reported. This API subset is not a fresh Portal UI/redirect-list inspection. Existing website notices describe local development. Whole-account/guild deletion, historical delivery identifiers while a source stays shared, caches, indefinite deduplication/candidate references and backup expiry/restore exclusions remain unresolved or untested. A manual contact process can be appropriate, but this one has no confirmed accessible public contact or validated complete workflow yet.

**Required:** owner/platform/legal review of actual data categories/retention and disclosure, confirmed service contacts/URLs/identity where required, tested scoped erasure and backup/restore handling, and approved publication/Portal steps. Discord requires an accurate accessible privacy policy and deletion request handling; YouTube has storage/refresh/deletion requirements. Review their application rather than claiming compliance from SQL timers or hashes. [Discord Developer Terms §5](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service), [YouTube Developer Policies III.E](https://developers.google.com/youtube/terms/developer-policies).

### M05 — Controlled public admission and capacity are not validated

Private bot and account allowlist intentionally remain; no general public admission policy or runtime guild cap exists. Ten global source slots are not a ten-guild installation limit. Public bot installation could outgrow the operator register even with dashboard login restricted. Process-local limits/caches, one leader and a single-host Gateway owner need a measured operating envelope before access expansion.

The capacity test is meaningful **synthetic correctness**: five YouTube/five Kick sources × ten guilds, 100 unique accepted simulated sends, 101 attempts including one definite 429, delay respected and no resend after reconstructed monitor. It stubs provider methods and broker responses and uses a no-op coordinator with embedded SQL. It does **not** validate official discovery, Discord permissions/bucket contention, independent PostgreSQL workers, real process restart, CPU/RSS/disk, latency or uptime. Its claimed scope is mostly accurate and must stay narrow.

**Required:** explicit admission/access-expansion decision and capacity enforcement/operations; representative Linux/PostgreSQL load/resource/soak and failure tests with fake external destinations; verified real private-beta acceptance before public expansion. Keep the ten-server/ten-source ceiling provisional until measured. Do not enable Public Bot as a way to test a checklist item.

### M06 — YouTube coverage and quota acceptance remain unresolved

Known-candidate/current-LIVE fixtures cannot establish scheduled/unscheduled/long-scheduled/short broadcast discovery, Premiere discrimination, upstream indexing lag or actual quota headroom. Nominal current cadence is 60s for one YouTube source/450s for ten at budget 7200; these are arithmetic scheduling values, not observed alert latencies. More batches for M01 require revised accounting. Web/diagnostic clients can share project usage outside worker reservations.

**Required:** fix M01, run a controlled coverage matrix, record misses/quota/UTC latency and explicitly accept/disclose limitations before release. Google's documented push events concern uploads/title/description changes rather than a universal live-start guarantee. [Official YouTube push guide](https://developers.google.com/youtube/data/guides/push_notifications).

## Minor findings and residual risks

1. **Four moderate advisories remain.** `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, nested `esbuild`. The offered fix is a semver-major Drizzle Kit 0.18.1 change, not a tested compatible upgrade. No affected exposed tooling server is demonstrated. Resolve compatibly or record explicit bounded risk acceptance; scan the actual Linux image later.
2. **Earlier registration recovery/rate edges persist.** `streamer-manager.tsx` reports a successful mutation then awaits a GET in the same failure handler, risking success+error/stale display. `streamer-providers.ts` still clamps Retry-After to 86400 and classifies HTTP 400 `invalid_client` as generic outage. Worker cooldown fixes do not fix this separate web adapter. Add focused corrections and tests; do not shorten instructed waits. [Discord rate-limit guidance](https://docs.discord.com/developers/topics/rate-limits) likewise emphasizes returned limits/retry timing rather than hardcoded assumptions.
3. **Hardening limits remain explicit.** Floating/unscanned base images, partial script CSP, web probe checks only auth table, REST-only bot health and host-local Gateway ownership are unchanged. No exploit is demonstrated; public/runtime acceptance must address or explicitly accept their risks.
4. **Documentation is preparation, not approval.** Historical current-state paragraphs differ from later observations; keep dates/pointers clear. Landing page has Login with Discord, not an Add to Discord button. Public guide, policy drafts, admission plan and capacity ceiling must not be marketed as deployed features or certified outcomes.

## Capacity and cost conclusion

Documentation is sufficient **for planning review**: maximum ten guilds/ten unique YouTube+Kick accounts, proposed 100 routes, provisional 2 vCPU/4 GB/30–40 GB persistent storage and 14 web/worker pooled DB connections plus headroom. The owner targets **US$0/month**, with **US$15–25 contingency not approved for spending**. Free-host sleep/expiry/reclamation and continuous worker/WebSocket/storage needs are disclosed. No provider, domain, actual invoice, measured resource usage or verified free-host suitability exists; do not call these production capacity/cost results or authorize purchases from the contingency.

## Conditions for reassessment

1. Close M01 with reviewable code/regressions and preserved quotas/security/deduplication; correct remaining rate/recovery defects as appropriate.
2. Restore local dependencies and prove real migration/role/persistence/backup/rollback/health/alert/restart acceptance, without changing public infrastructure.
3. Complete the approved real private-beta journey and two-platform received-alert evidence, including measured duplicates, coverage, latency and multi-server isolation.
4. Validate resource/load bounds and an enforceable public admission approach; resolve policy/contact/retention/deletion gates and residual-risk decisions.
5. Re-run affected checks, record exact release artifacts and owner decisions, then request separately authorized public deployment/install changes. No release is inferred merely from completing the preparation phase.

**Final assessment: FAIL. Controlled public release: NO-GO.** Automated baseline PASS; major correctness and real acceptance/public-readiness gates remain open. Continued supervised private local verification is appropriate, but this audit does not certify private-beta acceptance, enable Public Bot, change deployment settings or launch publicly. Only the audit and sanitized supporting evidence are added; no later phase is started.
