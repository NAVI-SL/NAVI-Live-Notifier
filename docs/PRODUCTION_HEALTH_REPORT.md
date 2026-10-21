# Production health report

**Phase 14 follow-up — 2026-10-20:** [current verification](PHASE_14_VERIFICATION_REPORT.md) reports local Docker/PostgreSQL/Redis healthy, actual SQL concurrency/isolated restore and Linux build/synthetic runtime PASS. Actual website/bot/worker probes remain unavailable; production rollout/metrics and real receipts remain unverified. The Phase 13 observations below retain their original timestamp and do not describe the newly healthy local database as failed.

As of **2026-10-20, Asia/Colombo**, Phase 13. **No verified production deployment exists in the supplied records.** This report contains actual local diagnostics and clearly labelled test evidence; it is not a production uptime/SLA report. Wider launch remains **NO-GO**.

## Observed environment

| Signal                             | Actual observation                                                                       | Interpretation                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Configured website, bot and worker | All unavailable at **2026-10-20 04:05:33.185 UTC**                                       | Local configured runtime unhealthy; no inference about an unconfigured remote service    |
| Database                           | Connection and independent PostgreSQL reliability commands exit 1                        | Persistence/migrations/process recovery cannot currently be verified                     |
| Docker                             | Compose model passes; Linux engine named pipe unavailable                                | No successful image build/container start, TLS/proxy or volume/restore acceptance        |
| Provider authentication            | YouTube authenticated channels HTTP 200; Kick key/app-token/inventory checks pass        | Read-only API access works; no real stream, callback or receipt verified                 |
| Release scope and HTTPS            | Preflight false for scope/agreement and HTTPS origins                                    | External admission must stay on HOLD; private restrictions not removed                   |
| Local compiled web                 | Nine loopback rendering/negative guard cases pass with synthetic config                  | Useful HTTP evidence, separate from unavailable actual configured application            |
| Security baseline                  | 357 automated tests pass; known-value client scan zero matches; four moderate advisories | No new critical bypass demonstrated; not comprehensive production security certification |
| Alerts                             | Actual local degraded sample emits `health_alert`, console only                          | No external alert destination/collector/schedule or received operational alert verified  |

## Production metrics availability

**All actual production metrics below are unavailable, not zero.** There are no approved production observations/receipts/soak records to calculate them.

| Metric                                              | Production value                       | Available implementation/evidence                                                                                                                          |
| --------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website/API availability and response latency       | **UNAVAILABLE**                        | Existing liveness probe, private checks, safe ingress duration/status log configuration; no live ingress measurement                                       |
| Gateway connection uptime/reconnect duration        | **UNAVAILABLE**                        | Private combined REST/Gateway health with lifecycle/change timestamp; simulated disconnect/resume tests                                                    |
| Worker heartbeat and database readiness             | **UNAVAILABLE**                        | Last completed tick/age, existing database readiness and 120-second stale threshold                                                                        |
| Unique deliveries / success or failure rate         | **UNAVAILABLE**                        | Durable PostgreSQL delivery ledger; bounded process-local claims/outcomes. Outcomes are transitions, not unique messages or a release success percentage   |
| Detection latency                                   | **UNAVAILABLE**                        | Post-baseline newly committed session delay from provider-reported start; excludes repeated observations, resets per process                               |
| Discord notification receipt latency                | **UNAVAILABLE**                        | Worker can measure start-to-successfully-persisted broker acknowledgment, **not independently observed receipt**; controlled Discord evidence still needed |
| Quota/headroom/rate limits                          | **UNAVAILABLE production consumption** | Cached provider reservation day/usage/cooldown, safe REST 429/bucket/global logs; external console totals and other project clients not covered            |
| CPU/RAM/disk, DB query percentiles and queue growth | **UNAVAILABLE**                        | No verified host/soak/load envelope; no speculative query/index optimization applied                                                                       |
| Backup age, achieved RPO/RTO, restore time          | **UNAVAILABLE**                        | Runbooks only; no completed isolated restore evidence                                                                                                      |
| Feedback volume, incident count, response time      | **UNAVAILABLE**                        | Prepared private intake template, no actual controlled-cohort case records supplied                                                                        |

## Using the improved monitoring safely

Existing trusted operator commands: `npm run beta:health`, `npm run db:check`, `npm run release:check`, and explicitly read-only `npm run monitor:check -- --connectivity`. Finite supervision can use `npm run beta:health -- --samples=60 --interval-seconds=60`; this is not an installed automation or a substitute for a named responding operator. A degraded sample sets a nonzero exit status even if a later sample recovers. Incident/recovery transitions go to console only and reset when the CLI process restarts.

The existing private `/internal/health` bot/worker routes require the broker bearer secret and remain loopback-only. Do not expose them or copy their authentication headers into tickets. Worker snapshots contain only bounded aggregates and known-provider reservation rows. Interpret an old quota day as old data, check `available`/`checkedAt`, and do not equate worker-local reservations or the Kick local safety ceiling with a platform's complete published quota. No extra API calls are made to gather metrics.

Worker counters reset on restart; they do not replace PostgreSQL session/delivery uniqueness or recovery. `sending` counts claims, `pending` counts requeues and `sent` counts applied completion transitions in this process, so never divide these indiscriminately into an exactly-once delivery claim. Latency summaries expose sample count/total/max, not percentile estimates. A stale/fatal completion records no successful acknowledgment metric. Baseline sessions are deliberately excluded from first-detection samples; there is no backfill to manufacture good latency.

For historical counts, an authorized operator may use a reviewed **read-only** query such as `SELECT status, count(*) FROM live_deliveries GROUP BY status;` privately against the verified target. This may scan retained history, so do not add it to frequent health polling without measured justification. These are ledger-state counts, not observed Discord receipts. Never publish raw database rows or reset uncertain/sent records to fix a metric.

## Operational gates

Restore intended local services and validate the reviewed Linux profile before considering deployment. Observe Gateway readiness separately from REST; verify schema/roles beyond liveness; configure a protected collector and authorized alert destination only after approval. Exercise a safe outage/recovery, backup restore/ledger reconciliation, support/deletion request and actual two-platform receipt matrix. Measure capacity and quota before admitting external servers, retaining the account allowlist and at most five configured guilds.

No host/domain/service purchase, DNS or credentials changed. Public Bot/private beta configuration is preserved. Read [Phase 13 implementation](PHASE_13_IMPLEMENTATION.md), [verification and remaining gates](PHASE_13_STABILIZATION_REPORT.md), [release monitoring](RELEASE_MONITORING.md), [operations](OPERATIONS_RUNBOOK.md) and [rollback](ROLLBACK_PLAN.md). This report authorizes no release or Phase 14.
