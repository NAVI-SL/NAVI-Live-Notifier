# Phase 14D — release configuration and test isolation

Date: **2026-10-22, Asia/Colombo**. **Local isolation prepared; public release NO-GO.** Reviewed all Phase 14C reports, progress, current architecture, deployment/startup, auth, database, monitoring, webhook and test code. See [validation](PHASE_14D_VALIDATION_REPORT.md), [controlled plan](PHASE_14D_TEST_PLAN.md) and [sanitized evidence](evidence/phase14d-results.json).

## Confirmed configuration corrections

The owner identified the existing test server and separate YouTube/Kick destination channels. Private read-only inventory confirmed **two enabled subscriptions, one server, two destinations**, both previously using `@everyone`. Both destinations were verified accessible to the bot with Embed Links using existing read-only permission services. No Discord permissions or external server state was changed.

Applied only the approved **local development** isolation:

- Set matching `BETA_GUILD_IDS` in ignored `.env.web` and `.env.worker` to the approved server. Existing account allowlist and all other configuration values, apart from the explicitly changed monitoring flag, were verified unchanged.
- Set local `.env.worker` `MONITORING_ENABLED=false`. This prevents an accidental combined `npm run dev` from starting automatic polling/delivery. No worker was started. Disabled monitoring is reported as disabled/degraded, never healthy.
- Updated only the **two approved PostgreSQL notification settings** to No mention (`role_id=NULL`, `mention_everyone=false`), incrementing each settings version and setting a common update timestamp **2026-10-22 10:50:37.190 UTC**. Actual destination IDs, templates, enabled notification states and subscription states were preserved. No unrelated route was disabled or changed.
- Verified there was no pending/sending work before the update and that the **entire delivery ledger remained unchanged** afterward: six sent records and one uncertain YouTube record. No state was reset or requeued.

The private scope manifest is `.local/phase14d/test-scope.json`; the prior selected settings are retained in `.local/phase14d/settings-before-private.json`. Both contain private identifiers; neither belongs in GitHub or public reports. The manifest pins the current source identities and per-platform destinations, rather than implicitly approving future streamers. It is planning input, **not live execution approval**.

The configuration operation checked that the worker port had no listener and that the selected rows matched the approved saved routes, locked those rows, required no pending/sending work and committed a narrowly scoped update. This was an owner-authorized local operator update, not a claimed completed dashboard save workflow. Future rollback must review current versions and restore only intended fields through an authorized operation; do not blindly overwrite later edits or automatically restore `@everyone`.

## Release preflight defects fixed

1. **Public-origin false positives.** The old HTTPS check excluded only three exact loopback names and accepted aliases such as `https://127.0.0.2`, private IPs and reserved/example names. Added a conservative canonical HTTPS **DNS-host** check rejecting IP literals, loopback/local/internal/reserved names, credentials and non-origin paths. This is a syntax/profile gate, **not DNS resolution, public reachability, certificate verification or domain ownership proof**. A future IP-literal deployment would need separate reviewed policy support; none is configured now.
2. **Disabled monitoring could still pass release checks.** Added `monitoring_enabled` to readiness. A disabled worker must not make a production-ready report even if scopes and origins are populated. It deliberately remains false in this phase.
3. **Native preflight execution preserved.** The extracted TypeScript helper uses an explicit `.ts` import so `node scripts/check-release.ts` continues to work on the tested Node runtime. Tool-only `noEmit` TypeScript configuration permits those import extensions. No application compiler or architecture was redesigned.

Regression fixtures use an official-domain string only as a syntax input with **no networking**. No production URL was assigned from a fixture or invented to make readiness pass.

## Current configuration result

| Field / requirement                                                                    | Current result                                                                                          | Remaining action                                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Beta guild scope / web-worker agreement                                                | **PASS**, approved scope is now present and matches                                                     | Recheck scope before every live test; do not expand automatically                                                                  |
| Allowed users / broker secret and target / database agreement / bot token / source cap | **PASS current validation**; credentials unchanged                                                      | Production values must be privately approved and checked independently                                                             |
| Monitoring enabled                                                                     | **False intentionally; release check FAIL**                                                             | Explicit live-test approval plus just-in-time safety review before enabling                                                        |
| Public HTTPS website origin                                                            | **FAIL**, current origin remains local HTTP                                                             | Owner-selected host/domain/valid TLS; no DNS/hosting action taken                                                                  |
| Public HTTPS worker origin                                                             | **FAIL**, absent                                                                                        | Approved externally reachable webhook origin/certificate/routing                                                                   |
| Discord callback                                                                       | Source computes `<WEB_ORIGIN>/api/auth/callback/discord`                                                | Privately compare the exact local origin/port to the Portal; production uses the future approved HTTPS origin, not an invented URL |
| OAuth / installation                                                                   | Existing `identify guilds`, `bot applications.commands`, Guild Install and minimum permissions retained | Manual consent/install verification; Public Bot unchanged                                                                          |
| YouTube callback                                                                       | Worker-generated authenticated path under approved `MONITOR_PUBLIC_ORIGIN`                              | No public origin/registration configured; protect generated path/secret; require approval before hub operations                    |
| Kick callback                                                                          | `/webhooks/kick` under the approved external origin                                                     | Review Kick app callback and app-owned subscription inventory before approved reconciliation; no API registration performed        |
| Production required variables                                                          | Existing schemas/templates retained; local auth shape passes                                            | Populate reviewed service secret files privately after host approval; keep stable auth secret and do not expose credentials        |

