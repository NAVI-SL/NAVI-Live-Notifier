# Operations runbook — supervised private beta

**Phase 13 — 2026-10-20:** [current telemetry/limits](PRODUCTION_HEALTH_REPORT.md) supersede older REST-only bot-health descriptions below. The actual bot now requires REST and Gateway readiness. Worker tick age, process-local outcome/detection/ack summaries and cached provider reservations are private; counters reset on restart and do not replace the ledger. Finite health CLI emits console-only incident/recovery transitions, not externally delivered alerts. Diagnose stale ticks, DB/provider failures, 429 and uncertainty separately; never reset ledger rows or blindly retry uncertain sends to repair metrics. No collector/scheduler/alert destination installed.

Prepared 2026-10-18. **Not an active deployment.** Use with the [beta plan](PHASE_10_BETA_PLAN.md), [deployment guide](DEPLOYMENT_GUIDE.md) and [rollback plan](ROLLBACK_PLAN.md). Operator: project owner; no external on-call recipient or alert service configured. Commands that start/stop review containers are instructions to execute only after the intended local setup and approved targets are ready, not evidence they already ran.

## Startup and access

Review all enabled routes globally against the approved server/channel/source register. Keep monitoring off while DB migration, target approval or backups remain unresolved. Validate environment without printing values:

```powershell
npm run env:check:auth
npm run db:check
npm run test:postgres
npm run monitor:check -- --connectivity
```

The last command is read-only connectivity, not a live test. Apply reviewed migrations/grants through 0006 using the deployment guide, confirm current runtime roles and complete an isolated restore. Never use a destructive reset or `down --volumes` as recovery. For native development use separate `dev:web`, `dev:bot`, `dev:worker` commands so lifecycle ownership is visible; the worker remains scaffold-only until its opt-in. Native HTTP is development evidence, not production HTTPS validation. For container review use separate service commands/secret files in the guide; stop an existing same-token Windows bot first. One Gateway owner per token across all hosts/VMs.

Production-ready preparation uses loopback-bound Nginx/TLS and persistent PostgreSQL; only intended edge ports may be published after approval. Do not expose internal 4001/4100 health/broker, database or Redis. No public DNS, hosting, TLS endpoint or paid resource is provisioned by this runbook.

## Read-only local health and error reporting

New operational commands (no dependencies, notification sends, provider subscriptions, automatic restarts or delivery retries):

```powershell
npm run beta:health
npm run beta:health -- --samples=60 --interval-seconds=60
```

The first takes one sample. The second takes at most 60 sequential rounds, roughly one hour, then exits; it is **not installed as a scheduled service**. Supported ranges: samples 1–1440, interval 10–3600 seconds. Ctrl+C stops sampling. No claim of continuous monitoring beyond the command's lifetime. Use a dedicated operator terminal; closing it ends observation.

Run this aggregate CLI on the trusted native operator host with the existing separate `.env.web`, `.env.bot` and `.env.worker` configuration. Do not point one `NAVI_ENV_FILE` at a single container's secret and assume it supplies all three services. For a container use its existing `deployment/healthcheck.mjs <service>` probe instead; the aggregate host command does not validate container mounts.

The CLI loads existing per-service configuration privately and probes web public `/api/health`, authenticated bot private health and authenticated worker private health only when monitoring is enabled. Redirects are refused, each request bounded to five seconds, response bodies bounded to 4096 bytes. It emits a JSON line per round with UTC timestamp, sample, severity, aggregate status and allowlisted service states; never URL, response body, signature, token or exception text. Disabled monitoring is **degraded**, not green. A configuration/options failure emits only `beta_health_error` / `check_local_configuration_and_options`.

Exit 0 means all completed rounds were healthy within this narrow probe scope. Exit 1 means at least one degraded round or configuration failure, even if later rounds recover. An interrupted run does not certify any observation period. Health output examples:

```json
{
  "event": "beta_health",
  "severity": "error",
  "status": "degraded",
  "services": { "web": "unavailable", "bot": "ok", "worker": "disabled" }
}
```

This is the current observed classification; real output additionally contains UTC time/sample. Keep local structured output in a protected, ignored `.local` file only if needed, with retention/rotation under operator control. The CLI does not rotate redirected files, send external alerts, inspect Gateway acknowledgments, query the DB schema or measure per-delivery latency. Web liveness may pass with a broken database. Use `db:check`, migrations, worker health and actual delivery evidence separately. Worker health covers current tick/dependencies, not guaranteed complete stream coverage. Bot health proves REST identity, not visual online presence.

