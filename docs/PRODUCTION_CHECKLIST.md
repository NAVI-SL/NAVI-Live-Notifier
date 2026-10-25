# Production checklist

**Local evidence update — 2026-10-22:** [Phase 14 blocker review](PHASE_14_RELEASE_BLOCKERS.md) verifies local Docker build/offline runtime, actual PostgreSQL concurrency/schema checks and a fresh isolated restore. Older unchecked items below retain their original full-production scope: local success does not verify complete TLS/Compose deployment, encrypted offsite recovery, actual livestream receipts or externally delivered alerts. Production release remains **NO-GO**; no settings are changed by this note.

Prepared 2026-10-18. **Release decision: HOLD.** Files are prepared for local review, not a completed public deployment. Checkboxes describe actual evidence; leave manual gates unchecked until performed. See [deployment instructions](DEPLOYMENT_GUIDE.md) and [Phase 8 report](PHASE_08_IMPLEMENTATION.md).

## Scope and approvals

- [x] Owner confirmed no existing hosting, domain or production database.
- [x] No hosting purchase, DNS change, public deployment or production credential change performed.
- [x] Existing TypeScript/Next.js/Better Auth/discord.js/PostgreSQL architecture preserved; no new product features or Phase 9 work.
- [ ] Choose hosting/region, budget, operator contact and hostname; obtain explicit approval before provisioning or publishing.
- [ ] Resolve public release versus personal allowlist/private Discord app policy. Do not silently remove the allowlist or enable Public Bot.

## Build and dependency supply chain

- [x] Native TypeScript, linting, unit/security/integration fixtures and production builds pass; see report for counts and commands.
- [x] Docker context excludes local credentials, backups and build outputs.
- [x] Production service files are secret-free templates with runtime file mounting and fail-closed preflight.
- [x] Browser asset scan found no configured secret values in this native build.
- [ ] Start Docker's Linux engine; build the image and run the complete local Compose acceptance sequence.
- [ ] Validate Nginx syntax, TLS, Host rejection, rate limits and internal-route exclusion in a running container.
- [ ] Resolve and pin reviewed image digests; record immutable application tag and scan the actual built Linux image.
- [ ] Resolve or explicitly accept the four moderate Drizzle/esbuild-chain advisories. No forced downgrade was applied.
- [ ] Verify image history/context and browser assets again using the intended build/CI inputs and runtime secret configuration.

## Authentication, permissions and secrets

- [x] Existing tests cover Discord state/browser binding, denied login, sessions/logout, expired credentials, unauthorized guild access, cross-origin mutations and installation URL scopes/permissions.
- [x] Production HTTPS state cookies tested for Secure, HttpOnly and SameSite=Lax.
- [x] Fresh server-manager authorization and tenant-scoped persistence remain enforced; no role/ID from the browser becomes authorization.
- [x] Template/role validation and explicit allowed-mention lists remain covered by regression tests.
- [ ] Privately populate separate web/bot/worker/migrator secret files for the intended environment; verify host ACLs/UID 1000 readability and no cross-service secret mounts.
- [ ] Keep auth encryption secret stable, back it up securely and rehearse rotation/re-authentication. Rotate bot/provider credentials through the owner only when authorized.
- [ ] Confirm exact HTTPS Discord redirect URI, minimal `identify guilds` login scopes, Guild Install `bot applications.commands`, permission 19456 and only Guilds intent. Keep privileged intents off.
- [ ] Perform fresh browser login/consent/logout and manager-revocation/direct-API denial against the deployed origin.
- [ ] Verify real bot install/status and chosen destinations, including role/channel deletion and permission removal.
- [ ] Review strict script CSP and public-service abuse requirements before expanding beyond the personal allowlist. Current CSP is intentionally partial.

## Database and data lifecycle