**Overall release preflight remains exit 1**, now for the two public HTTPS origin flags and deliberately disabled monitoring. It is not “fixed” by relaxing security or claiming local HTTP is public production HTTPS.

Production service files still require private operator review, not copying values from test fixtures:

| Service           | Required configuration groups                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web               | `NODE_ENV`, `WEB_ORIGIN`, `DATABASE_URL`, stable `BETTER_AUTH_SECRET`, Discord client ID/secret and allowed users, approved `BETA_GUILD_IDS`, broker URL/secret; YouTube/Kick credentials for registration                                |
| Bot               | `NODE_ENV`, `DISCORD_BOT_TOKEN`, matching `BOT_INTERNAL_SECRET`, `BOT_STATUS_PORT`; existing Guilds-only intent retained                                                                                                                  |
| Worker            | `NODE_ENV`, `DATABASE_URL`, syntactically valid legacy `REDIS_URL`, explicitly approved monitoring flag, broker URL/secret, scope, port, platform credentials and YouTube budget; public origin/webhook secret when webhooks are approved |
| Migration/ingress | Privileged migration connection separate from runtime grants; approved TLS certificate/key mounts, hostname, renewal, storage and backup ownership                                                                                        |

Use existing `deployment/*.env.example` names/schema. No production secret files were populated. Public hostname/certificate/DNS/hosting selection, exact Portal redirect update and platform webhook registration require owner approval. Beta allowlisting restricts access; it never grants server-management permission or replaces fresh backend authorization.

Safe presence checks confirm YouTube and Kick credentials are configured in both local web and worker profiles, and web authentication shape is valid. **The worker public origin and `MONITOR_WEBHOOK_SECRET` are both absent.** A webhook origin cannot be enabled without an approved server-side secret of at least 32 characters; provision it privately only after approval, never paste it into chat or reuse/publish a provider token. Current profiles are local development rather than production. These presence checks are not fresh platform authentication or a Portal verification.

## Offline delivery/webhook dry-run

Added local developer command:

```powershell
npm run monitor:dry-run -- --scope-file=.local/phase14d/test-scope.json
```

This standalone planner does **not import/start the worker scheduler, broker sender, Gateway or provider clients**. It takes a repeatable-read, read-only PostgreSQL snapshot and projects scoped routes/pending deliveries. It validates exact guild/provider/source/channel scope, no mentions, other enabled destinations, cross-guild shared-source exposure and an ISO UTC start cutoff. Existing sent/sending/failed/uncertain records are never execution candidates; uncertain records remain preserved.

Delivery is always zero-send. Webhook operations are always skipped and explicitly require separate approval; no provider subscription creation, deletion, renewal or callback request is made. The actual scoped run has **no planning blockers**, two eligible No mention subscriptions, one preserved uncertain record and zero pending post-cutoff work. All **14 application/migration relations** have identical counts/content digests before and after the dry-run. Unit tests verify no fetch invocation and input immutability.

This is **offline planning**, not a full worker-level dry-run or actual LIVE verification. A clean plan always returns `liveExecutionAuthorized=false` and `controlledMonitoringReady=false`. The manifest is not installed as a runtime authorization policy. No runtime was enabled by testing it.

The worker previously ignored unknown command-line arguments: passing `--dry-run` would not prevent monitoring when enabled. Added a fail-closed argument guard **before environment loading/startup**, accepting only the existing optional `--smoke`. Unsupported `--dry-run` or send flags now exit 1 with a safe instruction to use the offline planner, rather than silently starting a send-capable worker. Normal no-argument and smoke paths retain their behavior. Regression subprocesses verify rejection without raw argument or secret disclosure.

## Historical and shared-source safeguards

The existing monitor admits a new delivery only after baseline, after settings/subscription activation, within freshness bounds, and with current version/eligibility checks. The No mention save time now provides a route cutoff for streams begun **before 10:50:37.190 UTC**; tests verify this for both YouTube and Kick. Existing sent/uncertain history and persistent destination uniqueness remain intact.

That timestamp is **not a permanent future test-window fence**. Immediately before a separately approved test, with the worker stopped, refresh the approved No mention settings, record the new update time, regenerate the scope cutoff and verify no old pending/sending jobs or unapproved routes. Do not reset global baselines, candidates, receipts or deduplication history to pass a test. A stream begun after today's save but before a later test needs that new just-in-time cutoff.

Current local sources have no other enabled destination outside the approved scope in the dry-run. Normal webhook reconciliation is source-wide: Kick looks up the matching broadcaster/event/version and may create a missing subscription; YouTube can submit a hub subscription. It is **not inherently a per-destination dry-run**. The disabled worker and absent public origin prevent these operations in this phase. Review upstream inventory and any shared-source consumers before separate approval; do not infer permission to modify unrelated subscriptions from the manifest.

## Files changed

Tracked tooling/tests: `package.json`, `tsconfig.tools.json`, `scripts/check-release.ts`, new `scripts/lib/release-origin.ts`, `scripts/lib/controlled-test-plan.ts`, `scripts/plan-controlled-test.ts`, `tests/controlled-test-plan.test.ts`; updated `tests/monitoring.test.ts`, `tests/production.test.ts` and the argument guard in `apps/worker/src/index.ts`.

Local-only changes: ignored `.env.web`, `.env.worker`; No mention/version/timestamp fields on the two approved settings rows; private manifest/rollback snapshot. No dependencies, credentials, database schema, destinations/templates, delivery history, bot permissions or production files changed. Documentation: three Phase 14D reports, evidence and progress.
