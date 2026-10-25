# Deployment guide

**Phase 14 remediation — 2026-10-22:** [report](PHASE_14_REMEDIATION.md) records zero current full/production dependency advisories under the patched lock, guarded Linux builds and a corrected Nginx forwarded-host header. Run `npm run test:tooling` and, after building `navi:local-review`, `npm run test:proxy` for synthetic network-disabled local TLS/route/header/limit checks. Docker and OpenSSL (Git for Windows detected) are prerequisites; fixtures publish no host ports and use no real environment files. This does not activate the production topology or prove real callback/Discord delivery. Retain `npm ci`, the lock and guards; the npm workspace listing/update caveat is documented. Wider release remains NO-GO.

**Phase 14 local follow-up — 2026-10-20:** [verification](PHASE_14_VERIFICATION_REPORT.md) now establishes healthy original Docker/PostgreSQL/Redis, actual SQL integration/isolated local restore and a successful Linux image with network-disabled synthetic HTTP checks. This supersedes older engine/DB-unavailable observations for the current local session. No public deployment or full TLS/proxy/webhook acceptance occurred; private backup is local/unencrypted, actual sender startup and messages remain approval-gated. Existing deployment configuration is unchanged.

Prepared 2026-10-18 for **local review only**. No provider, domain, production database or budget has been selected. The owner confirmed Windows development with Docker Desktop/PostgreSQL/Redis. Existing `compose.yaml` is development infrastructure; no prior production deployment configuration was found. This guide does not authorize purchasing services, changing DNS, publishing ports, modifying production credentials or deploying publicly.

## Architecture and prerequisites

The proposed first deployment is one Linux Docker host, three independent Node processes and PostgreSQL 17. A TLS Nginx edge shares its network namespace with web, bot and worker. This deliberately preserves existing `127.0.0.1` broker validation/bindings rather than opening the bot API or changing the application architecture. Only edge ports are published, initially bound to host loopback. PostgreSQL is a separate container on the Compose bridge with a persistent named volume and no host port.

The website handles Better Auth and current manager authorization. The bot alone holds the bot token and owns Gateway presence and REST delivery. The worker holds provider credentials and the broker secret, runs independently of website requests and persists scheduling/delivery state in PostgreSQL. Redis is unused by the implemented database queue: its legacy validated URL remains in the worker template, but production Compose intentionally does not provision Redis.

Requirements: Docker Engine/Desktop with Linux containers, Compose v2, outbound HTTPS/WebSocket access to Discord/Google/Kick and certificate renewal services, reliable DNS/time synchronization, persistent storage and an operator. Start with an estimated 2 vCPU/4 GB RAM and 30–40 GB SSD for a small source cap; measure before increasing load. Build images on a separate machine/CI if memory is constrained. Budget at least 14 application database connections (5 query + 2 lock per web/worker), transient health/migration connections and PostgreSQL administrative headroom. Avoid transaction-pooling proxies for session advisory locks; use direct/session-preserving PostgreSQL connections.

