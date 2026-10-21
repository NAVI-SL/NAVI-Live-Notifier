# Phase 10 — controlled private beta plan

Prepared **2026-10-18 (Asia/Colombo)**. **Preparation delivered; beta activation NO-GO.** Phase 10 is explicitly authorized for preparation and approved local tests. It does not override the [Phase 9 final audit](PHASE_09_FINAL_AUDIT.md), authorize public infrastructure or constitute a release sign-off.

## Release gate and current situation

It is **not possible to confirm that all Phase 9 acceptance tests passed**. The audit found no demonstrated critical defect, but four major acceptance gaps remain: external database/persistence/recovery; complete real user journey and received alerts; runtime/TLS/operations recovery; measured YouTube discovery/Premiere behavior. Passing automated security tests do not close these gates.

Current read-only observations: personal Discord allowlist configured; actual application ID matches configured client ID and bot remains private; provider authentication works; bot REST health is OK. Web is unavailable, worker monitoring disabled, PostgreSQL connection refused, Docker Linux engine unavailable, web origin HTTP and public webhook origin/secret absent. No new account, credential, Portal setting, deployment, DNS or billing change was made.

See [actual Phase 10 test results](PHASE_10_TEST_REPORT.md), [operations](OPERATIONS_RUNBOOK.md), [rollback](ROLLBACK_PLAN.md) and [deployment prerequisites](DEPLOYMENT_GUIDE.md).

## Explicit approval register

| Item                                           | Approved identity / status                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Discord account(s) permitted to log in         | Existing private allowlist retained; owner must privately confirm it contains only intended testers |
| Discord test guild                             | **Pending explicit name/ID confirmation**                                                           |
| Exact Discord text destination(s)              | **Pending explicit confirmation**; no sends allowed yet                                             |
| Controlled public YouTube channel              | **Pending public handle/URL confirmation**                                                          |
| Controlled Kick channel                        | **Pending username/URL confirmation**                                                               |
| Second guild/destination for multi-server test | Pending; optional only when explicitly approved, not inferred from existing memberships             |
| Hosting/public hostname/HTTPS tunnel           | None selected or approved for creation; local review only                                           |
| Beta activation and release sign-off           | Not supplied                                                                                        |

An approval question was submitted during this task; names/URLs were not provided before report completion. Do not use historical screenshots, existing database rows or the user's ability to manage a guild as approval to send there. Record public names and opaque evidence references; never record credential-bearing callback paths or URLs.

Before enabling the worker, inspect **all enabled subscription + settings destinations in the database**, including legacy guilds outside the current dashboard selection. Every active destination/source must be in the approved register. A worker processes all eligible shared sources, not just the selected browser guild. Leave monitoring disabled if that inventory cannot be checked. No new runtime guild restriction or settings redesign is introduced; existing access controls and reviewed configuration supply the boundary.

## Private-beta configuration contract

- Keep the personal account allowlist and fresh owner/Admin/Manage Guild checks. Never replace authorization with a browser ID, stored membership or an installation callback parameter.
- Keep Public Bot off. Guild Install enabled; User Install is unnecessary for this beta. Use the existing native Install NAVI form and explicit authorization URL, even if Portal Install Link is None.
- Login scopes remain `identify guilds`. Guild installation scopes remain `bot applications.commands`, context 0, permissions **19456** (View Channel, Send Messages, Embed Links). No Administrator, Manage Roles, Manage Messages or privileged Gateway intents. Gateway needs only Guilds.
- Keep everyone/role mentions **off for initial acceptance**. A later everyone test requires explicit consenting target approval, saved YouTube opt-in and current channel permission; sample test messages never ping everyone.
- Preserve stable auth encryption secret, existing bot/provider credentials and server-only env selection. Runtime role files stay private; file-backed Compose secrets are not an encrypted vault. No credentials in `NEXT_PUBLIC_*`, command arguments, reports, screenshots or raw debug logs.
- Local Linux deployment review defaults remain loopback HTTPS `https://localhost:8443`, isolated named PostgreSQL volume and separate web/bot/worker processes. It requires owner-provisioned trusted local TLS and review secrets. **No such deployment was performed.** A new public endpoint/tunnel/hostname remains a separate approval.

## Discord Developer Portal steps — owner review, not applied

1. Open the **existing** NAVI application. Privately compare General Information application ID with `DISCORD_CLIENT_ID`; the read-only API comparison currently passes. Do not reset/copy secrets into reports.
2. Under Bot keep **Public Bot off**, privileged intents off and Requires OAuth2 Code Grant off for the existing bot installation flow. Only the owner's eligible private-app account can be assumed for installation; adding other installers may require separate app-team/access review.
3. Under Installation enable **Guild Install**, scopes `bot` and `applications.commands`, permissions 19456. Do not enable broad mention permissions merely to match formatting. Install Link may remain None because NAVI generates the URL directly.
4. Under OAuth2 register the exact chosen canonical origin plus `/api/auth/callback/discord`, no trailing slash. For the existing HTTP development origin retain its exact registered hostname; localhost and 127.0.0.1 are different origins. For separately prepared local TLS review the intended URI is `https://localhost:8443/api/auth/callback/discord`. Confirm the chosen URI and `WEB_ORIGIN` agree before consent; do not blindly replace an existing callback.
5. Start login from NAVI, complete owner consent, verify manageable guilds and logout/session denial. Use Install NAVI on the approved guild, finish consent, return and refresh membership status; never treat return parameters as installation proof.

