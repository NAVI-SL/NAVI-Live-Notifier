# Phase 14C — local runtime validation

Date: **2026-10-22, Asia/Colombo**. **Partial real runtime verified; public launch NO-GO.** Read alongside [integration results](PHASE_14C_INTEGRATION_REPORT.md), [release readiness](PHASE_14C_RELEASE_READINESS.md) and [sanitized evidence](evidence/phase14c-results.json).

Reviewed Phase 14 final audit, all three Phase 14B reports, progress, current startup/configuration, Gateway/broker, worker scheduler/health, database, auth/install/settings and tests before execution. Passing builds was not treated as running services.

## Authorization and startup sequence

The Phase 14C request authorizes local service startup but expressly withholds real notification sends/external modifications. After inspection showed the enabled worker immediately polls, delivers and can reconcile subscriptions, the owner explicitly answered **“Keep worker stopped; no real sends.”** This validation did not start a worker or change production configuration to manufacture readiness. A separate runtime appeared afterward, outside this validation's process ownership; see the timeline below and the pending owner clarification.

The existing order is PostgreSQL/Redis (`npm run services:up` if actually needed), website (`npm run dev:web`), bot (`npm run dev:bot`), and monitoring worker (`npm run dev:worker`, only after separate send/reconciliation approval). Website and bot can be tested independently. The enabled worker requires the deployed schema, bot health and provider credentials. Redis is a validated legacy URL in the worker environment; the implemented durable queue is PostgreSQL-backed, not Redis-backed, and production Compose intentionally omits Redis.

Original PostgreSQL/Redis containers were already running and healthy. No reset, restart, migration or volume recreation was needed. Initially ports **3000, 4001 and 4100** had no listeners. The original application-health problem is reproducibly explained by stopped application processes, not a reproduced database/authentication failure.

For bounded validation, used the existing compiled bot entry point and existing Next.js development CLI on loopback with current local configuration. Supervision collected safe outputs and sent a stop signal through an owned child IPC wrapper; application code was not replaced. The bot retains the existing Guilds-only intent, presence, broker, REST sender and ownership lease. No broker POST/message/command-registration route was called.

## Actual service results

| Service / check                             | Actual result                                                                                                                                     | Assessment                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL                                  | Original container healthy, `pg_isready` accepting connections; OAuth tables and worker monitoring schema accessible                              | **PASS actual local DB**                                                                                                          |
| Redis                                       | Original container healthy; PONG, including a probe using the worker's configured URL                                                             | **PASS actual local cache connectivity**, not a Redis delivery queue claim                                                        |
| Website, port 3000                          | Real development process starts; health 200, guild API 401 without session, dashboard 307, intentionally hidden auth session endpoint 404         | **PASS real local HTTP**, not authenticated browser onboarding or public production execution                                     |
| Bot, port 4001                              | Authenticated private health 200/ok, Gateway `ready` at **10:18:57.036**, **10:19:31.012**, **10:20:01.443 UTC**                                  | **PASS actual Discord REST/Gateway readiness**, approximately **64.4 seconds** between first/last samples                         |
| Bot planned restart                         | First instance gracefully exits 0; second obtains ownership and returns health 200/Gateway ready at **10:20:04.607 UTC**, then gracefully exits 0 | **PASS one real supervised process restart**, not a real network-disconnection/resume or 24-hour reliability test                 |
| Worker, port 4100                           | No listener during owned test; subsequently a separately started worker reports healthy                                                           | **PASS later read-only health observation; BLOCKED controlled startup/restart/send acceptance**, no healthy scaffold substitution |
| Combined private health during real runtime | At **10:19:29.191 UTC**: web OK/200, bot OK/200, auth DB OK, worker `connection_refused`; overall exit 1/degraded                                 | **Correct degraded result**; no suppressed or faked worker failure                                                                |

The full bounded runtime window was **10:18:54.155–10:20:05.163 UTC** (about 71 seconds). Logs show actual Gateway-ready and stopped events. Reconnecting events emitted during intentional destruction do not establish recovery from an injected network outage. Online/Watching presence is configured and applied at ClientReady; SDK readiness was observed. A separate human Discord-client visual presence check was not performed.

