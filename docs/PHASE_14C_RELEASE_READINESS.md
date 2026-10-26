# Phase 14C — release readiness

Date: **2026-10-22, Asia/Colombo**. **Public launch: NO-GO. Complete release acceptance: FAIL / HOLD.** Actual local website, Discord Gateway/restart, API identity/permission and database reconnection checks improve the evidence. They do not replace fresh controlled livestream delivery, production hosting or continuous-operation acceptance.

See [runtime](PHASE_14C_RUNTIME_REPORT.md), [integration results](PHASE_14C_INTEGRATION_REPORT.md) and [evidence](evidence/phase14c-results.json). Only these reports, evidence and a progress pointer are added; existing application code, dependencies, credentials and production configuration remain unchanged. No Phase 15 work or public activation occurred.

## Current disposition

| Area                        | Phase 14C result                                                                                                                                                            | Remaining gate                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| PostgreSQL/Redis            | **PASS actual health**, worker-env access, own-connection reconnect and real SQL fixtures                                                                                   | Production grants/transport/capacity and full host-loss recovery                                             |
| Website                     | **PASS actual local development HTTP**, then intentionally stopped                                                                                                          | Fresh authenticated browser journey, intended production HTTPS topology                                      |
| Discord bot                 | **PASS actual Gateway/REST**, 64.4-second ready sample interval, one graceful process restart and restart-ready sample                                                      | Long soak, genuine network disconnect/resume, external-owner install/consent and human presence confirmation |
| Worker                      | Not started by this validation; separately started runtime briefly reports healthy with advancing heartbeat; verified combined group then stopped per no-worker restriction | **PASS brief observation; BLOCKED controlled acceptance**; final worker is off                               |
| Destinations/settings       | **PASS read-only current guild/channel/mention checks and saved-data consistency**                                                                                          | Approved new save/test-message journey and actual delivery after restart                                     |
| YouTube/Kick                | **PASS actual authenticated API/identity resolution**, stored IDs match                                                                                                     | Fresh controlled OFFLINE→LIVE→actual receipt, repeat/fan-out/latency matrix                                  |
| Uncertain delivery          | Row unchanged; available history/log evidence inconclusive                                                                                                                  | Private operator reconciliation; never blind resend                                                          |
| Automated checks            | **PASS 395 tests**, type/lint/format/native/Docker builds, SQL/proxy and package audits                                                                                     | Simulations/builds cannot certify production; npm listing remains a disclosed FAIL                           |
| Release preflight           | **FAIL** beta guild scope/agreement and HTTPS origin checks                                                                                                                 | Owner-approved scope and actual host/HTTPS/callback validation                                               |
| Operations/recovery/hosting | Local console alert and prior Phase 14B 14-relation restore evidence retained                                                                                               | Received external alerts, encrypted offsite DR, real soak/resource/quota/cost acceptance                     |

The prior local restore is dated Phase 14B evidence, not a new Phase 14C restoration or offsite test. Earlier successful historical livestream messages remain historical; no new real notification was sent. No critical exploit or data-loss event was demonstrated, but the major release gates below remain open.

## Exact configuration work to prepare after approval

Current failures are consistent with a local-only setup: beta guild scope absent, local HTTP web origin and no public worker origin. Existing allowed users and broker/database target agreement checks pass. Absent scope makes `web_worker_scope_matches` false; it does not establish disagreement between two populated lists. Do not weaken release preflight to turn this into PASS.

Prepare private service files from `deployment/web.env.example`, `bot.env.example`, `worker.env.example` and `migration.env.example`. Preserve actual credentials and stable auth secret. The following are **review placeholders, not applied configuration**:

```dotenv
# web
NODE_ENV=production
WEB_ORIGIN=https://<APPROVED_WEB_HOST>
BETA_GUILD_IDS=<SAME_APPROVED_GUILD_LIST>
DISCORD_ALLOWED_USER_IDS=<EXISTING_APPROVED_USER_LIST>
BOT_INTERNAL_URL=http://127.0.0.1:4001

# worker
NODE_ENV=production
BETA_GUILD_IDS=<SAME_APPROVED_GUILD_LIST>
BOT_INTERNAL_URL=http://127.0.0.1:4001
MONITOR_PORT=4100
MONITOR_PUBLIC_ORIGIN=https://<APPROVED_WEBHOOK_HOST>
# MONITORING_ENABLED=true only after explicit send/reconciliation approval.

# bot
NODE_ENV=production
BOT_STATUS_PORT=4001
```

