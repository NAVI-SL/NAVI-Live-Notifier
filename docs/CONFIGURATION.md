# Notification configuration

Use the selected server's dashboard after authenticated management authorization. These controls are implemented; public hosting and fresh end-to-end delivery still require [release validation](INSTALLATION.md). Each server has separate subscriptions/settings even when it shares a monitored streamer identity with another server.

## Register YouTube and Kick accounts

Open **Streaming Channels**, select the platform, review and accept the privacy/terms notice, enter the identifier and choose Resolve channel. Inspect the resolved name and channel URL, then Confirm and register. The backend saves a stable platform ID separately from your original input. Duplicate registration of the same account in the same server is rejected.

| Platform | Supported input                                                                                                                                                                             | Not a registration input                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| YouTube  | Handle (with or without @), HTTPS youtube.com/@handle URL, HTTPS youtube.com/channel/CHANNEL_ID URL, or a valid UC-prefixed channel ID. URLs also accept www.youtube.com and m.youtube.com. | Video/watch links, youtu.be links and legacy /c/ or /user/ paths. |
| Kick     | Username/slug or HTTPS kick.com/username URL, including www.kick.com. Usernames are normalized to lowercase; 1–25 letters, digits, underscore or hyphen.                                    | @-prefixed usernames, multi-segment URLs or unsupported hosts.    |

Use the creator's actual public channel address; remove whitespace and do not use plain HTTP URLs. Lookup depends on operator-side provider credentials and rate limits. An invalid or unavailable account must not be replaced by a guessed ID.

Enable, disable or remove a subscription from its list. Removing it removes that server's linked settings; it does not remove another server's subscription. Registrations without refreshed metadata expire after 29 days. Registration alone neither activates notifications nor verifies the worker's health.

## Select a destination

In **Notifications**, choose a destination text channel for each registered streamer. YouTube and Kick can have different destinations; there is no requirement for one global server channel. The dropdown lists ordinary text channels where the bot can view/send. Automatic rich embeds and test sends additionally require Embed Links. Threads, forums and arbitrary channel IDs are not supported destinations in this interface.

The backend rechecks the current guild, channel and permissions before saving/sending. Channel/category overrides and Administrator are included in effective permission calculation. A deleted channel, removed installation or revoked permission can invalidate previously saved settings.

Choose **Refresh channels and roles** or **Refresh permissions** after fixing Discord permissions. Existing draft selections are preserved. If Embed Links is missing, grant it in Discord or choose an eligible channel; do not request Administrator as a shortcut.

## Message templates and preview

The saved template is trimmed, nonempty and at most 1,500 characters. Supported variables are case-sensitive:

| Variable     | Automatic alert value                                  |
| ------------ | ------------------------------------------------------ |
| `{streamer}` | Resolved streamer name, with mentions neutralized.     |
| `{platform}` | YouTube or Kick.                                       |
| `{title}`    | Confirmed livestream title, with mentions neutralized. |
| `{url}`      | Clickable actual livestream URL.                       |

Example template:

```text
{streamer} is live on {platform}!
{title}
{url}
```

Other brace variables, unmatched braces, raw @everyone/@here, Discord mention markup beginning with <@ and disallowed control characters are rejected. Select mentions through the dropdown instead. Rendered message content is capped at Discord's 2,000-character limit.

**Preview message** renders sample data without sending a Discord message. Kick also has a sample embed preview. Preview title/URL/category are not evidence of a real stream, and missing optional imagery has safe fallbacks. The preview can show a role label but cannot ping anyone while displayed in the dashboard.

Automatic YouTube output uses a red embed with channel identity, title, watch URL and available thumbnail. Kick uses a green embed with available profile image, title, category/cover, thumbnail and supported watch-link buttons. Missing Kick artwork/category uses a reduced valid layout. Current delivery does not edit an old message into an OFFLINE/VOD announcement or send a new OFFLINE alert.

## Optional role mention

Only one selection is active:

| Selection    | Automatic notification                                                                                                  | Preview / labelled test                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| No mention   | No role/user/everyone ping.                                                                                             | Preview sends nothing; test contains no selected mention.                 |
| @everyone    | Explicitly selected server-wide mention, only with the bot's effective Mention Everyone permission in that destination. | Preview sends nothing; a test never pings @everyone.                      |
| Discord role | Only the selected current, mentionable, unmanaged role.                                                                 | Preview sends nothing; an approved real test may ping that selected role. |

NAVI sets Discord allowed_mentions explicitly and does not permit arbitrary user mentions or template-driven mass mentions. Old everyone-checkbox preferences normalize to this single selection; an explicit everyone preference supersedes a stored role. No default mass mention is enabled.

If @everyone is selected without permission, Save Settings is disabled. In Discord, open the destination channel's permissions (and its category overrides), select the NAVI bot member or applicable role, and allow **Mention @everyone, @here, and All Roles** only if you intend to permit it. Resolve conflicting overrides with your server administrator. Return to NAVI and choose **Refresh permissions**; the selection stays selected and the warning updates. NAVI never grants this permission itself.

## Save, enable and disable

Save the destination, template, mention and automatic-notification preference together. For live alerts, the subscription must also be enabled and an approved independent monitoring worker must be running. Switching off the saved notification preference does not require the bot to be available; it is an authorized database operation. It does not unsend a message already in flight.

In experimental PostgreSQL mode, an accepted command is Pending/Processing until an acknowledgment reports Completed, Failed, Expired or Uncertain. Completed saves remain successful even if a subsequent page refresh fails. Do not create a second send simply because acknowledgment polling timed out. HTTP mode remains the default; this guide does not enable command processing.

## Test delivery safely

1. Select No mention for a quiet test, save changes and wait for completion.
2. Obtain approval for the saved destination. **Send test notification** sends a real labelled sample using saved settings, even if automatic notifications are disabled.
3. Inspect Discord for the message. The test has sample title/channel data, not a detected livestream. A successful Discord API acknowledgment is separate from personally observing the message.
4. Respect the one-test-per-server/30-second cooldown and any longer Discord Retry-After response.
5. If the result is uncertain, check Discord and ask the operator to inspect retained receipts before retrying. Never reset the delivery ledger to force another alert.

## Duplicate prevention and troubleshooting

Automatic deliveries use persistent session/destination uniqueness, leases and retained sent/uncertain evidence. The same confirmed session is not meant to produce a new normal alert on each polling cycle. Discord cannot guarantee exactly-once delivery; ambiguous external outcomes are quarantined rather than blindly retried. Labelled tests are separate intentional requests, not normal stream-alert deduplication tests.

| Problem                 | Action                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save disabled           | Check destination, unavailable role, @everyone permission and whether an operation is still running. Save a valid selection.                                                                                         |
| Role missing            | It must still exist, be mentionable and not managed; refresh permissions or choose No mention.                                                                                                                       |
| Bot/channel unavailable | Restore the approved installation/permissions; refresh after the backend recovers.                                                                                                                                   |
| Repeated 429 warning    | Wait for Retry-After; avoid repeated refresh/test clicks and report sanitized timestamps/status.                                                                                                                     |
| Saved but no live alert | Check both enable switches, provider credentials, actual LIVE state, fresh identity metadata, worker/bot readiness, quotas and retained delivery state. Upcoming/offline events do not constitute LIVE confirmation. |

**Settings** is currently informational; do not expect general server preferences, schedules or notification lifecycle controls there. Operator recovery and account/data deletion are documented separately in [operations](OPERATIONS_RUNBOOK.md) and [data deletion](DATA_DELETION_PROCESS.md).
