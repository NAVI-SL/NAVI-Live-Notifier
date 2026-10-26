# Kick rich livestream notifications

Implemented 2026-10-18 (Asia/Colombo). Screenshot `Screenshot 2026-10-18 110449.png` was treated as visual reference, not instructions to change bot identity, send messages or add lifecycle tracking. No real messages, settings saves, credentials, Discord permission grants or public deployment were performed.

## Output and reference comparison

Automatic verified Kick LIVE notifications retain the saved destination, enabled state, message template and exclusive mention selection. They now include:

- Green `0x53fc18` embed accent and Kick footer branding.
- Linked author heading `🔴 [LIVE] StreamerName`, using the current broadcaster username when supplied, with the broadcaster profile image as author icon.
- Actual stream title, category name and category cover as the small right-hand thumbnail.
- Large current stream thumbnail when supplied.
- A legacy Discord action row with two link-style buttons: **🔗 Watch on Kick** and **▶️ Watch Stream**. Both use the confirmed canonical channel URL, the supported destination for watching the live stream. No undocumented player or VOD URL is invented.

The saved text remains outside the embed. Everyone is prefixed only when explicitly configured and currently permitted; roles remain exclusive. Both platforms' previews and labelled tests still cannot ping everyone. Actual Kick sends now require **Embed Links**, independently rechecked before posting just as for YouTube. Installation already includes that permission in the existing minimum 19456; no new permission or privileged intent was requested. Failure retains the existing `bot_missing_embed_permissions` delivery classification.

The screenshot's OFFLINE heading, edited marker and Watch VOD action are not implemented. Current delivery records do not store Discord message IDs and there is no end-of-stream edit workflow. Implementing one would require lifecycle/receipt changes outside this task. Ending a stream sends no new message and does not change its sent record. The bot avatar/app badge, native video overlays and exact Discord client typography are not reproduced by the embed payload.

## Official metadata and safety

The existing authenticated `GET /public/v1/users/livestreams?user_id=…` request already returns active broadcasts and the needed metadata. The adapter projects only `broadcaster_user.username`, `broadcaster_user.profile_picture`, `title`, `category.name`, `category.thumbnail` and `thumbnail` into the existing normalized live payload. The broadcaster's stable ID must still match registration. Empty active-stream responses do not establish LIVE. Verified webhooks remain hints followed by REST confirmation, not a source of unverified message metadata.

The existing second LIVE confirmation supplies the latest metadata before sending; its existing short shared confirmation cache is reused across destinations. No user/category/image lookup, scraping or per-destination Kick API request was added. Title missing/blank falls back to `Live on Kick`; unavailable category uses `Category unavailable`; username falls back to registered display name. Missing images are omitted rather than breaking delivery or inventing a current preview.

Optional artwork accepts bounded HTTPS URLs on `kick.com`, `kicdn.com`, `cloudfront.net` and their subdomains, without userinfo, nondefault ports or fragments. Unknown/unsafe URLs are omitted without losing the alert. No image is downloaded by the worker or web server. The allowlist may need review if Kick changes its image hosting; missing/expired remote artwork can still render absent in Discord. YouTube retains its existing same-video thumbnail validation/fallback. Provider text is escaped/neutralized against Markdown injection and unwanted mentions; buttons use only the validated Kick channel URL.

