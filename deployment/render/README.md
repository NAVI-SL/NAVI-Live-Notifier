# Render dashboard and separate backend — review only

Current plan: [Phase 15F](../../docs/PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md). The October 22 readiness report is historical. PostgreSQL commands now remove the dashboard broker dependency, but **the complete free/no-card always-on deployment remains NO-GO**. Nothing is deployed or activated.

## Commands (repository root)

Leave Render Root Directory unset. Review/pin the Node 24 LTS patch and image digest before a real rollout; the example major version is not an immutable pin.

```sh
npm ci --include=dev --no-audit --no-fund && npm run build
```

Dashboard start, after separate approval and explicit PostgreSQL mode selection:

```sh
node deployment/render/check-web.mjs && exec node node_modules/next/dist/bin/next start apps/web --hostname 0.0.0.0 --port "$PORT"
```

The prestart check rejects HTTP mode, missing production auth settings, an invalid PORT and a bot token supplied through the web process environment. It performs no database/network request and does not certify readiness. Render's PORT is public ingress; `/api/health` remains public **liveness**, not DB/queue/Discord readiness. No artificial keepalive traffic is configured.

`dashboard.yaml.example` is deliberately outside the root and is not an active Blueprint. **Importing it creates/deploys a service and needs owner approval.** `autoDeployTrigger: off` controls later deploys, not initial creation. BOT_COMMAND_TRANSPORT is an explicit operator-supplied field, not automatically switched on. Admission is paused by the template. The web template retains `http` as a safe default and is intentionally rejected by the Render prestart check until an approved operator selects `postgres`; it contains no broker URL/secret. Never use a public broker to make startup pass.

Backend inventory, for an approved continuously running host only:

```sh
node deployment/start.mjs bot
node deployment/start.mjs worker
node deployment/healthcheck.mjs bot
node deployment/healthcheck.mjs worker
```

These are **not** runnable Render Free web-service definitions. Do not start the worker without separate monitoring/reconciliation/send approval. Existing `MONITORING_ENABLED=false` prevents production worker startup. Consumer flag `BOT_COMMANDS_ENABLED=false` remains the default. `deployment/cloud/*.service.example` prepares two supervised processes on one host, preserving the worker's loopback broker at 127.0.0.1:4001. No combined-process fake health wrapper is supplied. The worker unit also needs an explicit approval marker; do not install/enable any units now.

## Per-service configuration

Use private provider settings or separate ignored environment files. Never share the bot token with the dashboard or copy real environment files into the image.

- Web: production WEB_ORIGIN, web DATABASE_URL, Better Auth secret, Discord OAuth client ID/secret, approved user/guild scope, provider registration credentials, source cap, transport and admission flag. No bot token or broker credentials in PostgreSQL mode.
- Bot: token, private broker secret/port, disabled consumer flag; a separate restricted direct DB URL and matching approved user/guild scope before approved consumer activation.
- Worker: restricted DB URL, native Redis URL, provider credentials, private loopback broker URL/secret, approved guild scope and HTTPS hook origin/secret. Keep monitoring disabled until approved.
- Neon: native direct TCP endpoint, `sslmode=verify-full`; do not use a transaction-pooler endpoint with session advisory locks. Role credentials can differ while endpoint/port/database identity must agree. Actual cloud TLS, roles and cold starts remain unverified.
- Upstash: native `rediss://` URI with percent-encoded credentials, not a REST URL/token. No Redis queue exists in NAVI. Local Redis probes do not verify Upstash TLS or its blocking-command behavior.

## Callbacks and edge

No hostname is invented. After the actual origins are approved:

- Discord login callback: exactly `${WEB_ORIGIN}/api/auth/callback/discord`, login scopes `identify guilds`. Bot installation remains the explicit authorized URL, Guild Install, minimum permissions and current private-beta restrictions. Do not enable Public Bot automatically.
- Kick: `${MONITOR_PUBLIC_ORIGIN}/webhooks/kick` on the separately supervised backend. Validate raw-body signatures and event identity; app subscription reconciliation requires approval.
- YouTube: retain generated `/webhooks/youtube/<channel-id>/<HMAC>` callback paths and challenge handling. Do not invent/log capabilities. Events are hints; actual LIVE confirmation still uses the existing API path.

`deployment/cloud/backend-webhooks.nginx.conf.example` allows only the two worker callback patterns. Its approved-host marker and local TLS binding require review; public binding, certificates and DNS need approval. `/internal`, dashboard and OAuth routes are not forwarded. Existing single-host `deployment/nginx.conf` retains web/auth throttling for the alternative all-in-one host. Native Render does not automatically provide all existing edge controls: equivalent throttling/abuse controls are still an activation gate.

## Migration, role grants and activation (instructions only)

1. Approve the host, scope, exact target/origins, backup/restore procedure and activation separately. Keep owner credentials outside runtime services and the Render build environment.
2. In the approved target only, apply migrations 0000–0007 once with the migration identity. Do not migrate during builds or every restart. The native command is `npm run build:shared && npm run db:migrate`; Docker's `deployment/migrate.mjs` uses `/app` and is not the Render-native command. Do not run either against the normal DB during preparation.
3. Review existing `deployment/database-permissions.sql` (its literal navi DB/role names need review) and the new variable-based `deployment/command-permissions.sql`. Existing separate runtime roles must be provisioned by the owner. The command file resets command-table grants, preserves web legacy rights, and grants the bot no auth-table access. It is not executed automatically.
4. Verify the private command DB readiness profiles with each intended role, current migration/grants, actual TLS/direct advisory locking and same target. The role probe is read-only and **does not prove a running consumer heartbeat**.
5. After approved activation: enable the consumer on one backend, explicitly select postgres on the web while admission remains false, validate scoped status/read-only operations and then enable admission only after approval. Monitoring/reconciliation and real sends require their own controlled approval. The preflight intentionally reports not-ready while flags remain disabled.
6. Never dual-dispatch. Pause admission for rollback, keep authenticated status access, drain safe work or stop the consumer, preserve uncertain records/receipts/tombstones and reconcile manually. Revert HTTP only for a co-located web with its original private broker. A separate Render dashboard uses maintenance/read-only mode instead of unreachable localhost fallback.

## Local verification

```sh
npm run check
npm run build
npm run test:commands:integration
npm run test:redis:compatibility
npm run test:proxy
npm run test:proxy -- --backend
npm run cloud:check
npm run release:check
```

The integration command needs local PostgreSQL CREATEDB/CREATEROLE privileges and creates/removes only a guarded disposable DB and NOLOGIN roles. It does not apply migration 0007 to normal development tables. The cloud check compares known local secret values in memory against preparation files/client assets and prints counts only; it is bounded, not exhaustive secret detection. `release:check` is expected to fail against the existing local, disabled, nonpublic configuration. Syntax/fixture success is not actual deployment, OAuth, LIVE delivery, external alerts or disaster-recovery evidence.
