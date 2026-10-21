# NAVI Live Notifier — planning audit

Audit date: 2026-10-16 (Asia/Colombo).

**Final assessment: FAIL — the existing baseline is not ready for application implementation without corrections and feasibility decisions.** This is an implementation-readiness assessment, not a finding that the project is infeasible. A separately authorized, narrowly scoped API experiment remains the appropriate next development step after reviewing this audit.

Findings: **1 critical issue, 12 major issues, 6 minor improvements.** Severity applies to planning gaps; no application exists whose exploitability or runtime behavior has been tested.

## Scope and method

Reviewed every existing planning document:

| Document | Areas reviewed |
| --- | --- |
| [README.md](README.md) | Scope, approval status and planning boundary |
| [01-requirements.md](01-requirements.md) | F01–F11, personal MVP, notification semantics and targets |
| [02-api-research.md](02-api-research.md) | Provider endpoints, authorization, events, resolution and quotas |
| [03-architecture.md](03-architecture.md) | Service responsibilities, local topology, state transitions, scheduling and HTTP surface |
| [04-database-schema.md](04-database-schema.md) | Identity, tenancy, constraints, leases, delivery uniqueness and retention |
| [05-security-and-risks.md](05-security-and-risks.md) | Threat controls, dependencies and recovery |
| [06-roadmap.md](06-roadmap.md) | Phase order, gates, estimates and acceptance evidence |
| [07-decisions.md](07-decisions.md) | Confirmed scope versus proposals and unresolved decisions |

Official sources were retrieved again for this audit. External facts are cited inline below; deductions from the plans are identified as audit reasoning. No authenticated provider calls, live stream tests, OAuth logins, bot installs, database migrations, dependency installation or application changes were performed. Existing documents are preserved; only this report is added. Suggested fields, transitions and tests below are proposals for review.

## What is sound and should be retained

The personal-development, start-only scope is coherent. Multiple test guilds remain useful for verifying isolation. Deferring public signup, billing, chat moderation, privileged Discord intents, reminders and offline notifications avoids unnecessary product scope. Public provider data does not generally require logging every streamer into NAVI.

The separation of dashboard login from bot installation, global provider sources from guild-owned routes, and database state from queue transport is appropriate. Stable source IDs, composite tenant foreign keys, encrypted credentials, explicit mention allowlists, durable inbox/outbox intent, bounded catch-up and explicit uncertain deliveries are good foundations. The plans correctly avoid promising permanent exactly-once Discord delivery and correctly acknowledge YouTube/Premiere uncertainty. These safeguards should be completed rather than replaced with optimistic assumptions.

## Current official API verification

