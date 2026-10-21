# Phase 7 audit — reliability, duplicate prevention and recovery

Audit date: **2026-10-17 (Asia/Colombo)**.

**Final assessment: FAIL / HOLD for Phase 7 acceptance.** Automated baseline checks pass, including 214 tests and production builds. Actual PostgreSQL concurrency checks and current read-only YouTube/Kick/Discord connectivity also pass. Supplemental audit probes expose reliability/health defects not covered by the existing suite, and real livestream/delivery/crash acceptance remains incomplete.

Findings: **0 critical, 3 major, 4 minor**. Severity distinguishes acceptance gaps from confirmed code defects. Phase 8 was not started. No application fixes, credentials, Portal settings, migrations or real notifications were changed during this audit.

## Scope and method

Reviewed the current roadmap, approved project direction/requirements, architecture, API research, database design/migrations, security/decision records, Phase 6 audit, Phase 7 implementation report, progress and setup documentation. Reviewed worker scheduling/dispatch/runtime/health/webhooks/provider adapters, persistent repositories/coordination, bot broker/sender, shared validation/rendering, Better Auth/guild/install boundaries and relevant regression tests. Historical proposals are distinguished from the concrete PostgreSQL queue and bot-owned sender; no unrelated dashboard, Gateway, queue redesign or Phase 8 requirement was introduced.

Official Discord rate-limit/message, YouTube push and Kick signature guidance was checked again. Tests and builds ran outside the Windows sandbox because prior runs demonstrated temporary-file/junction restrictions. The existing PostgreSQL integration command creates a uniquely named temporary schema, tests actual connections and removes that schema; it does not modify application tables. Additional audit probes use isolated embedded PostgreSQL and synthetic provider responses. The ignored local artifact `.local/phase07-audit-probes.ts` records them; reproduction steps below remain useful without that file.

**Evidence classes:** mocked provider/Discord responses; actual embedded SQL; actual loopback HTTP; actual external PostgreSQL connections; actual read-only platform requests. None of those alone establishes a real livestream transition or received Discord notification.

## Verified functionality

| Requirement                        | Verified behavior                                                                                                                                                                                                                                                                      | Limits                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent duplicate prevention    | Shared source/session hash and unique session/guild/channel delivery index; repeated observations and concurrent inserts create one logical delivery. Destination uniqueness is present in the deployed database.                                                                      | Source deletion removes source-bound deduplication state by design. No permanent exactly-once external delivery claim.                                                     |
| Delivery states and retries        | Pending/sending/sent/failed/uncertain plus intentional suppression; attempt-matched completion, bounded safe preflight retries and conservative ambiguous-response handling.                                                                                                           | Shared provider cooldown can be shortened (M03); completion logging has a zero-row gap (N02).                                                                              |
| Concurrent processing              | Actual PostgreSQL concurrent admission and SKIP LOCKED claiming across two pools return one delivery; route advisory lock serializes separate connections.                                                                                                                             | This is not a two-production-process crash test. Standby health is misleading (N01).                                                                                       |
| Restart/recovery                   | Reconstructed repositories/monitors preserve pending work and deduplication; orphan sending becomes uncertain; acknowledgment-storage failure does not blindly repost. Runtime tests cover nonoverlapping ticks, abort/drain order, cleanup failures and safe enabled startup failure. | Actual process kill, network partition and host/container signal behavior remain manual.                                                                                   |
| Webhook reconciliation             | Persistent receipt deduplication, hint generations and atomic candidate merge protect the Phase 6 discovery/observation races. Polling recovers simulated missed starts; Kick missing subscription restoration is simulated.                                                           | No actual external webhook received; candidate-only YouTube coverage is unproven. Key-cache outage backoff gap in N03.                                                     |
| Discord rate limits                | SDK retry categories and decimal/date Retry-After handling tested; definite 429 reschedules under attempt/freshness bounds.                                                                                                                                                            | No real rate-limit event generated; no deliberate Discord flooding. M03 concerns shared provider cooldowns, not a demonstrated failure of per-delivery Discord 429 timing. |
| Interruptions/long-running streams | Simulated hours-live, offline interruption and same-session reconnect yield one message; new Kick start time is a new logical session, YouTube video ID remains stable.                                                                                                                | Whether a real platform reconnect preserves or changes these keys was not measured. Different provider sessions are not heuristically merged.                              |
| Multi-server delivery              | Simulated single-source/two-guild fan-out, independent destinations, current version/activation/expiry and safe channel/role checks. Disable/re-enable no longer revives a pre-activation queued alert.                                                                                | Actual two-guild received messages, mentions and live permission races remain unverified.                                                                                  |
| Logging/health                     | Structured redacted source/delivery/lifecycle logs; authenticated loopback bot/worker health, no-store responses, actual current bot identity check.                                                                                                                                   | Active missing credentials can produce green health (M02); contention and completion logs need correction (N01/N02).                                                       |
| Credentials/webhooks               | Server-specific environment selection, no worker bot/OAuth/session token, bounded fixed-origin requests, RSA/HMAC verification, timestamp/topic/subscription checks, replay receipts and XML DTD/entity rejection. Generated-key/tampering/rotation/ingress tests pass.                | External TLS/proxy controls, Google's actual signed distribution and Kick retry/rotation behavior remain manual.                                                           |
| OAuth2 and installation            | Better Auth authorization-code/state/browser binding/encrypted-token/session/logout tests; fresh manager checks and cross-origin rejection; explicit guild-install URL with bot/applications.commands, context 0 and permissions 19456.                                                | No new browser login/consent/logout/install flow was performed in this audit. Historical live OAuth evidence is not presented as a fresh result.                           |
| Existing features                  | All auth, recovery, guild/install, dashboard, registration, settings, mention, persistence and failure-boundary regressions remain passing.                                                                                                                                            | Passing fixtures do not re-certify live browser/Portal/device behavior.                                                                                                    |