- [x] Existing migration chain runs in isolated embedded PostgreSQL; the reviewed role-grant script rejects runtime DDL, worker auth access and worker configuration mutation.
- [x] Persistent production volume and explicit serialized migration command supplied; no automatic destructive reset.
- [ ] Restore local PostgreSQL availability and rerun `npm run test:postgres`, including independent-connection concurrency/cooldown tests.
- [ ] Create nonsuperuser migrator/web/worker roles privately in the isolated review database, apply migrations once, apply reviewed grants and test actual runtime-role connections.
- [ ] Verify schema/data migration on the intended PostgreSQL 17 service; keep owner/admin credentials out of runtime files.
- [ ] For managed PostgreSQL, verify TLS/CA, network rules, connection limits and session advisory locks; avoid transaction-pooling incompatibility.
- [ ] Choose retention/deletion policy for source metadata, receipts, sessions, OAuth data and backups; reconcile provider requirements.
- [ ] Configure encrypted offsite backups, separate key protection, completion alerts and unique archive names. Proposed RPO/RTO require owner agreement.
- [ ] Successfully restore a backup to a new isolated database and time recovery. Reconcile deduplication state before enabling monitoring after restore.
- [ ] Never treat a Docker volume or same-host archive as sufficient disaster recovery.

## HTTPS, ingress and platform integrations

- [x] Only edge ports published, bound to host loopback for review; database and internal broker are not public.
- [x] Public webhook handlers retain raw-body signature, timestamp, subscription/topic and durable replay checks; malformed/forged tests pass.
- [x] Proxy configuration supplies body/time limits and rate limits; avoids logging OAuth query codes and YouTube capability paths. Live proxy behavior still needs verification.
- [x] Expired Kick hosted-key refresh failures now back off and fail closed, with regression coverage.
- [ ] Set approved domain/Host check/origins and verified TLS certificates. Configure renewal and certificate-expiry alerts; enable HSTS on the verified public hostname, not localhost.
- [ ] Obtain explicit approval before DNS changes, public bind/ports or deployment.
- [ ] Confirm no direct access to 3000/4001/4100/5432, no exposed tooling servers, and no CDN header spoofing/rate-limit bypass.
- [ ] Configure real Kick callback and YouTube lease/challenge callbacks over public HTTPS; inspect signed receipt persistence without logging secrets.
- [ ] Test real YouTube/Kick starts, correct title/URL, two-guild delivery, selected mentions and repeated events. API authentication alone does not pass this gate.
- [ ] Agree YouTube discovery/Premiere limitations and sustainable quota/cadence. Do not promise complete go-live coverage.

## Availability and operations

- [x] Website, bot and worker have separate commands/containers; monitoring does not depend on web requests.
- [x] Exit restart policies, signal forwarding, shutdown grace periods and secret-safe health probes supplied.
- [x] Active missing platform configuration degrades readiness; longest provider cooldown persists; stale delivery completion is logged without claiming a false transition.
- [x] Simulated SDK Gateway reconnect/resume, worker drain/reconstruction, outages, rate limits and uncertain delivery remain passing. This is not container/real-outage evidence.
- [ ] Ensure one Gateway owner per token across Windows, Docker VM and hosts. Local ownership does not span those boundaries.
- [ ] Test container SIGTERM/forced restart, transient database/API loss, missing credentials, stale health and recovery with synthetic destinations.
- [ ] Stop the website and demonstrate ongoing worker/bot operation. Inspect actual channel messages before manually resolving uncertain sends.
- [ ] Rehearse joint application recreation after replacing the edge shared network namespace; do not assume automatic rolling updates.
- [ ] Configure operator alerts/private log collection, disk/backup/certificate monitoring and an incident contact. Docker logs/health labels alone do not send alerts.
- [ ] Review sustained Gateway disconnection separately: bot health currently proves REST identity, not an active Gateway acknowledgment.
- [ ] Record measured load, memory, database connection usage, quotas, queue freshness and hosting cost before increasing source caps.

## Final sign-off

- [ ] All major integration/deployment gates closed or explicitly accepted with owner and date.
- [ ] Remaining dependency/policy/coverage risks accepted with owner and date.
- [ ] Production hostname, credentials, backup restore evidence and runbook reviewed privately.
- [ ] Explicit owner approval to deploy publicly obtained. No approval is inferred from Phase 8 preparation.

No release sign-off, provider choice or approval date is fabricated here.
