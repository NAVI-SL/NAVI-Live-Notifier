# Discord Gateway presence — 2026-10-17

The existing bot constructed a discord.js client but never called `login`; its REST broker could work while Discord displayed the bot offline. The separately authorized presence update now logs in one persistent client in `apps/bot`, using the already installed discord.js 14.27.0. No dependency, credential or Developer Portal setting was changed.

## Runtime and security

- `application.ts` requests only `GatewayIntentBits.Guilds`. Presence is `online`, with `ActivityType.Watching` and name `livestreams`, rendered as **Watching livestreams**. Setting our own presence requires no privileged Presence or Message Content intent.
- `gateway.ts` logs in once, reapplies presence on readiness and lets discord.js manage heartbeat, reconnect, resume and re-identification. It does not implement a competing login loop. Invalidated sessions request process shutdown with failure status; initial connection has a 30-second deadline.
- `index.ts` retains the existing REST services and private broker. Notifications still use the same REST sender, destination checks and safe mentions. Gateway presence does not send messages or process member/message events.
- SIGINT/SIGTERM drain the Gateway and broker, then release ownership. A 10-second shutdown watchdog bounds cleanup. A supervisor may restart a failed process; no supervisor is added here.
- Lifecycle logs contain event names, never token values, raw SDK errors, Gateway packets or token-derived lock addresses. There are no new frontend credentials or environment variables.

Keep the existing `DISCORD_BOT_TOKEN` in the bot-only environment file. Existing `BOT_INTERNAL_SECRET` and `BOT_STATUS_PORT` continue configuring the broker. Keep private testing/Guild Install settings and existing installation permissions. No privileged intents or Public Bot change is needed.

## Local process ownership

Ownership is acquired before broker startup or Gateway login. Windows uses an exclusive named pipe derived from the token hash; other platforms bind a token-derived loopback port. The address is never logged. OS ownership disappears when the process exits, avoiding stale lock files. A five-second wait allows a previous watch child to finish shutdown; a competing process then fails safely without identifying to Discord. Ownership is released after client/broker cleanup.

Run `npm run dev` **or** `npm run dev:bot`, not both. The guard covers the same host/namespace even if broker ports or working directories differ. Separate hosts/containers require an operator-enforced single bot replica; this is not a distributed lock. On non-Windows hosts a port collision fails closed. Those platform paths were not manually exercised on this Windows machine.

## Run and verify

1. Retain the existing private `.env.bot` configuration; never paste tokens into commands or documentation.
2. Run `npm run dev:bot` from the root, or run the full `npm run dev` once. For production, build then use `npm run start --workspace=@navi/bot`.
3. Look for the safe `gateway_ready` lifecycle event and inspect the bot member in your Discord server: a green Online indicator and **Watching livestreams** activity should appear.
4. Keep that process running. Ctrl+C disconnects it. Do not kill an unrelated owner if a duplicate startup is refused.

Without a token, or with `--smoke`, the existing disconnected scaffold path remains available. Smoke tests prove startup/cleanup only and never log in.

## Actual verification

| Check                                        | Result                                                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway regression tests                     | Five tests cover Guilds/presence, single login, safe reconnect event handling, sanitized failure/invalidation, startup timeout, and real local ownership release/reacquisition. Fake client events do not prove a real outage recovery. |
| Complete automated suite                     | 219 tests / 20 files passed after the ownership correction. Final consolidated validation is recorded in PROGRESS.md.                                                                                                                   |
| Production build                             | Shared packages, Next.js, bot and worker passed, exit 0.                                                                                                                                                                                |
| Actual Discord presence                      | Visually verified in the Discord desktop server member list and bot member card: green Online indicator, Watching livestreams. After an interruption stopped that process, the built bot was started again and emitted `gateway_ready`. |
| Actual existing broker / Discord REST health | Authenticated loopback `/internal/health` returned HTTP 200 with healthy status. No notification was sent for this check.                                                                                                               |
| Actual overlapping bot startup               | Second startup was refused before login because the existing process owned the session. Existing bot remained online.                                                                                                                   |

An initial Windows TCP ownership test failed on a reserved port; Windows ownership was changed to an exclusive named pipe and the tests passed. Two lint findings for sanitized error replacement were resolved with narrow documented suppressions to keep token-derived addresses out of diagnostics.

No forced network disconnection, invalid real token experiment or multi-host contention test was performed. SDK recovery is supported by documentation and simulated lifecycle checks. Online presence is not proof of actual YouTube/Kick detection or automatic message delivery, and does not close earlier audit findings. No Phase 8 functionality was implemented.

Official references checked for this change: [Discord Gateway](https://docs.discord.com/developers/events/gateway), [Update Presence](https://docs.discord.com/developers/events/gateway-events#update-presence), and [discord.js Client](https://discord.js.org/docs/packages/discord.js/14.27.0/Client:Class).

The first post-interruption health probe failed because no process was listening on port 4001. After starting one configured bot instance, the probe again passed with HTTP 200 and healthy status. The disconnected bot smoke command also passed, exit 0; it did not open another Gateway connection.