Existing service JSON logs cover source checks/baselines/errors, delivery attempts/outcomes, uncertainty and lifecycle. Preserve only safe categories/timestamps/opaque IDs in evidence. Never enable raw OAuth/Gateway HTTP debugging or log request URI/query/header/body, env files or database URLs. Nginx access records intentionally omit URI/query data. Prepared Docker logging rotates 10 MB × 3 per service. Standard proxy error logging is restricted to avoid callback leakage.

For supervised beta, the operator reviews failures immediately and pauses testing. Proposed investigation triggers: first unauthorized probe, any uncertain delivery/unexpected mention, two consecutive service failures, repeated provider credential errors or absent expected ticks for two minutes. These are operating thresholds, not automatic enforcement. Before unattended operation configure and test an owner-approved private alert path, certificate expiry/renewal, disk and backup alarms; no external error collector is connected here.

## Incident actions

| Symptom                                | First action                                                                                     | Investigation/recovery                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong target/unexpected ping/duplicate | Stop the relevant worker; preserve ledger and inspect actual Discord                             | Confirm approval register/settings/nonce/session identity and in-flight requests; do not purge rows or resend                                 |
| Uncertain or sending after crash       | Stop further live experiments; inspect actual destination before a new send                      | Keep uncertainty conservative. There is no generic retry/reset endpoint; use a reviewed operator decision, never `UPDATE ... pending` blindly |
| Database unavailable                   | Keep worker stopped; inspect local service/volume/connection state privately                     | Restore intended DB, test schema/roles/concurrency; use isolated restore if corruption, reconcile ledger before resume                        |
| Provider 401/403                       | Pause affected tests; privately verify existing credential validity/API restrictions             | Owner handles credential changes if required; do not print/rotate automatically. Healthy auth alone does not prove channel entitlements       |
| Provider/Discord 429                   | Respect Retry-After and durable cooldown; inspect quota and cadence                              | Do not restart repeatedly, create new projects or flood endpoints; safe retries remain existing sender responsibility                         |
| Webhook signature/key failure          | Keep fail-closed handling; inspect clock, approved callback, key service and proxy byte handling | Reconciliation may recover fresh starts; never disable authenticity or log signatures/capability URLs                                         |
| Channel/role/bot removed               | Disable affected saved notification configuration where authorized                               | Restore only approved permissions/target through existing UI; no Administrator workaround                                                     |
| Bot REST OK but offline in Discord     | Inspect Gateway lifecycle logs and single-owner state                                            | No new login loop; SDK reconnects. Do not start a second token owner to mask failure                                                          |
| TLS/certificate alert                  | Pause callbacks; inspect expiry/renewal/origin and trusted chain                                 | Owner-approved certificate handling; never bypass browser validation or publish internal routes                                               |

Use [rollback](ROLLBACK_PLAN.md) if behavior cannot be safely restored. `unless-stopped` restarts exited containers; it does not restart merely unhealthy containers. Replacing the edge namespace requires coordinated recreation of web/bot/worker; see deployment guide. Inspect outstanding sends before any restart.

## Daily and pre/post-test duties

Privately verify approved route inventory, account allowlist, health/dependency state, Gateway single ownership, quota/cooldown, queue/uncertain outcomes, last successful checks, disk capacity and backup completion. Run the existing `db:prune-streamers` maintenance only on the reviewed intended DB; it deletes expired metadata under documented retention. Do not treat hashes/backup retention as automatically policy-compliant. Record actual receipts and UTC times for tests, not raw payload dumps.

Back up before changes, retain unique dated archives and stable auth encryption keys separately, encrypt/offsite-store using the owner-approved method. Follow deployment guide's `pg_dump --file` plus `docker cp` pattern to avoid PowerShell binary redirection damage. A same-host volume/archive is not disaster recovery. Test restore in a separate database monthly during an ongoing beta; proposed daily RPO/4-hour RTO are unproven until measured and owner-accepted. Review retention across SQL, logs, provider metadata and backups.

After each change rerun relevant checks, inspect health and perform approved sample/live acceptance before declaring recovery. Stop at private beta; no automatic public launch or access expansion.
