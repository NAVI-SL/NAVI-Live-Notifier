# Phase 15B — PostgreSQL command and acknowledgment design

Date: **2026-10-22**. **Design for approval only. No DDL, migration, consumer, endpoint or UI has been implemented.** Phase 15C onward is explicitly paused for owner approval. [Audit](PHASE_15A_ARCHITECTURE_AUDIT.md), [verification](PHASE_15AB_VERIFICATION_REPORT.md), [hosting comparison](PHASE_15_CLOUD_ARCHITECTURE_REVIEW.md).

This document refines the earlier cloud proposal: required state names are pending/processing/completed/failed, idempotency aligns with the existing guild-wide test ledger, immediate notification disabling stays synchronous, and uncertain sends have an explicit additional state. It does not alter any approved runtime behavior today.

## Proposed architecture and command allowlist

The dashboard writes a validated guild-scoped command over verified database TLS. A consumer inside the bot backend claims it and calls the existing Discord services. Dashboard results come through authenticated Next.js APIs reading PostgreSQL, never directly from the bot. The bot token remains on the backend; no public broker, SQL endpoint or raw Discord proxy is introduced.

Keep worker-to-bot loopback HTTP and existing `live_deliveries` unchanged initially. Bot and worker may be co-hosted as **separate supervised processes** on an always-on host. One bot REST client/limiter/sender serves both control commands and the existing worker, with bounded command concurrency so dashboard work cannot starve live delivery. Single-owner deployment, meaningful readiness, ordered shutdown and restart backoff are prerequisites, not present-day cloud guarantees.