The shared namespace is an explicit single-host tradeoff, not separate-host orchestration. One bot replica per token is required. All three processes must be recreated together if the edge network namespace is recreated; restarting only the edge process is different from replacing its container. No automatic scaling or rolling multi-host deployment is configured. See [Docker networking/service namespaces](https://docs.docker.com/reference/compose-file/services/).

## Files and secrets

- `Dockerfile`: reproducible lockfile install and native production build, separate runtime dependency install, nonroot Node runtime. One image serves the three explicit process commands.
- `compose.production.yaml`: isolated project/volume, separate services, init/signal forwarding, restart policies, health probes, bounded JSON logs and read-only application roots with temporary cache directories.
- `deployment/nginx.conf`: TLS, bounded bodies/timeouts, IP-based API/login/webhook rate limits, only supported public webhook paths, blocked internal routes, query/path-free access logs.
- `deployment/*.env.example`: deliberately incomplete service-specific production templates. `deployment/.env.deploy.example` contains only nonsecret local Compose parameters.
- `deployment/start.mjs`: fail-closed preflight; production bot cannot silently start disconnected and production worker cannot silently run disabled. `healthcheck.mjs` prints no response bodies or credentials.
- `deployment/migrate.mjs`: explicit serialized migration job using the existing Drizzle migrator; no startup migration or destructive reset. `database-permissions.sql` separates runtime roles from schema ownership.

Docker build context excludes local environment files, `.local`, backups, credentials, logs and existing build outputs. No secret is a Docker build argument. Runtime uses one Compose secret file per service, selected through `NAVI_ENV_FILE`; unreadable/missing explicit files fail closed. Process environment still overrides file fields. Never add `NEXT_PUBLIC_*` credentials. Compose file-backed secrets are host files/bind mounts, **not an encrypted secret vault**; protect host access and backups. [Docker secret guidance](https://docs.docker.com/compose/how-tos/use-secrets/).

Create a separate ignored `.local/production/secrets` directory; do not copy real local credentials automatically. Copy each service template there as `web.env`, `bot.env`, `worker.env`, `migration.env`; privately fill intended testing values. Store a separately generated database bootstrap password in `postgres_password` (file content only). This task did not generate/change any credential. On Linux, make env files readable by runtime UID 1000 but inaccessible to other host users (owner UID 1000, mode 0600; parent directory protected). File-backed Compose secret UID/mode overrides are not portable. Verify actual read permissions on Windows/Linux before starting. Keep administrator credentials out of all runtime service files.

| File            | Required configuration                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web.env`       | Exact HTTPS `WEB_ORIGIN`, `navi_web` `DATABASE_URL`, stable random `BETTER_AUTH_SECRET` (32+ characters), Discord client ID/secret and personal allowed-user IDs, matching `BOT_INTERNAL_SECRET`, loopback bot URL. Optional provider lookup credentials.                                             |
| `bot.env`       | Existing intended `DISCORD_BOT_TOKEN`, matching 32+ character broker secret, port 4001; no database/user OAuth secret.                                                                                                                                                                                |
| `worker.env`    | `navi_worker` database URL, explicit `MONITORING_ENABLED=true` only when controlled tests are ready, provider credentials for every active platform, broker URL/secret, existing budget/port values. Public HTTPS origin and 32+ character webhook secret for callbacks. No bot/OAuth/session secret. |
| `migration.env` | Database URL for a separate schema-owning `navi_migrator`, used only for explicit migration.                                                                                                                                                                                                          |

URLs use `postgres:5432/navi` inside this Compose network, **not** host `localhost`. URL-encode passwords privately. The isolated bridge example uses the standard local PostgreSQL transport; external managed PostgreSQL requires verified TLS/CA configuration, firewall restrictions and a connection test, not a blanket certificate-validation bypass.

## Local review sequence

Do not change the existing development Compose project or volume. Commands below use the separate project defined in `compose.production.yaml`. They are instructions, not evidence of executed container tests.

1. Start Docker Desktop's Linux engine manually. Create the ignored directories/secret files described above and a local certificate with SAN `localhost`; trust its local CA only on the testing machine. Place `fullchain.pem` and `privkey.pem` in `.local/production/tls`. No public certificate/domain is required for configuration review. Never commit private keys.
2. Keep defaults: host `127.0.0.1`, HTTP 8080, HTTPS 8443, `WEB_ORIGIN=https://localhost:8443`. Nginx allows only `localhost`. Use exactly that hostname; it is separate from the earlier HTTP development login origin. No existing Discord callback registration was changed. Real local HTTPS OAuth requires the owner to add this exact callback privately in the Portal.
3. Validate/build without printing resolved secrets:

```powershell
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml build web
docker compose -f compose.production.yaml up -d edge postgres
docker compose -f compose.production.yaml exec edge nginx -t
```

4. Bootstrap roles interactively using `docker compose -f compose.production.yaml exec postgres psql -U navi_owner -d navi`. The official PostgreSQL image's bootstrap `navi_owner` is an administrator; never use it in web/worker env files. Create `navi_migrator`, `navi_web` and `navi_worker` with LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE and NOREPLICATION. Set each password with interactive `\password role_name`, not SQL literals or shell arguments. On this **new isolated database**, assign database ownership to `navi_migrator`; it owns migrations/public objects without superuser. Record ownership before future upgrades. The bootstrap password only initializes a new volume; editing its file does not rotate an existing database password.
5. Fill the migration URL privately, then run the reviewed migration job:

```powershell
docker compose -f compose.production.yaml --profile tools run --rm migrate
```

6. Apply `deployment/database-permissions.sql` using the administrator's interactive psql session (review/paste nonsecret SQL, or copy the file into that isolated database container and use `\i`). Reapply after additive migrations. Web can access auth/configuration tables; worker cannot read auth tokens or change notification settings. Neither runtime role owns tables or can create schema objects. No application-level tenant check is replaced by these roles: PostgreSQL RLS is not implemented, and the web runtime necessarily serves multiple guilds.
7. Stop any development bot using the same token before starting a container bot. Windows and Docker's Linux VM are separate ownership namespaces; the local ownership guard cannot prevent that cross-namespace duplicate. Do not scale the bot. Review enabled sources/destinations and manual send consequences before opting the worker in.

```powershell
docker compose -f compose.production.yaml up -d bot web
# Only after explicit local monitoring configuration/review:
docker compose -f compose.production.yaml up -d worker
docker compose -f compose.production.yaml ps
docker compose -f compose.production.yaml exec web node deployment/healthcheck.mjs web
docker compose -f compose.production.yaml exec bot node deployment/healthcheck.mjs bot
docker compose -f compose.production.yaml exec worker node deployment/healthcheck.mjs worker
```

Use a browser trusting the testing CA or `curl --cacert <local-ca-file> https://localhost:8443/api/health`. Confirm `/internal/health` returns 404 through TLS and invalid webhook signatures are rejected. Run a bounded local rate-limit experiment against synthetic endpoints, not Discord. Do not use `curl -k` as production validation. These container/TLS instructions remain unexecuted because the Docker engine was unavailable during this phase.

## Public HTTPS, DNS and provider callbacks — approval required

After the owner approves hosting, budget and hostname, provision a host/firewall, persistent disk and encrypted offsite backups. Open only intended HTTPS/HTTP certificate-challenge ports and restricted administrative access. Do not expose 3000, 4001, 4100, 5432 or Redis. Set an approved canonical hostname in both Nginx `server_name` and the explicit Host check, and set matching web/worker origins. Only then review changing `NAVI_BIND_ADDRESS`/ports to public 80/443. No DNS action was taken here.

Obtain/renew a publicly trusted certificate using the chosen hosting provider or ACME tooling, store it outside images and reload Nginx after renewal. The provided Nginx configuration does **not** automate certificate issuance or renewal. Test expiry alerts before release. HTTP currently returns 404; configure a redirect to the literal approved HTTPS hostname if desired, rather than reflecting an untrusted Host header. After testing the final public hostname, enable `Strict-Transport-Security` with a short initial max-age, then increase it once HTTPS/renewal are reliable. HSTS is deliberately disabled for localhost because it can break existing HTTP development ports. An A record (and AAAA only with working IPv6/firewall/TLS) must point to the approved host; DNS and certificate automation remain manual. A CDN/proxy requires explicit trusted real-IP configuration and rate-limit retesting; none is assumed.

- Discord: register exactly `https://APPROVED_HOST/api/auth/callback/discord`, no trailing slash, matching `WEB_ORIGIN`. Keep login scopes `identify guilds`, Guild Install `bot applications.commands`, permission integer 19456 and privileged intents off; Gateway needs only Guilds. Keep private testing/Public Bot settings unchanged. Public-user bot distribution is a separate approval/policy decision. [Official OAuth2 documentation](https://docs.discord.com/developers/topics/oauth2).
- YouTube: set `MONITOR_PUBLIC_ORIGIN` to the approved reachable HTTPS origin and a private stable webhook secret. The worker generates channel-bound `/webhooks/youtube/<stable-id>/<mac>` callbacks and renews its hub subscriptions. Do not paste these capability paths or OAuth query strings into logs. Google API keys remain server-side, API-restricted and IP-restricted where a stable egress permits. No Google browser OAuth callback is needed for the current public Data API integration. [Official push notification contract](https://developers.google.com/youtube/data/guides/push_notifications).
- Kick: enable webhooks in the existing developer application with `https://APPROVED_HOST/webhooks/kick`; the worker reconciles `livestream.status.updated` subscriptions using app credentials and verifies the official RSA signed bytes, timestamp and subscription. App client credentials do not require a broadcaster authorization-code callback. Configure one only if a future user-consent integration actually requires it. [Official webhook security](https://raw.githubusercontent.com/KickEngineering/KickDevDocs/main/events/webhook-security.md).

## Health, logging and outages

Web's public `/api/health` stays liveness-only. Its private container probe additionally checks auth-schema/database access. Bot health checks actual REST identity, not a live Gateway acknowledgment; inspect Gateway lifecycle logs for persistent disconnection. Worker health is bearer-protected and reports database, bot and required platform readiness. Missing credentials for an active platform degrade health; unused platforms may remain unconfigured. Startup fails on missing deployed schema. Probes print no tokens or response bodies.

Docker rotates JSON logs at 10 MB × 3 per container. App lifecycle/source/delivery events remain structured, without raw credential-bearing errors. Edge logs only method/status/duration; request URI, query, headers, signatures, capability paths and bodies are omitted, and request error logs are suppressed to avoid callback leakage. This trades detailed proxy diagnosis for credential protection. Do not enable raw Gateway/HTTP debug logging. Partial CSP limits base/object/framing; a strict nonce-based script CSP is not implemented or claimed.

No external error-monitoring service was selected or connected. The operator must configure a private collector/alerts before public release: repeated health failures, worker tick/queue staleness, rejected credentials, quota/429 events, renewal failures, uncertain deliveries, sustained Gateway reconnects, certificate expiry, disk exhaustion and missed backup/restore checks. Do not include cookies, authorization headers, provider payloads or callback paths in an error collector. Local Docker logs alone do not provide unattended alert delivery.

`unless-stopped` restarts exited processes; an **unhealthy** status does not automatically restart a container. Monitor/alert on health rather than running a blind restart loop. Transient external outages are handled by existing bounded retry/reconciliation; uncertain sends are not blindly replayed. SIGTERM is forwarded, bot shutdown is bounded at 10 seconds and worker drain at 30 seconds, with a 45-second Compose grace period. [Docker restart policy semantics](https://docs.docker.com/engine/containers/start-containers-automatically/).

For a controlled restart test, stop **only web** and confirm bot/worker ticks continue; restart web. On synthetic destinations, interrupt/restart a worker and inspect persistent delivery states and the actual channel before any manual retry. Test temporary database/network loss and recovery with two independent worker processes only after a current backup and explicit test destination review. Container signal behavior, sustained real outages and actual received automatic notifications were not verified in this phase.

## Backup, restore and upgrades

The `production_postgres` named volume survives ordinary container recreation and `docker compose down`. Never use `down --volumes` or a volume reset for production recovery. A same-host volume is not a backup. Schedule daily encrypted offsite custom-format logical backups, monitor completion/storage, protect encryption keys separately, and perform a monthly isolated restore drill. Proposed initial RPO is 24 hours and RTO four hours, subject to an actual timed restore; no SLA is promised. Agree retention/provider-policy requirements before retaining real provider/user data; do not assume indefinite backup retention is permitted.

Use PostgreSQL 17 tools. To avoid PowerShell binary-redirection corruption, dump to a file inside the container and copy that file to a protected local backup directory:

```powershell
docker compose -f compose.production.yaml exec -T postgres pg_dump -U navi_owner -d navi --format=custom --no-owner --no-acl --file=/tmp/navi.backup
docker compose -f compose.production.yaml cp postgres:/tmp/navi.backup .local/backups/navi.backup
```

Create `.local/backups` first; choose a unique dated filename instead of overwriting the only backup. Encrypt/upload using the approved backup mechanism, verify its checksum and remove temporary unencrypted copies under the agreed policy. The commands do not themselves encrypt or schedule backups. Store `BETTER_AUTH_SECRET` separately in the secret store; losing/changing it can invalidate encrypted OAuth credentials and sessions. Never print connection URLs or run `pg_dumpall` role-password exports into reports. [PostgreSQL logical backup guidance](https://www.postgresql.org/docs/17/backup-dump.html).

Restore into a **new isolated database/project**, never over the active database: copy the archive into that database container, create a new empty restore-test database, then use `pg_restore --exit-on-error --no-owner --no-acl --dbname=RESTORE_TEST_DATABASE /tmp/navi.backup` as its intended schema owner. Recreate runtime roles/grants separately; validate migration journal, auth tables, settings, sessions, delivery counts and uniqueness. Start only with synthetic credentials/destinations and no public ingress until verification is complete. Test retrieval of encryption keys without printing them. [Restore options](https://www.postgresql.org/docs/17/app-pgrestore.html).

Restoring an old backup can lose newer sent/deduplication records: keep monitoring stopped until the operator reconciles already-delivered messages and chooses a safe baseline. A restore is not permission to bulk replay pending jobs. No backup/restore drill was executed here because Docker/local PostgreSQL were unavailable.

Before upgrades, back up, build/test immutable images, resolve/pin base-image digests and scan the built image. Apply reviewed additive migrations once using the tools job, reapply runtime grants, then start services and check health. Pin an approved `NAVI_IMAGE_TAG`; current major/stable image tags are review defaults, not immutable release pins. Keep the previous compatible image for rollback. Do not reverse a migration blindly: application rollback requires schema compatibility, otherwise restore into an isolated database and plan an explicit maintenance cutover. No automatic image updater or destructive rollback is configured.

## Cost and free-hosting limits

No hosting purchase is recommended before local gates pass. Local review costs $0 in new hosting charges, excluding existing hardware/electricity/internet. For an always-on small shared VPS, use an **engineering budget estimate** of US$8–20/month including a small backup allowance, plus roughly $10–25/year for a domain; taxes, regional pricing, IPv4, egress and storage can increase it. These ranges are planning estimates, not provider quotes. As a current reference, Hetzner's published June 2026 EU CX23 price is €5.49/month excluding IPv4 and VAT; availability and suitability still require selection/testing. [Official price update](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/).

Free sleeping web tiers cannot establish always-on monitoring: Render documents web spin-down after 15 minutes and free PostgreSQL expiry after 30 days. This is useful for experiments, not a persistent production database/bot/worker arrangement. [Official free-tier limitations](https://render.com/docs/free). Split managed hosting would need continuously running bot/worker services plus persistent PostgreSQL and a reviewed private-network change; this phase intentionally preserves the loopback contract. Public release readiness remains HOLD until the checklist is completed.
