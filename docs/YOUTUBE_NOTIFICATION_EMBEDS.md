# YouTube notification embeds and optional everyone mention

**Current mention control — 2026-10-18:** [the unified mention dropdown](NOTIFICATION_MENTIONS.md) supersedes the checkbox and YouTube-only mention policy in this historical report. YouTube and Kick support one exclusive No mention / @everyone / role choice using existing fields and current permission checks. Embed formatting is unchanged; previews/tests never ping everyone.

Implemented 2026-10-18 in response to the standalone screenshot-formatting request. This does not start another development phase or change the Phase 8 deployment HOLD. No real notification, mass mention, credential change, Portal update or public deployment was performed.

## Behavior and screenshot comparison

Automatic YouTube notifications now use the existing worker → private broker → bot REST sender, with a red (`0xff0000`) rich embed containing the YouTube label, bold channel name, linked livestream title and a large thumbnail image. Message text continues to use the saved dashboard template and its four variables. The URL variable is wrapped in Discord's `<URL>` syntax: it remains clickable while avoiding a second automatic link preview. Even if the configured text omits `{url}`, the embed title link still opens the stream.

The provided `Screenshot 2026-10-17 113608.png` was visually inspected. Its content is reference material, not an instruction to enable everyone mentions or modify bot identity. The regression fixture uses the screenshot's video ID/channel label and a representative Sinhala title, not a claim that a current stream/API lookup occurred.

| Screenshot element                                                         | Implemented output / comparison                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @everyone on its own line                                                  | Appears only on automatic YouTube messages after the explicit saved opt-in and fresh permission checks; absent by default.                                                                           |
| Clickable livestream URL                                                   | Canonical `https://www.youtube.com/watch?v=…` in configured content when `{url}` is used, plus a clickable embed title. This is equivalent navigation to the screenshot's shortened `youtu.be` link. |
| Red left accent                                                            | Explicit embed color `0xff0000`; YouTube automatic messages no longer carry `SUPPRESS_EMBEDS`.                                                                                                       |
| YouTube, channel name, linked title                                        | Embed author label `YouTube`, followed by bold channel name and a red-circle Markdown title link in the description. Metadata Markdown is escaped.                                                   |
| Large stream artwork                                                       | Embed `image.url` uses the highest available API thumbnail, rather than the small corner-thumbnail field.                                                                                            |
| Native video play overlay, verified-app badge, theme, exact fonts/wrapping | Owned by Discord's client/native YouTube preview and bot identity. A custom rich image embed does not supply native video playback or a verified badge; pixel-identical rendering is not claimed.    |

`tests/youtube-embed.test.ts` checks that structure and content ordering against the screenshot, including the URL-only template plus explicitly enabled everyone case. These are automated payload comparisons, not screenshots of newly delivered Discord messages. Actual Discord rendering and thumbnail availability still require a controlled live-start test after local services are restored.

## Everyone mention security

The new `mentionEveryone` preference is per subscription and defaults to false. The dashboard shows it only for YouTube registrations. It cannot be enabled through the UI without a selected channel whose current bot snapshot permits Mention Everyone. Changing a checkbox does not send anything; the administrator must save.

All save/preview/test requests retain fresh owner/Administrator/Manage Guild authorization, allowlist and tenant checks. A forged browser flag, channel or capability does not grant permission: the backend gets capabilities from the bot, and the bot independently refreshes effective permissions before every send. Channel/member/role overwrites and timeout state are honored. Kick everyone opt-ins are rejected. No bot permissions or Gateway intents are automatically expanded.

Actual automatic opt-in messages contain exactly one system-generated `@everyone` prefix and `allowed_mentions.parse: ['everyone']`. User mentions remain empty, selected role IDs remain explicitly allowlisted and replied-user mentions remain false. Raw @everyone/@here/user/role markup in templates stays prohibited; interpolated names/titles are neutralized and embed Markdown is escaped. Turning the preference off or sending a legacy config without the field clears the saved opt-in. No @here feature is introduced.

**Previews and labelled test messages never ping @everyone**, even when the preference is saved. Existing optional role mentions on tests retain their prior behavior. Test messages remain plain text with suppressed embeds; the new rich format applies specifically to automatic YouTube starts. Kick formatting remains unchanged.

## Thumbnail and API contract

The worker extracts `snippet.thumbnails` from the existing official YouTube `videos.list` result; no search/scraping or additional API request is added. It prefers maxres, standard, high, medium, then default. The normalized thumbnail URL survives database session JSON and the final shared LIVE recheck before sending.

