# Phase 5 audit — Discord notification settings

Audit date: **2026-10-17 (Asia/Colombo)**. Scope: the user's Phase 5 notification-configuration requirements and current development roadmap, not the older proposal's detection-phase numbering.

## Final recommendation

**FAIL / HOLD for complete Phase 5 acceptance; automated corrections PASS.** The user-authorized follow-up on **2026-10-17** resolves N01–N03 below. Current verification passes **160 tests in 15 files**, type checks, lint, formatting, production builds and external PostgreSQL transaction probes. Live Phase 5 channel selection and message delivery still require manual verification. At the original audit inspection, the bot was in **zero guilds** and PostgreSQL held **zero registrations/settings/sent tests**; membership was not rechecked during correction work. Passing mocks is not evidence of live delivery. Four moderate dependency-chain findings remain unresolved for the documented compatibility reasons below.

The initial audit identified one major acceptance-evidence gap, three minor findings and a known moderate dependency chain. The three minor findings are now corrected/covered; the live acceptance gate and dependency findings remain open. No credentials, Portal configuration, bot installation, real settings or Discord messages were changed. Phase 6 remains unstarted.

## Authorized correction results — 2026-10-17

### Transaction result correction (N01 resolved)

The notification repository now returns a `NotificationRow` built from the actual SQL `INSERT/UPDATE ... RETURNING` row and the subscription identity read/locked within that same transaction. Its promise resolves only after the transaction commits. Save and restrictive disable return this snapshot directly; neither performs the old fallible post-commit `get`. Versions, guild constraints, pre-write authorization and fresh destination checks remain intact. A later edit cannot change the prior response's configuration/version.

HTTP regressions exercise successful PUT and restrictive-disable responses while making every subsequent repository read throw. Both return 200 with the correct saved version. Additional SQL assertions verify inserted/updated snapshots and rejection of stale writes. Existing hydrated UI coverage still verifies that the browser adopts the returned snapshot without a second browser GET. A network failure during the commit acknowledgment can still make any database transaction outcome ambiguous; this fix addresses the confirmed avoidable **read after acknowledged commit**, not an impossible global exactly-once guarantee.

### Recovery regressions (N02 resolved within automated scope)

Added **19 tests** across `tests/notifications.test.ts` and `tests/notification-safety.test.ts`:

- Save/disable HTTP success despite post-commit read outage, and immutable returned snapshots after later edits.
- Real SQL returned versions plus stale-version rejection.
- Discord acknowledgment followed by result-storage failure returns uncertainty; a fresh service/repository sees the persisted pending row and replay makes no second POST. This simulates process-state loss without claiming a real process-restart experiment.
- A rejected send whose failure cannot be recorded also returns uncertainty and makes no Discord POST when permission validation fails.
- Actual Discord SDK errors for missing permissions/access, missing channel/role/guild, rejected payload, server failure and rate-limit delay map to safe errors without raw provider text.
- Malformed JSON, non-object JSON, unsupported content type and oversized public bodies, plus malformed/oversized authenticated broker bodies, are rejected without writes/sends.

Independent-process PostgreSQL contention, committed restart durability and manual Discord acceptance remain explicitly unverified; they are not represented as closed by these tests.

### Current documentation reconciliation (N03 resolved)

Updated `docs/README.md`, `03-architecture.md`, `04-database-schema.md`, `07-decisions.md`, `DEVELOPMENT_ROADMAP.md` and Phase 2/3/4/5 implementation contracts. Current scope consistently includes Phase 5 configuration/preview/explicit tests, real OAuth success and the available external PostgreSQL evidence, while excluding automatic detection/delivery and Phase 6. Historical phase-scope text is labelled as historical; earlier audit evidence remains dated rather than silently rewritten. The original audit evidence table below is preserved for comparison.

### Dependency review — findings retained, no unsupported downgrade

All four moderate package findings descend from **one underlying advisory**, [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): esbuild's development-server CORS behavior, affected through 0.24.2 and patched starting at 0.25.0. The installed chain is `drizzle-kit@0.31.11 → @esbuild-kit/esm-loader@2.6.5 → @esbuild-kit/core-utils@3.3.2 → esbuild@0.18.20`. These are four package findings, not four independent exploits.