Source contract checked against [official Discord OAuth2/state/scopes/install context](https://docs.discord.com/developers/topics/oauth2). Actual Portal toggles and callbacks were not newly inspected or changed during Phase 10; only private status and ID match were checked through the API.

## Database, provider and webhook prerequisites

Restore local PostgreSQL without deleting volumes. Review/apply required additive migrations through **0006**, then test actual runtime roles, isolated concurrency, committed settings/ledger restart and backup restore. Use the existing migration/grant workflows; do not use bootstrap administrator credentials in the website/worker. Keep database and broker private. Redis is not the delivery queue.

YouTube uses the existing restricted Data API key and public channel/video APIs. Hints are not proof of LIVE. Kick uses existing app client credentials, stable broadcaster IDs, supported targeted live lookup and `livestream.status.updated` v1 subscription reconciliation. Current read-only authentication passes; no actual controlled channel registration/subscription or live event was verified. Kick app-token event capabilities are documented in [official event setup](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/introduction.md).

The worker requires server-only `DATABASE_URL`, legacy `REDIS_URL`, matching `BOT_INTERNAL_SECRET`/loopback URL, provider credentials and explicit `MONITORING_ENABLED=true` only after target review. Web uses existing `WEB_ORIGIN`, auth secret, Discord client credentials, account allowlist, DB and broker settings; bot alone holds the bot token. No new secret is needed for the operational CLI.

Public webhook testing requires an **approved reachable HTTPS origin**, worker `MONITOR_PUBLIC_ORIGIN` and private `MONITOR_WEBHOOK_SECRET`; localhost is not reachable by providers. Kick Developer settings must use that origin's `/webhooks/kick`; YouTube callback capability paths are generated by the worker and must not be logged. TLS proxy forwards only supported callbacks; internal health/broker stays private. Polling-only testing may proceed after other gates, but cannot pass external webhook/HTTPS acceptance. Do not invent a tunnel, bypass TLS warnings or silently switch credentials to obtain a green test.

## Controlled execution and measurement

1. Close database/runtime gates, record exact source/lockfile/image identifiers and backup restore evidence, complete the approval register. Verify only intended routes enabled globally. Start one bot owner; do not run Windows and Docker bot instances concurrently with the same token.
2. Exercise real canonical-origin login, cancel/deny/login/logout, authorized picker/install/status and non-manager/foreign-ID denial. Register the approved provider inputs and compare stable identities before confirmation. Save destinations/templates with mentions off; reload/restart web to check persistence.
3. Send **one** explicitly approved labelled sample per destination; inspect Discord. A sample confirms route/sender permissions, not live detection or YouTube embed rendering.
4. Establish a successful **offline baseline** on each registered source before starting a controlled public broadcast. Do not register an already-live source and expect an automatic backfill. Record platform start, first API-confirmed LIVE, dispatch and actual message receipt times in UTC. Separate platform/discovery delay from delivery delay.
5. Observe each same session for at least several polls; update title, briefly interrupt/reconnect and restart worker safely. Confirm **one normal alert per session/guild/destination**. A changed Kick start timestamp is a new session; no heuristic reconnect merging is promised. Inspect any uncertain result before retrying.
6. Test a second approved destination where supported: different provider subscriptions may use separate channels; the same shared source can fan out to separate approved guilds. Current schema supports one destination per source subscription in a guild, not arbitrary multiple channels on that one subscription. Do not add a feature to broaden this test.
7. Close the browser and stop only web while keeping bot/worker running; observe ticks and a newly controlled start. Test safe fixture 429/timeouts/forgeries, then approved local process/database outages and recovery. Never flood Discord to manufacture a limit.
8. Proposed supervised soak: two hours after initial starts, then owner-selected longer operation. Keep a responsible operator present until recovery is demonstrated. This duration and latency targets are proposals, not measured results or uptime promises.

| Measurement              | Record / acceptance                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery latency        | Actual start → first current API-confirmed LIVE; record misses/unknowns, not just successes                                                                    |
| Delivery latency         | Verified LIVE → actual Discord receipt; compare with original proposed 30-second processing target, excluding mandatory rate waits; no fresh SLA invented      |
| Provider coverage        | Scheduled, unscheduled, long-scheduled, short broadcasts, already-live onboarding and Premiere/ordinary-video negative cases; no guarantee before measurements |
| Duplicates               | Count normal messages per logical session and configured destination; expected 1 for eligible controlled starts, 0 for baseline/disabled/stale cases           |
| Failures                 | Count failed/uncertain/pending/suppressed states separately; no blind resend or deletion of the ledger                                                         |
| Independence/persistence | Actual worker/web-off operation plus DB/process restart preserves settings and prior sends                                                                     |

Google documents upload/title/description push events rather than universal go-live discovery; retain that limitation explicitly. [Official YouTube push guide](https://developers.google.com/youtube/data/guides/push_notifications).

Release requires observed delivery on **both platforms**, passing security/access/persistence/recovery gates, accepted coverage and dependency risks, and explicit owner sign-off. Current decision remains **NO-GO**; public launch is not authorized.
