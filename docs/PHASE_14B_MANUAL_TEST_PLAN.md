# Phase 14B — controlled manual acceptance plan

Prepared **2026-10-22, Asia/Colombo**. **Not executed or approved by this document. Public launch remains NO-GO.** See [current results](PHASE_14B_VALIDATION_REPORT.md). Obtain explicit approval before message-producing actions, livestream initiation, infrastructure changes or offsite uploads. Never paste secrets, OAuth callback queries, cookies, private message contents or account identifiers into public reports.

## 1. Record scope and prerequisites privately

Have the owner approve the exact test user, guild(s), destination channel(s), YouTube channel, Kick broadcaster, test window and allowed message count. Begin with one owned test guild and one account per platform; approve each additional destination independently. Keep public installation disabled and current user restrictions intact. Maximum five approved external servers and ten unique sources are planning ceilings, not measured capacity or automatic admission approval.

Set a pass criterion for detection/receipt latency with the owner before testing; account for the configured YouTube quota/cadence. Record a protected evidence sheet: case ID, UTC timestamps, expected/actual, PASS/FAIL/BLOCKED, private source/session/delivery/message correlation, and correction. Public evidence should contain only safe aggregates and conclusions.

Do not run `npm run dev` or enable the existing worker before scope review: these can start automatic delivery immediately to saved routes. Inspect enabled subscriptions, pending/sending/uncertain ledgers and saved destinations read-only first. Do not delete/requeue historical records. Ensure no other bot/worker instance owns the same token/database.

## 2. Resolve configuration without changing credentials

1. Review environment privately using `.env.example` and `deployment/*.env.example`. Keep the current stable authentication secret and credentials. Run `npm run env:check:auth`, `npm run db:check` and `npm run release:check`; the first two passing does not override a failed release check.
2. After owner approval of the exact beta scope, configure the same `BETA_GUILD_IDS` in web and worker and retain `DISCORD_ALLOWED_USER_IDS`. Do not invent guilds or remove the allowlist. Verify broker secret/URL/port and database target agreement without printing values.
3. For local development, use the exact privately configured `WEB_ORIGIN`, including host spelling and port. In Discord Developer Portal, compare the OAuth2 redirect to **`<WEB_ORIGIN>/api/auth/callback/discord`** exactly. Login scopes are `identify guilds`; bot installation uses `bot applications.commands`, Guild Install (`integration_type=0`) and the existing minimum permission mask, never Administrator. Keep the existing private bot configuration. If Discord rejects a private install for an external owner, record BLOCKED; do not enable Public Bot to pass the test.
4. Public/externally reachable callbacks require separate host/domain/HTTPS approval. Validate the intended certificate/renewal, trusted host/proxy route and production secure cookies. Kick targets `/webhooks/kick`; YouTube uses the worker-generated authenticated callback URL. Do not construct, log or publish its secret-bearing path. Follow the existing deployment/API guide for official subscription configuration; record real provider challenge/signature acceptance separately from local proxy tests.
5. Rerun release preflight against the intended private secret files and keep failure reasons visible. A local HTTP-only profile is not production-ready, even though reconciliation polling can be tested locally. Do not set production mode with an HTTP origin or relax auth validation.

## 3. Approved local runtime and onboarding

Only after send scope is approved, start services in separate terminals: website `npm run dev:web`, bot `npm run dev:bot`, worker `npm run dev:worker`. These commands are for local development, not deployment. Startup can deliver existing eligible work; verify scope first. Use the deployment guide for production processes only after separate infrastructure approval.

Run `npm run beta:health -- --samples=3 --interval-seconds=60` initially. Expected: website liveness HTTP 200/initialized, OAuth database readiness OK, bot authenticated REST plus Gateway ready, worker authenticated health/tick/dependencies ready. Public `/api/health` alone is not readiness. If degraded, retain safe reason/status and private service logs; do not repeatedly restart or reset data to clear it.

