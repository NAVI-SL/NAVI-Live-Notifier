# Discord rate-limit investigation and correction

Date: 2026-10-18 (Asia/Colombo). Scope: existing dashboard/Discord request handling; no release, credentials, permissions or notification settings changed.

## Diagnosis and evidence

The main pressure point is **GET `/users/@me/guilds`**, authenticated with the user's OAuth token. Real local dashboard observations returned HTTP 200 with `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset-After: 1`, and bucket fingerprint `9110bf786eed`. A protected Notifications render previously requested the same guild list in both the workspace and notification service, followed by another request for client channel/role retrieval. React Strict Mode could replay the latter effect. There was no dashboard interval polling or automatic network retry loop; navigation, duplicate authorization reads and development remounts amplified requests.

The bot independently reads guild membership, channels, roles and its member permissions. These share the bot's existing REST client and its rate-limit machinery; the user's guild-list OAuth credential is separate from the bot token. The web service continues to broker bot operations rather than creating another bot REST sender.

One confirmed error-handling defect converted discord.js `RateLimitError.timeToReset` alone to Retry-After. SDK global/sublimit `retryAfter` or `sublimitTimeout` could be longer, incorrectly presenting a one-second wait. The corrected calculation uses the longest delay. An SDK preemptive bucket rejection is distinguished from an actual HTTP 429.

**Evidence limitation:** no upstream HTTP 429 was captured during the final controlled browser run. Successful exhausted buckets were captured; a local preemptive 429 was encountered during investigation before bounded pacing was added. Historical upstream 429 endpoints cannot be reconstructed from the former logs. Do not infer that every reported one-second warning was an actual Discord HTTP 429. The new logging attributes future actual 429s precisely. Final bot guild/channel/role/member requests returned 200; OAuth token-endpoint 429 handling is covered by simulated tests, not observed live here.

## Corrections and security boundaries

- User guild lists: concurrent requests share a pending read; ten-second completed caching is for server-picker display only, isolated by a SHA-256 token key. Protected access explicitly requests fresh permissions. React request-scoped memoization shares repeated fresh checks within one server render; permission grants are not memoized across requests. Session and private-beta allowlist checks still run.
- Exhausted successful guild-list buckets: wait once for the advertised reset (rounded up), then issue the fresh permission request, including between pagination pages. Waits over eight seconds return 429/Retry-After rather than holding the request. Actual 429 cooldowns prevent another outbound call until expiry. There is no stale permission fallback or automatic 429 retry loop.
- Bot installation display: ten-second cache; unknown failures are not cached. Notification target display: five-second cache, concurrent reads shared. Channel/role/member permission verification is fresh for save, preview and actual send. Send-time checks and existing mention restrictions remain authoritative.
- Browser channel/role fetches: only in-flight requests are shared, including Strict Mode effect replay. Settled requests are removed. Retry-After disables manual refresh until expiry; the timer enables the button but never automatically sends another request. Page effects ignore stale unmounted results. No mutation retries or test sends were added.
- Existing discord.js REST global and route coordination remains enabled. Safe Retry-After parsing supports decimal seconds, body fallback and HTTP dates. Credential refresh locking and expiry handling remain in place; no credentials were replaced.

Handling follows [Discord's official rate-limit documentation](https://docs.discord.com/developers/topics/rate-limits): use returned bucket/reset metadata and Retry-After, including global limits; do not hard-code Discord's quota.

## Safe diagnostics

Structured `discord_rest` console events contain only UTC time, service, endpoint template (numeric IDs removed), status, source (`http` or `sdk_bucket`), Retry-After seconds, bucket fingerprint, global flag, remaining count and reset-after seconds. Unknown routes become `other_discord_route`. Request/response objects, Authorization headers, URL queries, tokens and bodies are not logged.

In native development, the same projected events are written to ignored `.local/discord-rest.jsonl`, rotated at approximately 1 MiB with one previous file. Production uses stdout only; development file failure does not break requests. Protect the local workspace with normal OS access controls. New bearer-protected, loopback-only `GET /internal/discord-diagnostics` exposes the bot's last 30 projected events, no-store; it makes no Discord requests. It is not a public dashboard endpoint. `sdk_bucket` status 429 is a local SDK rejection, not proof of a wire response.

## Verification

| Check                                                                  | Actual result                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                        | PASS: TypeScript, zero-warning ESLint, formatting, 275 tests / 26 files.                                                                                                                                                                                                                                                          |
| `npm run build`                                                        | PASS: shared packages, production Next.js, bot and worker.                                                                                                                                                                                                                                                                        |
| Real authenticated Chrome dashboard                                    | PASS: Notifications loaded saved Kick/YouTube destinations and current channel/role choices; Overview loaded bot-installed status; navigation back to Notifications succeeded.                                                                                                                                                    |
| Real Discord reads                                                     | PASS: guild-list, bot guild/channel/role/member lookups returned 200; guild-list exhausted/reset metadata recorded safely.                                                                                                                                                                                                        |
| Regression simulations                                                 | PASS: concurrent sharing, TTL expiry, credential isolation, fresh revoked permissions, failed-read eviction, global/decimal 429 cooldown, short reset pacing, long reset refusal, SDK sublimit/global delay, safe logs, diagnostics authorization, Strict Mode fetch sharing and manual-refresh cooldown without automatic retry. |
| Historical or deliberately induced real Discord 429                    | NOT VERIFIED; no flooding performed.                                                                                                                                                                                                                                                                                              |
| Real notification delivery, controlled livestreams, multi-process soak | NOT EXECUTED in this task. No messages sent.                                                                                                                                                                                                                                                                                      |

Automated tests simulate Discord responses; they are not real rate-limit or message-delivery acceptance. Existing persistence/authentication/regression suites remain included. No schema or migration changed.

Additional security check: `npx tsx scripts/check-client-secrets.ts` PASS, 19 client assets and 12 configured candidate fields, no exact secret matches. This is a bounded exact-value scan, not proof against every possible leak.

Browser evidence: [recovered Notifications screenshot (private image omitted: discord-rate-fixed.png)](evidence/UPLOAD_PRIVACY_NOTE.md), showing the selected destination and bot installation status without the rate-limit warning.

## Changed files and operational limits

Core: `packages/core/src/read-cache.ts`, `discord-rate.ts`, `index.ts`, package exports. Web: `discord.ts`, `guild-service.ts`, `runtime.ts`, `oauth-recovery.ts`, `notification-broker.ts`, `notification-service.ts`, `components/notification-manager.tsx`. Bot: `notifications.ts`, `status-server.ts`, `index.ts`. Tests: `discord-rate.test.ts`, `guilds.test.ts`, `notification-ui.test.tsx`. Documentation: this report and `PROGRESS.md`.

Caches/cooldowns are process-local and bounded display caches do not use Redis. Run the existing single web process and single bot broker locally; do not create competing bot sessions. Multiple web replicas would need shared coordination for the same OAuth token before scaling. Fresh mutations can legitimately consume quota: wait for Retry-After and retry manually. Brief display metadata staleness is intentional and cannot authorize a send. Normal service restart drops caches and cooldowns; live multi-instance/outage/long-duration behavior remains an operational verification item. The private-beta NO-GO decision and outstanding real-stream gates are unchanged.