## Tests executed and actual results

| Command/check                                | Result in this audit                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                              | **PASS, exit 0:** all workspace/tool TypeScript checks, zero-warning lint, formatting and **214 tests / 19 files**. Includes 25 Phase 7 additions; no new assertions were added to the maintained suite during audit.                                                                       |
| `npm run build`                              | **PASS, exit 0:** shared packages, Next.js 16.4.2 production build, bot and worker.                                                                                                                                                                                                         |
| `npm run test:postgres`                      | **PASS, exit 0:** all six migrations in isolated schema; concurrent session admission and single delivery claim, connection-level route-lock serialization, interrupted-send reconstruction/deduplication. Temporary schema cleanup passed.                                                 |
| Worker and bot smoke commands                | **PASS, exit 0**, disconnected scaffold initialization only. They do not run the enabled monitoring loop.                                                                                                                                                                                   |
| `npm run env:check:example`                  | **PASS, exit 0**, validation only.                                                                                                                                                                                                                                                          |
| `npm run env:check:auth`                     | **PASS, exit 0**, validation only; not an OAuth login test.                                                                                                                                                                                                                                 |
| `npm run monitor:check -- --connectivity`    | **PASS, exit 0:** Kick hosted RSA key, authenticated YouTube channels request, Kick app-token read-only subscription inventory. No stream/subscription/message side effect.                                                                                                                 |
| Actual bot identity probe                    | **PASS, exit 0**, Discord bot identity REST request, no message sent.                                                                                                                                                                                                                       |
| Deployed schema read-only probe              | **PASS:** repository readiness and destination unique-index presence. No migrations applied by audit.                                                                                                                                                                                       |
| Discord application identity read-only probe | **PASS:** existing application's ID matches configured web client ID; API reports private bot. No ID/secret value printed or setting changed.                                                                                                                                               |
| Supplemental audit probes                    | **Four defects reproduced:** provider cooldown shortening, green health with an active unconfigured provider, leader-contention/database-health misclassification and expired-key-cache outage backoff. Probe exit 0 means successful reproduction, **not passing application acceptance**. |
| `npm audit --omit=dev --json`                | **FAIL, underlying audit exit 1:** four moderate package findings, zero high/critical. Sanitizing wrapper exit 0 does not mean audit passed.                                                                                                                                                |
| Final `npm run format:check`                 | **PASS**, including this completed report.                                                                                                                                                                                                                                                  |

**Current configuration observation, values never disclosed:** monitoring disabled; YouTube/Kick/broker configuration present; public webhook origin/secret setup absent. YouTube authenticated connectivity now succeeds, so the earlier Phase 7 implementation-time `API_KEY_INVALID` is **not reproduced now**. The audit did not change its value. Earlier reports remain dated evidence; use this result for the present connectivity state.

## Critical issues

**None demonstrated.** This finding is limited to reviewed code and executed tests; it is not certification of untested live configurations.

## Major issues

### M01 — Real delivery and process-recovery acceptance remains open

**Severity: Major acceptance/evidence gap, not a newly demonstrated API defect.**

All automatic Discord sends in the suite use mocks. Actual checks establish API authentication, schema readiness and connection-level coordination, but do not demonstrate a controlled YouTube/Kick start, external signed webhook receipt, received message in two guilds or interrupted production-worker recovery. Monitoring is disabled and public callbacks are not configured. A fresh browser OAuth/install flow was also not re-exercised.

