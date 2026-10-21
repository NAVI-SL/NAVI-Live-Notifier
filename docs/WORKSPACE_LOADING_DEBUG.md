# Workspace loading failure — diagnosis and repair

Verified **2026-10-18 (Asia/Colombo)** against the existing local Windows application and authenticated Chrome session. No credentials, OAuth codes or cookies were printed. No notification, public deployment, access expansion or unrelated phase work was performed.

## Root cause and exact path

The failing browser route was `/dashboard/REDACTED_DISCORD_ID/notifications`. Its server render invokes the authorized notification list repository; the equivalent backend endpoint is **GET `/api/guilds/REDACTED_DISCORD_ID/notifications`**.

The authenticated endpoint displayed `{"error":"service_unavailable"}`. The endpoint's error handler maps that response to **HTTP 503**, reproduced directly in the regression test. This was **not a demonstrated current Discord HTTP 429**. Browser tooling did not expose a raw response-header/network capture; the status is established by the actual error-response mapping and the reproduced failing repository path, not a fabricated network trace.

The deployed local table lacked **`notification_settings.mention_everyone`**. Current Drizzle selects include that column, introduced by the existing approved **`0006_youtube_embed_mentions.sql`** migration. Direct read-only inspection confirmed the column absent; the actual repository call failed with PostgreSQL **42703 (undefined column)**. The migration had been recorded as pending in earlier reports while local backing services were unavailable. Restoring the services without applying it exposed the mismatch.

Next development logs were inspected with output restricted to safe matches: three failed-query/column references were present. No raw SQL parameters, provider responses or credential-bearing logs were copied. One rate-limit text reference in the log does not establish a current 429; the original error boundary itself mentioned rate limits for every failure. Request logging/Better Auth logging remain disabled; no raw OAuth debug tracing was enabled.

## Confirmed secondary defect

After applying the migration, the authenticated API returned saved subscriptions, but the existing **Try again** button still reproduced the error screen. It called Next.js `reset`, which only clears boundary state and can re-use failed server output.

The installed Next.js 16.4.2 documentation and implementation distinguish **`retry`**, which refreshes server data and resets the boundary. Changed the button to call `retry`. A real click then loaded the workspace, verified installed status, existing Kick/YouTube settings and writable channel/role controls without reauthentication. No Save/Test button was clicked.

The generic fallback text now says a required service failed, rather than implying Discord caused every database/runtime error. It still hides internal details and provides manual recovery; no automatic retry loop was added.

## Checks and repair

| Check                         | Actual result                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL connection         | PASS before/after; the immediate fault was schema mismatch, not connection loss                                                                                                                                        |
| Existing allowed-user session | Unexpired session exists; no session/cookie values selected or printed                                                                                                                                                 |
| Stored Discord credential     | Unexpired provider access token exists; its value was not selected/printed. Existing authenticated request and workspace recovery independently validate current session/Discord guild access                          |
| Token refresh                 | Not forced because current token was unexpired; existing real-library refresh/error/cooldown regressions pass                                                                                                          |
| Redis                         | Actual local container `redis-cli PING` returned **PONG**. Redis is not the dashboard authorization store or implemented delivery queue                                                                                |
| Migration target              | Confirmed same configured web/migration URL, loopback development PostgreSQL/database, nonproduction environment, before any write                                                                                     |
| Backup                        | Created a pre-migration custom-format `pg_dump` archive in ignored local backups; no contents attached or printed. This is a local safety copy, not a certified encrypted offsite backup/restore drill                 |
| Existing migration            | `npm run db:migrate` **PASS**, exit 0; applied pending approved SQL. No reset, new migration, credential change or preference rewrite                                                                                  |
| After migration               | Column present, actual notification repository succeeds; authenticated API displays saved Kick/YouTube preferences/versions; default everyone opt-out retained                                                         |
| Manual recovery               | Old reset remained on error after backend recovery; corrected retry loaded current server data and channels/roles in real Chrome                                                                                       |
| `npm run check`               | **PASS**, exit 0: TypeScript, zero-warning lint, formatting and **263 tests / 25 files**                                                                                                                               |
| `npm run build`               | **PASS**, exit 0: shared packages, Next.js, bot and worker                                                                                                                                                             |
| `npm run db:check`            | **PASS**, exit 0, actual local PostgreSQL                                                                                                                                                                              |
| `npm run test:postgres`       | **PASS**, exit 0: isolated actual-connection admission/SKIP LOCKED, longest cooldown, advisory serialization and interrupted-send reconstruction; temporary schema removed, application tables untouched by this check |

## Rate limits and request volume

Reviewed `discord.ts`, `oauth-recovery.ts`, dashboard data/service paths and notification target loading. User guild lookup is the official `/api/v10/users/@me/guilds`; access-token refresh uses Discord's token endpoint. Both preserve numeric `Retry-After`/`retry_after`, return safe 429 errors and refuse another request during their stored cooldown. The suite covers cooldown request suppression and auth recovery. Official [Discord guidance](https://docs.discord.com/developers/topics/rate-limits) requires respecting those returned delays; no deliberate flooding or real rate-limit experiment was performed.

There is no dashboard interval polling or automatic retry loop. The server Notifications render independently authorizes workspace status and settings, producing two fresh guild checks; the client then requests targets, with another fresh authorization. Development Strict Mode can mount the target effect twice, although its cleanup suppresses stale UI updates. These are bounded request amplification points, not proof of the earlier warning's exact cause. No cross-request permissions cache or authorization bypass was introduced to hide them. The observed load failure occurred after authorization at the SQL read; repairing the schema and making one explicit retry recover removes the need for repeated failing user attempts. Further coalescing would need request-scoped permission-freshness verification and is outside this confirmed repair.

## Changed files and regression coverage

- `apps/web/src/app/dashboard/error.tsx`: documented Next.js retry behavior and neutral fallback copy.
- `tests/dashboard-error.test.tsx`: hydrated click invokes fresh-render retry exactly once; no automatic retries or blanket Discord blame.
- `tests/production-database.test.ts`: creates an older-schema fixture, reproduces 42703/503, applies existing 0006 and verifies prior destination/template/enabled/version survive with everyone off.
- This diagnosis, [progress](PROGRESS.md) and [recovered workspace screenshot](evidence/workspace-recovered.png).

Migration 0006 was applied locally, not modified. Temporary safe diagnostic script removed afterward. Existing auth/session/Origin/manager checks, provider credentials, bot permissions, notification settings and sender behavior remain unchanged. The recovered dashboard is verified; this does not imply real livestream delivery or a private-beta GO decision.
