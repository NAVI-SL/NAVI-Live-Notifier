# Phase 14D — controlled integration test plan

Prepared **2026-10-22, Asia/Colombo**. **Plan only: no worker startup, broadcast, webhook mutation or message is approved by this document.** The owner confirmed one test server and separate existing YouTube/Kick channels; identifiers/source pins are in the private `.local/phase14d/test-scope.json`. Public release remains **NO-GO**.

Read [configuration](PHASE_14D_CONFIGURATION_REPORT.md), [actual validation](PHASE_14D_VALIDATION_REPORT.md) and the detailed [Phase 14B manual matrix](PHASE_14B_MANUAL_TEST_PLAN.md). Local No mention settings and matching beta scope are applied; monitoring remains disabled. Original templates/destinations/enabled states are preserved.

## Gate before any automatic monitoring

1. Obtain explicit approval for the exact two owned streaming accounts, server/destinations, test window and permitted number of labelled tests/normal alerts. Channel selection alone was not send approval. Separately approve webhook changes if needed; polling-only tests must keep the public origin absent and do not prove webhooks.
2. Keep all application processes stopped while reviewing the private manifest/current database. Verify stable identities against official APIs, current bot membership/channel permissions, current source pins, versions and scope. Existing Phase 14C read-only evidence is useful history, not a current go-live event.
3. Refresh/save both approved No mention settings **immediately before the test**, through an authorized configuration operation; retain templates/channels/enabled states. Record the new cutoff/update time. Regenerate the scope file from that timestamp; do not simply keep today's earlier cutoff for a later window. Do not reset persistent monitoring/delivery history.
4. Run `npm run monitor:dry-run -- --scope-file=.local/phase14d/test-scope.json`. Require no planning blockers, only the two approved source/destination pairs, zero pending pre-window/sending work and one still-preserved uncertain record. Current zero pending/failed/sending counts must be rechecked then. No unapproved route may remain active within worker scope; shared-source consumers require review.
5. Keep No mention selected. No preview/test or automatic alert in this test should ping everyone or roles. If permissions/settings changed, stop and revalidate rather than bypass the bot checks.
6. Only after approval and review may the operator enable local monitoring and start services **separately**: `npm run dev:web`, `npm run dev:bot`, then `npm run dev:worker`. Do not use combined `npm run dev` under a no-worker restriction. Never start a second existing bot/worker blindly. Monitor health honestly; disabled/scaffold output is not ready monitoring.

The offline dry-run has no execution mode and does not enforce policy inside a subsequently started worker. Recheck actual saved settings, beta scope, cutoff, pending jobs and webhook policy immediately before startup. Stop after the approved observations/messages; there is no new automatic message-budget controller in this phase.

Do not pass `--dry-run` to the worker: the new guard intentionally rejects unsupported flags. Only `monitor:dry-run` invokes the zero-effect offline planner; it never starts the monitor.

## Discord onboarding — supervised manual interaction

| Scenario                   | Action                                                                                       | Required evidence / expected outcome                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth login                | Open the exact configured local origin, Login with Discord, approve consent as the owner     | Exact Portal callback matches `<WEB_ORIGIN>/api/auth/callback/discord`; authenticated dashboard, safe state/session handling; keep callback queries/cookies private |
| Cancel/deny/logout/expiry  | Exercise each approved session case                                                          | Cancel/deny yields safe errors; logout/expired sessions reject protected access                                                                                     |
| Server selection/isolation | View the approved server; try a distinct unauthorized account/guild and revoked-manager case | Only authorized scoped management works; backend rejects foreign-ID reads/mutations                                                                                 |
| Install NAVI               | Inspect generated private-install consent; install only if needed and separately approved    | Correct client/guild, `bot applications.commands`, Guild Install, no Administrator; refreshed actual membership                                                     |
| Streamer registration      | Resolve owned YouTube handle/URL and Kick username/URL, confirm stable IDs                   | Correct identity and duplicate rejection; no unrelated registration                                                                                                 |
| Channel/settings           | Verify the approved per-platform channels, template and No mention, save and refresh         | Correct persisted destination/configuration and version; all other servers isolated                                                                                 |
| Labelled test              | Only after exact per-channel send approval, send one labelled test                           | Receipt in the selected channel, correct sample label, no unexpected mentions; record private message ID/time                                                       |

Do not enable Public Bot to make an external-owner install pass. A private-install limitation must be recorded BLOCKED. No `/dashboard` slash command is implemented; the protected website route exists. Do not add an unrelated command during testing.

## YouTube — separate new broadcast procedure

