# Developer self-hosting

This guide is for an authorized developer running **their own** Discord application and provider credentials. It is different from [using a future hosted NAVI bot](INSTALLATION.md). Repository access is currently private. Public installation and the complete free/no-card continuous deployment remain **NO-GO**.

Commands below are setup instructions for a separately approved environment. They were not executed to start real services or migrate an existing database during documentation preparation. Use fresh local data for first setup; back up/review any existing target before migrations. Do not delete volumes or reset delivery records to repair a failed setup.

## 1. Requirements and source checkout

- Node.js **24** is the recommended documented runtime. Root package.json permits `^22.13.0 || >=24.0.0`; use the committed lock and npm **11.15.0** for reproducibility (engine minimum npm 10).
- Git and authorized read access to the private repository. Use your normal credential manager; never put access tokens in clone URLs.
- Docker Desktop with Linux containers on Windows, or Docker Engine/Compose v2 on Linux; the local file supplies PostgreSQL **17** and Redis **7**.
- Your own Discord developer application and approved test account/server/channel; your own Google Cloud YouTube API key and Kick application credentials for the providers you use.

```sh
git clone --branch feature/phase-15-cloud-architecture https://github.com/NAVI-SL/NAVI-Live-Notifier.git
cd NAVI-Live-Notifier
npm ci
npm run env:check:example
npm run check
npm run build
```

These npm scripts exist in [root package.json](../package.json). The build does not migrate a database or start monitoring. No application secrets are needed for the fixture suite or example-only check. Integration scripts described later need isolated local targets.

## 2. Create private configuration files

Copy examples **only when the destination does not already exist**. PowerShell, from the repository root:

```powershell
foreach ($service in @('', '.web', '.bot', '.worker')) {
    $destination = ".env$service"
    if (-not (Test-Path -LiteralPath $destination)) {
        Copy-Item -LiteralPath "$destination.example" -Destination $destination
    }
}
```

On other shells, use your editor/file manager to make those same copies without overwriting an existing file. Do not commit filled files. Generate strong secrets with a password manager and keep bot/provider secrets only in the relevant service files.

Configuration precedence is process environment > optional `NAVI_ENV_FILE` > `.env.<service>` > root `.env`. The database tooling uses `.env.database` if present, not `.env.web`. The service selector does not inject other services' secrets into process.env. Do not export all service secrets into a shared web process, and do not use NEXT_PUBLIC credential variables.

Replace every REPLACE_ placeholder privately. Set raw `POSTGRES_PASSWORD` for Compose and the **URL-encoded form** of the same password in every applicable `DATABASE_URL`. Keep the database target consistent across root/web/worker; changing a password in a file does not rotate an existing volume's database password.

| Process             | Configuration to review                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local Compose       | `POSTGRES_PASSWORD`, `POSTGRES_PORT` (55432), `REDIS_PORT` (56379). Never use these example defaults against another project's data.                                                                                                                               |
| Root/database tools | `DATABASE_URL`; local target database/user are navi. Prefer separate approved owner credentials for migrations rather than application credentials in a real deployment.                                                                                           |
| Web                 | `WEB_ORIGIN` = `http://localhost:3000`, `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_USER_IDS`, private HTTP broker URL/secret, optional provider registration credentials.       |
| Bot                 | `DISCORD_BOT_TOKEN`, `BOT_INTERNAL_SECRET` (at least 32 characters), `BOT_STATUS_PORT` (4001). Start one Gateway owner per token, including across hosts.                                                                                                          |
| Worker              | `DATABASE_URL`, `REDIS_URL`, `BOT_INTERNAL_URL`, matching `BOT_INTERNAL_SECRET`, provider credentials, `MONITORING_ENABLED=false`, webhook settings when separately approved, `MONITOR_PORT` (4100), `YOUTUBE_DAILY_BUDGET` (7200 default, range 1–8000).          |
| Approved beta scope | `DISCORD_ALLOWED_USER_IDS` is a comma-separated nonempty list of approved Discord user IDs. `BETA_GUILD_IDS` accepts at most five distinct guild IDs and must match the relevant services; empty is legacy owner-only development, not a public-access invitation. |
| Streamer cap        | `STREAMER_SOURCE_LIMIT` defaults to 10 unique shared sources; actual API/hosting capacity must be measured. Do not increase it to hide quota errors.                                                                                                               |
| Common/optional     | `NODE_ENV`, `LOG_LEVEL` and optional private `NAVI_ENV_FILE`. Production auth requires an approved HTTPS origin.                                                                                                                                                   |