The website supervisor explicitly terminated its owned Windows process tree after read-only checks: its process exit was **1**. This was deliberate test cleanup, not an observed startup failure or proof of graceful web drain. Both bot shutdowns were graceful exit 0. All owned runtime processes were stopped after validation; original database containers remain healthy. At 10:22:06 UTC the three application ports again refused connections. Do not present the owned runtime-window PASS as an indefinitely running deployment.

## Subsequent separately owned runtime — material state change

The final read-only check unexpectedly returned **exit 0 / all services OK at 10:27:43.417 UTC**. Inspection found new processes in this workspace on ports 3000/4001/4100, with creation times around **10:22:26–10:22:27 UTC**, after the owned test ended. These are not the PIDs started by this validation. The operator/source of that startup has not been established; it must not be attributed to this phase or assumed approved.

Authenticated worker health at **10:29:18.365 UTC** returns HTTP 200, worker running, database/bot/YouTube/Kick OK and heartbeat age 452 ms. A read-only aggregate query found no delivery rows updated since this validation began at that observation. This is useful actual current readiness evidence, not proof of no possible external effects, a controlled worker startup/restart or fresh livestream delivery.

The owner replied that these services may have been started through VS Code terminals; this was not send approval and did not revoke the instruction to keep the worker stopped. A second read-only observation at **10:31:00.296 UTC** again found worker health OK, a later completed heartbeat and no recent delivery updates. These observations verify brief current readiness, not a controlled broadcast or sustained acceptance.

Inspection traced the worker to this workspace's combined development group using `concurrently --kill-others`. Stopping only its watcher would also end the web/bot siblings. The owner was informed; to enforce the still-active no-worker/no-send instruction, this validation stopped **only the verified NAVI combined process tree**, preserving VS Code, PostgreSQL, Redis and data. The stop returned exit 0, and all three application ports then had zero listeners. This Windows forced stop is **not claimed as graceful worker recovery**. Do not restart the combined command under the current restriction; use separate web/bot commands if needed and leave worker off until separately approved.

The first process-stop guard refused a string/date comparison mismatch before taking action. A read-only recheck proved matching PID/start-time/workspace/combined launcher; the corrected guard compares normalized UTC ticks before stopping the same tree. No unrelated process was targeted. No notification was initiated by this validation; the separately started scheduler's external effects cannot be certified solely from its health or ledger aggregates.

## Database reconnection and recovery

Using the actual worker environment without starting the worker, monitoring repository schema readiness passes and Redis PING succeeds. Created a separate probe-owned PostgreSQL pool, obtained its backend identifier privately and terminated **only that probe connection** through a control connection. The idle-error handler emitted its safe existing warning; the next query succeeded on a different backend. **PASS actual pool reconnect**, no database service restart, application connection termination or data modification.

The independent PostgreSQL reliability command also passes concurrent admission/SKIP LOCKED claims, longest cooldown persistence, route advisory locking, reconstructed interrupted-send quarantine/deduplication and temporary schema cleanup. These are real SQL operations with synthetic deliveries. They do not prove an actual running worker survived a crash or sent/recovered an in-flight Discord message.

## Resource observations and operations

One direct-process sample during runtime: bot **76.05 MiB / 0.73 CPU seconds**, Next CLI parent **63.15 MiB / 0.19 CPU seconds**. These are point-in-time direct child values; Next server descendants, active monitoring, workload, peaks and intended hosting architecture are excluded. They are not total application sizing or hosting capacity. No public host was selected or benchmarked.

Console-only unhealthy transition delivery is observed. No external alert transport/recipient, alert receipt, host-down observer or long-term operational monitor was established. A 64-second ready interval and one clean bot restart are meaningful partial evidence, not sustained worker/bot operation or automatic outage recovery acceptance.

## Errors, changes and remaining action

No new application defect required a code patch. No source, environment, dependency, schema, production configuration, permission or credential changes were made by this validation. Runtime failures before startup were connection refusals; bounded real web/bot startup and later separate runtime observations establish partial actual readiness. The separate combined runtime was subsequently stopped to preserve the owner's restriction. Controlled worker/live acceptance remains BLOCKED, final application health is intentionally unavailable, and release configuration still fails its separate gates.

Next steps require new explicit approval of exact destination/account/send/reconciliation scope before worker startup, followed by the existing Phase 14B controlled matrix. Continuous soak, actual worker restart, genuine platform callbacks, injected real Gateway outage/recovery, received external alerts and hosting capacity remain open. Do not start Phase 15 or public activation.
