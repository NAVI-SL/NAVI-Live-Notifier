# NAVI Live Notifier — user guide

**Phase 13 troubleshooting — 2026-10-20:** a confirmed registration/enable/remove can succeed while list refresh fails. The dashboard now says the change was saved; use Refresh list rather than repeating registration. Rejected mutations still report errors. If session/guild access was revoked, sign in again or ask the server owner to verify management permission. Registration alone does not prove monitoring is running. See [current verification limits](PHASE_13_STABILIZATION_REPORT.md).

Review draft, 2026-10-18. NAVI is currently restricted to approved private-beta accounts and servers; beta activation and a public website have not been signed off. Website: **[WEBSITE_URL — TO BE CONFIRMED]**. Support: **[PUBLIC_SUPPORT_CONTACT — TO BE CONFIRMED]**. These placeholders are not working links.

## Connect a server

1. Open the exact website address supplied by the operator. In existing local development use `http://localhost:3000` when that is the configured origin; do not interchange `localhost` and `127.0.0.1` during login.
2. Choose **Login with Discord** and review Discord's consent. NAVI requests your identity and server list to determine what you can manage. Login does not install the bot. If your account has not been approved for the private beta, ask the operator for access.
3. Select a server in **Your servers**. You must own it or have Administrator or Manage Server permission. Having a server's ID or an invite is insufficient. NAVI checks permission again on protected requests.
4. If status is not installed, choose **Install NAVI**, review the selected server on Discord and approve only if it is the intended one. The bot needs View Channel, Send Messages and Embed Links, not Administrator. Private applications may restrict who can install them.
5. Return to NAVI and choose **Refresh status**. Unknown status means NAVI could not verify membership; it does not prove installation failed. Do not reinstall repeatedly during an outage.

The home page offers Login with Discord and Add to Discord. Both use the same login/server-selection flow before installation. Beta support and feedback links to private reporting guidance; no public support contact has been activated.

## Register a streaming channel

Open **Streaming Channels**, choose YouTube or Kick, review the linked privacy/terms notice and enter an identifier:

| Platform | Supported examples                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| YouTube  | `@channelhandle`, a valid `UC…` channel ID, `https://www.youtube.com/@channelhandle` or `/channel/UC…` URL |
| Kick     | `streamername` or `https://kick.com/streamername`                                                          |

YouTube video/watch URLs and older `/c/` or `/user/` URLs are not registration inputs. Resolve the account, check its displayed name/platform/stable identity and confirm registration. Resolve again if you edit the input or confirmation expires. Two names that resolve to the same stable account cannot be registered twice in one server. The same account can be subscribed to by different servers.

Use enable/disable/remove on the registered entry to manage that server's subscription. Removing it does not remove another server's subscription. Registration alone does not confirm active monitoring: an enabled notification destination and a healthy independent worker are also required. The planning limit is ten unique streamers across the whole beta, not ten per server; contact the operator if it is reached.

## Choose notification preferences

1. Open **Notifications** inside the intended server and find the streamer.
2. Choose a text destination where NAVI can view and send. YouTube and Kick entries may use different channels. Automatic embeds also require Embed Links.
3. Customize the message with `{streamer}`, `{platform}`, `{title}` and `{url}`. Other variables and raw Discord mentions are rejected. Example:

   ```text
   {streamer} is live on {platform}!
   {title}
   {url}
   ```

4. Choose **No mention**, **@everyone**, or one available role. No mention is the safe initial choice. Everyone can notify the entire server: choose it deliberately and only after obtaining the relevant channel's agreement. NAVI must have **Mention @everyone, @here, and All Roles** in that destination. Normal role selection does not also enable everyone.
5. If a permission warning appears, a manager can open Discord channel settings → Permissions → NAVI's bot/member role and allow the needed permission. Check category inheritance and member overrides. Do not grant Administrator as a workaround. Return and choose **Refresh permissions**; your draft selection stays selected. Save remains disabled until the reported validation problem is resolved.
6. Enable notifications and **Save settings**. Reopen the page to confirm the saved destination/template/mention. A conflicting revision means another edit happened; refresh and review before saving again.
7. **Preview message** shows sample data without sending anything; the Kick card uses illustrative sample artwork. Preview does not prove a channel is live or that delivery works.
8. **Send test notification** sends a real labelled sample to the saved destination. Use only operator-approved test channels. It never pings everyone; a selected normal role may be pinged. Wait for the result and inspect Discord before retrying an uncertain result. Test success verifies that sample path, not automatic live detection.

