# Official API research

**Phase 12 — 2026-10-20:** retained YouTube candidates up to 100 are checked in sequential ≤50-ID videos batches, fixing known-ID starvation behind recent uploads. Each call reserves its unit; later-batch failure returns no partial observation. Scheduler budgets four calls/source/cycle with 20% headroom, nominal 60/300/600s for 1/5/10 YouTube sources at 7200. Undiscovered videos, Premiere behavior, short-stream visibility and real delivery remain unverified; ten-source cadence may exceed freshness after delay. [Current plan and evidence](PHASE_12_RELEASE_PLAN.md) supersede the earlier three-call formula.

**Kick rich-format update — 2026-10-18:** current official active-stream `users/livestreams` schema supplies broadcaster username/profile picture, category name/thumbnail and stream thumbnail in the existing request. These now populate green embeds and supported Discord link buttons through the existing sender. No extra lookup, offline editing or VOD discovery was added. [Implementation and actual evidence](KICK_NOTIFICATION_EMBEDS.md) supersede older Kick plain-text formatting descriptions; live visual receipt remains unverified.

**Local YouTube detection correction — 2026-10-18:** YouTube discovery now runs on every budgeted reconciliation rather than every 15 minutes; three one-unit calls per source/cycle are included in cadence calculations. One source at 7,200/day polls nominally every 60 seconds, ten at 450 seconds. Official channel/uploads/video API reads passed for the registered channel. Public LIVE/start/no-end checks and existing delivery semantics remain unchanged; no real LIVE transition or Discord receipt was verified. See [YouTube investigation](YOUTUBE_MONITORING_DEBUG.md) for evidence, current bot-health blocker and controlled acceptance instructions. Earlier cadence figures below are historical.

**YouTube formatting update — 2026-10-18:** existing `videos.list` snippet thumbnail metadata now supplies red Discord rich-image notifications through the current sender, with no additional API requests. Current embed/mention/thumbnail validation references and screenshot-comparison limits are in [YOUTUBE_NOTIFICATION_EMBEDS.md](YOUTUBE_NOTIFICATION_EMBEDS.md). This does not change YouTube discovery/coverage claims.

**Phase 7 update — 2026-10-17:** current Discord rate-limit/nonce guidance, YouTube quota table and Kick OpenAPI were rechecked. Provider endpoints/signature mechanisms are unchanged. Reconciliation now preserves concurrent hints and uses a budget-derived YouTube cadence (ten sustained sources: nominal 225 seconds at 7,200 units/day, excluding rotation). Actual Kick app-token inventory and Discord bot identity REST passed; Google currently returns `API_KEY_INVALID`. No real stream/webhook/automatic Discord message was verified. [Phase 7 evidence](PHASE_07_IMPLEMENTATION.md) supersedes earlier configuration/result claims, while their dated evidence remains historical.

**Phase 6 update — 2026-10-17:** current official YouTube push/videos/playlists/quota guidance and Kick OpenAPI/signature/event documentation were rechecked for implementation. The worker uses candidate-only YouTube discovery and official targeted Kick status checks, with authenticated webhook hints and persistent budgets/reconciliation. See [Phase 6 implementation](PHASE_06_IMPLEMENTATION.md) for exact current fields, authentication, coverage limits, actual test results and manual gates. Earlier text below remains research/proposal context, not evidence that all future architecture is implemented.

Checked 2026-10-16. API facts below come from primary sources; architecture choices and numerical operating targets are NAVI proposals. No authenticated API calls were made, so account availability, real quotas, latency and permission behavior remain untested.

## Discord

Use separate user login and guild bot installation flows. Dashboard login requests `identify guilds` with authorization code, server-side token exchange, one-use session-bound `state`, refresh handling and revocation. Bot installation uses guild context and `bot`; add `applications.commands` if optional slash commands are adopted. Email and automatic guild joining are unnecessary. [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2).

