# Phase 15A/B — verification and approval report

Date: **2026-10-22**. **Phase 15A audit and Phase 15B design complete for review; Phase 15C onward not started.** Deployment/public release remains **NO-GO**.

## Deliverables

- [Architecture audit](PHASE_15A_ARCHITECTURE_AUDIT.md): all six bot broker routes, worker/operator callers, stored-versus-fresh operations, current authorization and durable queue, concrete risks.
- [Command design](PHASE_15B_COMMAND_QUEUE_DESIGN.md): allowlisted commands, proposed schema/indexes, required lifecycle and uncertain state, ownership/lease/fencing, idempotency, atomic settings/test boundaries, result polling, permissions, migration/rollback and acceptance matrix.
- [Cloud feasibility and sizing research](PHASE_15_CLOUD_ARCHITECTURE_REVIEW.md): earlier dated official-source comparison, capacity estimates and unresolved hosting gates, refined by the new A/B design.
- Updated progress/roadmap pointers and earlier proposal cross-reference. These records are proposals and evidence, not architecture implementation approval.

Only documentation is changed. No SQL/Drizzle migration file, command processing code, endpoint, UI, environment/deployment setting or dependency is added/modified. No existing data is deleted, local architecture replaced, broker exposed, service deployed/started, real credentials changed or Discord notification sent.

## Evidence boundaries and actual checks

Private raw logs are in ignored `.local/phase15ab/`; [sanitized evidence](evidence/phase15ab-results.json) records the results. These checks exercise the **existing** application and reusable mechanisms, not the proposed schema, consumer or acknowledgment UI. No simulated test is a real OAuth installation, livestream or Discord delivery test.

| Check                                                                | Actual result                                                                       | What it establishes                                                                                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintained caller/endpoint inspection                                | PASS; six broker routes identified plus private worker health/operator dependencies | Actual source architecture and boundaries; no new generic settings-save broker route invented.                                                                                   |
| Focused existing test command                                        | PASS, exit 0; **151 tests/six files**, Vitest 5.13 seconds                          | Existing guild isolation, notification persistence/mention safety, monitoring/recovery and cloud config fixtures. Discord/provider I/O simulated; embedded SQL where applicable. |
| Full checks/build/security/local SQL                                 | Results recorded after execution below                                              | Foundation regression evidence only, never acceptance of unimplemented commands.                                                                                                 |
| Proposed command contracts/roles/schema/lifecycle                    | DESIGN REVIEW ONLY; runtime verification BLOCKED until approved implementation      | No new command transport exists to test.                                                                                                                                         |
| Neon/Upstash connectivity and migrations                             | BLOCKED / not executed against cloud services                                       | No approved cloud test target or provisioning; URI/driver fixtures do not prove actual cloud operation.                                                                          |
| Actual onboarding/controlled livestream/Discord receipt/hosting soak | BLOCKED / not executed                                                              | No live-send/startup/deployment approval; earlier historical evidence is not a fresh controlled test.                                                                            |

Additional actual results:

- `npm run check`: **PASS**, exit 0; **432 tests/38 files**, Vitest 12.05 seconds, TypeScript, zero-warning ESLint and formatting.
- `npm run build`: **PASS**, exit 0; shared packages, production Next.js, bot and worker compilation. No configured bot/monitoring service started.
- `npm run test:postgres`: **PASS**, exit 0; real local concurrent admission/claims, longest cooldown, advisory locks, interrupted-send quarantine/reconstruction; temporary schema removed and application tables untouched. This is not Neon or the proposed command schema/role design.
- Full and production `npm audit`: **PASS**, both exit 0, zero findings. Current package advisory metadata only; no dependency changes or OS-image/security certification.
- Final document formatting: **PASS**, exit 0. Final local app listeners on 3000/4001/4100: zero.

Focused command executed:

```text
npm exec vitest -- run tests/worker-reliability.test.ts tests/monitoring.test.ts tests/notifications.test.ts tests/guilds.test.ts tests/notification-safety.test.ts tests/render-compatibility.test.ts
```

## Key conclusions and risks requiring approval

**No confirmed new critical exploit** is asserted by this source/document review. Major design/release risks:

1. Delayed commands need requester/session binding and current management authorization, not a browser guild ID or trusted snapshot.
2. Settings+ack and test reservation+enqueue require atomic transactions; naive adapter substitution creates false failure/orphan/duplicate windows.
3. Lost Discord response/receipt requires uncertain quarantine; an expired lease does not prove an operation was not accepted.
4. Existing seven-day test pruning must not erase unresolved/command-linked evidence after migration. No present data/retention change occurred.
5. Immediate disable stays web-authorized/DB-only so backend outage cannot prevent it; version changes invalidate older queued saves.
6. Web database mode must never instantiate the HTTP broker or require its secret, while legacy local HTTP mode retains strict validation. Preflight/health tooling needs separate mode-aware updates later.
7. Continuous backend hosting, Neon compute allowance, ten-YouTube latency/freshness, actual beta scope (maximum five today), resource measurements, public hooks, external alerts and restore remain open gates. No indefinitely free/card-free reliable backend was verified.

Current preflight also compares complete database URLs; later validation must allow separate restricted logins for the same intended database while rejecting another database, without exposing connection strings.

Minor/operational: bound polling to avoid repeating OAuth calls; maintain fresh permission checks and metadata coalescing without caching grants; report stale snapshots truthfully. Preserve current role mentions, test/preview no-everyone behavior, limiter, worker LIVE verification and normal-delivery uniqueness.

## Approval decision and stop boundary

**GO for reviewing the A/B proposal. NO-GO for Phase 15C implementation until the owner approves it; NO-GO for deployment or release.** Approval should cover the typed command schema/state names (including uncertain), transaction/permission model, retained synchronous disable, retention/fencing requirements and synthetic local prototype plan. It does not authorize real sends, cloud changes or access expansion.

After approval, Phase 15C–E must prove the proposed queue with role-isolation, invalid input, expiry, concurrent claims, revocation, DB outages, every send crash boundary, idempotency, rate-limit and UI refresh/acknowledgment tests before Phase 15F deployment preparation changes. Real integration/deployment still needs separate authorization. This task stops here.