| Proposed kind, version 1       | Strict payload                                                                                                | Result / side-effect class                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guild_status.refresh`         | Empty object; guild comes only from authorized envelope                                                       | Installed/not_installed/unknown, observed timestamp; read-only. Unknown cannot refresh a previously known status as authoritative.                    |
| `notification_targets.refresh` | Empty object; always an actual refresh when explicitly requested                                              | Validated channels/roles/capabilities and observed time; read-only.                                                                                   |
| `notification_settings.apply`  | Subscription UUID, expected settings version (0 allowed for first save), existing validated/normalized config | Committed existing notification row and new version; DB-only side effect after fresh Discord checks.                                                  |
| `notification_test.send`       | Subscription UUID and expected saved version (>0)                                                             | Validated message receipt/status; one external side effect through existing sender. No unsaved config, user-supplied identity or live-stream payload. |

Guild selection, installation URL generation, streamer/provider registration, stored settings reads and immediate disable do **not** need general bot commands. Preview initially uses a validated target-refresh result plus the existing web sample renderer, without sending. No guild/channel/role creation, arbitrary REST method/path, SQL execution, bulk broadcast, webhook registration or normal live-notification command is allowed.

## Data model: proposed additions

Use existing text UUID conventions with server-generated random UUIDs, UTC `timestamptz`, bounded JSONB and reviewed Drizzle migrations. The design below is not a migration file.

### `bot_commands`

| Column                                                            | Proposed type / purpose                                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                                                              | Text UUID primary key, server-generated unique command ID                                                              |
| `schema_version`, `kind`                                          | Integer fixed to 1 and explicit kind allowlist; unknown versions/kinds rejected                                        |
| `guild_id`                                                        | Validated Discord snowflake, authorized on admission and execution                                                     |
| `requester_user_id`, `requester_discord_id`, `session_ref`        | Internal user/session IDs and server-derived Discord identity, never session token/cookie; bound together at admission |
| `subscription_id`, `expected_version`                             | Nullable for reads; mandatory for settings/tests; composite guild/subscription relationship and kind-specific checks   |
| `idempotency_key`, `payload_hash`                                 | Request UUID and hash of canonical validated payload; immutable after admission                                        |
| `payload`                                                         | JSONB, strict per-kind schema, maximum 12,000 serialized UTF-8 bytes; no credentials/raw Discord requests              |
| `status`                                                          | Required pending/processing/completed/failed, plus expired/cancelled/uncertain for truthful lifecycle                  |
| `created_at`, `expires_at`, `due_at`, `updated_at`, `finished_at` | Database-clock timestamps for TTL, retries and observation                                                             |
| `attempt_count`, `retry_count`, `max_attempts`                    | Claims/safe reschedules, initially maximum three total attempts; never browser-configurable                            |
| `lease_owner`, `lease_generation`, `lease_expires_at`             | Opaque consumer identity, monotonically increasing generation and bounded ownership expiry                             |
| `effect_started_at`                                               | Durable conservative boundary before a potentially accepted Discord message; never proof that a message was sent       |
| `result`, `error_code`, `retry_after_seconds`                     | Typed bounded result or allowlisted sanitized error; never raw exceptions/headers/provider bodies                      |

Do not cascade-delete commands when sessions are revoked/deleted: missing session invalidates execution, while operational evidence survives. Avoid a cascading subscription reference that erases ambiguous sends when a streamer is removed. Validate live subscription existence/guild binding at admission and execution; retain immutable IDs for audit. A soft reference or composite FK with a reviewed retention-safe deletion policy must be selected in the migration review. Privacy/data-erasure behavior must cancel unstarted work and redact personal metadata without creating replay opportunities; no legal retention certification is claimed.

### `bot_command_attempts`

Composite primary key `(command_id,lease_generation)`; owner, start/phase timestamps, sanitized error, optional validated Discord channel/message IDs and receipt time. Each attempt belongs to the command; web cannot insert/edit attempts. Persist the send boundary before invoking Discord. Preserve evidence of late responses without allowing a stale attempt to overwrite current command state. No raw SDK response or token is stored.

### `bot_guild_snapshots`

Primary key `(guild_id,kind)`, schema version, validated bounded payload, `observed_at`, `stale_after`, backend generation and optional originating command ID. Backend-only writes. Installation and target snapshots are display metadata, not user or bot permission grants. An unavailable refresh keeps the old snapshot marked stale/unknown rather than manufacturing fresh absence. Target results keep current role ordering and separate capability booleans.

A small backend heartbeat relation is an optional later operational addition, not required for command correctness. It must expose only safe status/age, never raw private diagnostics.

### Required constraints and indexes

- Unique `(guild_id,kind,idempotency_key)` across requesters, aligning test idempotency with existing `(guild_id,request_id)`. On conflict require the same actor, subscription, version and canonical payload; otherwise return generic conflict without revealing someone else's result. This supersedes the earlier actor-inclusive uniqueness proposal.
- UUID/snowflake, kind/version/status, JSON-object/size, nonnegative counts, attempt ceiling and timestamp ordering checks. A processing row requires owner/generation/lease; only a successful completed row carries a success result. Terminal rows cannot be automatically reclaimed.
- Partial pending index on `(due_at,created_at,id)`; partial processing lease index on `lease_expires_at`; expiry index; `(guild_id,requester_user_id,id)` result lookup; snapshot primary key; attempt uniqueness as above.
- Preserve the existing settings composite relationship and version checks and **normal notification uniqueness** `(session_id,guild_id,channel_id)`. No change to those keys or existing uncertain rows.
- General read result maximum 1 MiB and at most the existing 1,000 channels/1,000 roles, with strict field validation; oversized responses fail explicitly, not silently grant partial permissions. Test/settings results are much smaller. Constrain snapshots separately and include them in storage sizing.

Initial server policy: read TTL 60 seconds, settings/test TTL 120 seconds, lease 60 seconds renewed every 15 seconds, up to three total claims and bounded consumer concurrency. Database clock controls deadlines; client clocks/TTL/owner values are ignored. These values are a prototype starting point, subject to tests and measured API latency.

## Admission, claim and execution transactions

### 1. Admission

Authenticate Better Auth session, user allowlist and **fresh** OAuth owner/Administrator/Manage Guild permission; enforce guild beta scope and same-origin mutation policy. Derive requester and internal session reference server-side. Validate/normalize exact per-kind payload and size, then hash its canonical representation.

In one database transaction, resolve existing idempotency key first. Same actor/payload returns the existing command, including terminal outcomes, with no new effect. Different body/actor is conflict. For new work verify current subscription/version, queue capacity and per-user/guild limits. For a test, reserve the existing test ledger and enforce its 30-second guild cooldown **in the same transaction as command insertion**. Roll back both if either fails. Do not reserve again when replaying the same request.

No command JSON contains bot/OAuth/API credentials, cookies or authorization headers. `session_ref` is the auth row ID, not its `token` column. DB credentials never reach browser code.

### 2. Claim

In a short transaction, select a due, unexpired pending row using `FOR UPDATE SKIP LOCKED`, set processing/owner/new generation/lease and increment attempts, insert the attempt row and commit. Do not hold that row lock across Discord HTTP. This prevents concurrent ordinary claims but does not make remote sends exactly-once. [PostgreSQL locking guidance](https://www.postgresql.org/docs/current/sql-select.html).

Every renewal, phase marker and completion compares ID, processing status, owner and generation, plus relevant lease/deadline checks. The old process cannot complete or requeue another owner's attempt. Use a consistent lock order; after claiming, release the transaction before obtaining the existing route advisory lock/settings rows.

### 3. Execution authorization

Backend reloads command and rejects changed/unknown payload, expired policy/scope, missing or expired session, mismatched requester and removed allowed user. A narrow reviewed DB function returns only necessary user/session/Discord identity metadata, not OAuth tokens. Use fixed `search_path`, no dynamic SQL and restricted EXECUTE grants if security-definer rights are necessary. Backend config must receive approved public user/guild allowlist policy, not the web secret bag; inconsistent policy fails closed.

For delayed mutations/tests, query current actor membership, guild owner and role permissions through official targeted member/guild/role endpoints; calculate owner/Administrator/Manage Guild. Preserve Gateway Guilds-only intent; real beta-app targeted REST behavior is an acceptance gate. API failures/429 are not permission grants. Missing actor/bot membership forbids effects. Read-only installation status may validly return not_installed when the bot is absent. [Discord guild API](https://docs.discord.com/developers/resources/guild#get-guild-member).

Then recheck current subscription/settings/version and current bot channel/role/overwrite permissions. Permission snapshots never authorize save/send. Both actor and bot checks are needed; a manager having permission does not mean NAVI can post or mention everyone. Revocation between a final check and Discord acceptance cannot be made atomic; keep checks recent and recheck deadlines after lock waits.

### 4. Settings commit and immediate disable

After external read checks, lock/verify the owned command, obtain the **existing route advisory transaction lock**, perform the existing CAS settings write and persist the full committed result plus completed status **in the same outer transaction**. Refactor repository transaction composition only during approved implementation. Calling current `save()` and acknowledging later would create two commits and is not acceptable.

Retain the web's direct, freshly authorized **disable-only** operation when backend is unavailable. It uses the current lock/version increment; queued saves with the old version fail. In database mode a narrow function may restrict the web to disabling rather than arbitrary settings writes. The legacy HTTP deployment retains compatible grants during the tested transition. This is not a way to bypass OAuth/DB availability or generalize offline permission grants.

### 5. Test send and acknowledgment

Reload saved configuration/identity rather than trusting queued rendered content. Preserve target checks, explicit allowed_mentions and current renderer. Tests/preview never ping everyone; existing selected-role behavior remains. Use the original request UUID for the existing deterministic nonce; never generate a new key on retry.

Commit the command/attempt effect-start marker before invoking the current sender. If the lease/DB is unavailable, do not initiate the send. Extend the sender's result in a reviewed manner to return a validated message/channel receipt when Discord acknowledges; current code discards it. Commit test ledger sent state, attempt receipt and command completed result together. A lost transaction response is resolved by querying the same command/ledger.

Known **pre-send** failure can retry safely only when the adapter provides reliable phase classification. An explicit Discord rejection/429 can be handled according to its documented non-acceptance and cooldown. An unclassified network/5xx/lost response after possible message submission becomes uncertain. No inference from generic error text or an elapsed lease is enough to authorize another send. Nonce enforcement is additional protection, not an indefinite exactly-once promise.

## State and recovery contract

| From / condition                                                                          | Next state                | Required behavior                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| New accepted work                                                                         | pending                   | Accepted, not completed; no success toast for the action yet.                          |
| Atomic claim                                                                              | processing                | One owner/generation; renew bounded lease.                                             |
| Read succeeds / settings transaction commits / message receipt acknowledged and persisted | completed                 | Terminal success; return persisted result. Later refresh failure does not change it.   |
| Validated input/auth/destination/version error or exhausted safe retries                  | failed                    | Terminal sanitized failure, with certainty about whether an effect was prevented.      |
| Pending/unstarted work exceeds deadline                                                   | expired                   | No execution; UI explains expiry.                                                      |
| Authorized cancellation before effect/commit wins CAS                                     | cancelled                 | No effect. Cancellation is not undo; race with completion is resolved by stored state. |
| Lease expires, no external effect possible                                                | pending or expired/failed | Bounded safe recovery; settings+ack atomic transaction is read back before any retry.  |
| Message may have been accepted, receipt/commit unconfirmed                                | uncertain                 | Quarantine; no automatic reclaim or resend. Preserve ledger/attempt evidence.          |

Database outage before admission returns unavailable/unconfirmed, not a fabricated command ID/success. Browser retains its request key and retries that key after recovery. Outage during processing stops new effects/lease renewal; once communication could have occurred, recovery is conservative. A late validated receipt is stored against its original attempt; it does not blindly overwrite a quarantined/new generation. Operator reconciliation requires evidence and a conditional transition.

Retry uses a maximum of two safe reschedules/three claims. Respect the longest route/global Retry-After/reset deadline with jitter; never shorten it to fit TTL. If it cannot fit, expire/fail without bypassing the rate limit. Unknown SDK failures after possible send stay uncertain. No unattended dashboard “retry” generates a new operation.

Proposed command UI preserves Pending, Processing, Completed and Failed and adds explicit Expired/Cancelled/**Delivery uncertain**. Do not flatten uncertainty into Failed with a send-again button. “Refresh status” is GET-only; “accepted” is not “saved/sent.”

## Proposed dashboard API behavior (not implemented)

`POST /api/guilds/:guildId/bot-commands` accepts only kind, idempotency key and strict payload. The web derives all identity/lease/state fields. New work returns 202, command ID, status, expiry and same-origin status URL; an idempotent terminal replay may return 200 with the stored result. Invalid input is 400, unauthorized 401/403, key/version conflict 409, local admission pressure 429, and DB unavailable 503. Responses are `no-store` with sanitized errors.

`GET /api/guilds/:guildId/bot-commands/:id` repeats current session, actor ownership and fresh guild authorization. Return only that actor's scoped result; inaccessible IDs use a consistent response without tenant leakage. No long-held connection or cross-service callback is required. If the initial POST response was lost, re-POST the **same** key/body to retrieve the same command—never a new key.

Suggested browser polling delays are 2, 4, 8 then 15 seconds, bounded by TTL plus a short status-resolution window. Stop on unmount/logout/terminal status; honor server/Discord Retry-After and manual resumption after timeout. Existing fresh OAuth guild authorization on every protected poll is preserved and its rate cost must be tested. Do not cache management grants to hide rate-limit pressure. Metadata reads can coalesce per guild, while each actor's result remains separately authorized.

## Least privilege and retention

Web mode: existing auth/provider rights, narrow command admission/read functions and immediate disable; no claim/result/attempt/snapshot writes or normal live-delivery rights. Command consumer: claim/renew/complete, limited subscription/settings and test-ledger operations, snapshot writes, narrow session metadata function; **no OAuth token columns, auth encryption secret, schema DDL or owner login**. Worker stays unchanged. No raw table GRANT should let web forge backend completion. SQL constraints/transactions supplement application authorization; RLS is not asserted as implemented.

Retain unresolved commands/attempts and compact idempotency evidence; proposed seven-day result pruning must not remove uncertain/pending work or allow an old test key to send again. Retention/erasure/tombstone policy is an approval item: default to preserving compact mutation/test tombstones until explicitly reviewed. Do not claim indefinite idempotency after deleting its evidence. Existing seven-day test pruning must exclude command-linked/unresolved records before command mode is enabled. No retention change is applied now.

## Cloud preparation and migration order

1. **Approval now:** accept A/B contract, immediate disable, extra lifecycle states, short TTL/lease/retry defaults, role/session validation strategy, retention requirements and the scope of a synthetic local prototype. This is not approval to deploy or send.
2. **C/E locally after approval:** additive migration/repositories/roles, pure validation, consumer and existing-service adapters; test auth/isolation, arbitrary input, role changes, concurrent claims, stale generation, every crash boundary, DB outages, expiry, rate limits and atomic commit/ack. Do not invoke real providers/sender.
3. **D after those pass:** web transport abstraction with legacy HTTP default, bounded authenticated result APIs/UI; regression-test existing settings and save-refresh recovery, duplicated POSTs, navigation/logout and GET-only status recovery. Demonstrate database-mode web works with all bot HTTP egress blocked.
4. **F preparation:** discriminated `BOT_COMMAND_TRANSPORT=http|postgres` proposed config. HTTP retains required loopback URL/secret; database web mode removes those requirements and never constructs the HTTP broker. Bot gains a restricted DB identity and command policy configuration; worker retains current URL/secret. Update release preflight's current cross-service broker comparisons, health probes and role grants per mode. Update Render examples **only then**. No permissive fallback from a failed database adapter to public HTTP.
5. **Approved later migration/cutover:** backup/restore drill, privately verify target, apply additive migration once using separate owner, start one backend with consumer disabled by default, verify readiness and activate only after approval. Flip web mode per deployment. Shadow reads only; never dual-dispatch a message. Existing settings/data and local mode remain usable until replacement acceptance.
6. **Rollback:** stop admission/consumer, drain or quarantine effects, preserve all command/ledger/tombstones, revert web mode only if web/bot are co-located; otherwise maintenance/read-only mode. Do not drop tables or restore blindly over current data. Keep compatibility until a later reviewed cleanup.

Neon: current session advisory locks need a **direct**, verified-TLS connection; the transaction pooler is incompatible. Row-lock queue claims alone do not make the rest of NAVI pooler-compatible. Actual Neon TLS, role grants, cold-start timeouts, locks, restore and connection limits remain external acceptance gates. [Neon pooling](https://neon.com/docs/connect/connection-pooling).

Upstash: no runtime Redis queue/client currently exists. `rediss://` URI validation works; Redis may be considered later for non-authoritative metadata caching, never as permission authority, sole deduplication record or replacement for committed queue state. No new Redis dependency is justified for A/B. Actual TCP/TLS/PubSub/queue behavior remains unverified. [Upstash compatibility](https://upstash.com/docs/redis/overall/compatibility).