| Case                  | Action                                                                                       | Required observed result                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Login / deny / cancel | Use approved Discord account; exercise consent, denial and cancel                            | Success reaches authorized dashboard; failures have safe errors, no authenticated access                           |
| Session / logout      | Refresh dashboard, logout, revisit protected routes; test expiration in a controlled session | Session persists correctly until logout/expiration; unauthenticated access rejected; no tokens/cookies in evidence |
| Install NAVI          | Select approved guild, open existing install action and inspect Discord consent privately    | Correct application/scopes/guild context, no Administrator; owner confirms install and refreshed status            |
| Existing install      | Repeat dashboard status check without reinstalling unnecessarily                             | Installed is displayed; no duplicate Gateway instance                                                              |
| Authorization         | Separate unapproved account/guild and a manager whose permissions were revoked               | Backend denies every unauthorized view/mutation; IDs from the browser do not grant access                          |
| Registration          | Resolve owned YouTube handle/URL and Kick username/URL; confirm identities                   | Stable platform IDs match the actual owned broadcasters; duplicates rejected; enable/disable/remove work           |
| Preferences           | Select approved text channel, template and **No mention** initially; save and refresh        | Destination/template/enabled/mention values persist and stay isolated to the guild                                 |
| Test notification     | Only with exact send approval, trigger one labelled test per approved destination            | Exactly one clearly labelled message arrives at the selected channel; preview/test never pings everyone            |

Do not send to ordinary/external users as an incidental test. Role/everyone tests need explicit additional approval and the existing permission checks; prefer No mention throughout this acceptance run. Never bypass missing Mention Everyone or Embed Links/channel permissions.

## 4. Fresh YouTube and Kick broadcast-to-receipt tests

Perform separately for each owned platform account, after explicit authorization to initiate the broadcast and send the notification. Capture private official provider IDs/status/start time, worker detection/tick logs, persisted session/destination delivery state, bot result and the actual Discord message ID/timestamp. Do not publish actual URLs or raw payloads.

1. Verify the registered stable identity and saved enabled destination. Establish OFFLINE baseline with the worker running before starting; a scheduled/upcoming broadcast alone must not notify.
2. Start the approved broadcast. Observe official LIVE confirmation, current title/URL and available metadata, first detection, durable admission and actual receipt. Merely seeing a `sent` row, mocked event or earlier message is insufficient.
3. Keep it live through at least three reconciliation cycles and repeat an approved event hint if supported safely. Require one normal message per session/destination. Validate YouTube red/Kick green embed, correct actual title/link and metadata fallback without template-driven arbitrary mentions.
4. Close the browser while bot and worker continue; require fresh heartbeat/readiness and continued monitoring. Test a deliberate interruption/reconnection with the platform's actual session identity recorded. Do not expect a new alert merely because the same session reconnects.
5. For an explicitly approved second destination/guild, repeat scoped fan-out: one receipt per configured destination, no unauthorized guild access or cross-server settings changes. Do not expand to an unapproved server.
6. Restart the worker under supervision once a delivery is durably sent; require no duplicate. Test in-flight uncertainty/restart with synthetic delivery infrastructure first; do not intentionally lose a real response or repeat a real send without separate approval. Verify queued work survives restart and uncertainty remains quarantined.
7. Finish broadcast and inspect the resulting state. Do not expect or send a new OFFLINE alert. Record API quota/cooldown, queue age and receipt latency. Mark unavailable scenarios BLOCKED rather than passing from historical evidence.

For public webhook acceptance, separately observe a real official challenge/event over approved HTTPS, valid signature acceptance, invalid/replayed event rejection, and later reconciliation after a safely omitted event. Existing unit tests cover simulated timeout/429/invalid-signature branches; do not flood real APIs or bypass Retry-After to manufacture failures.

## 5. Uncertain delivery reconciliation

The protected row is YouTube, updated **2026-10-18 04:43:50.810 UTC**, one attempt, `delivery_interrupted`. Current inspection found no matching session URL/nonce, but cannot prove non-delivery; the database has no stored Discord message ID for it.

1. Locate the exact row/session/guild/channel privately through read-only SQL. Compare the stored video URL/ID and attempt time with Discord channel history, message author/timestamp and any available archived bot/worker logs. Check for deleted messages or changed channel access. Do not substitute another sent YouTube session's receipt.
2. If a uniquely matching receipt is found, retain its private message ID and session/destination/time evidence for review. This phase provides no automatic state-changing reconciliation command. Any supported operator correction needs a reviewed, narrowly conditional transaction against that exact row, preservation of uniqueness/history and a recorded reason; do not execute a blanket UPDATE.
3. If evidence remains inconclusive, leave `uncertain` indefinitely suppressed and record the missing proof. A replacement alert requires explicit owner approval and duplicate-risk acknowledgment. Never reset attempts, delete ledger rows or silently retry.

