# Installing NAVI Live Notifier

**Public installation is currently unavailable.** There is no approved public NAVI invite or hosted dashboard address in this guide. The project remains NO-GO for public release. The steps below explain the implemented workflow for approved testing and the intended hosted experience after the operator completes the release gates.

Server owners using a future hosted service will not need API keys or a local database. Developers running their own instance need their own credentials and the [self-hosting guide](SELF_HOSTING.md).

## Before you start

You must own the Discord server or have Administrator or Manage Server permission, and your account/server must satisfy the operator's approved beta scope. The web application checks these permissions server-side; a server ID in a browser URL is not authorization. A private Discord application may restrict who can install it even when NAVI's dashboard permits management.

Do not enable Public Bot, weaken allowlists or request Administrator just to bypass a failed installation.

## Installation and setup workflow

1. **Obtain the official entry point from the operator.** No installation link is available today. After approval, use only the published NAVI entry point. Do not construct or reuse another bot's invite.
2. **Open the dashboard and choose Login with Discord / Add to Discord.** Both current entry actions lead to login; the existing implementation authenticates before producing a server-specific install URL.
3. **Authorize login.** NAVI requests `identify` and `guilds` to identify you and find servers you manage. Cancelled consent does not complete login. Check the application identity on Discord's consent page.
4. **Select your server.** Only authorized, in-scope servers should appear. A missing server can indicate account/guild restrictions or insufficient management permission.
5. **Select Install NAVI if the bot is absent.** The authenticated backend checks your server access and generates an explicit guild-bound Discord authorization URL. This does not depend on Discord's default installation link.
6. **Authorize the bot on Discord.** Check the selected server. Guild installation requests `bot` and `applications.commands`, with View Channel, Send Messages and Embed Links (permission integer 19456), not Administrator. The application-commands scope does not mean NAVI currently registers slash commands.
7. **Return to the dashboard and refresh status.** Expect Bot installed, Bot not installed or Status unavailable. Do not treat an unavailable status as proof the bot is absent or reinstall repeatedly. PostgreSQL command mode may first show Pending/Processing; wait for completion rather than assuming acceptance means success.
8. **Register a streamer in Streaming Channels.** Choose YouTube or Kick, review/accept the policy notice, enter the handle/username or supported channel URL, resolve it and confirm the displayed identity. Check the channel name and canonical URL before saving.
9. **Choose a destination in Notifications.** Configure each registration independently, including separate channels for YouTube and Kick. Only eligible ordinary text channels appear; the bot needs effective channel permissions.
10. **Customize the message and optional mention.** Choose No mention, an eligible role or explicitly selected @everyone. Start with No mention during testing. See [configuration](CONFIGURATION.md) for safe mention rules.
11. **Save settings.** Enable automatic notifications only as part of an approved monitoring test. Also keep the streamer subscription enabled. A saved preference is not proof the monitoring worker is running. In command mode, wait for Completed; do not retry an Uncertain result blindly.
12. **Verify carefully.** Preview uses sample data without sending. A labelled test sends a real Discord message using saved settings and may ping a selected role, but never @everyone. Obtain channel approval before testing, inspect Discord for the received message, and record the result. Separately approved real YouTube/Kick broadcasts are required to verify automatic detection, correct live title/URL and no duplicates; a sample test proves none of those by itself.

## When something goes wrong

| Symptom                                     | Next step                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account not approved                        | Ask the operator through the agreed private channel; do not remove access restrictions.                                                           |
| Login cancelled/expired                     | Start a fresh login from the configured canonical dashboard origin. Never share callback codes or cookies.                                        |
| Server missing / access denied              | Confirm the correct Discord account and management permission, then ask whether the server is in approved scope.                                  |
| Install NAVI fails                          | Check application identity/private-install eligibility and ask the operator to inspect the server-side install flow. Do not demand Administrator. |
| Status unavailable / Pending                | Wait for the backend and Retry-After delay; refresh once after recovery. Installation status does not certify monitoring.                         |
| No destination / mention permission missing | Follow [channel and mention troubleshooting](CONFIGURATION.md), then Refresh permissions.                                                         |
| Test or delivery Uncertain                  | Inspect the destination and ask the operator to reconcile retained records before trying another send.                                            |

## Missing prerequisites for public installation

- An approved public dashboard origin and verified official installation entry point; neither is published here.
- Explicit owner approval for public-install settings and controlled onboarding. The private application's settings must not be changed automatically.
- Reliable always-on bot/worker hosting, PostgreSQL persistence/roles/backups and appropriate capacity. Free/no-card continuous hosting is not validated.
- HTTPS, exact Discord callback and verified platform webhook endpoints/subscriptions.
- Fresh real Discord login/install, YouTube and Kick livestream-delivery evidence, duplicate/restart checks and sustained operation.
- Operational monitoring, external alert verification, encrypted offsite restore and measured quotas/resource headroom.
- Reviewed public privacy/terms/support/deletion information and the unresolved project-license decision.

The [cloud plan](PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md) contains the operational approval gates. No live installation or delivery was performed to prepare this guide.
