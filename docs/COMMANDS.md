# Commands reference

## Discord user commands

**NAVI Live Notifier currently registers no Discord slash commands, prefix commands or streaming-chat commands.** Configure it through the authenticated web dashboard. The bot's Gateway uses only the Guilds intent, and there is no interactionCreate/messageCreate command dispatcher or application-command registration in the current bot source.

The installation scope `applications.commands` is present in the install URL, but it does not establish that a slash command exists. Do not confuse this application with NAVI GAMING's streaming-chat commands.

There is therefore no implemented Discord command name, chat usage example or bot command response to document.

## Dashboard actions instead of chat commands

All actions require an approved authenticated account and server-management authorization. These are interface actions, **not commands to type into Discord**.

| Action                                 | Purpose and permission                                                                                    | Usage example                                                                               | Expected result                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Install NAVI / Refresh status          | Install or inspect the selected authorized guild; Discord also applies private-app install restrictions.  | Select your managed server and use the displayed action.                                    | Discord authorization page, or installed/not installed/unavailable status.                                     |
| Resolve channel / Confirm and register | Save the verified public streamer identity for this guild.                                                | Select YouTube/Kick in Streaming Channels, resolve input and confirm the displayed account. | Saved subscription or a validation/API/duplicate error.                                                        |
| Save Settings                          | Persist a valid guild destination, template, mention and enable preference.                               | Edit one registration's Notifications form and save.                                        | Saved settings, or accepted command followed by its terminal acknowledgment in opt-in mode.                    |
| Preview message                        | Inspect sample formatting with no Discord send.                                                           | Choose Preview message in Notifications.                                                    | Sample text; Kick also has a sample embed.                                                                     |
| Send test notification                 | Explicit real labelled sample to the configured channel; bot destination permissions are required.        | Save first, obtain channel approval, then select Send test notification.                    | Discord acknowledgment, failure or uncertain result. Selected roles may ping; @everyone never pings in a test. |
| Enable / Disable / Remove              | Manage the selected guild's streamer subscription; notification disabling is a separate saved preference. | Use the controls in Streaming Channels or Notifications.                                    | Updated guild-scoped preference/list, without changing another server.                                         |

## Internal durable commands

Developers will find `guild_status.refresh`, `notification_targets.refresh`, `notification_settings.apply` and `notification_test.send`. They are strict backend queue types, not public bot commands. They require authenticated admission, guild/session scope, execution-time authorization and an explicitly enabled consumer. Do not submit raw database commands as an installation workaround.

See [Phase 15C](PHASE_15C_IMPLEMENTATION.md) and [Phase 15D](PHASE_15D_IMPLEMENTATION.md) for their protocol. See [configuration](CONFIGURATION.md) for end-user controls and [self-hosting](SELF_HOSTING.md) for npm scripts.
