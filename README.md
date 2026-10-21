# NAVI Live Notifier

Private beta source for a Next.js dashboard, Discord bot and independent YouTube/Kick monitoring worker. PostgreSQL stores authentication, server-scoped subscriptions, notification preferences and durable delivery records. Redis is included for local tooling; the implemented delivery queue uses PostgreSQL.

This is a sanitized source copy, not a production deployment. No real environment files, credentials, database data or Git history are included. Existing historical reports are preserved with private identifiers redacted; private evidence screenshots are omitted. Current copy verification is recorded in [GitHub readiness report](docs/GITHUB_READINESS_REPORT.md).

## Requirements

- Node.js 24 LTS is recommended (Docker uses Node 24 on Debian Bookworm). The package engine also permits Node 22.13+ within version 22 and Node 24+.
- npm 11.15.0, matching packageManager and the committed package-lock.json.
- Docker Desktop with Linux containers for Windows development, or Docker Engine and Compose v2 on Linux.
- PostgreSQL 17; Redis 7 is optional legacy local tooling. Do not point initial setup at an existing database.
- Your own Discord application and approved test server/accounts. Platform credentials are required for real integrations, not for the automated fixture suite.

## Install and verify from source

Run from the repository root:

```sh
npm ci
npm run check
npm run build
npm run env:check:example
```

check runs TypeScript, ESLint, formatting and automated Vitest tests. Tests use mocks, synthetic credentials and embedded database fixtures; they do not establish successful real Discord, YouTube or Kick delivery. test:postgres is a separate PostgreSQL integration check; run it only against an isolated test database after setting DATABASE_URL privately.

## Local setup