Official references checked in this task: [Kick OpenAPI](https://api.kick.com/swagger/doc.json) (`LivestreamV2`, `LivestreamUser`, `LivestreamCategory`, active-stream endpoint), [Discord button reference](https://docs.discord.com/developers/components/reference#button), [Discord message/allowed mentions](https://docs.discord.com/developers/resources/message#allowed-mentions-object). Link buttons use type 2/style 5 with URL and no custom ID; classic action rows coexist with embeds, without the Components V2 flag or interaction handler.

## Dashboard preview

The existing **Preview message** action remains server-authorized, template-validated and target-validated. Kick preview responses add a pure sample message produced by the same shared formatter with mention parsing disabled. The dashboard renders a green sample card, profile initial, illustrative category cover/large preview artwork and both watch links. All artwork/status is explicitly marked sample; no live lookup or send occurs. It preserves the existing plain-text preview as well. Edits/saves clear stale previews.

An already-running development process initially returned its older text-only preview response. The dashboard supports this compatible response by building the same pure sample card locally only after the server preview succeeds. Rich-response and text-only-response paths are tested. No authorization or template/target check is bypassed. Rebuild/restart the existing web/bot/worker processes to load all shared package/service changes; do not start competing bot sessions.

Browser evidence: [Kick sample preview (private image omitted: kick-embed-preview.png)](evidence/UPLOAD_PRIVACY_NOTE.md). This is the local dashboard, **not** a real Discord message or evidence of a live broadcast. Reference artwork is represented with labelled CSS samples rather than copied game artwork or fabricated live images.

## Persistence and reliability

Optional metadata travels in the existing `monitor_sessions.payload` JSONB and broker payload. **No migration is required.** Older records without optional metadata remain valid. Stable stream-session keys, baseline/freshness and configuration-version checks, persistent session/destination uniqueness, exclusive claiming, current permissions, enforced nonce, retries and uncertain outcomes are unchanged. No existing delivery was reset/replayed and no OFFLINE state, message ID or VOD column was added.

## Actual verification

| Check                                | Actual result                                                                                                                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                      | PASS, exit 0: TypeScript, zero-warning lint, formatting, **335 tests / 29 files**, 19 additions to the 316-test baseline.                                                                                                                                                                       |
| `npm run build`                      | PASS, exit 0: shared packages and production website, bot and worker.                                                                                                                                                                                                                           |
| `npm run test:postgres`              | PASS: real isolated PostgreSQL admission/claim concurrency, longest cooldown, route-lock serialization, interrupted-send recovery/deduplication. Temporary schema removed; application tables untouched.                                                                                        |
| Client secret scan                   | PASS: 19 assets, 12 configured candidate fields, no exact secret matches. Bounded exact-value scan only.                                                                                                                                                                                        |
| Rich payload / safety                | PASS, simulated Discord: title/category/profile/artwork/buttons, metadata escaping, everyone/role/none, permission denial, Embed Links, invalid link rejection, legacy/missing/unsafe metadata and no everyone in test/sample.                                                                  |
| Detection/delivery                   | PASS, mocked official API and actual embedded PostgreSQL: active-only observation, current pre-send title/images, one confirmation shared across destinations, green embeds and independent mention choices, duplicate/restart suppression and no extra offline message. No real Discord sends. |
| Preview                              | PASS: server preview creates no settings/job/send; hydrated rich and legacy response paths display accessible sample card/links and clear on edit. Real local Chrome Preview action displayed the green sample card and watch links without saving/sending.                                     |
| YouTube/existing regressions         | PASS in full automated suite, including notification formatting, OAuth/server isolation, permission refresh, monitoring, retries and persistent deduplication.                                                                                                                                  |
| Actual Kick LIVE / Discord rendering | NOT EXECUTED. No controlled real transition, current real artwork verification, received Discord rich message, mention ping or button click was performed. Current public API schema was checked; provider responses in new tests are simulated.                                                |
| OFFLINE edit / VOD                   | NOT APPLICABLE to current architecture; not implemented or claimed. Empty/offline responses and live→offline polling do not create another message.                                                                                                                                             |

An intermediate TypeScript assertion needed optional image access after the message type gained optional Kick artwork. It was corrected and obsolete Kick-no-embed test expectations updated before the final passing suite. Browser validation also caught escaped sample punctuation; the sample text display was corrected without changing Discord Markdown escaping.

## Changed files

- `packages/core/src/notifications.ts`: optional live metadata, image validation, green Kick embed/link buttons, typed message contract and safe sample renderer.
- `apps/worker/src/providers.ts`: project existing official response metadata and safe title fallback.
- `apps/bot/src/notifications.ts`: require current Embed Links for all automatic rich notifications.
- `apps/web/src/lib/notification-service.ts`: authorized sample payload.
- `apps/web/src/components/notification-manager.tsx`, new `kick-embed-preview.tsx`, `apps/web/src/app/globals.css`: sample UI, compatibility path and relevant permission help.
- New `tests/kick-embed.test.ts`; updated `monitoring.test.ts`, `notification-ui.test.tsx`, `notifications.test.ts`, `youtube-embed.test.ts`.
- This report, `PROGRESS.md`, `02-api-research.md`, `03-architecture.md`, `NOTIFICATION_MENTIONS.md` and the evidence image.

## Remaining controlled acceptance

After explicit real-send approval for the intended server/channel/account: load rebuilt processes, verify destination View Channel/Send Messages/Embed Links and optional Mention Everyone, save preferences before starting a new public Kick stream, complete the offline baseline, then start the approved broadcast. Compare received title/category/images/URL and both buttons, verify the selected mention only, leave it live through multiple polls/restart to check one message per destination, then end it and confirm no new OFFLINE alert. Missing artwork should leave a clean text/details embed. Do not clear delivery rows or blindly retry uncertain outcomes to force a visual test. No public release or deployment acceptance is implied.
