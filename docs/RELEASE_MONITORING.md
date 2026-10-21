# Controlled release monitoring, acceptance and rollback

**Phase 13 — 2026-10-20:** [health report](PRODUCTION_HEALTH_REPORT.md) records local failures and unavailable production values. The actual bot entry point now combines Gateway lifecycle/REST health; worker adds tick age, bounded process-local metrics and cached quota rows. Finite health sampling emits console-only transitions. Earlier REST-only/probe descriptions below are historical where superseded; collector/received-alert, uptime/receipts and restore/soak gates remain open. No public diagnostic endpoint, deployment or access change.

Prepared 2026-10-20. **Not an active deployment or alert service.** Maximum five scoped guilds; source capacity unverified; no external users invited. Provisional operator: project owner. Public support/on-call/privacy contacts remain unconfirmed; establish the private intake channel before supervised external tests.

## Pre-session checks

After explicit setup/admission approval, privately review approved accounts/guilds/channels/sources, all enabled database routes and pending/uncertain jobs. Scope must be the same in web and worker; never rely on the currently selected browser server. Retain default-off mentions for first acceptance. Run existing commands:

```powershell
npm run release:check
npm run env:check:auth
npm run db:check
npm run test:postgres
npm run beta:health
npm run monitor:check -- --connectivity
```

Preflight checks shape/agreement, not real DNS/TLS or approval. Provider connectivity is read-only, not a LIVE test. `test:postgres` uses temporary isolated schema, not application rows. Any failure retains HOLD. Do not start actual bot/worker or change credentials merely to get green output without approved routes. Current results and blocked checks are in [Phase 12 report](PHASE_12_TEST_REPORT.md).

These npm commands are for the trusted native operator checkout with its separate service files. Do not point one `NAVI_ENV_FILE` at a single container secret and assume it describes all services. The proposed Compose profile does not publish broker/worker ports to the host: use each container's existing `node deployment/healthcheck.mjs web|bot|worker` from its private namespace after approved startup. A host CLI using old development files cannot certify the deployed configuration. Review actual intended service settings privately without copying/printing credentials; see the [deployment guide](DEPLOYMENT_GUIDE.md).

## Indicators and thresholds — proposed, to verify

| Indicator                | Collection / limitation                                                                   | Initial trigger and response                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service readiness        | Private bot/worker health + web/schema check; `beta:health` is finite/local               | Two failed rounds or no worker tick for 120s: pause testing/investigate; do not blindly restart senders                                                                                      |
| Gateway                  | Sanitized ready/disconnect/reconnect lifecycle and actual member presence                 | Sustained disconnection >120s: inspect one-owner/network state; REST healthy is not Gateway proof                                                                                            |
| Queue/delivery           | Safe delivery/attempt/state/code/time; SQL pending age and uncertainty, no bodies         | Any uncertain/unsafe target/duplicate: stop new live experiments, inspect actual channel and preserve ledger                                                                                 |
| Latency                  | UTC actual stream start → first official LIVE → actual Discord receipt                    | Record every case and miss; target processing <30s after verified LIVE absent mandatory waits. Provider discovery delay separately measured, no fabricated SLA                               |
| YouTube quota/cadence    | Durable local reservation plus approved project-console totals                            | Reserve 20% headroom, halt expansion on exhausted budget or freshness misses. Current worst-case four calls/source/cycle; 10 YouTube sources nominally 600s can miss fresh-window acceptance |
| Discord/Kick limits      | Sanitized endpoint/status/Retry-After/bucket/global flags                                 | No request before instructed wait. Repeated 429/credential failures: pause admission, inspect counts/cadence; never flood providers to reproduce                                             |
| Resource headroom        | Isolated-host CPU/RSS, DB connections/latency, disk/queue trends                          | Propose ≥20% RAM/disk headroom, no sustained queue growth. Reduce approved admission if target fails; no verified hardware capacity yet                                                      |
| Data/backup/TLS          | Protected backup completion/checksum, isolated restore record, certificate expiry/renewal | Missed daily backup, failed restore, or certificate expiry <14 days: no expansion; missing safe recovery is a stop condition                                                                 |
| Policy/deletion/feedback | Private request/ack/case reference, bounded record retention                              | Unreachable support, missed applicable deletion deadline or unauthorized disclosure: pause cohort and investigate                                                                            |