1. Confirm the owner-approved YouTube stable channel ID and current OFFLINE state privately. Establish an offline worker baseline after the just-in-time settings save and approval; scheduled/upcoming videos alone must not send.
2. Only the owner/explicitly authorized operator starts a new controlled broadcast. Record official video/channel identity and actual start time. Do not substitute a historical receipt, Premiere, scheduled start or synthetic hint.
3. Record UTC first confirmed LIVE response, worker detection/session admission, broker acknowledgment and actual Discord receipt. Verify one normal red embed in the YouTube destination with correct actual title, clickable URL and available thumbnail; No mention remains enforced.
4. Keep LIVE across at least three polls, inspect repeated detections and current ledger uniqueness, then perform an approved worker restart after acknowledgment. Require no second normal notification for that session/destination.
5. Agree a latency target before testing, considering the actual source count/quota/cadence. Report measured detection and receipt latency; do not infer it from a synthetic test duration. Stop monitoring after the approved window without erasing records.

## Kick — separate new broadcast procedure

1. Confirm the owner-approved stable broadcaster ID/channel URL and OFFLINE baseline after the new settings cutoff. Keep reconciliation changes suppressed unless separately approved.
2. Owner/authorized operator starts a new controlled Kick broadcast. Record verified official LIVE status and session start, current title/category/available imagery, then detection and admission times.
3. Verify exactly one normal green Kick embed in the Kick destination, correct actual title/channel URL, metadata/fallback and No mention. Record the actual private Discord message ID/time and delivery correlation.
4. Hold LIVE across several polls/hints and an approved clean worker restart; require no duplicate. A same-session reconnect should not produce another normal alert. A genuinely new session requires separate approval/message budget.
5. A webhook-specific PASS additionally requires a real official signed event over approved HTTPS and observed verification/replay handling. Polling success or fetching the public RSA key is not webhook acceptance. Do not send a new OFFLINE message.

For each platform, keep a private sheet with scenario, expected/actual, PASS/FAIL/BLOCKED, UTC timestamps, source/session/delivery/message correlation and required correction. Publish only redacted counts/results. Close the browser during an approved portion to verify independent worker/bot operation. A second server/destination needs its own approval; do not broaden scope automatically.

## Uncertain delivery, failures and operational tests

The existing YouTube uncertain outcome remains suppressed. Do not count it as a candidate, delete it, reset attempts or retry it. Match exact historical session/destination/author/time privately if more evidence appears; an inconclusive search is not proof of non-delivery. The existing Phase 14B reconciliation procedure remains applicable.

Execute rate-limit, timeout, invalid/replayed signature, concurrent claim, restart/reconstruction and mention-failure cases with existing mocks/isolated SQL first. Never flood Discord/platforms or force a real response-loss resend. Real sender in-flight fault injection needs separate approval because it can create uncertainty.

After initial approval/receipts, agree a supervised soak duration and sample health/heartbeat, Gateway state, quota/cooldowns, queue age/outcomes, resource usage and latency. Restart only owned processes and retain logs. Actual host/database outage tests require separate approved recovery plans; the existing safe PG test terminates only a probe connection. Do not call a finite health sample continuous production monitoring.

External alerts require an approved transport/recipient and real received incident/recovery evidence, including monitor/host failure. Current alerts are console-only. Encrypted offsite recovery requires approved key custody/storage/retention, independent retrieval/decryption/replacement-environment restore and measured RPO/RTO; preserve original data/auth secret/deduplication history and do not send from a restored copy. The retained earlier backup predates Phase 14D isolation and may restore the old mention settings: verify current beta scope, No mention and disabled monitoring before any restored runtime is considered. Follow [deployment](DEPLOYMENT_GUIDE.md), [operations](OPERATIONS_RUNBOOK.md) and [rollback](ROLLBACK_PLAN.md).

Hosting must be selected/approved and measured on the intended architecture: full process-tree CPU/RAM, database connections/storage, queue/notification throughput, API budget and latency. Existing local idle samples do not verify Oracle ARM64 or a free host. US$0 preference/US$15–25 contingency is not spending permission.

## Stop/rollback triggers

Stop controlled monitoring immediately for an unapproved destination/mention, duplicate normal alert, unexplained uncertainty, wrong identity/session, lost scope/permissions, unbounded retries/quota use or owner cancellation. Stop only verified owned processes and account for any combined launcher. Preserve rows/logs, classify outcomes and investigate before resuming. Do not bulk-requeue or restore the previous `@everyone` selections automatically. End with an evidence review and explicit decision; public activation and Phase 15 are not authorized.