**Required correction:** perform controlled public starts on each provider after the intended local configuration is reviewed; inspect actual selected-channel messages/roles, repeated callbacks/polls, same-session reconnect and downtime recovery. Exercise actual worker termination/competing processes and permission/channel/bot removal. Record observed results separately from fixtures. Configure HTTPS callbacks for webhook acceptance; polling-only operation is possible but cannot prove webhook behavior. No Public Bot change is required for the documented owner/private testing arrangement.

### M02 — Health can return success while an active provider cannot be monitored

**Severity: Major confirmed operational correctness defect.** Location: `apps/worker/src/monitor.ts:257–278`.

Provider health returns `not_configured` before considering failed active-source checks. Overall readiness rejects only `degraded` and accepts any other configured provider's `idle` state. Consequently an enabled Kick subscription with missing Kick credentials fails every check, yet an unused configured YouTube integration can make worker health return `status:ok`. This is different from correctly allowing an unused unconfigured provider.

**Reproduction:** configure a synthetic YouTube key, omit Kick credentials, return one active Kick source, have discovery throw `kick_not_configured` and have the bot health reply succeed. Run a tick. The audit probe gets `status:ok`, `youtube:idle`, `kick:not_configured` despite the active source failure. No network or real source data was involved. Both real provider configurations are present now, so this is a reproduced failure branch, not a claim that today's disabled worker is sending incorrectly.

**Required correction:** base readiness on providers actually required by active subscriptions. A required missing/rejected/unhealthy provider must degrade readiness; an unused unconfigured provider need not. Preserve explicit per-provider state. Add tests for active missing configuration, unused missing configuration, one healthy/one failing active provider and recovery.

### M03 — A later failure can shorten an existing provider Retry-After cooldown

**Severity: Major confirmed rate-limit/recovery defect.** Location: `packages/database/src/monitoring.ts:220–227`; caller: provider HTTP error handling in `apps/worker/src/providers.ts`.

`block()` unconditionally replaces `blocked_until`. Two in-flight failures can complete in either order: a short generic-error delay can overwrite a longer 429/quota/credential delay. Webhook key retrieval and polling share the provider budget/cooldown, so a later independent failure can reopen requests earlier than the original restriction. A source's individual next-poll time does not protect other sources or key retrieval.

**Reproduction:** using all actual migrations in isolated embedded PostgreSQL, set Kick's block to 3,600 seconds, then apply a 60-second block. Advance the injected clock 61 seconds. `reserve('kick',100000)` returns true, although the original hour-long cooldown remains unexpired. This test models error-response ordering; it does not send real rate-limited requests.

**Required correction:** atomically retain the greatest applicable existing/new blocked-until instant instead of shortening it. Preserve independent daily accounting. Add overlapping failure-order/concurrent-connection tests, persistence across repository reconstruction, expiry recovery and a check that the longest delay is honored by every affected source.

## Minor issues

### N01 — Expected leadership contention is reported as database unavailability

**Confirmed by synthetic coordinator probe.** Locations: `apps/worker/src/monitor.ts:290–324`, `packages/database/src/account-lock.ts`.

The lock helper's normal busy timeout is caught as a generic tick failure, setting `databaseHealthy=false`. A standby worker can therefore advertise a database outage and emit `monitor_unavailable` while the database and leader are healthy. The probe throws the existing lock-busy message before any repository access and reproduces `database:unavailable`.

**Correction:** distinguish normal contention/standby from connectivity or lost-lock failure, and avoid reporting an unobserved database outage. Test both busy and broken-connection cases with real locks where available. This finding does not invalidate the successful uniqueness/claim serialization checks.

### N02 — Completion logs do not confirm that a state transition was applied

**Source-review finding; not a live failure experiment.** Locations: `packages/database/src/monitoring.ts:302–326`, `apps/worker/src/monitor.ts:129–137,227–235`.

Attempt/status fencing safely makes an obsolete `finish()` update affect zero rows, but the repository returns no applied/not-applied result. The monitor still assigns the requested outcome and logs it. A late sender whose row was already quarantined as uncertain can emit `state:sent` while the persisted row remains uncertain. The guard protects state; diagnostics can disagree.

**Correction:** return whether the guarded update applied and log a stale-completion/retained-state outcome when it did not. Add an acknowledgment-versus-recovery race regression; do not weaken the attempt/status guard or automatically resend uncertain messages.

### N03 — Expired hosted-key cache failure bypasses the retry gate

**Confirmed with generated key and simulated outage.** Location: `apps/worker/src/webhooks.ts:74–89`.

