# Everyone permission investigation and refresh

Date: 2026-10-18 (Asia/Colombo). No Discord permission, credential, live notification setting or deployment change was made. No real message was sent. Temporary read-only diagnostic harness removed after use.

## Actual cause, established before code changes

**The warning was accurate for both configured destinations.** Read-only official Discord role/member/channel API requests showed:

| Evidence                 | Actual result                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Bot assigned guild roles | `@everyone`, `🤖 Bots`, `NAVI Live Notifier`; none grants Mention Everyone or Administrator.                         |
| Bot timeout              | Not timed out.                                                                                                       |
| `🔴│youtube`             | Bot can send; effective Mention Everyone false; no applicable everyone/assigned-role/bot-member overwrite grants it. |
| `🟢│kick`                | Bot can send; effective Mention Everyone false; no applicable overwrite grants it.                                   |

The permission evaluator already uses BigInt, unions everyone/assigned guild roles, handles Administrator, applies everyone channel overwrites, combines assigned-role overwrites (allow wins), then applies member-specific overwrites. It also requires View Channel/Send Messages and rejects timed-out members. This agrees with [Discord's documented calculation and implicit permissions](https://docs.discord.com/developers/topics/permissions). No permission-math defect was demonstrated, so the evaluator and existing sender were preserved.

The UX gap was that the previous warning gave little guidance and the existing manual target refresh could reuse a five-second bot display cache. A recent permission change could therefore appear unchanged until expiry. Default bot installation deliberately requests minimum message/embed permissions and does not grant Mention Everyone; installing or testing a normal notification does not imply this additional capability.

## Changes

- Added a visible **Refresh permissions** action alongside the existing target refresh. Both manual actions now request `GET /api/guilds/:guild/notifications/targets?fresh=1`.
- The HTTP handler parses the explicit fresh flag, the service reauthorizes the session/server, and the existing broker forwards `notification-targets?fresh=1`. The bot's existing fresh-read mechanism bypasses completed display cache entries. Concurrent reads remain deduplicated, and Retry-After still disables manual actions without an automatic retry loop.
- The dropdown's draft value, selected channel, message and enabled flag remain in the existing editor while refreshing. Loading/error disables saving; successful refresh updates capabilities and announces that selections were kept. A denied→allowed result removes the warning and permits saving without a page reload. Permission loss continues to block saving.
- The warning explicitly explains why Save Settings is disabled and provides channel-scoped Discord instructions. Its details are associated with the accessible select and announced as an alert. Everyone remains an explicit dropdown choice, never an automatic fallback.

Save-time authorization/current target checks and independent send-time permission verification remain intact. Allowed mentions, template/metadata safety, no everyone in previews/tests, normal role behavior, settings compatibility, monitoring and persistent deduplication are unchanged. No bot permission was auto-granted and no Administrator permission is requested. No database migration is needed.

## Enable the permission manually

1. In the intended Discord destination, open **Edit Channel → Permissions**.
2. Add/select **NAVI Live Notifier** as a bot member (or its dedicated bot role). Allow **Mention @everyone, @here, and All Roles**, then save the change in Discord. Apply this to NAVI in the intended channel, not the server's general `@everyone` role. Administrator is unnecessary. If permissions are category-synced, review which channels will inherit any change; prefer the specific destination when that is the intended scope.
3. Return to NAVI and click **Refresh permissions**. The selected everyone option remains. When Discord reports it allowed and the other settings are valid, **Save settings** becomes enabled. Save explicitly to opt in.
4. If still denied, check NAVI's member-specific and assigned-role channel overrides, View Channel/Send Messages and timeout status. A member-specific deny overrides role allowances. No reinstall or public-bot setting change is needed for a channel permission update.

The API inspection found a real missing grant; refreshing alone will not grant it. Granting this permission is the server administrator's action and was not performed during this task.

## Actual checks

| Check                              | Result / evidence class                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                    | PASS, exit 0: TypeScript, zero-warning lint, formatting and **316 tests / 28 files** (16 additions).                                                                                                                                                                                                    |
| `npm run build`                    | PASS, exit 0: production web, bot, worker and shared packages.                                                                                                                                                                                                                                          |
| Effective permission matrix        | PASS, simulated inputs: missing/base/assigned-role grant; everyone deny; combined role allow/deny; member allow/deny; Administrator; implicit View/Send denial; ignored unassigned role grant.                                                                                                          |
| Fresh API path                     | PASS, embedded PostgreSQL + mocked Discord: warmed denied display cache stays denied ordinarily; explicit fresh request reaches broker and sees new grant; saving/reloading everyone succeeds. Unauthorized/expired-session refresh returns 403/401 without reaching the broker. No test messages sent. |
| Hydrated YouTube and Kick UI       | PASS, simulated denied→granted refresh: selection survives pending request, Save disabled while pending/denied, warning removed and Save enabled after grant, exact config saved with everyone and null role. Existing loading/role/compatibility regressions pass.                                     |
| Failed/rate-limited refresh        | PASS, simulated 429: everyone draft retained, buttons blocked for Retry-After, no automatic request loop.                                                                                                                                                                                               |
| Real Discord reads                 | PASS: assigned bot roles/member and actual channel overwrite inspection confirmed missing grant. No mutations or messages.                                                                                                                                                                              |
| Real Chrome                        | PASS: selected everyone as an unsaved draft, clicked Refresh permissions, observed completed refresh with everyone retained and accurate denied warning. Original role choice restored without saving.                                                                                                  |
| Built-client secret scan           | PASS: 19 assets, 12 configured candidate fields, no exact secret matches. Bounded exact-value scan only.                                                                                                                                                                                                |
| Real permission grant/save/message | NOT EXECUTED: no Discord grants, real settings save or notification send performed. Grant→save behavior is automated/simulated evidence, not a real permission-change claim.                                                                                                                            |

[Browser evidence](evidence/mention-permission-refresh.png) shows an unsaved everyone draft, step-by-step instructions and disabled Save after fresh denial. No actual granted-state screenshot or real send is claimed. Existing release/live-stream acceptance limits remain unchanged.

## Changed files

- `apps/web/src/components/notification-manager.tsx`: explicit refresh action, fresh requests, retained draft/status, accessible instructions and disabled-save explanation.
- `apps/web/src/lib/notification-http.ts`, `apps/web/src/lib/notification-service.ts`: authorized fresh flag propagation to existing broker.
- `tests/mention-permissions.test.ts`, `tests/notification-ui.test.tsx`, `tests/notifications.test.ts`: permission matrix, refresh/cache/auth boundary and UI recovery tests.
- This report, `NOTIFICATION_MENTIONS.md`, `PROGRESS.md` and evidence image.