The npm registry reports **0.31.11 as the latest stable Drizzle Kit**. It still depends on the legacy loader. npm's automatic recommendation is the breaking **Drizzle Kit 0.18.1 downgrade**, which is inappropriate for the existing Drizzle ORM 0.45.4 configuration/migration toolchain. A targeted patched-esbuild override was tried, but installed/locked resolution remained 0.18.20 and the audit stayed non-green. The ineffective override was removed: no dependency fix or compatible patched installation is claimed, and no package version/override change is retained. No `npm audit fix --force` downgrade was performed. The transient `npm install --force --package-lock-only` resolution attempt was not an audit-fix downgrade and did not remediate the chain.

Current exposure is tooling: the application does not run an esbuild development `serve` endpoint or Drizzle Studio; current Next.js development uses Turbopack. Keep that tooling surface unexposed, track an upstream stable replacement or separately validate a patched dependency replacement before adopting it, and recheck advisories before deployment. This is exposure reduction, **not remediation or proof of safety**. The optional Drizzle Kit peer path means `--omit=dev` still reports the chain; it cannot be dismissed solely as a dev-only finding.

### Current automated verification

| Check                                    | Actual correction-run result                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused notification tests               | **PASS**, 57 tests across 3 files after the initial regression additions; final HTTP assertions also pass in the full run.                                                                       |
| `npm run check`                          | **PASS, exit 0**: TypeScript, lint, formatting and **160 tests / 15 files**.                                                                                                                     |
| `npm run build`                          | **PASS, exit 0**: shared packages, Next.js production build, bot, worker.                                                                                                                        |
| `npm run env:check:auth`                 | **PASS, exit 0**; credentials unchanged.                                                                                                                                                         |
| `npm run db:check`                       | **PASS, exit 0**; configured external PostgreSQL reachable.                                                                                                                                      |
| `npx tsx .local/phase05-audit-probes.ts` | **PASS, exit 0**: real PostgreSQL repository round-trip/version/isolation/test-claim replay, fixture rollback/absence and corrected snapshot regression. No persistent fixtures or Discord send. |
| `npm audit --omit=dev --json`            | **FAIL, exit 1**: same four moderate findings, no high/critical. No registry failure; no security pass claimed.                                                                                  |

No real Discord delivery test was attempted during this correction work. The remaining operator actions are described under M01 and the final acceptance checklist.

## Review scope and evidence

Reviewed the requirements, API research, architecture, schema, security/risk and decision records, current and historical roadmaps, prior audit findings, Phase 4/5 contracts, progress and OAuth diagnosis records. Where older proposals conflict with the later user-authorized phases, `DEVELOPMENT_ROADMAP.md` and `PHASE_05_NOTIFICATION_SETTINGS.md` define current scope.

