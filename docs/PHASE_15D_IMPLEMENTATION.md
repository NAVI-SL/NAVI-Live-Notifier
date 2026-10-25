# Phase 15D — dashboard commands and acknowledgments

Date: **2026-10-23**. Phase 15D integration only. **HTTP remains the default; the PostgreSQL consumer remains disabled.** No configured bot or monitoring worker was started, Discord message sent, cloud resource changed, credential modified or Git commit/push made. Migration 0007 was not applied to the normal development database.

## Implementation summary and request flow

Reviewed the Phase 15A architecture audit, 15B queue design, 15AB verification, 15C implementation and migration `0007_phase15c_commands.sql`. The four implemented commands remain `guild_status.refresh`, `notification_targets.refresh`, `notification_settings.apply` and `notification_test.send`. No general Discord proxy or new notification sender was introduced.

1. Better Auth resolves the real session with cookie caching disabled. The existing OAuth guild service freshly verifies management authority. Admission derives the requester from that session; the browser cannot supply a requester, credential, lease or command state.
2. In PostgreSQL mode, `POST /api/guilds/:guildId/commands` admits only the strict Phase 15C command schemas. Existing settings PUT and test POST routes submit settings/test commands instead of calling their legacy broker operations. Mutations enforce exact origin, bounded JSON and UUID idempotency. Existing repository checks also enforce scope, live session identity, subscription/version and pending-work limits.
3. Admission returns **HTTP 202**, `{accepted:true,command:{id,status,expiresAt,statusUrl}}`, Location, no-store and a polling hint. This is acceptance, not proof of a Discord action or settings commit. Replays retain the same ID. A completed replay is still resolved through its authenticated status endpoint.
4. `GET /api/guilds/:guildId/commands/:commandId` rechecks the session and fresh guild-management access on every request. Repository reads additionally constrain guild and requester. Responses contain only typed results/sanitized errors, never raw rows, session references, payloads or credentials.
5. The explicitly enabled bot consumer starts after Gateway readiness and uses the same Discord REST adapter and existing PostgreSQL account/route coordinator. It serializes local processing with one owner UUID; database SKIP LOCKED, renewable leases and generations coordinate other consumers. Current session/scope and Discord membership/management checks are repeated at execution. An absent bot may produce the read-only not_installed result without a member lookup; installed status now rechecks actor management too.
6. Settings commit and completed acknowledgment remain one transaction. Test reservation/nonce, effect marker, receipt journal, conservative uncertain state and normal livestream deduplication are inherited from Phase 15C. No fallback to HTTP occurs after submission or a database failure.

### Dashboard behavior

- Pending, processing, completed, failed, expired and uncertain outcomes are visible with a command ID. Status recovery uses GET only. Failed/expired/cancelled terminal outcomes can be dismissed deliberately; uncertain sends have no dismiss/resend shortcut. Cancelled remains reserved: no cancellation operation was added.
- Polling performs at most 20 status requests per invocation, normally spaced at least three seconds, with ten-second per-request timeouts. Larger server retry windows are respected; 429 pauses manual recovery until Retry-After. Poll failure preserves the command rather than declaring a completed action failed. Manual recovery can start another bounded GET-only poll.
- Queue-mode admission retries retain the same body/key, including the original test nonce. Accepted settings/test IDs are retained in sessionStorage for same-tab reload recovery; credentials are never stored there. Browser storage is advisory, not authorization. If storage is unavailable, keep the visible command ID; database evidence still survives. Do not treat clearing browser storage as permission to resend.
- Target discovery is deduplicated across concurrent callers/React Strict Mode, with shared progress updates. Backend snapshots are valid for 15 seconds, retain role ordering and serve only advisory display/preview data. Saves and tests always validate actual bot permissions at execution.
- Installation pages read fresh snapshots, showing unknown when absent/stale. In queue mode the existing Refresh status control submits a refresh command and refreshes the page after completion. Server selection performs no HTTP bot lookup. Install NAVI remains the existing guild-authorized Discord OAuth redirect, not a queued installation action.
- Preview remains a sample-only server renderer; queue mode refreshes targets first and validates a current snapshot. No preview send was added. Tests retain the existing labelled-message and no-everyone protections.
- **Disable saved notifications remains immediately web-authorized and DB-only**, including during admission pause or a pending acknowledgment. Its version invalidates an older queued save. A later old completion cannot overwrite a newer disabled state in the UI. Disabling does not erase pending/uncertain command evidence and is not cancellation of a test already in flight.
- Original dashboard styling and the private loopback broker remain. Worker-to-bot live delivery, health/diagnostics, YouTube/Kick detection and the notification sender are unchanged.

## Feature flags and defaults

