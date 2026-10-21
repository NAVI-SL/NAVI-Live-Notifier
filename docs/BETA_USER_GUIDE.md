# NAVI Live Notifier — approved external beta guide

Prepared 2026-10-20. **Invitations are not active.** This is the guide for a future approved cohort of at most five servers. Website/support contact: **[OWNER-APPROVED URL AND PRIVATE SUPPORT CHANNEL — PENDING]**. Never substitute a personal address or assume a placeholder is a working service.

## Before onboarding

The operator must approve both your Discord account and the exact server. You must also own that server or currently have Manage Server/Administrator. NAVI checks Discord permissions on the backend; being on a beta list or knowing a server ID is insufficient. Do not invite additional servers, share sessions or send test messages to channels outside the approved register.

Private Bot is still off for public installation; an external owner cannot assume installation will work until the operator explicitly approves and completes the Portal change. Do not ask for Administrator bot permissions or try alternative URLs to bypass admission. Available source slots are global, not per server, and depend on measured operator capacity.

## Connect and configure

1. Open the exact operator-approved website hostname. Choose **Add to Discord** or **Login with Discord**; both use the same secure login. Review identity/server-list consent. Login does not install the bot.
2. Choose your approved manageable server. Missing server can mean beta admission or Discord permission is absent. Ask the operator; changing the browser ID will not grant access.
3. Choose **Install NAVI** when not installed. Review Discord's selected server and permissions: View Channel, Send Messages, Embed Links. Approve only the intended server. Return and **Refresh status**. Unknown is an outage/verification state, not proof of success or failure.
4. In **Streaming Channels**, choose YouTube or Kick and review the privacy/terms notice. Enter a YouTube @handle/channel URL or Kick username/channel URL. Resolve, check the stable public identity and confirm. YouTube watch/video URLs and legacy /c/ or /user/ forms are not channel inputs. Do not register accounts outside the approved test-source list.
5. In **Notifications**, select that streamer's ordinary text destination, template and enable state. YouTube/Kick may use separate channels. Supported variables: `{streamer}`, `{platform}`, `{title}`, `{url}`. Raw Discord mentions/unknown variables are rejected.
6. Initially choose **No mention**. Optional normal role or everyone needs explicit server/channel consent and saved selection. Everyone requires NAVI's effective Mention Everyone permission in that channel. If permission changes in Discord, choose **Refresh permissions** and review warnings before saving; your draft choice is preserved.
7. **Save settings**, reload and verify the saved destination/template/enabled/mention state. Preview shows sample data and sends nothing. Kick preview artwork is illustrative.
8. Use **Send test notification** only after the operator approves that exact destination and sample. It sends a real labelled message, may ping an explicitly selected normal role, and never pings everyone. Check Discord before retrying an uncertain result.

## Verify a livestream with the operator

Save settings before starting. Wait for a successful offline baseline, then start a **new public broadcast** on the approved source and keep it live through several polling cycles. Scheduled/upcoming/preview mode is not LIVE. Record the public stream URL, actual start/timezone and actual received message time; do not share callback URLs or credentials.

Expected: saved text, correct streamer/title/platform/watch URL, red YouTube or green Kick embed with available artwork, selected mention only, one normal message per stream/destination. Leave the stream live through repeat polls; perform a worker restart only when coordinated by the operator and check no second message. Separate platforms are separate events. No offline message/edit or guessed VOD link is implemented.

Registration/enabling while already live creates a baseline, not a backfilled alert. Ended streams and starts older than the freshness window are not replayed. Short broadcasts, API indexing delay, candidate bounds and local downtime may cause misses; YouTube Premiere/complete discovery and real latency remain unverified. The former retained-candidate starvation defect is corrected in simulations, not certified by a real broadcast yet. Report misses honestly rather than repeatedly re-registering or clearing records.

## Errors and private feedback

Use **Beta support and feedback** (`/support`) for safe reporting instructions and the operator's agreed private intake channel once supplied. There is no public email/form backend or automated ticket submission. Copy [feedback template](BETA_FEEDBACK_TEMPLATE.md), omit personal/server data unless needed and approved, and keep reports private.

| Symptom                                                              | Action                                                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access denied / server absent                                        | Ask operator to verify both allowlists and fresh Manage Server permission. No workaround URL.                                                                          |
| OAuth connection error                                               | Use canonical hostname, retry once, report time/error. Never paste code/state/callback/cookie.                                                                         |
| Unknown bot status / no channel                                      | Wait for service recovery; refresh status/permissions. Check channel View/Send/Embed and bot membership.                                                               |
| Everyone cannot save                                                 | Grant only the intended bot/channel Mention Everyone permission through an authorized manager, or select No mention; refresh permissions. No Administrator workaround. |
| Rate limited                                                         | Respect Retry-After; do not refresh/retry in a loop or create extra API projects.                                                                                      |
| Missing/incorrect account                                            | Confirm supported input and platform. Operator handles credentials/quota errors privately.                                                                             |
| Save/update then failed list refresh                                 | The streamer registry can show stale state after a committed mutation; refresh before repeating an add/remove.                                                         |
| Uncertain notification                                               | Discord may already have accepted it. Inspect the actual channel, stop retries and report privately; never request blind ledger reset.                                 |
| Unexpected ping, wrong destination, duplicate or unauthorized access | Stop testing immediately and report to the operator privately. Do not repost secrets or demonstrate the issue against another server.                                  |

## Stop alerts and request deletion

Disable saved notifications or remove your server subscription. Other servers' subscriptions remain separate. Logout ends the current session; removing the bot/closing the browser does not erase all saved data. Request account or whole-server deletion through **[APPROVED DATA-DELETION CONTACT — PENDING]**, or the existing private operator channel during supervised testing. NAVI deletion does not delete YouTube/Kick content or automatically erase historic Discord messages. The [deletion process](DATA_DELETION_PROCESS.md) and policy drafts still need publication/operational approval. No personal credentials are needed to report a bug or request deletion.