The initial-outage gate checks `!keyCache`. Once a cached key exists but expires, `publicKey(false)` bypasses that condition and can start another fetch after each failed refresh, despite `refreshAllowed` being in the future. Single-flight coalesces overlapping requests but does not back off repeated sequential failures. Real HTTP errors may also encounter the repository cooldown; transport failures do not reliably provide that additional protection.

**Reproduction:** populate the key cache once, advance just past its one-hour expiry, then make the hosted-key provider throw. Three sequential fresh-timestamp invalid-signature requests cause three refresh attempts without advancing time. Requests fail closed with 503; no forged webhook is accepted. Existing maintained tests cover initial key outage and rotation, not this expired-cache branch.

**Correction:** apply failure backoff consistently to initial and expired-cache refresh paths, preserve single-flight and safe rotation behavior, and test repeated requests during recovery. Do not treat the backoff correction as permission to accept unverifiable events.

### N04 — Existing moderate dependency advisories remain unresolved

Current production-only audit reports `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`, `esbuild`: four moderate package findings in the previously reviewed tooling chain. Zero high/critical findings were reported. No new dependency was introduced by Phase 7.

**Correction:** retain the restriction against exposing affected tooling servers and test a compatible upstream fix when available. No forced downgrade/override or dependency modification was performed during audit; exposure restrictions are not a vulnerability fix.

## Outstanding risks and unverified functionality

- **YouTube discovery:** official feed notifications are uploads/metadata hints, not a universal go-live guarantee. Recent uploads/candidate bounds can miss unscheduled/long-scheduled starts. Premiere exclusion and actual latency remain unproven; the 225-second nominal ten-source cadence is budget-aware, not the earlier proposed 120-second guarantee. [Official push guidance](https://developers.google.com/youtube/data/guides/push_notifications).
- **Kick reconnection/authenticity:** RSA construction/rotation/freshness are fixture-tested; real callback retries, hosted-key rotation and session timestamp behavior are not. A changed `started_at` intentionally represents a new session. [Official signature guidance](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/webhook-security.md).
- **Discord semantics:** recent enforced nonce and persistent logical uniqueness reduce duplicates; neither makes Discord permanently exactly-once. No real 429 or ambiguous accepted-message response was induced. Explicit mention allowlists and destination validation pass fixtures. [Official rate limits](https://docs.discord.com/developers/topics/rate-limits), [message API](https://docs.discord.com/developers/resources/message).
- **Deployment/lifecycle:** enabled healthy entry-point startup/shutdown, forced termination during actual sending, two worker processes, website-independent operation and sustained database partition remain manual. Connection-level PostgreSQL tests are real but narrower than those claims.
- **OAuth/install:** source/tests verify scopes, state, encrypted tokens, sessions, authorization and installation URL. Current actual application identity matches configuration and remains private. Fresh consent/callback/logout, manager revocation and install-button navigation are not newly verified through a real browser. Historical successful OAuth evidence is preserved without reusing it as current proof.
- **Operations/data lifecycle:** actual queue age/latency/quotas, tunnel HTTPS/path/rate controls, upstream subscription garbage collection, retained candidate/hash/backup policy and uncertain-outcome resolution remain operator duties. No delivery-history or recovery dashboard was required/implemented in this audit.

## Required corrections and acceptance evidence

1. Fix **M02/M03** and add focused regression coverage. Preserve uniqueness, current authorization, safe mentions and conservative uncertain handling.
2. Correct **N01–N03** diagnostics/backoff; keep the existing lock/state/signature protections. Re-run the full suite, actual PostgreSQL tests, type/lint/format and builds afterward.
3. Review **N04** under compatible dependency policy; record accepted residual exposure if a safe fix remains unavailable.
4. Close **M01** with redacted real-stream/two-guild message, webhook, browser OAuth/install and process-recovery evidence. Do not claim a received message from API authentication success or a mocked POST.
5. Record sustainable measured polling/coverage and the agreed YouTube/Premiere boundary. Current authenticated YouTube access passes; no key replacement is requested by this audit.

## Final PASS/FAIL assessment

**Automated baseline: PASS. Overall Phase 7 acceptance: FAIL / HOLD.** Persistent admission, ordinary retry/uncertainty handling and local regression behavior have strong evidence. M02/M03 are confirmed defects outside the existing 214-test coverage; M01 remains a real-integration acceptance gap. N01/N03 are also reproduced, while N02 is explicitly a source-review finding. No duplicate real Discord message or compromised credential was demonstrated. Review and correct the identified Phase 7 issues before asserting full acceptance. No application feature/fix or Phase 8 work was performed during this audit.