| Service | Variable                        | Default / behavior                                                                                                                                       |
| ------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web     | `BOT_COMMAND_TRANSPORT`         | `http`. Explicit `postgres` constructs the DB adapter instead of the HTTP broker.                                                                        |
| Web     | `BOT_COMMAND_ADMISSION_ENABLED` | `true`, inert in HTTP mode. Set `false` while retaining postgres mode to pause new admissions and preserve status reads, snapshots and direct disabling. |
| Bot     | `BOT_COMMANDS_ENABLED`          | `false`. Only literal `true` enables consumer startup; merely providing DATABASE_URL never activates it.                                                 |

PostgreSQL web mode needs DATABASE_URL, existing authentication variables, explicit DISCORD_ALLOWED_USER_IDS and BETA_GUILD_IDS (maximum five). It does **not** require the broker secret and never constructs the HTTP broker. Unused URL configuration still uses the existing strict loopback validator. HTTP mode retains the existing required private broker secret and URL validation.

An enabled bot consumer additionally needs its own restricted direct DATABASE_URL, DISCORD_BOT_TOKEN and the same approved user/guild lists. Policy hashes must match; mismatches fail closed. Bot service environment selection now allows these fields, but never imports web OAuth secrets. Worker environment behavior is unchanged.

Root and deployment example files contain only safe defaults/placeholders. No actual environment file was edited. Render YAML, cloud resources and release-preflight/health-tool redesign remain Phase 15F work, not completed here.

## Database migration and service permissions

**No new migration.** The additive Phase 15C migration 0007 is required before opt-in. Do not run the normal db:migrate command on the development database under this task. Back up and verify a separately approved target, apply migration with the owner identity and provision reviewed runtime roles before activation. Direct database connections are needed for the existing session advisory coordinator; this phase does not establish compatibility with transaction-pooler endpoints or verify cloud TLS.

Existing `deployment/database-permissions.sql` does not provision command grants. Review additions separately; do not run the bot as schema owner or give it OAuth-table access. Required privileges beyond existing application grants:

| Runtime role                         | Command-specific requirements                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web (`navi_web` in existing example) | SELECT, INSERT on bot_commands; SELECT on bot_guild_snapshots; EXECUTE on `public.navi_command_requester_valid(text,text,text)`. No command UPDATE, attempt writes or snapshot writes. Existing auth/provider/settings/test rights remain needed for current compatibility, admission/test reservation and direct disable.                                                                                                                     |
| Separate restricted bot-command role | CONNECT and schema USAGE; SELECT/UPDATE bot_commands; SELECT/INSERT/UPDATE bot_command_attempts, bot_guild_snapshots and notification_settings; SELECT/UPDATE notification_test_attempts; SELECT provider_channels and streamer_subscriptions, with UPDATE(id) only for existing joined FOR UPDATE locks; EXECUTE on the boolean requester-validation function. No auth-table SELECT, DDL, superuser, role creation or command/attempt DELETE. |
| Monitoring worker                    | Existing permissions/transport unchanged. No need to grant it command execution or auth access.                                                                                                                                                                                                                                                                                                                                                |

The owner-defined security-definer function has a fixed search path, schema-qualified auth tables and PUBLIC EXECUTE revoked. It returns a boolean, not credentials. Readiness initially probes command-table availability; this does not certify every grant. Restricted-role SQL fixtures provide local evidence, while actual deployment roles remain an approval/verification gate. These application roles remain trusted service identities, not untrusted direct SQL users; guild isolation is enforced by repository/admission/execution, not a new RLS claim.

The bot consumer polls once every three seconds, never runs automatically on import, and drains its current processor before closing DB pools. A 60-second shutdown watchdog bounds a hung drain. Gateway and broker shutdown are still attempted if DB closure fails; a possible remote send interrupted by process death is recovered conservatively, not retried as unsent.

## Retention, expiration and reconciliation

No automatic command/attempt/tombstone pruning was added. Preserve test-ledger links and uncertain evidence. Pending commands whose DB-clock deadline has passed are displayed expired even if the backend is offline, without rewriting evidence from a GET. Processing/effect-marked rows need the existing consumer recovery; the dashboard never infers that Discord did not accept them. Expired pending rows still count toward admission caps until recovery updates them.

Before approving operational retention or privacy erasure, define audit duration, bounded terminal compaction, requester redaction and safe key/receipt retention. Do not delete or reset uncertain rows to unblock the UI. Manual reconciliation must inspect the original command/attempt and validated channel/message receipt, compare Discord evidence and follow a separately approved operator procedure. A nonce or elapsed lease does not prove exactly-once delivery. No manual terminal-state rewrite endpoint was added.

## Changed files