## 6. Continuous operation, alerts and capacity

After approved initial sends, conduct a proposed **24-hour supervised soak**; agree its duration/targets before starting. Sample health every 60 seconds using bounded runs (the CLI supports up to 1440 samples), track worker heartbeat age, Gateway reconnects, API cooldown/quota, queue backlog, sent/failed/uncertain counts and latency. A finite CLI sample is not an independent always-on monitor.

Restart owned processes under supervision; verify graceful stop, persistent jobs and single Gateway ownership. Preserve logs for deliberate outage and recovery. Existing Compose restart policies are preparation, not observed automatic recovery on the intended host. Do not reboot the original database or reset volumes for a test without a separate reviewed recovery plan.

Approve an alert transport and recipient before configuration. Induce a safe supervised service-health failure, observe an alert **at the recipient**, acknowledge it, restore service and observe recovery without unchanged-failure flooding. Test monitoring-agent/host failure too; a process cannot report its own total outage reliably without an external observer. Do not reuse livestream sender routes or send operational Discord messages without permission.

Measure actual website/bot/worker/database CPU, RSS, disk/volume growth, connections, queue age, API quota/headroom, sustained notification throughput and end-to-end latency at the intended host/architecture. Start with one guild/one account per platform; expand only through approved capacity steps. The Phase 14B idle local PG/Redis snapshot is not a load test. Confirm an itemized cost, free-tier sleep/continuous-process/storage/egress limits and operator ownership before any purchase or hosting change. US$15–25 contingency is not spending approval.

## 7. Encrypted offsite recovery and rollback

Use [deployment backup/restore](DEPLOYMENT_GUIDE.md), [rollback](ROLLBACK_PLAN.md) and [operations](OPERATIONS_RUNBOOK.md). The local archive/14-relation scratch test already passes; this next test must demonstrate retrieval after loss of the original host.

Have the owner choose an approved authenticated encryption tool and offsite destination, independent key custody, retention and RPO/RTO. For example, an approved `age` recipient workflow encrypts the existing private archive with `age -r <APPROVED_PUBLIC_RECIPIENT> -o <PRIVATE_ENCRYPTED_OUTPUT> <EXISTING_PRIVATE_ARCHIVE>`; decryption uses an identity **file path**, never a private key pasted into a command/chat. These are placeholders, not executed commands or permission to upload. Do not add encryption keys or archives to the repository.

After separate approval, upload only encrypted data, retrieve on an isolated replacement environment, obtain the key from its independent approved location and decrypt privately. Restore into a uniquely named scratch database, validate counts/digests, grants, schema, auth-secret continuity, subscriptions and delivery/uncertainty history. Measure complete retrieval/key/decrypt/restore/application-readiness time and source backup age. Clean up only explicitly owned scratch data. Do not overwrite active databases, send from the restored copy, or replay historical deliveries. Verify the compatible image/schema rollback plan and retention/deletion exclusions before resuming any sender.

## 8. npm warning and final sign-off

Use the committed lockfile with `npm ci`, then `npm run test:tooling`, `npm run check`, full/production audits and native/Linux builds in a separate clean trial. The actual loader must remain patched; a clean npm listing alone is insufficient. Test candidate npm/toolchain fixes only in isolation and preserve original source/lock until compatibility and advisory checks pass. Do not force audit upgrades/downgrades or remove the override to silence ELSPROBLEMS.

Before public activation, also close existing policy/operator/support/deletion/retention placeholders, real feedback/incident intake and owner risk review. Require all applicable cases above to have dated real evidence, no unexplained duplicates/uncertain outcomes, accepted latency/quota/capacity, received alerts and measured DR/rollback. Obtain explicit public-release approval separately. Otherwise retain **NO-GO**, private installation and access restrictions. This plan does not authorize Phase 15.