1. Copy .env.example to .env, and the service examples to .env.web, .env.bot and .env.worker. PowerShell example:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.web.example .env.web
   Copy-Item .env.bot.example .env.bot
   Copy-Item .env.worker.example .env.worker
   ```

2. Replace every REPLACE_ placeholder privately. Choose a new database password and use its URL-encoded form in DATABASE_URL. POSTGRES_PASSWORD is the raw password; DATABASE_URL must refer to the same database credentials. Service files override the root file: update their DATABASE_URL too. Never upload filled environment files. Use strong, separately generated Better Auth, broker and webhook secrets; the broker secret must match across its clients and server.
3. Start local data services with npm run services:up. The copied Compose project is named navi-github-local, with loopback PostgreSQL port 55432 and Redis port 56379 so it can coexist with the original project. POSTGRES_PORT and REDIS_PORT can override these; update URLs consistently. These are fresh named volumes, not copies of your original data. Changing POSTGRES_PASSWORD does not change credentials inside an already initialized volume. Stop with npm run services:down; never add --volumes unless intentionally discarding this copy's disposable data.
4. Apply the committed migrations to your chosen database with npm run db:migrate. npm run db:check performs a connection/schema check. Back up any existing database before migrating it. Do not regenerate migrations just to initialize a checkout.
5. Fill the required service environment values below. npm run env:check and npm run env:check:auth validate configuration without contacting providers.
6. Run npm run dev:web first. Open http://localhost:3000. Run npm run dev:bot and npm run dev:worker in separate terminals only when ready to connect your approved accounts. MONITORING_ENABLED remains false in examples. Enabling it can generate real notifications; obtain approval and verify allowlists/destinations first. npm run dev starts all three processes, so use it deliberately.

## Environment variables

The server-only config loader reads root .env, then .env.<service>, then NAVI_ENV_FILE if set. Process environment takes precedence. Keep secrets out of NEXT_PUBLIC_ variables and browser code.

| Process                     | Configuration                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local Compose               | POSTGRES_PASSWORD, optional POSTGRES_PORT and REDIS_PORT                                                                                                |
| Database tooling            | DATABASE_URL                                                                                                                                            |
| Web                         | WEB_ORIGIN, DATABASE_URL, BETTER_AUTH_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_ALLOWED_USER_IDS, BOT_INTERNAL_URL, BOT_INTERNAL_SECRET |
| Bot                         | DISCORD_BOT_TOKEN, BOT_INTERNAL_SECRET, BOT_STATUS_PORT                                                                                                 |
| Worker                      | DATABASE_URL, REDIS_URL (legacy validation), MONITORING_ENABLED, BOT_INTERNAL_URL, BOT_INTERNAL_SECRET, MONITOR_PORT                                    |
| YouTube lookup / monitoring | YOUTUBE_API_KEY in the respective web/worker configuration                                                                                              |
| Kick lookup / monitoring    | KICK_CLIENT_ID and KICK_CLIENT_SECRET in the respective web/worker configuration                                                                        |
| Webhooks                    | MONITOR_PUBLIC_ORIGIN (public HTTPS), MONITOR_WEBHOOK_SECRET; review platform subscription/verification setup before enabling monitoring                |
| Admission / quota           | DISCORD_ALLOWED_USER_IDS, BETA_GUILD_IDS (same reviewed list in web and worker, at most five guild IDs), STREAMER_SOURCE_LIMIT, YOUTUBE_DAILY_BUDGET    |
| Common                      | NODE_ENV, LOG_LEVEL; optional NAVI_ENV_FILE for mounted service secrets                                                                                 |

See the safe example files and [config implementation](packages/config/src/index.ts) for conditional requirements and defaults. Empty credentials are intentional; placeholders are not working credentials. Allowlists must be set explicitly before external beta access. Never substitute public wildcard access.

## Discord configuration

Use your existing application; do not create or rotate credentials just for this copy. Configure the exact local OAuth callback http://localhost:3000/api/auth/callback/discord. WEB_ORIGIN must be http://localhost:3000; use the canonical origin consistently. Production needs its own reviewed HTTPS origin/callback.

Login scopes are identify and guilds. Guild installation uses bot and applications.commands through an explicit OAuth authorization URL. The base bot installation permission set is View Channel, Send Messages and Embed Links (19456); it does not request Administrator. The Gateway uses only the non-privileged Guilds intent. Optional everyone mentions additionally require Mention Everyone in the destination channel and explicit administrator selection. Preview/test messages never ping everyone. Keep the application's existing private-install status; public installation is a separate manual approval.

## Repository layout

- apps/web: website, OAuth/session endpoints, protected dashboard and server-scoped configuration.
- apps/bot: Gateway presence, permission-aware REST message delivery and private broker.
- apps/worker: official provider polling/webhooks, reconciliation and durable delivery processing.
- packages/config, core, database, tsconfig: shared validation, services, Drizzle schema and SQL migrations, TypeScript configuration.
- tests and scripts: regression fixtures, security, health and operational checks.
- deployment, Dockerfile and compose.production.yaml: separate process containers, reverse proxy, migrations and health probes.
- docs: architecture, API research, phase reports, operational instructions and policy drafts.

## Oracle Cloud / Linux ARM64 prerequisites

OCI Ampere uses Arm processors; build a linux/arm64 image for that target. Do not upload Windows node_modules or compiled outputs. Use npm ci on the destination architecture so native optional dependencies such as Next.js SWC and esbuild resolve appropriately.

```sh
docker buildx build --platform linux/arm64 --load -t navi:arm64 .
docker compose -f compose.production.yaml config --quiet
```

The production Compose file is for local review until approved: loopback publication, private PostgreSQL volume, mounted service secrets and TLS files, separate web/bot/worker processes, restart policies and health checks. It will not run successfully until those private inputs exist. Preserve the shared network namespace/loopback broker arrangement when adapting hosting. Do not expose PostgreSQL, Redis, broker or internal health endpoints publicly.

Deployment prerequisites: an approved Linux ARM64 host with sufficient measured RAM/storage, Docker/Compose, persistent PostgreSQL storage, encrypted off-host backups plus a tested restore, reviewed least-privilege DB roles, public HTTPS and exact OAuth/webhook callbacks, approved allowlists, logging/alerts, and real controlled livestream verification. Hosting availability, free-tier capacity and cost are not guaranteed. No Oracle resources have been provisioned.

See [deployment guide](docs/DEPLOYMENT_GUIDE.md), [production checklist](docs/PRODUCTION_CHECKLIST.md), [rollback plan](docs/ROLLBACK_PLAN.md) and [operations runbook](docs/OPERATIONS_RUNBOOK.md). These historical documents may describe original local ports; this README and compose.yaml define the copy's isolated local ports. Legal/operator/contact placeholders in policy drafts must be reviewed and filled with approved public information before publication.

Official references: [Oracle Arm-based Compute](https://docs.oracle.com/en-us/iaas/Content/Compute/References/arm.htm), [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/).

## Upload safety and release status

Review docs/GITHUB_READINESS_REPORT.md before uploading. Use a private repository. Do not upload .env files, .local, node_modules, backups, dumps, TLS/SSH keys or build outputs. .gitignore and .dockerignore provide exclusions; they do not replace reviewing the actual upload. Git ignore rules do not protect manual drag-and-drop uploads or files already tracked elsewhere.

No license or operator legal identity has been invented. Four previously documented moderate advisories in the Drizzle tooling chain require review. This chain is also present in the production dependency tree through Better Auth; --omit=dev alone does not remove it. do not run npm audit fix --force blindly. Readiness for source upload is separate from readiness for public launch. Wider public deployment remains NO-GO until the documented integration, infrastructure, policy and operational blockers are resolved. Nothing is automatically committed, pushed, installed publicly or deployed.