Settings are isolated per server. Switching servers does not copy preferences. Log out through the dashboard when finished; logout ends the current session, while saved server monitoring may continue independently.

## What to expect from automatic alerts

NAVI verifies current public LIVE status through official APIs. Upcoming/scheduled time alone is insufficient. YouTube messages use a red embed and linked title/thumbnail; Kick uses a green embed, current title/category/images where available and channel watch links. Missing artwork is optional. The saved message and explicit mention preference are used for both platforms.

For a controlled test, save configuration before broadcasting and allow an offline baseline first. Registering/enabling during an already-live stream does not backfill an alert. Ended streams, old starts and disabled intervals are not replayed. Same-session repeats/title changes should not send another normal alert; a new Kick start timestamp is a new session. No separate OFFLINE message, VOD discovery or offline-message edit is currently supported.

**Phase 12 correction:** known retained YouTube candidates are checked in up to two batches, fixing starvation behind 50 recent uploads in simulated regressions. Real discovery coverage, Premiere exclusion and delivery latency are not certified. Short streams and upstream indexing delays can be missed; local machine/worker/network downtime stops monitoring. Report misses with the public stream URL and start/end times, not secrets. External activation remains blocked; see the [current beta guide](BETA_USER_GUIDE.md).

## Troubleshooting

| Symptom                                         | What it means / action                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unable to complete authentication               | Use the operator's exact canonical website hostname, check connectivity and try a fresh login. If it persists, give support the time and visible error; never send callback URLs/codes/cookies.                    |
| Access denied / server missing                  | Confirm approved beta account and current Manage Server/owner/Admin permission. Changing the browser server ID cannot grant access.                                                                                |
| Install NAVI unavailable                        | It appears for verified not-installed state. Unknown status needs a refresh when bot/Discord recovers. Private bot installation may require the application owner; contact the operator.                           |
| Workspace interrupted                           | May be database/schema or service failure as well as Discord. Try the provided retry once; report timestamp/page. Operators should check the actual error rather than assume rate limiting.                        |
| Discord/platform rate limited                   | Respect the displayed Retry-After. Do not repeatedly click refresh, switch pages to force requests or reinstall. Ask the operator if warnings persist beyond the wait.                                             |
| No channel / missing Embed Links                | Check bot installation and View Channel/Send Messages/Embed Links in that exact destination. Refresh permissions after changing Discord.                                                                           |
| Everyone selection cannot save                  | NAVI lacks effective Mention Everyone permission or the destination is invalid. Follow the channel steps above or choose No mention; the check cannot be bypassed.                                                 |
| Role disappeared                                | Role may be deleted, managed or not mentionable. Choose a current eligible role or No mention and review before saving.                                                                                            |
| Lookup fails                                    | Check supported input, platform selection and public account existence. Credentials/quota outages need operator attention; never supply your platform password.                                                    |
| Save succeeded but streamer list refresh failed | Existing registry recovery can show stale information after a successful mutation. Refresh the list before retrying an add/delete; do not assume the first write failed.                                           |
| Sample arrives but automatic alert does not     | Verify registration+notifications enabled, saved before start, healthy worker, offline baseline and current public LIVE status. Test and automatic paths differ. Ask operator to trace safe source/delivery codes. |
| Uncertain delivery                              | Discord may have accepted the message despite a lost response. Inspect the actual destination first; do not repeatedly test, clear ledger or request blind retries.                                                |

## Remove data or stop alerts

Disable saved notifications to stop future eligible sends, or remove the streamer subscription for this server. Already initiated messages cannot be recalled. Removing NAVI in Discord stops its access, but does not itself prove all stored account/server data has been erased. Logout does not delete the account. For account or whole-server deletion, use **[DATA_DELETION_CONTACT — TO BE CONFIRMED]** when published; during private testing use the operator's already agreed private channel. Never send passwords/tokens. Details: [deletion process](DATA_DELETION_PROCESS.md). NAVI deletion does not delete your YouTube/Kick channel or broadcasts.