Configure secret-bearing database/broker/provider/auth fields privately from the existing approved secret source; no values belong in this report. Ensure matching broker secret/target, correct shared database and the selected deployment's grants. Production Compose's shared edge network namespace supports its loopback broker URLs; do not reuse those URLs blindly on a different topology. No production Redis service is missing from the implemented PostgreSQL queue design.

After separate host/domain/TLS approval, compare Portal OAuth redirect exactly to `https://<APPROVED_WEB_HOST>/api/auth/callback/discord`. Keep OAuth login `identify guilds`, installation `bot applications.commands`, Guild Install and no Administrator. Keep private/public installation settings unchanged until specifically authorized.

Kick requires the approved origin's `/webhooks/kick`. YouTube uses the worker-generated authenticated callback path; do not manually invent or publish that secret-bearing URL. Nginx already routes these paths, blocks `/internal`, normalizes forwarded headers and applies a **64 KiB** body bound. Mount a trusted certificate chain/key at the configured `/etc/navi/tls/fullchain.pem` and `privkey.pem` paths, preserve renewal and ensure real event bodies/headers pass the configured bounds without weakening verification.

**Hosting support is UNVERIFIED**: no provider/domain/production machine is selected or approved, so no real HTTPS callback/certificate/DNS/provider reachability can be certified. The intended host must support continuous bot WebSocket/outbound HTTPS and worker processes independently of browser traffic, public HTTPS routing without interstitials, raw webhook request bodies/signature headers, persistent PostgreSQL/backup storage and suitable process/network isolation. Local Nginx TLS fixtures show routing behavior, not that an unspecified free host supports it.

Rerun `npm run release:check` using intended private runtime configuration after approval. Then independently validate certificate trust/renewal, exact redirects, real provider challenge/signed events and full service readiness; a passing preflight alone is not deployment authorization.

## Operational and manual closure

1. **Worker/live acceptance and startup isolation — major:** owner says no sends/keep worker stopped. Separately started services briefly reported all-service readiness; owner indicated possible VS Code startup. Their verified combined launcher was stopped to honor the existing restriction. Do not use the combined `npm run dev` while sends remain prohibited: it automatically starts the enabled worker. No approval is inferred from incidental runtime presence. Follow the Phase 14B manual matrix only after exact send/reconciliation scope approval; never label an empty/disabled scaffold healthy monitoring.
2. **Onboarding — major:** complete supervised login/cancel/deny/logout/session expiration, private-install confirmation, manager/revocation and unauthorized guild access tests. Actual current membership and generated URL do not prove a new install.
3. **Continuous operation/alerts — major:** agree and run a supervised soak beyond the short runtime window, actual worker recovery and safe genuine Gateway outage/recovery. Approve alert transport/recipient and verify received failure/recovery and host/agent-down alerts. Current delivery remains `console_only`; a running process cannot independently detect its own total host loss.
4. **Offsite recovery — major:** select approved encryption/key custody/storage/retention, retrieve/decrypt an encrypted backup onto an isolated replacement environment and measure RPO/RTO. Validate auth-secret continuity, grants and dedup/uncertainty history before any resume. Prior local scratch restore is not encrypted/offsite DR. Do not overwrite originals or send from a restored copy.
5. **Capacity/cost — major:** no production capacity or costs were measured. Direct-child local memory samples exclude worker and Next descendants. Profile intended architecture/host with representative sources/destinations, CPU/RSS/storage/connections/queue age, API headroom and latency. US$0/month preference and US$15–25 contingency are not a hosting guarantee or spending approval. Current cohort ceilings are planning limits, not verified capacity; no Oracle ARM64 deployment claim.
6. **npm warning — tooling follow-up:** full/production audit zero and actual patched tooling tests pass; `npm ls esbuild --all --json` still exits 1 on override metadata. Retain pinned lock/`npm ci` and tooling guards. Test candidate toolchain updates in isolation; no forced dependency change or waiver was applied.
7. **Policies and incident ownership — major:** earlier legal/operator/contact/retention/support/deletion/feedback placeholders and actual intake/deletion/incident exercises remain open. No compliance certification or public policy readiness is inferred from HTTP 200 pages.

**Decision: NO-GO for public launch; continue safe local checks and separately approved supervised acceptance only.** No public deployment, Public Bot/App Directory change, purchase, DNS/credential change, real message, new livestream initiation or Phase 15 work was performed by this validation. Effects of the separately owned runtime are not certified. Original data/volumes and the uncertain suppression record remain preserved by this work.
