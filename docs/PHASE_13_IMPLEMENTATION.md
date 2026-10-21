# Phase 13 — monitoring and stabilization implementation

Date: **2026-10-20, Asia/Colombo**. User-authorized local stabilization supersedes the earlier prohibition on automatically starting Phase 13; it does **not** close the [Phase 12 audit](PHASE_12_AUDIT.md) release gates. **Wider launch: NO-GO.** No controlled external release or production feedback was available to analyze. Work addresses reproducible source/test findings instead of inventing production incidents.

## Confirmed issues and fixes

### Gateway readiness was not included in bot health

The bot's private health route previously called REST `users/@me` only. Working REST credentials can coexist with a disconnected Gateway, so the health result could not establish the online connection. The existing Gateway wrapper now tracks starting/ready/disconnected/reconnecting/invalidated/unavailable/stopped lifecycle state and its change timestamp. The actual bot entry point supplies that snapshot to the existing bearer-protected loopback health server. Readiness requires both REST success and Gateway ready; otherwise HTTP 503. A late resume cannot clear fatal invalidation, and stopping remains unhealthy.

This reuses the existing discord.js client, single-process lease and Guilds intent. SDK reconnect/resume ownership, REST sender, mention policy, installation broker and notification endpoints remain intact. No second Gateway session, privileged intent, public health detail or bot-token consumer is introduced. Lifecycle state reflects SDK events, not a new heartbeat-ack latency measurement or proof of actual Discord presence.

### Successful streamer changes could be reported as failed

`StreamerManager` previously awaited mutation and subsequent list GET inside one error boundary. A committed POST/PATCH/DELETE followed by a failed GET therefore displayed an operation failure despite the saved change.

Confirmed mutations now retain success and show a separate accessible refresh warning if the GET fails. Enable/remove immediately update the known local row after success. Registration clears its consumed confirmation. Refresh list retries only the GET, clears the warning on success and never repeats the mutation. A rejected mutation still displays the actual authorization/error state and does not alter local rows or perform a follow-up GET. Existing server-side current-session/guild authorization is unchanged.

### Worker observations lacked usable timing/outcome summaries

The existing private worker health result now includes:

- Last completed tick timestamp and age, alongside existing database, bot, provider and leader/readiness states.
- Fixed-size process-local source-check/failure counters for YouTube and Kick; delivery claim/outcome and definite Discord 429 counters.
- First post-baseline detection delay samples, total and maximum, recorded only when a new session is committed to PostgreSQL. Repeated LIVE checks do not create new samples.
- Stream-start-to-broker-ack delay samples, total and maximum, counted only when the sent state is successfully persisted. This is **not independently observed Discord receipt latency**.
- Cached persisted provider reservation day/usage/cooldown rows and configured YouTube budget, read at most once per minute. Failed optional quota reads mark telemetry unavailable and do not stop successful detection/delivery or expose the raw error.

An existing-table query returns only the two known provider rows, using their primary key. No delivery-history aggregation, new index, schema migration, metrics dependency or provider request is added. Existing delivery/session uniqueness, activation fences, SKIP LOCKED claims, safe retry, rate deadlines and uncertain-outcome handling are preserved. The repository's observation result reports detection delays only after its transaction commits. Private snapshots are cloned so a caller cannot mutate internal counters.

`monitor_summary` emits bounded safe aggregates at most once per completed minute; `source_checked` distinguishes new post-baseline sessions from repeated LIVE observations. Successful delivery logs add stream-start-to-broker-ack time. Existing safe endpoint/status/Retry-After/bucket/global logs remain the detailed Discord rate diagnostics. Metrics never include titles, templates, URLs, OAuth data, tokens, signatures or user/member lists.

### Existing health sampling needed incident transitions

`npm run beta:health` retains finite sampling, authenticated GETs, timeouts and failure exit status. It now emits `health_alert` on the first unhealthy observation or a changed unhealthy service combination, and `health_recovered` on recovery. Identical repeated failures produce no additional transition alerts. These are **console-only structured events**, not delivered Discord/email alerts, a scheduled service or an installed collector. Ordinary per-sample status records remain available.

## Coverage of requested work

| Area                                            | Delivered or reviewed                                                                                         | Boundary                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Web/API availability                            | Existing liveness/probe and protected-route tests; nine fresh compiled local HTTP checks                      | No production uptime, complete authenticated browser journey or live proxy validation            |
| Bot, worker, database and platforms             | Combined bot readiness, timestamped worker health, cached quota, existing actual SQL/provider checks          | Actual configured runtimes/database unavailable; Gateway recovery tests simulate SDK events      |
| Delivery reliability and multiple guilds        | Existing durable ledger/retry/uncertainty/fan-out regressions rerun; new metrics and restart/dedup assertions | No actual receipt, independent PostgreSQL concurrency or full outage/restore acceptance          |
| Install/login/server selection/channel settings | Existing native install URL/origin/session/guild/mention/permission-refresh regressions retained              | No newly confirmed defect requiring a redesign; actual external install/consent blocked          |
| Registration UX                                 | Saved-change/refresh recovery fixed and hydrated regressions added                                            | No claim that rejected/uncertain network mutations were committed                                |
| Feedback and incidents                          | Existing reports/intake reviewed; troubleshooting expanded                                                    | No external beta cases supplied; no fabricated feedback or external contact                      |
| Security/dependencies                           | Authorization/isolation/webhook/mention regressions, bundle scan and advisory check                           | Four moderate existing advisory-chain findings remain; policy/deletion/public contact gates open |
| Query performance                               | Constant-size primary-key quota read, no provider calls for metrics                                           | No production query measurements justify new indexes/caches or tenant-authorization changes      |

## Changed files

Runtime: `apps/bot/src/gateway.ts`, `status-server.ts`, `index.ts`; `apps/worker/src/monitor.ts`, new `telemetry.ts`; `packages/database/src/monitoring.ts`; `apps/web/src/components/streamer-manager.tsx`; `scripts/lib/beta-health.ts`, `scripts/check-beta-health.ts`.

Tests: `tests/bot-gateway.test.ts`, `worker-reliability.test.ts`, `beta-health.test.ts`, `monitoring.test.ts`, `streamer-ui.test.tsx`, new `telemetry.test.ts`.

Documentation: the three Phase 13 reports, progress/roadmap/index, architecture/security/current mention pointers, user troubleshooting, operations and monitoring notes; sanitized Phase 13 evidence. Build-generated ignored outputs/logs are not release artifacts. No dependency, environment key, SQL migration, production credential or deployment configuration change.

## Verification and operation

See [stabilization results](PHASE_13_STABILIZATION_REPORT.md), [production health evidence](PRODUCTION_HEALTH_REPORT.md) and [sanitized command evidence](evidence/phase13-results.json). All testing distinguishes synthetic providers/Discord, embedded SQL and local HTTP from real read-only API connectivity and unverified livestream receipts.

Use existing trusted private health paths and operator commands; never expose broker/worker diagnostics through public ingress. Counters reset per worker process; persist/collect safe summaries outside the process only through an approved monitoring system. PostgreSQL remains authoritative for deduplication and delivery recovery. An old reservation day is not today's usage, and local reservations are not total cloud-project consumption. No new infrastructure or scheduled monitor was installed.

Private restrictions and max-five configured-guild parser remain; actual scope is still unset and release preflight fails. Restore local services and close real onboarding/delivery/recovery/policy/capacity gates before external admission. Deployment, destinations/sends, alerts, support publication and Public Bot changes remain separately approval-gated. Phase 14 is not started.