At provider ingestion and broker sending, optional thumbnail URLs must be bounded HTTPS URLs on `i.ytimg.com`, under the matching video ID's `/vi/` or `/vi_webp/` path with an image filename. Credentials, nonstandard ports, fragments, unrelated video IDs and other hosts are rejected. The bot does not fetch arbitrary remote image URLs. For older persisted payloads/API responses without a thumbnail, the renderer uses the same video ID's standard `hqdefault.jpg` image URL; upstream image availability is not guaranteed.

Official references checked for this change: [YouTube video thumbnail metadata](https://developers.google.com/youtube/data/reference/rest/v3/videos#snippet.thumbnails), [Discord embeds and message flags](https://docs.discord.com/developers/resources/message#embed-object), [allowed mentions](https://docs.discord.com/developers/resources/message#allowed-mentions-object). The existing YouTube discovery, LIVE-verification, freshness and Premiere limitations still apply; richer formatting does not make detection complete.

## Persistence and duplicate prevention

Reviewed migration `0006_youtube_embed_mentions.sql` adds only `notification_settings.mention_everyone boolean NOT NULL DEFAULT false`. Existing rows remain opted out. The Drizzle schema/snapshot/journal and relevant migration test chains are updated; no table reset or credential change occurs. Worker schema readiness checks the new column before announcing enabled monitoring.

The existing versioned settings, activation checks, route locks, stable YouTube video session keys, persistent session/guild/destination uniqueness, claimed deliveries, deterministic enforced nonce and uncertain-outcome handling remain intact. Formatting never creates a second queue or direct sender. Repeated hints and reconstructed monitors in the new two-guild test produce exactly one embed per destination, with independent mention preferences. Discord permanent exactly-once delivery is still not guaranteed; ambiguous sends are not blindly retried.

## Local setup and manual verification

1. Restore the intended local PostgreSQL/Docker services. Confirm `DATABASE_URL` privately points to development, then review and apply the additive migration with the existing `npm run db:migrate` workflow. This task's `npm run db:check` failed; no real database migration was applied here. Embedded PostgreSQL tests include the new migration successfully.
2. Rebuild/restart web, worker and bot together after the migration. Keep one Gateway owner per token. No new environment variable is required. Keep monitoring disabled until sources/destinations are reviewed.
3. In the selected Discord channel, grant NAVI View Channel, Send Messages and **Embed Links**. The existing installation permission integer 19456 already includes those permissions, but channel overwrites can revoke them. Missing Embed Links blocks an automatic YouTube send with `bot_missing_embed_permissions` before POST.
4. Configure the notification text, destination and enable preference in the dashboard. To reproduce the screenshot's URL-only body, use `{url}` as the template. Leave everyone off for ordinary verification.
5. Only if the administrator wants mass alerts, manually grant NAVI **Mention Everyone** in the intended channel, refresh dashboard targets, explicitly check the YouTube everyone option and save. Administrator permission and privileged Gateway intents are unnecessary. Do not enable Public Bot or grant mass-mention permissions globally just for formatting.
6. After reviewing the real destination and monitoring configuration, start a controlled public YouTube stream. Inspect the received red embed/name/title/URL/image and correct channel. Repeated polls/hints must not resend. Inspect both destinations independently when testing multi-server behavior.
7. Exercise a deliberately opted-in everyone alert only in a consenting test server. Confirm default-off delivery and permission-revocation rejection separately. Ordinary test/preview buttons cannot validate an actual everyone ping because they suppress it deliberately.

## Actual test results

- `npm run check`: **PASS, exit 0**, TypeScript, zero-warning lint, formatting and **249 tests / 23 files**. Eighteen new tests over the Phase 8 baseline include screenshot-format payloads, safe thumbnail URLs, permission overwrites/revocation, default-off/persist/reset authorization, hydrated UI opt-in and repeated-event/two-destination delivery. Provider/Discord responses are simulated; SQL and loopback HTTP in the suite are real isolated operations.
- `npm run build`: **PASS, exit 0**, shared packages, Next.js, bot and worker. The final production build includes the corrected Markdown sanitizer; final source validation is recorded in PROGRESS.md.
- `npm run db:generate`: **PASS**, generated the reviewed additive migration and metadata without connecting to or changing the database; the final generation check reports no further schema changes.
- `npm run db:check`: **FAIL, exit 1**, configured local PostgreSQL connection unavailable. Real migration, external database persistence and controlled live delivery remain unverified.
- No actual Discord message was sent and no @everyone ping was generated. No claimed real livestream/Discord visual acceptance is based on simulated output.

Changed files: shared `packages/core/src/notifications.ts`; bot `notifications.ts`; worker `providers.ts`/`monitor.ts`; database `schema.ts`/`notifications.ts`/`monitoring.ts`, migration and metadata; web notification component/service/broker; new embed tests plus fixture, UI, persistence, safety and monitoring regressions; external database check migration list. README and current notification/schema/security/API documentation pointers and progress describe this additive update.
