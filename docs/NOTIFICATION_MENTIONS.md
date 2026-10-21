# Unified notification mention selection

**Kick format update:** automatic Kick messages now use a green rich embed and link buttons while retaining the mention policy below. Kick also requires Embed Links in the destination. [Formatting, sample preview and limits](KICK_NOTIFICATION_EMBEDS.md) supersede historical plain-text Kick descriptions; everyone remains opt-in and previews/tests never ping everyone.

**Permission investigation follow-up:** actual Discord inspection confirmed missing Mention Everyone grants in both local destinations. The dashboard now provides channel instructions and a cache-bypassing Refresh permissions action that keeps the current selection. See [actual evidence and manual setup](EVERYONE_PERMISSION_REFRESH.md). Permission calculation and send-time enforcement remain unchanged.

Updated 2026-10-18 (Asia/Colombo). This change replaces the separate YouTube everyone checkbox with one native dropdown for YouTube and Kick. No real preferences, permissions, credentials or infrastructure were changed during implementation. No real Discord message was sent.

## Behavior and security

The existing Optional role mention dropdown contains **No mention**, **@everyone**, then current Discord roles in their original order. Existing unavailable-role placeholders remain for explaining broken saved settings. The native select retains its label, keyboard behavior, focus styling and dark dashboard styling. The old everyone checkbox is removed.

| Selection  | Configuration                           | Automatic notification                                         |
| ---------- | --------------------------------------- | -------------------------------------------------------------- |
| No mention | `roleId:null`, everyone absent/false    | No prefix; allowed mention parse/roles/users empty.            |
| @everyone  | `roleId:null`, `mentionEveryone:true`   | One everyone prefix; parse only `everyone`, roles/users empty. |
| Role       | Selected role ID, everyone absent/false | Only that role prefix/ID allowed; parse/users empty.           |

Everyone is never automatically selected for a new configuration. Selecting it shows a warning that it can notify the entire server. Missing destination Mention Everyone permission produces a validation error, marks the select invalid and blocks Save/Preview/Test. The server independently validates current targets for save/preview and the bot rechecks permissions before sending. Existing manager authorization, private access restrictions and guild isolation remain intact. Arbitrary template mentions are forbidden; provider metadata is neutralized. No permission grants, new intents or installation permission changes were introduced.

Preview and labelled test messages never include or allow everyone. Normal selected roles retain their existing labelled-test behavior. YouTube embeds and Kick text formatting are otherwise unchanged. Explicit [Discord allowed-mentions controls](https://docs.discord.com/developers/resources/message#allowed-mentions-object) and [channel permission checks](https://docs.discord.com/developers/topics/permissions) remain in use. Persistent destination uniqueness, nonce enforcement, retry and uncertain-outcome handling are unchanged.

## Compatibility and migration

**No new SQL migration or backfill is required.** Reuse existing `notification_settings.role_id` and `mention_everyone boolean NOT NULL DEFAULT false`, already introduced by migration 0006. The existing schema must include that previously required migration.

Shared normalization applies to API input, repository reads/saves, UI initialization and worker/bot payloads:

- Existing checkbox opt-ins display as everyone, including after refresh.
- Role-only settings retain the role. Reading settings does not reset destinations, templates, enabled flags or versions.
- A legacy row containing both everyone and a role resolves to everyone, honoring the explicit prior opt-in while preventing simultaneous mentions. The raw historical role is not overwritten on read. Its next explicit save persists canonical `role_id=null` for everyone.
- Choosing a role or No mention clears everyone. False/omitted flags normalize consistently, preventing a false unsaved-change warning after switching back to the saved option.

No application rows were manually edited. Compatibility fixtures use isolated databases. Rebuild/restart existing processes through the normal workflow to load shared package changes; avoid duplicate bot sessions. Everyone still cannot be sent without current permission. No real-send acceptance is claimed.

## Actual verification

| Check                     | Result                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`           | PASS, exit 0: TypeScript, zero-warning ESLint, formatting and **300 tests / 27 files**. Fourteen additions to the 286-test baseline, with obsolete expectations updated.                                                                        |
| `npm run build`           | PASS, exit 0: shared packages, production Next.js, bot and worker.                                                                                                                                                                              |
| `npm run test:postgres`   | PASS, exit 0: actual isolated PostgreSQL concurrent admission/claims, cooldown retention, route locking, interrupted-send recovery and deduplication. Temporary schema removed; application tables untouched.                                   |
| Persistence/compatibility | PASS in embedded PostgreSQL: legacy mixed row resolves exclusively to everyone without rewriting data; role-only records and other settings preserved; both platforms save/reload everyone, none and roles.                                     |
| Mention safety            | PASS with simulated Discord: exclusive both-platform formatting; denied/revoked permission; forged role/template rejection; no everyone in previews/tests.                                                                                      |
| Worker regression         | PASS with actual embedded PostgreSQL and simulated providers/Discord: legacy everyone payload, independent role destination, repeated polls and persistent deduplication for both platforms. Existing YouTube/Kick monitoring regressions pass. |
| Hydrated UI               | PASS: option order, default off, explicit selection/save, legacy loading, refresh/remount restoration, switching choices, permission validation and no false dirty state on round trip.                                                         |
| Real local Chrome         | PASS: both controls render, old checkbox gone, existing saved role choices intact. Unsaved everyone selection shows warning/missing permission and disables Save; original choice restored without saving.                                      |
| Real Discord messages     | NOT EXECUTED. No message, mass mention or live settings save performed.                                                                                                                                                                         |

The built-client secret scan also passed: 19 assets, 12 configured candidate fields, no exact secret matches. This bounded scan is not a guarantee against every possible leak. An intermediate formatting-only failure was corrected before final checks passed. [Browser evidence](evidence/mention-dropdown-permission.png) shows an **unsaved** everyone selection and permission error; everyone was not saved/enabled.

## Changed files

- `apps/web/src/components/notification-manager.tsx`: dropdown, warning, permission validation and canonical state.
- `apps/web/src/lib/notification-service.ts`: remove obsolete YouTube-only restriction, preserve authorization/target checks.
- `packages/core/src/notifications.ts`: single-mention normalization and both-platform formatting.
- `packages/database/src/notifications.ts`, `packages/database/src/monitoring.ts`: existing-column compatibility in read/save/worker payloads.
- `apps/bot/src/notifications.ts`: both-platform everyone through existing validated sender.
- `apps/worker/src/monitor.ts`: remove obsolete YouTube-only error category; detection/queue unchanged.
- `tests/mention-selection.test.ts`, `tests/notification-ui.test.tsx`, `tests/notifications.test.ts`, `tests/youtube-embed.test.ts`, `tests/monitoring.test.ts`.
- This report, `PROGRESS.md`, `PHASE_05_NOTIFICATION_SETTINGS.md`, `YOUTUBE_NOTIFICATION_EMBEDS.md` and the browser evidence image.

Existing release/live-integration gates remain open. No deployment or new development phase was started.