Source review covered the protected notification page, guild/session services, public route handlers, streamed request validation, notification service and client editor, private broker/client, bot REST and permission evaluation, shared template/mention contracts, database repositories, schema/migration/retention, and notification/auth/dashboard/registration tests. Current official [Discord permissions](https://docs.discord.com/developers/topics/permissions) and [message creation/allowed mentions/nonce](https://docs.discord.com/developers/resources/message#create-message) documentation were checked for the implemented contract. The API uses explicit mention allowlists and recent-window nonce protection; neither guarantees permanent exactly-once delivery.

No credentials, OAuth codes, provider tokens, session cookies or raw provider responses were printed. External database diagnostics used table-presence/count results. Discord checks were read-only and reported only HTTP statuses and membership count.

## Initial audit checks (historical evidence before corrections)

| Check executed during this audit                                            | Actual result and limitation                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                             | **PASS, exit 0**: workspace/tools TypeScript checks, ESLint with zero warnings, Prettier and **141 tests in 15 files**. Run outside the Windows sandbox restriction previously known to interfere with test temp files/network.                                                                                                                                              |
| `npm run build`                                                             | **PASS, exit 0**: shared packages, Next.js production routes/pages, bot and worker. Build success does not validate live credentials/delivery.                                                                                                                                                                                                                               |
| `npm run env:check:auth`                                                    | **PASS, exit 0** against current local configuration. This validates values, not live services or the browser's chosen origin.                                                                                                                                                                                                                                               |
| `npm run db:check`                                                          | **PASS, exit 0** against configured external PostgreSQL, outside sandbox network restrictions.                                                                                                                                                                                                                                                                               |
| External PostgreSQL schema inspection                                       | **PASS**: both Phase 5 tables exist. Initial counts: 0 registrations, 0 settings, 0 sent test records. This supersedes earlier development-time infrastructure failures.                                                                                                                                                                                                     |
| External PostgreSQL isolated transaction probe                              | **PASS, exit 0**: real repository save/readback, update/version increment, foreign-guild lookup rejection and repeated test-claim deduplication. Fixtures were deliberately rolled back, with absence checked afterward. This establishes SQL behavior on the external engine, not committed restart durability or independent-process contention. No Discord send was made. |
| Post-commit failure audit probe                                             | **REPRODUCED N01**: a simulated successful save followed by failed repository read rejects the whole service call although the write committed. Probe assertion passed; the behavior is a finding, not a functional pass.                                                                                                                                                    |
| Bot/worker smoke commands                                                   | **PASS, exit 0** for each. Scaffold startup only; no live sends or monitoring.                                                                                                                                                                                                                                                                                               |
| Official Discord bot identity GET                                           | **PASS**, HTTP 200 with configured bot token. No identity details/token printed.                                                                                                                                                                                                                                                                                             |
| Official Discord bot guild-membership GET, limit 200                        | **PASS as a credential/read check**, HTTP 200, **0 guilds**. Does not pass channel or delivery acceptance.                                                                                                                                                                                                                                                                   |
| `npm audit --omit=dev --json` (summarized)                                  | **FAIL, audit exit 1**: 4 moderate package findings; 0 high/critical. Packages: `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, `esbuild`. The wrapper printed sanitized counts; its own exit 0 is not an audit pass. No forced dependency changes applied.                                                                                             |
| Live dashboard channel population, save/restore, preview and role selection | **NOT EXECUTED / acceptance pending**: no guild installation or registered streamer configuration is available. Automated evidence below covers these paths with mocked Discord.                                                                                                                                                                                             |
| Real selected-channel test delivery and actual mention behavior             | **NOT EXECUTED / acceptance pending**. No message was sent or manually observed.                                                                                                                                                                                                                                                                                             |
| Real two-guild tampering, channel deletion and permission revocation        | **NOT EXECUTED / acceptance pending**. Tests simulate these conditions; live destructive permission/channel changes were not made.                                                                                                                                                                                                                                           |

The external audit probe is retained in ignored `.local/phase05-audit-probes.ts` for local reproduction; it is not application code or a new committed test-suite feature. It prints fixed outcomes only and rolls its external SQL fixtures back. Existing automated SQL tests use **PGlite**, not an external PostgreSQL server. Their real SQL/Drizzle execution is useful but cannot prove independent-process locking/restart recovery. Hydrated UI tests use **jsdom**, not a real Discord/browser/device end-to-end environment.

## Requirement verification

| Phase 5 requirement              | Implementation and evidence                                                                                                                                                                                                                                                                                                       | Assessment                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Load available text channels     | Bot reads guild/channels/roles/its own member, parses permissions with BigInt, applies everyone/combined-role/member overwrites, and returns only ordinary type-0 channels with View Channel and Send Messages. Administrator and member timeout behavior are tested. UI loads/refreshes targets with loading/empty/error states. | **PASS automated/source; live pending**                                                          |
| Select and save destinations     | Each subscription has its own destination and enable preference, permitting different YouTube/Kick channels. Typed IDs, current guild authorization, fresh bot target validation and optimistic settings versions precede writes.                                                                                                 | **PASS automated/source**, with N01 recovery issue                                               |
| PostgreSQL persistence           | Real migration includes `(guild_id,subscription_id)` composite FK, positive versions and Discord-ID/template constraints. Embedded tests restore different platform destinations and reject foreign-guild associations. External transaction probe verifies real repository round-trip. Removing registration cascades settings.  | **PASS automated/external transactional evidence; committed browser/restart acceptance pending** |
| Custom templates                 | Four variables only: `{streamer}`, `{platform}`, `{title}`, `{url}`. Bounded input, plain substitution, unknown/unbalanced-brace/control/raw-mention rejection; bounded Unicode-safe rendered content.                                                                                                                            | **PASS automated/source**                                                                        |
| Preview                          | Authorized server-side sample rendering, no DB write or Discord POST. UI renders text in React `<pre>`, clears preview when draft changes and identifies sample data.                                                                                                                                                             | **PASS automated/source; live browser pending**                                                  |
| Restricted role mentions         | Current same-guild mentionable unmanaged roles only; @everyone excluded. Forged/deleted/unmentionable roles rejected. Bot independently revalidates before send. Renderer neutralizes metadata `@` and supplies `allowed_mentions` with no automatic parsing/users/reply pings and only the selected role.                        | **PASS automated/source; real mention behavior pending**                                         |
| Test delivery                    | Saved settings only; fresh bot checks; explicit TEST/sample label, deterministic short nonce with `enforce_nonce`, 30-second per-guild admission cooldown, UUID binding/replay handling and bounded history. Composed route → service → broker → bot tests and actual loopback HTTP adapter reach a **mocked** Discord POST.      | **PASS mocked integration; live delivery NOT VERIFIED**                                          |
| Server isolation                 | Every service operation calls fresh session/allowlist/current guild-manager authorization; supplied IDs never authorize access. Scoped queries and composite FK prevent foreign subscriptions/settings. Missing/revoked permissions and foreign IDs are tested.                                                                   | **PASS automated/source; live two-guild scenario pending**                                       |
| Removed channels/permissions/bot | Fresh save/preview/send target checks reject unavailable state; structured safe errors and UI recovery exist. Restrictive disable works without bot access and accepts no new destination/template/role values. Transport uncertainty is recorded without automatic resend.                                                       | **PASS automated/source**, with N02 coverage limits                                              |
| Existing functionality           | Full auth, guild/dashboard, provider resolution, streamer CRUD/persistence, config and database-recovery suite passes with current notification suite. Earlier real OAuth success is documented in `OAUTH_LOGIN_DEBUG.md`, not re-executed as this audit's evidence.                                                              | **No automated regression detected; complete live regression acceptance pending**                |

The explicit Test button may send even when the streamer subscription or saved notification preference is disabled; the UI discloses this, and tests verify it. This is an intentional test action, not an automatic-delivery bypass. Preview/test title and URL are sample/channel data, not detected stream metadata. Automatic monitoring remains truthfully disabled.

## Critical issues

**None demonstrated** in the audited Phase 5 scope. No proven cross-guild authorization bypass, unrestricted mention injection or credential disclosure was found. This is bounded source/test evidence, not a guarantee of absence.

## Major issues

### M01 — Real Phase 5 acceptance has not been exercised

**Type:** major verification/deployment gate, not a demonstrated code defect.

The token validates, but Discord reports zero bot guild memberships. The configured database has the Phase 5 schema but no registrations/settings/sent tests. Therefore no existing live destination is available to verify dashboard channel retrieval, selected-destination persistence, role eligibility or actual delivery. Prior OAuth success and mocked message POSTs do not satisfy this gate.

**Required completion:** install the existing bot into an owner-approved test guild through the existing flow; register test YouTube/Kick identities through the existing UI; choose eligible text destinations; save and reload settings; preview; explicitly send labelled tests to those chosen channels and manually inspect the messages/mentions. Repeat isolation/revocation acceptance with a second permitted test guild/account. Do not grant Administrator or Mention Everyone to make acceptance pass. Record actual results before upgrading this decision.

**Acceptance:** a named operator confirms a real labelled message in the selected channel, only the intended optional role is mentioned, independent platform destinations survive reload/restart, cross-server requests are denied, and revoked/deleted resources fail safely. No real streamer start is needed for these sample tests.

## Minor issues and required corrections

### N01 — A successful commit can be reported as a failed settings operation

**Status: RESOLVED by the authorized correction above.** The following describes the original defect and its required correction.

**Locations:** `apps/web/src/lib/notification-service.ts:49`, `:50`, `:68`, `:74`; `packages/database/src/notifications.ts:63`.

`save` and restrictive `disable` commit the repository operation, then perform a separate `get`. An outage, expiry/deletion race or other read failure afterward produces an error response despite a committed write. The audit's simulated post-commit read outage reproduced this: write completed, service promise rejected. The editor only advances its saved snapshot/version on a successful response, so recovery can require a reload and subsequent retries may encounter version conflicts. The database remains protected and a reload provides recovery, making this minor for the personal configuration scope.

The Phase 5 contract's wording that save returns the committed configuration/version “directly” is stronger than the implementation. The UI avoids a second browser GET, but the server still reads after committing.

**Correction:** have the repository transaction return the committed configuration/version snapshot, and return that from save/disable, or explicitly distinguish a committed write with unavailable refresh from a failed write. Do not loosen authorization/version checks. Add a regression covering commit success followed by read failure and a competing edit; keep the UI's snapshot and error accurate. No fix was applied during this audit.

### N02 — Notification failure-boundary regression coverage is incomplete

**Status: RESOLVED for the identified focused automated regressions.** External process/restart and live Discord acceptance remain open. The following describes the original coverage gap.

**Locations:** `tests/notifications.test.ts`, `tests/notification-safety.test.ts`, `tests/notification-fixtures.ts`; production paths in bot `safeError` and service `finishTest` handling.

The fixtures exercise revoked targets and an ambiguous generic send exception, but often throw an already classified `NotificationError`. They do not directly cover the real Discord SDK 403/404/429/5xx translation branches. They also do not explicitly force `finishTest` failure after a successful Discord acknowledgment, replay a seeded pending row as a restart simulation, or verify all malformed/oversized HTTP body paths. Source handling exists; those branches should not be described as independently verified recovery guarantees.

**Correction:** add focused SDK-error and database-completion-failure tests, a pending-row replay test that makes no second POST, and bounded-body rejection tests. Separately exercise concurrent distinct processes and restart on external PostgreSQL before relying on that evidence; the current PGlite competing-request test and rolled-back external probe do not establish it.

### N03 — Current and historical documentation status is mixed

**Status: RESOLVED by current-document reconciliation above.** The following describes the original inconsistency.

**Locations:** `docs/README.md` Scope control, earlier paragraphs of `03-architecture.md` and `04-database-schema.md`, and `PHASE_05_NOTIFICATION_SETTINGS.md` verification limits.

Some paragraphs still say Phase 5 is not authorized, the bot performs only status checks, notification tables do not exist, or all external PostgreSQL/live OAuth testing is unverified. Later sections and the dedicated OAuth diagnosis supersede those statements, but the mixed status can mislead setup/audit readers. The current audit demonstrates external PostgreSQL connectivity/transaction behavior; earlier real login is also already recorded. Neither closes live Phase 5 delivery acceptance.

**Correction:** label old proposals/delivery records clearly and reconcile current index/setup claims against roadmap/progress. Correct the N01 “direct committed return” description at the same time. Preserve dated historical audit findings; do not rewrite them as if their original test results changed.

## Missing functionality and operational risks

No additional Phase 5 feature omission was demonstrated against the user's scoped requirements: per-subscription destinations, independent platform choices, safe templates/preview, enable/disable, optional safe roles, persistence, explicit tests and failure states exist. Server-wide pause/defaults, embeds, multiple destinations per subscription, detection, automatic sends and generic delivery history are broader proposals or later work, not silently added Phase 5 requirements.

Outstanding requirements are primarily **acceptance evidence** in M01 and **recovery assurance** in N02. The following remain operational constraints:

- Dependency audit remains non-green with four existing moderate tooling-chain findings. Review a compatible update; do not expose affected tooling servers or apply a forced breaking downgrade as an audit shortcut. No new Phase 5 dependency is needed to fix configuration.
- Test admission takes a short global table lock, so different guilds briefly serialize admission. This is acceptable for the documented personal scale, not demonstrated public-scale throughput. Do not hold this transaction over Discord HTTP; current code does not.
- Seven-day test history and provider metadata cleanup require operator maintenance; reads/admission/CLI do not run while every process is stopped. Nonce protection is recent-window only, and a new explicit click after uncertainty may duplicate an accepted message.
- Guild/role/channel authorization checks are point-in-time. An already initiated test cannot be recalled by disabling settings; future automatic delivery needs its separately reviewed disable/send coordination.
- The broker remains credential-protected and loopback-only; the worker stays idle. No public broker, privileged Gateway intent, unnecessary bot permission or automatic resend was introduced.

## Required actions before phase-exit approval

1. **Manual, pending:** install the existing bot in a chosen test guild and register test streamers through the existing UI; save/reload independent YouTube/Kick destinations and inspect previews. Use the explicit test button and personally confirm the labelled message reaches each selected channel with only its selected optional role. **Do not claim live delivery until this is done.**
2. **Automated, complete:** N01 snapshot fix and N02 focused regression tests; typecheck/lint/format/tests/build pass. No application work remains for those confirmed findings.
3. **Documentation, complete; dependency remediation pending:** N03 reconciled; four moderate advisories reviewed and retained with compatibility/exposure rationale. Adopt a validated compatible fix when available rather than a breaking downgrade or ineffective override.
4. **Manual/infrastructure, pending:** verify committed settings across restart, two-guild unauthorized access, revoked/deleted channels/roles and removed bot behavior in the real setup. Independent-process database contention and real device/accessibility/HTTPS acceptance are not certified by the automated tests here.

**Automated correction verdict: PASS (160 tests). Overall Phase 5 acceptance: FAIL / HOLD for manual live evidence and the unresolved dependency risk; N01–N03 no longer block on their original code/test/documentation findings. No Phase 6 work is authorized or started.**