The local HTTP broker URL must be `http://127.0.0.1:4001` (or the reviewed matching bot port). Public URLs/alternate hosts are rejected. Match the private secret in web, bot and worker for HTTP mode; do not expose the broker to solve split-host connectivity.

### Keep the optional command architecture inactive

| Flag                            | Source default / instruction                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BOT_COMMAND_TRANSPORT`         | `http`; keep it for this local baseline.                                                                                   |
| `BOT_COMMANDS_ENABLED`          | `false`; keep the bot consumer disabled.                                                                                   |
| `BOT_COMMAND_ADMISSION_ENABLED` | `true` by library default, inert in HTTP mode; cloud staging templates pause it. Do not infer consumer activation from it. |
| `MONITORING_ENABLED`            | `false`; keep monitoring off until an isolated test and its external effects are explicitly approved.                      |

No step here enables PostgreSQL command mode. Separately approved activation requires migration 0007, distinct least-privilege roles/direct PostgreSQL sessions, matching user/guild policy, private readiness and a reviewed pause/drain/rollback sequence. Follow the [cloud plan](PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md) and [Phase 15D](PHASE_15D_IMPLEMENTATION.md), not an improvised flag flip.

## 3. PostgreSQL and Redis

Inspect the intended Compose project first:

```sh
docker compose config --quiet
docker compose ps
npm run services:up
```

The file is [compose.yaml](../compose.yaml), project `navi-github-local`. It binds PostgreSQL to **127.0.0.1:55432** and Redis to **127.0.0.1:56379**, with separate named persistent volumes. Only datastore services are in this local file; it does not start the bot/worker. If these ports or volumes already belong to data you need, review a separate target before proceeding. `POSTGRES_PORT`/`REDIS_PORT` overrides must match private URL settings. Never publish the database/Redis ports externally.

PostgreSQL stores auth, subscriptions, preferences, delivery evidence and durable commands. Redis is currently a required **URI setting** for worker validation/local tooling, not an implemented runtime queue/client. For an approved Upstash experiment, configuration uses native `rediss://` TCP/TLS, not a REST URL/token. Actual Upstash TLS/quotas/reconnect behavior remains unverified; local Redis probes do not certify it.

For a **new, separately reviewed local database only**, apply the committed migrations:

```sh
npm run db:migrate
npm run db:check
```

The root migration command builds shared packages and calls Drizzle Kit using `packages/database/drizzle.config.ts`. Current migrations run through **0007**; schema presence does not enable command processing. Do not edit already applied SQL or regenerate snapshots for ordinary setup. `db:check` performs **SELECT 1 connectivity only**; it does not certify auth-schema access, migration completeness, role grants or a working login.

Keep migration owner credentials out of web runtime/build settings. Production role grants, TLS, persistent storage and encrypted backup/restore require separate review. The [deployment guide](DEPLOYMENT_GUIDE.md) and [current cloud plan](PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md) cover these gates; older reports may refer to original development ports or migrations through 0006.

`npm run services:down` stops this Compose project without deleting volumes. Do not append --volumes as troubleshooting or restore recovery.

## 4. Discord Developer Portal