- Configuration: `.env.example`, `deployment/web.env.example`, `deployment/bot.env.example`, `packages/config/src/index.ts`.
- Database: `packages/database/src/bot-commands.ts` (fresh advisory snapshot reader and read-only expiry projection). Migration 0007 and existing data unchanged.
- Bot: `apps/bot/src/index.ts`, `command-runtime.ts`, `command-processor.ts` (flagged lifecycle, cleanup and installed-status actor check).
- Web libraries: `runtime.ts`, `guild-service.ts`, `errors.ts`, `notification-http.ts`; new `command-http.ts`, `command-client.ts`, `request-json.ts` in `apps/web/src/lib/`.
- Web UI: notification-manager and server-workspace; new command-status and installation-refresh components; notifications page; new guild command POST and scoped status GET routes.
- Tests: `bot-commands.test.ts`, `notification-ui.test.tsx`; new `command-dashboard.test.ts`, `command-http-transport.test.ts`, `command-runtime.test.ts`.
- Documentation: this report, PROGRESS.md and sanitized `docs/evidence/phase15d-results.json`.

## Verification

Final results are recorded in [sanitized evidence](evidence/phase15d-results.json); private command output is in ignored `.local/phase15d-*.log`. No simulated Discord response establishes an actual OAuth/install/notification integration success.

| Check                                                      | Result and boundary                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full checks and automated suite                            | **PASS**, exit 0: `npm run check`; 509 tests/42 files, 34 new cases, Vitest 9.93 seconds. TypeScript, zero-warning ESLint, formatting, embedded SQL, simulated Discord and hydrated jsdom UI. |
| Production builds                                          | **PASS**, exit 0: final `npm run build`; shared packages, Next.js production routes, bot and worker compiled. No configured runtime started.                                                  |
| `npm run test:commands:postgres`                           | PASS: independent real PostgreSQL connections, duplicate admissions, SKIP LOCKED with held row, lease recovery/stale acknowledgment fencing; disposable schema removed.                       |
| `npm run test:postgres`                                    | PASS: existing seven-migration delivery claims/dedupe, provider cooldown, shared advisory route locks and interrupted-send quarantine; disposable schema removed.                             |
| Database/Redis                                             | PASS: PostgreSQL accepting connections, SELECT 1, Redis PONG. Normal public.bot_commands absent; zero temporary command/reliability schemas after cleanup.                                    |
| Dependency audits                                          | PASS: full and omit-dev npm audit exit 0, zero vulnerabilities. No dependencies added or changed.                                                                                             |
| Actual queue-driven Discord/OAuth/cloud/continuous runtime | BLOCKED / not executed. Requires separate approval, real integration target, migration/grants and live verification.                                                                          |

New cases cover accepted-not-completed routes, scoped status reads, session and permission revocation, strict schemas/CSRF, offline expiry, shared snapshots, duplicate admission, no fallback, rate windows, bounded polling, status outage recovery, uncertain outcomes, pause/rollback, immediate disable races, flags, consumer startup/shutdown and legacy compatibility. Existing monitoring/dedupe/reliability cases remain regression evidence, not new real livestream tests.

## Rollback procedure

1. Pause new admissions with `BOT_COMMAND_ADMISSION_ENABLED=false` while retaining web postgres mode. Do not flip to HTTP and immediately send another test. The status API and immediate disable remain available.
2. Keep the approved consumer available to drain unexpired work if safe, or disable it and preserve work for explicit review. Stop it gracefully. Inspect pending/processing commands, leases, effects, test reservations and receipts. Disabling is not proof an earlier send did not occur.
3. Let safely unstarted work expire/recover; quarantine uncertain effects. Do not drop tables, delete pending/uncertain rows, reuse keys or restore an old DB over newer notification evidence. Do not replay a test through the old broker to resolve uncertainty.
4. Retain a postgres-mode maintenance/status instance until outcomes are reconciled. Only after draining/review may an approved co-located web deployment revert to `BOT_COMMAND_TRANSPORT=http`, with its existing loopback URL/secret, and leave `BOT_COMMANDS_ENABLED=false`. A remote Render dashboard cannot roll back to an unreachable localhost broker: use maintenance/read-only access instead.
5. Preserve migration 0007, existing settings, attempts and uncertain rows. Re-enable admission only after explicit approval and verifying matching scope, roles, connectivity and queue state. No down migration or dual dispatch is part of rollback.

## Findings, remaining risks and decision

Safe local findings addressed: lost admission responses need stable keys; status outages need GET-only recovery; immediate disable must remain actionable during queue waits; old completions must not overwrite newer disabled settings; DB-close failure must not strand Gateway/broker resources; installed-status commands also need a current actor check.

Remaining gates: no live queue activation; actual service-role grants/direct verified cloud connections and public onboarding remain unverified; full browser/real Discord checks require approval; per-request fresh OAuth guild authorization and serial command throughput need later load validation; three-second idle polling adds database compute; operational retention/erasure and uncertain reconciliation need review. Browser storage loss or a separate tab does not authorize a new test. No indefinitely free always-on backend/capacity guarantee is established, and earlier public-release blockers remain.

**GO for a separately approved Phase 15E local reliability/security validation. NO-GO for queue activation, deployment or public release.** Phase 15E/15F were not started. Stop for owner review.