The user token calls `GET /users/@me` and paginated `GET /users/@me/guilds`; the latter includes guild ownership/permission information for authorization. [User resource](https://docs.discord.com/developers/resources/user).

Bot REST uses `https://discord.com/api/v10`. Required operations: guild/channel/role reads and `POST /channels/{channel.id}/messages`. Minimum posting permissions are View Channel, Send Messages and Embed Links for embeds (permission integer 19456). Do not request Administrator, Manage Webhooks or Manage Messages. Channel overwrites must be evaluated, and a selected role must be mentionable unless the bot has the relevant mention permission; MVP avoids requesting broad mention permission. [Permissions](https://docs.discord.com/developers/topics/permissions).

Set explicit `allowed_mentions` on every message. A deterministic per-delivery nonce plus `enforce_nonce=true` helps deduplicate ambiguous retries, but Discord checks only a recent window, so it does not provide permanent exactly-once delivery. Bound content/embeds to Discord limits. [Message resource](https://docs.discord.com/developers/resources/message).

Honor rate-limit buckets and `Retry-After`/`retry_after`; coordinate global limits across processes using the bot token. Stop repeated 401/403 requests rather than producing an invalid-request storm. [Rate limits](https://docs.discord.com/developers/topics/rate-limits).

A long-lived Gateway connection with the nonprivileged `GUILDS` intent maintains installation/channel/role lifecycle state. Presence, member lists and Message Content intents are unnecessary. A temporarily unavailable guild differs from removal. Revisit verification before public growth: Discord documents verification for apps in 100+ guilds and mandatory sharding at 2,500+. [Gateway](https://docs.discord.com/developers/events/gateway).

Optional future `/navi status`, `/navi dashboard`, `/navi test` should use application commands and current manager authorization. They are not required for the initial dashboard-managed bot. [Application commands](https://docs.discord.com/developers/docs/interactions/slash-commands).

## YouTube

Enable YouTube Data API v3 in a Google Cloud project. Public data can use a server-side restricted API key; do not require streamer Google login for this release. Resolve handles with `channels.list(forHandle=...)`, or IDs with `id=...`; request `snippet,contentDetails` for display and the uploads playlist ID. [Channels list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list).

Subscribe through Google's PubSubHubbub hub to `https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID`. The documented notifications cover uploads and title/description changes; there is no documented universal go-live event. Treat feed video IDs as discovery hints requiring API confirmation. [YouTube push guide](https://developers.google.com/youtube/data/guides/push_notifications).

Implement subscription intent/challenge validation, lease tracking/renewal and unsubscribe lifecycle. Request a per-subscription secret; validate authenticated distribution when provided. Verify actual hub support during the integration gate. Even if transport authentication is unavailable, a feed payload cannot establish live state: accept only configured topics/channel IDs and confirm every hint against the API. Disable XML external entities and DTDs. [WebSub specification](https://www.w3.org/TR/websub/).

Confirm candidates with `videos.list(part=snippet,liveStreamingDetails,status,id=...)`, batching IDs within the supported request size (target up to 50, verified in Phase 1). Each call costs one regular quota unit. [Videos list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list).

Use actual start/end timestamps and current live status rather than the scheduled time or feed publication time. Missing/deleted results mean unavailable, not proof of an offline transition. Premieres require an explicit discrimination experiment; these fields alone should not be assumed sufficient. [Video resource](https://developers.google.com/youtube/data/reference/rest/v3/videos).

The owner-oriented Live Streaming API is not an arbitrary-channel monitoring substitute: `liveStreams.list` requires YouTube OAuth authorization. NAVI does not provision or manage broadcasts. [LiveStreams list](https://developers.google.com/youtube/data/live/reference/rest/v3/liveStreams/list).

### Discovery and quota constraint

Current official quota documentation reports **100 `search.list` calls/day in its own bucket**, and 10,000 units/day combined for other endpoints; reset is midnight Pacific Time. Check actual project console quotas. Do not copy older examples that price search as 100 regular units/call. [Quota calculator](https://developers.google.com/youtube/data/determine_quota_cost).

`search.list(channelId=...,type=video,eventType=live|upcoming)` can discover broadcasts, but each page/request consumes search allowance. Routine per-channel search polling is unsuitable. [Search list](https://developers.google.com/youtube/data/reference/rest/v3/search/list).

Proposed discovery layers: feed hints; initial and periodic recent uploads-playlist inspection; tracked upcoming/live video checks; scarce search reserved for onboarding/manual diagnosis and controlled reconciliation. The uploads playlist is a candidate source, with no assumed guarantee that all upcoming/live broadcasts appear promptly. [PlaylistItems list](https://developers.google.com/youtube/v3/docs/playlistItems/list).

Illustrative regular budget, not a completeness guarantee: 10 YouTube sources inspected every 15 minutes use 960 playlist calls/day; one batch of up to 50 known candidates every minute uses 1,440 video calls/day. Total 2,400/day before pagination, extra candidates, registration, retries and feed-triggered checks. Centralize scheduling, coalesce hints, reserve at least 20% headroom and hard-stop noncritical tasks before exhaustion. Ten channels searched hourly would consume 240 searches/day, exceeding the documented default. Search admission therefore needs a separate daily counter.

**Feasibility gate:** test scheduled, unscheduled, long-scheduled and ongoing public streams, plus Premieres. Measure missed discovery as well as latency. If official API coverage is insufficient, restrict supported behavior, accept slower discovery, request additional quota through official processes, or obtain approval for a different product scope. Do not fill the gap with scraping, unofficial endpoints, or additional projects to evade quota.

Cached public YouTube data needs a refresh/delete lifecycle within policy limits; user-related deletion requests also require a defined process. Proposed cleanup design appears in the schema/security documents; policy and retained operational identifiers must be reviewed before claiming compliance. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).

## Kick

Register an app in Kick developer settings and enable a public HTTPS webhook URL. Official guidance supports app-token subscriptions to other channels using broadcaster IDs; streamer authorization is not the default dependency. [Events introduction](https://github.com/KickEngineering/KickDevDocs/blob/main/events/introduction.md).

Get an app access token through `POST https://id.kick.com/oauth/token` with `grant_type=client_credentials`. Renew using expiry; an app token is not a user refresh-token flow. User OAuth/PKCE is only needed if later features require delegated user access. [Token flows](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow).

Resolve channels using `GET /public/v1/channels` with `slug`; retain broadcaster user ID as identity. Use `GET/POST/DELETE /public/v1/events/subscriptions`, subscribing to `livestream.status.updated`, version 1, webhook method. An app token requires `broadcaster_user_id`; a delegated user subscription uses `events:subscribe`. Current schema documents 10,000 subscriptions per event type per app. For targeted reconciliation use `GET /public/v1/users/livestreams?user_id=...`, up to 100 IDs. The old `/public/v1/livestreams` is deprecated; `/public/v2/livestreams` lists active streams with cursor pagination rather than replacing targeted user lookup. Recheck limits in the live schema. [Kick OpenAPI](https://api.kick.com/swagger/doc.json), [official changelog](https://github.com/KickEngineering/KickDevDocs/blob/main/changelog.md).

Status payloads contain broadcaster, `is_live`, `started_at`, `ended_at` and title. Use broadcaster ID plus canonicalized start instant to correlate webhook sessions with polling observations. Metadata events are not needed for start-only notifications. [Event payloads](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/event-types.md).

Verify base64 RSA PKCS#1 v1.5/SHA-256 signature over message ID, timestamp and exact raw request body joined by periods. Fetch/cache the official public key with rotation handling; do not hardcode it. Deduplicate message ID. Kick warns that sustained webhook failure for over a day can cause automatic unsubscription, requiring recovery. [Webhook security](https://github.com/KickEngineering/KickDevDocs/blob/main/events/webhook-security.md).

No universal numeric HTTP request rate is assumed from these sources. Read runtime limits, use bounded retries/backoff, and verify event delivery timing/retry behavior empirically. Provider errors and an empty successful live response must be handled differently.

## Evidence limits

Phase 4 update (2026-10-17): channel registration reverified and implemented YouTube `channels.list` (`part=snippet`, `forHandle`/`id`, API key) and Kick `/public/v1/channels?slug=…` with an app token from client credentials. Official Kick OpenAPI explicitly permits AppAccessToken for channel reads; no delegated streamer authorization is required for this operation. Numeric broadcaster IDs are parsed losslessly. See [the registration contract](PHASE_04_STREAMER_REGISTRATION.md) for exact requests, current official citations, credentials, limits and remaining live acceptance. No event subscription or detection claim follows from successful account resolution.

This is documentation research, not proof that application credentials, webhook signatures, quotas or stream classifications work in the user's accounts. Phase 1 supplies that evidence. Kick documentation was read from its official source repository where rendered event pages were unavailable. Recheck provider documentation and terms at integration and release gates.