| Assumption | Audit result and evidence |
| --- | --- |
| Discord dashboard login needs `identify guilds`; installation is separate | Confirmed. State-bound authorization code is appropriate. `applications.commands` is included by default with `bot`, so treating it as an entirely separate optional permission is imprecise. Ordinary installation need not behave like advanced code-grant installation. [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2). |
| Manage Guild/Admin/owner can authorize NAVI configuration | Reasonable application policy. Current-user guild responses expose owner and permission data; do not substitute bot installation or cached membership for user authorization. The endpoint currently returns up to 200 guilds by default and says pagination is unnecessary for ordinary user integrations. [User resource](https://docs.discord.com/developers/resources/user). |
| Minimal Discord posting permission integer is 19456 | Confirmed for View Channel + Send Messages + Embed Links. Channel overwrites and implicit denials still apply. No broad Administrator or mention-everyone permission is needed. [Permissions](https://docs.discord.com/developers/topics/permissions). |
| Discord nonce supplies permanent deduplication | Correctly rejected by the plans. The documented nonce limit is 25 characters; enforced uniqueness covers only the past few minutes, with no exact guaranteed duration stated. [Message resource](https://docs.discord.com/developers/resources/message). |
| Discord rate limits can be fixed at one request rate | Incorrect as a general strategy; the plans correctly call for bucket/header handling. Preserve `Retry-After` handling and invalid-request protection. [Rate limits](https://docs.discord.com/developers/topics/rate-limits). |
| Bot needs privileged intents to track installation and channels | No. `GUILDS` covers relevant guild/channel/role lifecycle events; user permission validation remains separate. [Gateway](https://docs.discord.com/developers/events/gateway). |
| YouTube push means a channel went live | Not supported. The documented push activities are uploads and title/description updates. Feed hints alone cannot establish a start or completeness guarantee. [Push notifications](https://developers.google.com/youtube/data/guides/push_notifications). |
| YouTube public channel IDs and handles can be resolved | Confirmed through `channels.list` filters `id` and `forHandle`; legacy usernames have a distinct `forUsername` filter. Display names are not unique handles. [Channels list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list). |
| YouTube known videos can be checked cheaply | Confirmed: `videos.list` costs one regular unit and accepts selected IDs. Playlist inspection also costs one unit per call. Neither method's documentation establishes complete, prompt discovery of every public live transition. [Videos list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [PlaylistItems list](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list). |
| Planned YouTube quota figures are wrong because search costs 100 units | No correction warranted on that basis. Current official documentation reports 100 search calls/day in a separate bucket and 10,000 units/day combined for other endpoints, resetting at midnight Pacific Time. Actual project quotas still need console verification. [Quota calculator](https://developers.google.com/youtube/data/determine_quota_cost). |
| Search is a guaranteed complete live index | No guarantee established; the current reference warns about indexing delays/incomplete results in its ordering guidance. Search remains a limited discovery tool, not a reliability proof. [Search list](https://developers.google.com/youtube/data/reference/rest/v3/search/list). |
| Kick requires OAuth from each streamer | No. Official guidance permits app-token subscriptions to any channel with its broadcaster ID and requires a reachable callback. [Events introduction](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/introduction.md). |
| Kick app credentials and targeted reconciliation are viable | Confirmed in documentation: client credentials issue app tokens. Current OpenAPI supports slug resolution, event subscriptions with app authorization, and `/public/v1/users/livestreams` with up to 100 user IDs. `/public/v1/livestreams` is deprecated. The targeted response includes a stream ID and start time. [Token flow](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow), [Kick OpenAPI](https://api.kick.com/swagger/doc.json). |
| Kick status changes can drive start detection | Confirmed: `livestream.status.updated` version 1 has broadcaster, live state and start/end timestamps. Webhook and polling identity equivalence still needs a real fixture comparison. [Event payloads](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/event-types.md). |
| Kick webhook authentication is HMAC | No; existing plans correctly specify RSA PKCS#1 v1.5/SHA-256 over message ID, timestamp and raw bytes. Public-key rotation and automatic unsubscription after prolonged failure are documented. [Webhook security](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/webhook-security.md). |
| Hub subscription request acceptance proves an active subscription | No. WebSub separates request acceptance, intent verification and validation; denial can arrive asynchronously. Implementation must model these separately and verify Google's actual hub behavior. [WebSub](https://www.w3.org/TR/websub/). |

## Critical issues

### C01 — YouTube discovery and freshness rules do not form an achievable, accepted detection contract

**Locations:** `01-requirements.md`, F06 and notification semantics (lines 32, 43–45, 54); `02-api-research.md`, discovery and quota constraint (lines 35–45); `03-architecture.md`, scheduling (line 64); `07-decisions.md`, Q04/Q05.

**Finding:** The documents honestly acknowledge discovery uncertainty, but still leave the core YouTube behavior unresolved. The proposed fallback discovers recent uploads every 15 minutes while recovery accepts starts only within 10 minutes. Audit reasoning: a stream starting just after an inspection may first be discovered about 15 minutes later, already too old to notify. This failure does not require quota exhaustion or an outage. If freshness is meant to apply only after downtime, that exception is also unspecified in the processing rules. The broad start-notification requirement therefore cannot be accepted as written.

**Proposed correction:** Before finalizing the implementation contract, choose an explicit supported coverage/latency policy. Make maximum discovery interval, provider indexing allowance, retry allowance and freshness compatible; increasing freshness alone does not solve missing discovery. Retain the Phase 1 experiment gate, including scheduled, long-scheduled, unscheduled, short, already-live and Premiere cases. Approve a limited coverage statement if comprehensive discovery cannot be demonstrated.

**Closure evidence:** A detection truth table, approved missed/late-event behavior, actual account quota budget and redacted controlled-stream observations. No general YouTube reliability claim based on one successful stream.

## Major issues

### M01 — Authorization freshness is incomplete for reads and queued user actions

**Locations:** `01-requirements.md`, F03/F08/F11; `03-architecture.md`, authentication steps 2 and 4, worker boundary; `04-database-schema.md`, `worker_requests`.

**Finding:** Fresh manager checks are explicit for request-time writes, but sensitive read authorization/cache invalidation is less precise. Test sends are queued with an authorization timestamp and optional actor. A request can execute after the actor loses Manage Guild, is removed from the developer allowlist, or has their account deleted. The worker intentionally has no user OAuth token, so it has no specified path to perform the required fresh user check. Ordinary automated notifications are guild-owned and should not depend on the original creator's continued login.

**Proposed correction:** Define read-cache maximum age and fail-closed behavior. For delayed user side effects, specify a short-lived, single-use authorization grant and a fresh auth-service check immediately before dispatch, or another explicit authorization protocol preserving token separation. An expired/missing actor cancels a pending test; it does not stop independently authorized guild routes. Bind request, guild, route/version, actor, action and expiry. Specify revocation races and idempotency behavior.

**Closure evidence:** Revoke manager/allowlist access while a test job is delayed; no message is sent. Former managers cannot read configuration/history after the accepted authorization freshness bound. Automatic routes continue after creator logout.

### M02 — Guild pause, reinstallation and baseline activation are underspecified

**Locations:** `01-requirements.md`, F05/F09 and baseline rules; `03-architecture.md`, monitoring eligibility and first-start fan-out; `04-database-schema.md`, `activated_at`/baseline state.

**Finding:** Route disable/re-enable is discussed, but guild-wide pause/resume and reinstall do not have equivalent eligibility epochs. A stream beginning while paused may be discovered after resume within the freshness window; the old activation timestamp permits an unwanted catch-up. A baseline that remains unknown indefinitely also leaves registration permanently pending. Paused guilds may or may not count toward upstream monitoring demand; that is not defined.

**Proposed correction:** Define one effective-active predicate combining installation, guild pause, route enabled/deleted state and baseline readiness. Persist activation generation/eligibility time; specify whether resume/reinstall requires a new baseline. State what happens if detection and activation occur concurrently or baseline cannot establish offline/live truth. Compute monitoring demand from this same predicate.

**Closure evidence:** Pause → stream starts → resume, uninstall → stream starts → reinstall, route added during an existing stream, and failed baseline all have deterministic outcomes without surprise historical posts.

### M03 — Mutable destinations and suppressed deliveries can break routing semantics

**Locations:** `03-architecture.md`, first-start fan-out/send and PATCH routes; `04-database-schema.md`, route and delivery uniqueness, immutable destination snapshot.

**Finding:** The plan forbids changing a route's provider source but does not forbid changing its destination. A queued delivery snapshots the old destination while the sender re-reads the current route. It is unclear whether the event goes to the old channel, the new channel, or is canceled. Optional suppression rows also share the same unique delivery key as sendable work: a suppressed row can block a valid later state if upsert semantics are not defined.

**Proposed correction:** Prefer immutable source/destination identities per route; use replacement routes for destination changes. Define configuration version handling for queued work and whether template changes apply to unsent messages. Either store suppressed observations separately or define exactly which suppression reasons are terminal and whether an existing delivery can transition. Preserve destination-level uniqueness across route deletion/recreation.

**Closure evidence:** Change destination/template, disable/delete/recreate and resume while work is queued; verify one intended outcome and no stale or misrouted send.

### M04 — Lease expiry, send coordination and uncertain outcomes need a concrete protocol

**Locations:** `03-architecture.md`, durable processing 5–7; `04-database-schema.md`, transaction/locking rules and delivery attempts.

**Finding:** A database lease alone cannot prevent worker A resuming after worker B reclaims it. Per-route locking also does not serialize guild-wide pause/removal. PostgreSQL advisory locks have session/transaction lifetimes, not a built-in timed lease, so “short-lived advisory coordination” needs a concrete connection/pool and lock-order design. [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html).

The plan calls for a “confirmed” Discord nonce window even though no exact duration is documented. It also omits first send-attempt time, durable send intent and a nonce encoding constraint. These are needed to recover a crash after posting and before recording success. A generic 5xx retry can also be ambiguous if the provider accepted the side effect.

**Proposed correction:** Specify a single sender owner initially, coordination for route and guild eligibility, stale-owner checks, bounded requests and recovery rules. Persist send intent/first-attempt time before POST, a collision-resistant nonce of at most 25 characters and immutable destination. Do not present a measured nonce interval as a provider guarantee. Prefer `uncertain` when safe deduplication cannot be established; apply this to test sends as well as automated delivery.

**Closure evidence:** Suspend sender A past lease expiry, reclaim with B, then resume A; test guild pause during dispatch, crash after POST, response loss, long outage and ambiguous 5xx without blind duplicate sends.

### M05 — Database reconstruction of lost queue work is promised but not specified

**Locations:** `03-architecture.md`, database/queue boundary and dispatcher; `04-database-schema.md`, `outbox_jobs`, `scheduled_tasks`, inbox and deliveries.

**Finding:** Outbox rows have `published_at` but no explicit processing acknowledgment field/state, despite being described as recoverable until acknowledgment. Publishing successfully and then losing Redis before consumption can leave no eligible unpublished row. A permanent unique job key can also suppress later executions of a recurring task. Pending deliveries and inbox rows could repair this, but the exact scan/claim contract is absent.

**Proposed correction:** Define database job states through completion, or explicitly rebuild each class of unfinished work from its aggregate status. Separate queue publication from domain completion; include generation/due occurrence in recurring identities. Specify acknowledgment ordering, lease owner/token, error limits and poison-job quarantine. Persist a new due occurrence atomically with scheduler progress.

**Closure evidence:** Lose Redis after publication but before consumption; every unfinished inbox, delivery, user request and scheduled occurrence is recovered once logically. Repeat recurring tasks across restart without unique-key deadlock.

### M06 — Callback validation needs explicit ownership and quota-abuse rules

**Locations:** `02-api-research.md`, YouTube transport fallback; `03-architecture.md`, adapter contract and ingress; `05-security-and-risks.md`, webhook/SSRF controls.

**Finding:** REST confirmation of an unsigned hint does not alone prove that its video belongs to the configured source. Public callers can also trigger expensive API checks using invented video IDs. The wording can be read as confirming REST state before the durable-inbox acknowledgment, coupling callback latency to provider availability. Kick signature verification does not authenticate every surrounding HTTP header, so subscription/type/version handling also needs explicit consistency checks.

**Proposed correction:** Authenticate transport where available, validate structure, record the bounded inbox and acknowledge promptly; perform downstream verification asynchronously. Require `videos.snippet.channelId` to equal the registered source ID and require a public, currently live response. Enforce callback/topic/subscription mapping, event allowlists and broadcaster consistency; never treat unsigned routing metadata as authoritative. Coalesce/cap hints before API budget reservation. Once a YouTube subscription expects signatures, a missing signature must not silently downgrade that subscription to unsigned mode. Define controlled handling for invalid/unsupported versus transiently unverifiable events.

**Closure evidence:** Wrong-channel valid video, invented-ID flood, signature stripping, modified unsigned headers, invalid XML and provider timeout cannot cause wrong-streamer notifications, unbounded quota use or insecure fallback.

### M07 — Subscription creation/removal races and acknowledgment states are missing

**Locations:** `03-architecture.md`, global monitoring demand and scheduler; `04-database-schema.md`, `provider_subscriptions`; `02-api-research.md`, subscription lifecycle.

**Finding:** Desired/actual state is a good start but lacks a specified transition protocol for two concurrent route changes, callback-before-create-commit, upstream creation followed by a crash, stale unsubscribe jobs and tunnel changes. A unique local row does not make an external subscription operation atomic. Kick responses can carry event-level outcomes, so HTTP success is not sufficient by itself. [Kick OpenAPI](https://api.kick.com/swagger/doc.json).

**Proposed correction:** Persist intent first, coordinate changes per source, reconcile actual inventory and inspect each requested event's result. Use a desired-state generation so stale removals cannot cancel newly needed monitoring. Model pending/verified/denied/expired states for the hub; handle subscribe and unsubscribe challenges against stored intent. Keep provider-specific fields: Kick inventory repair is not a WebSub lease renewal. Specify callback/key/secret changes and grace periods.

**Closure evidence:** Concurrent last-route deletion/new-route creation, upstream success before DB crash, duplicate upstream subscription, denied hub subscription, callback arriving early and callback-hostname change all converge to the intended state.

### M08 — Schema deletion and tenant constraints need an executable design decision

**Locations:** `04-database-schema.md`, entities, composite references, retention/deletion.

**Finding:** The schema names sound isolation constraints, but does not define hard-delete actions. A nullable `route_id` in a composite `(guild_id,route_id)` reference needs an explicit strategy: blindly nulling both columns would erase required tenant identity. Retained delivery snapshots and deleted channel caches have competing lifecycle needs. Subscription provider uniqueness references a provider column not listed in that table. “Partial unique active” does not state whether active means enabled or merely not deleted; using enabled would allow duplicate disabled configurations. Polymorphic job subject IDs are not ordinary enforceable foreign keys despite the introductory blanket rule.

**Proposed correction:** Define soft/hard deletion order and FK actions per relationship; preserve guild IDs when detaching routes. Specify the partial predicate as `deleted_at IS NULL` if only one undeleted route is intended. Add or derive provider consistently and enforce agreement with its source. Mark internal polymorphic references explicitly and validate their kind/target. Decide RLS now: either require it with service-role/transaction-context tests, or use mandatory scoped repositories as the chosen boundary. An optional security boundary cannot be an acceptance assumption. Table owners normally bypass RLS. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

**Closure evidence:** Migration-level design review of all FKs and delete actions; later tests purge a route, guild and unreferenced source while preserving intended history and tenant isolation. Numeric Kick IDs are parsed without precision loss before conversion to string.

### M09 — Error handling conflates authentication, quota and missing resources

**Locations:** `03-architecture.md`, durable processing 6; `05-security-and-risks.md`, recovery; provider adapters.

**Finding:** The described 400/401/403/404 rules are suitable for some Discord sends, but unsafe as a general provider matrix. A YouTube quota error may be 403 and must not disable a Discord destination. An expired app token may be renewed; invalid refresh credentials require reauthentication. Successful empty live results, missing video metadata, subscription absence and inaccessible channels require different state updates. Retry maxima, elapsed limits and re-enable behavior remain unspecified.

**Proposed correction:** Define provider/operation-specific classifications using HTTP status plus provider error code. Bound one credential renewal attempt, distinguish revoked credentials, reserve quota, honor reset/Retry-After and separate monitoring failure from offline truth. Define terminal/dead-letter status and repair/re-enable actions, with numeric configurable limits chosen before implementation. Redact error payloads consistently.

**Closure evidence:** Fixtures for quota 403, permission 403, expired/revoked credential, 429, transient 5xx, missing/private video and successful empty livestream list produce distinct correct outcomes.

### M10 — Local OAuth origin, cookie and installation-return behavior are undecided

**Locations:** `03-architecture.md`, local execution and install step; `05-security-and-risks.md`, session controls/dependencies; `07-decisions.md`, Q02.

**Finding:** The design exposes only callback routes through the tunnel while the dashboard is loopback and sessions require Secure cookies. That can work, but only with an explicit origin/callback/cookie strategy. A tunnel-host callback cannot assume it receives a loopback-host cookie. Default SameSite selection also must allow the chosen OAuth return. Standard bot installation does not necessarily provide the pending-state return flow implied by the plan.

**Proposed correction:** Choose a concrete local dashboard origin, login redirect URI, callback host, cookie scope/SameSite and proxy trust configuration. Keep provider callbacks distinct from browser OAuth callbacks in routing rules. For simple bot installation, prefer a pending install page that refreshes verified membership; require advanced code grant only if its returned credentials/guild proof are actually needed. Restrict the personal bot's installation setting appropriately.

**Closure evidence:** Real login, denied consent, logout, install to wrong guild, no install redirect, tunnel restart and direct untrusted forwarded headers work safely under the selected local setup. No publicly exposed developer UI is introduced accidentally.

### M11 — Provider notices and deletion operations cannot all wait for public deployment

**Locations:** `05-security-and-risks.md`, later-public-deployment dependencies; `04-database-schema.md`, retention; `03-architecture.md`, HTTP surface; `06-roadmap.md`, Phase 7.

**Finding:** Policy/retention is recognized, but account disconnect/deletion and guild deletion have no defined UI/API or local operator operation. Cleanup is described without a scheduled cleanup task contract. Notices are grouped under later public deployment, although YouTube's client requirements are not stated as blanket public-launch-only requirements. Its policy includes terms/privacy disclosures, cache refresh/deletion rules and user deletion deadlines. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).

**Proposed correction:** Review applicable provider obligations before real-data integration; do not infer an exemption for personal tests. Define minimal notices and a documented operator deletion/disconnect procedure now, with full self-service UI only if needed later. Add deletion/cleanup jobs, backup expiry and restore-time deletion reconciliation. Decide how historical Discord notification metadata is handled; neither automatic message deletion nor indefinite retention is established by the current plan. Distinguish Discord OAuth user data from public YouTube cache and any future Google-authorized data.

**Closure evidence:** An approved retention matrix lists data class, storage copies, owner, deadline, refresh/delete action and verification. A later cleanup/restore test demonstrates it. No compliance claim based solely on this audit.

### M12 — Phase dependencies and measurable acceptance need correction

**Locations:** `06-roadmap.md`, Phases 0–7 and release matrix; `01-requirements.md`, latency targets; `07-decisions.md`, decision deadlines.

**Finding:** Phase 0 says blocking decisions must be resolved before Phase 1, while some blockers intentionally require Phase 1 evidence. Phase 2 requires DB/outbox recovery before the durable detection work is scheduled in Phase 5. Phase 4 requires real queued test sends while the robust sender is scheduled in Phase 6. Metrics specify p95 but no sample size, workload, clock reference or treatment of failures. Security/deletion design decisions are left late enough to force schema rework.

**Proposed correction:** Separate authorization of bounded experiments from approval of the final application baseline. Phase 2 should prove the minimal generic outbox/lease mechanism; Phase 4 should either preview only or depend on a minimal safe sender extracted from Phase 6. Introduce authorization, cleanup/data lifecycle and error contracts before their schema/features. Define repeatable workloads and enough observations to report percentiles honestly; record single live tests as demonstrations, not statistical proof. Include all C/M closure scenarios in the acceptance matrix and assign a phase/owner.

**Closure evidence:** A dependency-consistent roadmap with explicit evidence artifacts and no phase requiring a future deliverable. All implementation-blocking findings either corrected or explicitly accepted with bounded consequences.

## Minor improvements

1. **N01 — Simplify ordinary guild enumeration.** Keep robust pagination capability but remove mandatory multi-page evidence from F02 for the normal user endpoint; current Discord documentation says its default result covers ordinary users. Do not fetch all pages again for every small dashboard interaction without considering rate limits.
2. **N02 — Correct installation-scope wording.** Explain that commands are an optional product feature even though Discord includes the commands scope with bot installation. No need to implement slash commands merely because the scope appears.
3. **N03 — Publish a source-input matrix.** Distinguish YouTube channel IDs, `@handles`, `/channel/`, legacy `/user/`, ambiguous `/c/` URLs and display names, and Kick slugs versus usernames. Supporting legacy usernames through the official filter is optional, not a requirement. Confirm canonical identity before saving; test rename and old-slug reassignment rather than re-resolving identity silently.
4. **N04 — Consider reducing queue machinery for personal use.** PostgreSQL jobs could replace Redis/BullMQ, but this is an optional simplification. Two transports plus inbox/outbox/scheduled/user job tables may cost more maintenance than this stage needs. Keep PostgreSQL, multiple-guild isolation and durable processing regardless of queue choice.
5. **N05 — Make estimates conditional.** The 14–24-day arithmetic is consistent, but lacks a separate allowance for account eligibility, long-scheduled test time and failure investigation. Document runtime/package compatibility and Windows local prerequisites before pinning versions.
6. **N06 — Preserve precise decision status.** Personal/start-only vision is confirmed; technical IDs remain proposed. Completion of planning does not by itself resolve Q01–Q10 or authorize implementation. After review, record accepted audit corrections separately from later measured API evidence.

## Recommended corrections for review

These are a proposed change set, not edits already made to the planning baseline.

| Priority | Proposed correction package | Documents to amend after approval | Findings |
| --- | --- | --- | --- |
| Before application-baseline approval | Define YouTube supported detection/freshness behavior and experiment outcomes that determine scope | Requirements, API research, architecture, decisions | C01 |
| Before identity/schema implementation | Specify read/write/queued-action authorization and concrete local OAuth/install flow | Requirements, architecture, security, schema | M01, M10 |
| Before detection/routing implementation | Define effective activation epochs, baseline failure policy, route immutability and suppression states | Requirements, architecture, schema | M02, M03 |
| Before queue/delivery implementation | Specify ownership/locking, send intent/uncertainty, outbox acknowledgments and recurring identities | Architecture, schema, roadmap | M04, M05 |
| Before real callback processing | Define exact source ownership validation, pre-quota admission and subscription desired-state reconciliation | API research, architecture, security, schema | M06, M07 |
| Before migrations and real-data use | Choose tenant enforcement/FK deletion strategy, provider error matrix, notices and cleanup operations | Schema, security, API research, architecture | M08, M09, M11 |
| Before development scheduling | Reorder dependencies, add closure scenarios, choose metric workloads and record accepted decisions | Roadmap, requirements, decisions | M12, N01–N06 |

## Unverified assumptions and evidence required

| ID | Still unverified | Required evidence / disposition |
| --- | --- | --- |
| U01 | User's actual YouTube search/regular quota, project restrictions and available headroom | Redacted console limits plus a measured request budget; do not rely only on documented defaults |
| U02 | Feed/playlist/search coverage and delay for each targeted stream mode | Controlled starts, missed-event records and discovery timestamps, including cases without feed hints |
| U03 | Reliable distinction between Premieres and real livestreams | Official response fixtures showing a dependable field/rule, or explicit acceptance that exclusion cannot be guaranteed; do not infer a classifier from titles |
| U04 | Google's hub secret/signature support and exact challenge/lease behavior | Captured redacted challenge/distribution fixtures; selected authenticated/unsigned operating policy |
| U05 | Kick app eligibility, non-owner subscription behavior, practical HTTP limits and delivery retries | Registered app test, per-event subscription result and observed callback/recovery behavior; no invented numeric rate or retry promise |
| U06 | Kick polling `id`/`started_at` and webhook session correlation across reconnects | Paired payloads; lossless numeric ID parsing; canonical instant comparison and inconsistent-timestamp disposition |
| U07 | Discord nonce behavior for selected library, encoding and retry interval | Contract test plus explicit acknowledgment that observed retention is not a guaranteed permanent window |
| U08 | Bot member/role data needed for exact overwrite computation without privileged intents | Real installation and channel/role permission fixtures; explicit own-bot-member retrieval/cache invalidation strategy |
| U09 | Local HTTPS tunnel, OAuth redirect and cookie setup works on the owner's machine | Real login/install round trip with exact origins and path allowlist, browser security flags and proxy settings |
| U10 | Stream-capable YouTube/Kick test accounts and non-manager test access exist | Owner confirms test resources; platform eligibility resolved before estimating live-test completion |
| U11 | Chosen Node/framework/library/DB/Redis/container versions are compatible | Version compatibility and local setup check during authorized foundation work |
| U12 | Retention/deletion treatment for all stored copies and historical Discord messages is acceptable | Reviewed data lifecycle decision, including provider obligations; policy uncertainty stays visible until resolved |

These are evidence gaps, not assertions that the official capabilities are unavailable. Credential-dependent experiments are deliberately not performed during this audit.

## Coverage and final PASS/FAIL assessment

| Requested review area | Result |
| --- | --- |
| Requirements / MVP | Personal start-only boundary is appropriate; C01, M02/M03 and classification uncertainty prevent final acceptance |
| Architecture / responsibilities | Separation is sound; authorization handoff, ownership and queue recovery need M01/M04/M05 |
| Discord OAuth / permissions / installation | Core scopes and minimum posting permissions confirmed; M01/M10 and nonce protocol remain |
| YouTube / Kick feasibility and authentication | Official capabilities verified as above; empirical coverage remains U01–U08 |
| Username resolution / subscriptions | Stable IDs appropriate; input matrix and desired/actual subscription races need N03/M07 |
| PostgreSQL / multi-server isolation | Good foundation; deletion constraints and selected enforcement boundary need M08 |
| Detection / delivery / duplicates / retries | Explicit uncertain state is appropriate; C01 and M02–M05/M09 remain blockers |
| Security / quotas / errors / deployment | Strong intent; admission control, local origin strategy and policy timing need M06/M09–M11 |
| Roadmap / dependencies / acceptance | Meaningful scenarios exist; sequence and measurable gates need M12 |
| Missing / conflicting / unnecessary requirements | Critical conflict and design gaps listed; optional complexity reductions are N01–N06 |

**FAIL for proceeding directly into application implementation against the unchanged documents.** The failure is based on the unresolved core detection contract and specific major design gaps, not on the mere absence of running code or on requiring public-production infrastructure for personal use.

To pass a renewed planning audit: approve and incorporate the required corrections; resolve experiment-dependent feasibility or explicitly narrow the supported behavior; choose concrete authorization, delivery, tenancy and lifecycle contracts; and align the roadmap/acceptance matrix. Empirical evidence may remain a clearly scoped Phase 1 gate if the next authorization is only for those experiments. No existing document has been automatically rewritten, and this audit does not authorize implementation.