Use your own approved application in the [Discord Developer Portal](https://discord.com/developers/applications). For an existing instance, do not create a replacement application or rotate credentials just to read this guide.

1. Copy the application ID privately to `DISCORD_CLIENT_ID` and OAuth client secret to `DISCORD_CLIENT_SECRET` in the web configuration. The bot token goes only in the bot configuration. Do not paste them into issues, logs or browser code.
2. Register the exact local login redirect **http://localhost:3000/api/auth/callback/discord** under OAuth2. It is derived from `WEB_ORIGIN` + `/api/auth/callback/discord`; no separate DISCORD_REDIRECT_URI variable exists. Use localhost consistently rather than mixing it with 127.0.0.1 in the browser origin. Production needs an explicitly approved HTTPS origin and matching exact callback.
3. Login scopes in code are `identify` and `guilds`. NAVI uses Better Auth sessions/state and an approved user allowlist; it does not request the email scope or disable state validation.
4. Enable/review **Guild Install** for the intended private testing configuration. The explicit install flow uses `bot` and `applications.commands`, `integration_type=0` and permission integer **19456**: View Channel, Send Messages and Embed Links. It does not depend on a Portal default install link and does not implement public slash commands.
5. Keep only the non-privileged **Guilds** Gateway intent. No Message Content, Server Members or Presence privileged intent is needed by current code.
6. Retain private-application restrictions and approved test accounts/guilds. Do not enable Public Bot automatically. Optional @everyone needs a separate effective Mention Everyone permission in the chosen channel; it is never part of the minimal default installation permission set.

The actual dashboard authorizes a selected managed guild before generating an install URL. Follow [installation](INSTALLATION.md) on your local instance; do not publish that URL as an official NAVI public invite. See [Discord OAuth documentation](https://docs.discord.com/developers/topics/oauth2) for the platform flow. Reading this guide does not verify your Portal settings or authorize a live login/install.

## 5. YouTube and Kick credentials

### YouTube

In your own Google Cloud project, enable **YouTube Data API v3**, create a server-side API key and restrict it appropriately for that API/server environment. Set `YOUTUBE_API_KEY` separately in `.env.web` for registration and `.env.worker` for detection. Review the actual quota, not a presumed entitlement. See [Google's setup guide](https://developers.google.com/youtube/data/getting-started).

YouTube registration uses public channel lookup. Automatic detection additionally uses official API requests and supported feed notifications/reconciliation; feed events and upcoming broadcasts are not proof of LIVE. Do not use your broadcasting stream key as YOUTUBE_API_KEY or put any key in the browser.

### Kick

Create/review your own eligible Kick developer application and place `KICK_CLIENT_ID` and `KICK_CLIENT_SECRET` in the web and worker files that need them. Current code obtains app access tokens server-side through `client_credentials` for supported API operations; it does not provide a Kick end-user login callback or accept pasted user access tokens as a workaround. If a required operation needs authorization your application cannot obtain, stop and follow the platform's supported flow rather than scraping/bypassing it. See [official Kick token guidance](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow).

Before approved webhook monitoring, configure the Kick application's webhook destination to the actual approved `MONITOR_PUBLIC_ORIGIN` plus `/webhooks/kick` and review event access. The worker manages its supported livestream-status subscriptions only when explicitly running; do not start it just to inspect subscriptions.

### Webhook endpoints and approval boundary

Set `MONITOR_PUBLIC_ORIGIN` only to an approved reachable HTTPS origin and configure `MONITOR_WEBHOOK_SECRET` (at least 32 characters) for NAVI's capability paths. Kick uses the platform's raw-body signature validation; YouTube uses generated per-channel `/webhooks/youtube/<channel-id>/<HMAC>` paths/challenge checks plus actual LIVE confirmation. Do not invent paths, log capability URLs or publish internal health/broker routes.

Review the existing webhook-only proxy and [Kick signature guidance](https://github.com/KickEngineering/KickDevDocs/blob/main/events/webhook-security.md). Domain/certificate setup, external webhook reconciliation and actual platform acceptance require separate approval and testing. No public hostname is supplied here.

## 6. Validate and start separately

Configuration-only checks do not contact providers:

```sh
npm run env:check
npm run env:check:auth
npm run monitor:check
```

Run each application in its own terminal **only after its effects are approved**:

| Process | Local development    | Built runtime from repository root       | Effect                                                                                                                |
| ------- | -------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Website | `npm run dev:web`    | `npm run start --workspace=@navi/web`    | Binds loopback port 3000; login/lookup actions use configured external services.                                      |
| Bot     | `npm run dev:bot`    | `npm run start --workspace=@navi/bot`    | Configured token logs into Discord Gateway and starts the private broker; no token means scaffold, not a working bot. |
| Worker  | `npm run dev:worker` | `npm run start --workspace=@navi/worker` | With monitoring false, scaffold only; enabling it can create webhook subscriptions and send to saved destinations.    |

The built runtime commands require `npm run build` first. The web start command is Next.js production mode: review `NODE_ENV=production`, an approved HTTPS `WEB_ORIGIN` and its exact OAuth callback before using it; use `dev:web` for local HTTP setup. Open **http://localhost:3000** for local development. Do not run `npm run dev` casually: it starts web, bot and worker together. In production, the reviewed `deployment/start.mjs` wrapper has stricter startup validation; use [deployment instructions](DEPLOYMENT_GUIDE.md), not development watchers as an always-on hosting design.

Keep the worker stopped during documentation/testing preparation. Before any separately approved monitoring run, inspect enabled subscriptions/destinations and old pending/failed/uncertain records, disable mentions for controlled tests, prevent historical sends and ensure webhook reconciliation is scoped. Do not use a fabricated --dry-run worker flag; it is rejected. `npm run monitor:dry-run` is the separate planning command, not a delivery authorization.

## 7. Health checks and tests

| Command / route                           | What it verifies                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run env:check:example`               | Safe example structure only, no service/API connection.                                                                                                            |
| `npm run db:check`                        | Actual selected PostgreSQL connection only.                                                                                                                        |
| `GET /api/health`                         | Website liveness, not OAuth/DB/queue/monitoring readiness.                                                                                                         |
| `npm run beta:health`                     | Finite, read-only aggregate web/DB/bot/worker probes using private local configuration; disabled monitoring is degraded, not green.                                |
| `node deployment/healthcheck.mjs web`     | Private local dependency probe including auth-schema access and opt-in queue-role readiness.                                                                       |
| `node deployment/healthcheck.mjs bot`     | Private REST/Gateway health; opt-in command DB profile when enabled.                                                                                               |
| `node deployment/healthcheck.mjs worker`  | Private worker health/tick state when its server is actually running.                                                                                              |
| `npm run monitor:check -- --connectivity` | Explicit read-only external API connectivity requests using configured credentials; consumes requests, does not prove livestream delivery. Run only when approved. |

Never expose /internal/health publicly or paste its bearer secret into a report. Read-only health checks do not start a missing process. A healthy Gateway or website does not prove the command consumer progresses or that notification delivery has been observed.

Run `npm run check` and `npm run build` for local code validation. `npm run test:commands:integration` creates/removes a guarded disposable PostgreSQL database/NOLOGIN roles, requiring a local fixture owner with CREATEDB/CREATEROLE; it uses synthetic Discord/session adapters. `npm run test:commands:postgres` and `npm run test:postgres` also mutate scratch schema and must use a separately approved isolated test target. `npm run test:redis:compatibility` exercises temporary native Redis keys; prefer a disposable Redis instance. None is evidence of a real YouTube/Kick broadcast or observed Discord alert.

## 8. Troubleshooting and operations

| Problem                                  | Check                                                                                                                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL connection failure            | Docker/service health, correct 55432 port/target, raw Compose password versus URL encoding, per-service overrides and existing-volume password history. Do not delete data.                     |
| OAuth configuration/database error       | Canonical WEB_ORIGIN, exact Portal callback, allowlisted user, auth migrations and runtime-role permissions. env:check:auth validates fields, not a real OAuth transaction.                     |
| Bot appears offline / duplicate owner    | Start only an approved configured bot, inspect sanitized startup/Gateway logs, stop duplicate same-token processes gracefully. Do not disable ownership protection or privileged-intent checks. |
| Server/channel missing                   | Management permission, beta scope, installation and channel overrides. Refresh once after correcting permissions; respect Retry-After.                                                          |
| Registration unavailable                 | Correct public input, provider-specific web credentials, API response/quota and policy confirmation. Do not replace failed lookup with a guessed ID.                                            |
| Worker health absent                     | MONITORING_ENABLED=false runs a scaffold without the webhook server. Leave it disabled until approval; process existence is not monitoring readiness.                                           |
| Notification absent/uncertain            | Saved enable switches/destination, bot/worker health, actual LIVE confirmation, quotas and retained session/delivery records. Do not blindly retry or reset uncertain evidence.                 |
| Split-host dashboard cannot reach broker | Do not publish the broker. Use the separately approved PostgreSQL architecture and its roles/activation plan. Render Free is not certified for continuous monitoring.                           |

Persistent volumes are not a backup. Arrange separately approved encrypted offsite backups, a tested restore, runtime least privilege, rate-limit/queue progress monitoring, external alerts and controlled live verification before deployment. Metadata retention/cleanup and data deletion require operator care; do not run pruning/deletion commands as generic health checks. See [operations](OPERATIONS_RUNBOOK.md), [rollback](ROLLBACK_PLAN.md), [deletion](DATA_DELETION_PROCESS.md) and [security](../SECURITY.md).

This guide neither selects hosting nor changes DNS, billing, Portal settings, credentials, worker flags or public availability. Public release still needs the prerequisites in [INSTALLATION.md](INSTALLATION.md).