Render dashboard keeps root monorepo build, public `0.0.0.0:$PORT`, exact HTTPS OAuth origin and secure cookies. Backend owns restricted verified webhook ingress; no dashboard-to-bot network requirement. Preserve equivalent edge throttling and private readiness. No public broker, artificial keepalive, broad shared secret group or cloud changes.

## Risks and feasibility decision

The Phase F preflight update must also replace raw DATABASE_URL equality with validated intended canonical host/project/database identity. Separate least-privilege usernames/passwords may differ; test same-database/different-role acceptance and foreign-database rejection without printing credentials. This is a design requirement only; the current preflight is unchanged.

No-card/free hosting is not solved by the queue. Render sleeps; Railway Free's small recurring credit is unproven for continuous workload; alwaysdata's detailed supervised Services page is paid-only despite broad homepage wording. No indefinitely free always-on backend is verified. [Render limits](https://render.com/docs/free), [Railway pricing](https://railway.com/pricing), [alwaysdata Services](https://help.alwaysdata.com/en/docs/web-hosting/services/).

Continuous 0.25-CU Neon operation estimates 180 CU-hours/30 days against 100 Free; current official pricing and the earlier FAQ also conflict on storage allowance. Actual entitlements/cost require owner verification. More command polling adds SQL traffic without reducing existing ten-second scheduler activity. Ten all-YouTube sources have a ten-minute reconciliation interval matching freshness suppression; don't promise that coverage without testing. Current beta cap remains five guilds. The earlier [cloud review](PHASE_15_CLOUD_ARCHITECTURE_REVIEW.md) contains full sizing calculations and hosting sources. [Neon pricing](https://neon.com/pricing).

**GO:** A/B design is concrete enough for owner review. **NO-GO:** Phase C onward until approval; cloud deployment/release until implementation, security/recovery tests, viable host/budget and fresh real integration gates pass. Queue design cannot guarantee exactly-once delivery, eliminate Discord outages or demonstrate real-world acceptance through mocked tests.
