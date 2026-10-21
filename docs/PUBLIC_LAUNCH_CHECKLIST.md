# Public launch checklist — preparation only

Date: 2026-10-18. **Public release NO-GO.** Next authorized planning stage is private beta, maximum 10 guilds/10 unique streamers. A checked preparation item is not proof of deployment or real notification delivery. Owner sign-off and infrastructure/spending approval remain separate.

## Scope, admission and budget

- [x] Owner confirmed private-beta stage, 10-server/10-source planning ceiling, free hosting target and US$15–25 contingency not approved for spending.
- [x] Existing private bot/account allowlist preserved; no purchases, DNS, production config changes or public launch.
- [ ] Complete exact approved accounts/guilds/channels/source register before real tests or starting an enabled worker; include every globally active route.
- [ ] Measure capacity before using the ceiling; enforce operational admission at 10 guilds. Source cap is global, not per guild; no runtime guild admission cap currently exists.
- [ ] Before general public access, approve and implement an explicit signup/admission and anti-abuse policy, without weakening current per-guild authorization.
- [ ] Obtain separate owner approval for any deployment, paid service, Public Bot change or access expansion. Directory submission remains excluded.

## Onboarding, Discord and safety

- [x] Install NAVI source/tests reviewed: authorized native POST/303, explicit URL, scopes/context, selected guild and minimal permissions.
- [x] OAuth/state/session/refresh, unauthorized ID, isolation and safe mention automated tests available.
- [ ] Decide public landing CTA/copy; currently only Login with Discord exists, no Add to Discord button.
- [ ] Confirm Portal description, website/support, reviewed Privacy/Terms URLs, exact HTTPS redirect allowlist and Guild Install defaults. API reports description/policy links absent; manual UI review pending.
- [ ] Keep private beta Public Bot off, Guilds intent only, Guild Install bot/applications.commands, View/Send/Embed permissions. Do not enable Administrator or privileged intents.
- [ ] Observe real login, cancel/deny, logout/protected-route denial, fresh install/status in two approved servers and non-manager/revoked-access denial.
- [ ] Register YouTube handle/channel URL and Kick username/URL; confirm correct stable identity, duplicate/enable/disable/remove and server-specific settings.
- [ ] Save/reload distinct destinations and templates; grant only required channel permissions. Check deleted channel/role/bot and permission-refresh behavior.
- [ ] Use No mention for initial real acceptance. Any role/everyone test requires consenting destination approval, explicit saved choice and current permission. Preview/test never ping everyone; role tests may ping the selected role.

## Monitoring, reliability and load

- [ ] Correct Phase 10 M01 candidate starvation; test 50+ candidates, older hinted broadcasts, worker reconstruction, quota and freshness.
- [ ] Complete controlled real YouTube/Kick offline-to-live starts, correct metadata/URLs/embeds, actual receipts and duplicate counts; no ended/upcoming alerts.
- [ ] Measure supported YouTube discovery/Premiere/short-stream behavior and disclose limitations.
- [x] Add isolated 10-source/10-guild/100-destination correctness scenario with safe 429 and reconstruction. Provider/broker responses simulated.
- [ ] Run real isolated PostgreSQL independent-connection concurrency/leader/disable/send recovery checks; current command fails.
- [ ] Run load matrix in operations plan with synthetic destinations and no live tokens; measure CPU/RSS/SQL/queue/tick durations and API counts. Do not load-test Discord/provider production APIs.
- [ ] Prove worker and bot continue with browser closed/web stopped; verify supervised process/DB restart and graceful shutdown. Ambiguous sends stay uncertain.
- [ ] Fix remaining web lookup Retry-After clamp/error branches; verify reset/global/user bucket handling and no retry storm under agreed workload.

## Deployment, security and data

- [x] Native builds/checks, model validation and secret-value scan performed; see dated readiness report for actual results.
- [ ] Review/resolve or accept four moderate dependency advisories; pin/scan Linux images and retain an immutable compatible previous release.
- [ ] Choose approved free/affordable always-on host only after technical review. Sleeping web tiers are unsuitable for continuous monitoring; no provider selected.
- [ ] Test isolated local Compose build/start/TLS/proxy/headers/internal route exclusion/health/restart before publishing. Current Linux engine unavailable.
- [ ] Configure approved hostname, trusted certificate/renewal, canonical origins, secure cookies, exact Discord callback, reachable verified Kick/YouTube callbacks. No wildcard callbacks or verification bypass.
- [ ] Confirm least-privilege runtime DB users, encryption/storage ACLs, migrations through required journal, persistent volume, connection headroom and private DB/broker.
- [ ] Restore backup into a separate DB, time recovery, reconcile ledger and deletion requests, test compatible rollback; no destructive resets.
- [ ] Configure protected backup/log retention, cleanup when apps are stopped, private alerts, certificate/disk/backup monitoring and responsible operator.
- [ ] Review policy drafts and deletion workflow with confirmed operator/contact/URL/jurisdiction; test actual account/guild/shared-source deletion and backup expiry. Publish reviewed website notices only after approval.
- [ ] Confirm data transfers/providers, security incident process and applicable platform/legal obligations; no compliance claimed by this checklist.

## Sign-off record

Record evidence/date/owner for each open gate. Current values: **release artifact not approved; real two-platform receipt evidence pending; restore evidence pending; operator legal/contact details pending; public release approval not supplied**. Reassess private beta separately from public release; neither is automatically activated by Phase 11 completion.