Existing Compose rotates JSON logs, but no collector/alert destination/schedule has been installed. `beta:health -- --samples=60 --interval-seconds=60` is finite supervision, not an unattended alert service. Production public health is narrow, bot probe REST-only; verify schema, Gateway and actual receipt separately. Trigger and observe a safe synthetic failure notification through the approved alert channel before unattended use. No alert was sent by this phase.

## Measurable go/no-go matrix

Use synthetic external APIs for deliberate faults; real providers only for approved normal broadcasts, not load/rate-limit attacks.

- **Access:** all approved manager flows pass; zero successful unauthorized guild read/write/install/config attempts, including an allowlisted account with revoked Manage Guild and an unapproved guild owned by it.
- **Routing/content:** for every approved platform/source/destination case, exactly one normal observed alert, correct URL/title/platform/saved template/mention; zero alerts for upcoming/ended/baseline/disabled/foreign-scope cases. Missing artwork must remain clean.
- **Scope:** at most five configured guild IDs, matching across web/worker; all enabled routes reviewed; source cap no greater than measured approved capacity. Private preflight/activation approvals recorded separately.
- **Reliability:** repeated hints and long-live polls create no duplicate logical delivery; same-session reconstruction/restart does not resend; accepted-response-loss stays uncertain for operator review; definite 429 respects its actual deadline. Test real database/process restart and web-off operation after a backup.
- **Coverage/latency:** measure at least one newly created and one known/scheduled YouTube broadcast plus two Kick starts, repeats and an agreed reconnect case. Record all misses, discovery/processing/receipt times and request usage. Agree supported short-stream/Premiere/long-scheduled behavior explicitly; four starts alone do not prove completeness.
- **Operations:** before expansion beyond first server, successful isolated backup restore/compatible rollback, verified safe alert receipt and two-hour supervised soak. Before any unattended period, propose a 24-hour soak with resource/queue/quota trends and a named responding operator. These durations/targets are not measurements already completed.
- **Policy/support:** approved accessible service notices and privacy/deletion contacts; tested account/guild/shared-source and backup erasure process; received/acknowledged private feedback test. Placeholder publication is not acceptance.

## Rollback and incident procedure

Immediate stop triggers: wrong channel/server, unexpected mention, normal duplicate, unauthorized access, invalid signature accepted, suspected secret leak, uncertainty not reconciled, lost schema/durable ledger or recovery/alert failure. Operator pauses the **actual owning worker**, preserves settings/ledger/logs, inspects actual Discord messages and contains the affected scope. No arbitrary Node process killing, delivery deletion or bulk pending reset.

Prefer compatible application rollback with current database retained; no migration was added in Phase 12. Verify the previous artifact includes equivalent guild restrictions and understands current ledger/settings. Rolling back to code that lacks scope filtering can resume unapproved routes: keep monitoring paused until an owner-reviewed alternative restriction is established. The old YouTube batching behavior can also reintroduce starvation; do not claim a rollback target is safe merely because it builds. No tested previous artifact is available yet.

Restore only into a separate database/project if needed, reapply verified deletion exclusions and reconcile sends since the backup before resume. Never delete active volumes or rotate auth encryption keys as a recovery shortcut. Recreate app processes together after replacing the shared edge network namespace. Real rollback/restore remains unexecuted. Follow [rollback plan](ROLLBACK_PLAN.md) and [operations runbook](OPERATIONS_RUNBOOK.md), with owner approval and controlled receipt validation before resuming.

Log only safe event/category/opaque IDs/timestamps; never credentials, cookies, callback query/path secrets, raw signatures or provider bodies. Incident notifications/credential actions must be authorized and comply with reviewed applicable obligations; this document invents no public SLA or compliance status.
