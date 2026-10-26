# Phase 19 — Public MIT self-hosting source readiness

Date: 2026-10-26, Asia/Colombo. This report concerns publishing source, not launching a hosted NAVI service. **Blocking local verification passed. GO for reviewed source publication after owner-approved merge and visibility change; the repository remains private.**

The owner explicitly accepts possible disclosure of existing personal email addresses in Git commit metadata. No history rewriting, VeraCrypt setup, force-push or metadata scrubbing is planned. Acceptance covers those metadata emails only, not credentials or private application data. No raw personal email address is repeated here.

## Release scope

Branch: release/phase-18-mit-self-hosting, based on current origin/main 8979360afac987803fd78cd02efa97b2985249ab. Remote: NAVI-SL/NAVI-Live-Notifier, still private. Local main remains untouched. Existing implementation is already in main; no new application features, dependencies, migrations or runtime activation are part of this release change.

The prepared files include the standard MIT LICENSE (Copyright (c) 2026 NAVI-SL), README/self-hosting/contribution/security/installation guidance, safe .env.example flags, upload/image exclusions, dated Phase 18 evidence and this report. Historical Phase 18C/D plans are clearly marked canceled and their machine-specific paths removed. Those files preserve audit chronology; their old commands are not a proposed feature or a self-hosting requirement.

## Verification record

The current commands completed successfully; exact results are below. The new validation uses a clean remote main clone plus an explicit safe candidate overlay, without real environments or credentials. Previous Phase 18 Windows/Linux and local PostgreSQL/Redis results remain historical; they are not automatically new Phase 19 real-world evidence.

## Public source versus hosted service

Independent users create their own Discord developer application and bot/OAuth credentials, Google YouTube API project/key, Kick application credentials, PostgreSQL database, required Redis URI/tooling and host. They control their own allowlists, callback URLs and monitoring activation. No maintainer-owned bot token, private broker, database, hostname or user account is required. Redis is not NAVI's durable queue; PostgreSQL is.

The private HTTP broker is loopback-only and remains the default. PostgreSQL dashboard-command mode remains opt-in with admission/processing disabled in safe staging examples. The monitoring example remains off. Public source distribution does not enable the maintainer's Public Bot setting, remove beta restrictions or promise a 24/7 free-hosted service. Render Free sleeping and managed-provider quotas remain documented; actual hosting, public TLS/callbacks, alerting, backup recovery and capacity are operator responsibilities.

## Licensing and support boundaries

The full standard MIT terms are supplied with the requested 2026 NAVI-SL notice and no holder placeholder. Third-party dependencies retain their licenses. The prior 413-entry inventory includes Sharp/libvips LGPL variants, lightningcss MPL variants and caniuse-lite CC-BY attribution; do not relabel them MIT or remove upstream notices. Redis 7.4 image terms and Docker Desktop licensing are separate. This source/lockfile PR does not vendor those images/binaries or certify a future redistributed image's legal compliance. Operator privacy/support/deletion policy templates need the operator's own real details before running a public hosted service.

SECURITY.md gives a private-reporting boundary and a sanitized way to request a private channel without exposing vulnerability details. Private GitHub reporting availability is not claimed or enabled by this phase. There is no security SLA or legal/platform compliance guarantee.

## Authorized GitHub actions and stop conditions

Only after the blocking checks pass, the owner authorized a normal commit and fast-forward branch push plus a PR to main. Review an explicit staged allowlist and run a staged-content secret scan first. Stop on credential matches, serious unexplained privacy data, unexpected scope, a failed blocking check, branch mismatch or remote movement. Never force-push. Merge, repository visibility, releases, deployments and live notifications remain unapproved.

Final check results, commit/PR provenance and GO/NO-GO decision are appended below when supported by evidence.

## Actual Phase 19 results

| Check                                          | Result / evidence                                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh isolated remote-main clone               | PASS; candidate overlays exactly the 15 reviewed source-release files, no private environment or old node_modules                                                       |
| npm ci --include=dev --no-audit --no-fund      | PASS; 312 packages                                                                                                                                                      |
| npm run env:check:example                      | PASS; example-only validation, no service connection                                                                                                                    |
| npm run typecheck                              | PASS                                                                                                                                                                    |
| npm run lint                                   | PASS                                                                                                                                                                    |
| npm run format:check                           | PASS                                                                                                                                                                    |
| npm run test -- --maxWorkers=1                 | PASS; 537 tests across 43 files, 44.15 seconds                                                                                                                          |
| npm run build                                  | PASS; shared TypeScript packages, optimized Next.js website, compiled bot and worker                                                                                    |
| npm audit --json / npm audit --omit=dev --json | PASS; zero vulnerabilities in both                                                                                                                                      |
| Complete MIT terms and notice                  | PASS; standard permission/notice/disclaimer comparison and 2026 NAVI-SL; no holder placeholder                                                                          |
| Dependency license declarations                | PASS inventory; 413 entries, none missing; third-party obligations retained                                                                                             |
| Bounded candidate/history secret scan          | PASS; 376 prospective files, 421 historical blobs and seven commit/tag objects; no matches from eight privately compared credential candidates and six pattern families |
| Documentation                                  | PASS; 484 relative links across 106 Markdown files, 45 referenced npm scripts, no broken links/scripts                                                                  |
| Ignore coverage                                | PASS; original 20 representative private-file probes plus five encrypted/history-artifact probes                                                                        |
| Application/experimental scope                 | PASS; zero apps/packages/test/migration/dependency changes; opt-in features remain off by default                                                                       |

Tests ran on Windows x64 Node v25.3.0, npm 11.15.0, using synthetic external operations. No live monitoring, bot Gateway login or real notification was started. Historical Phase 18 Linux, PostgreSQL and Redis evidence is retained with its dates; it was not rerun or relabeled as new Phase 19 verification.

No blocking credential exposure or unexplained private user-data finding was detected. Contact-like test fixture strings and public GitHub noreply literals were reviewed as expected. Known-value/pattern scanning has limits and does not certify that arbitrary unknown secrets never existed; unreachable objects/forks/provider caches are outside this check. Existing personal Git email metadata remains intentionally unchanged under the owner's acceptance.

## Findings and remaining manual actions

- **Critical/major blocking findings for this source-only change: none found.** This is not a claim that the hosted application is production-ready.
- **Minor:** npm reports deprecated @esbuild-kit tooling packages; no current vulnerability is reported. No forced upgrade or lockfile change was introduced.
- **License obligations:** keep upstream notices; review any future binary/image redistribution, contribution rights and operator policy/contact details. Metadata inventory is not legal certification.
- **Security intake:** owner should verify a private vulnerability-report route or respond to sanitized requests for one; no contact email or enabled GitHub feature was invented.
- **Operational limits:** own-account real integration, production HTTPS/callbacks, 24/7 compute, capacity, alerting and recovery remain each instance operator's deployment work. They do not imply a requirement to use the maintainer's infrastructure.
- **Owner approval still required:** PR review/merge, public repository visibility, any GitHub release, infrastructure change or hosted-bot launch. No automatic merge/visibility/deployment occurs in this task.

Final staged-content review passed for exactly 15 allowlisted files and 19 fresh generated client assets, with zero credential matches or sensitive artifact filenames. No application-code or unexpected deletion was staged.

## Commit/PR provenance and final recommendation

This verified content is prepared for a normal commit and push to release/phase-18-mit-self-hosting, with a PR targeting main. The commit hash is necessarily created after this document's precommit evidence; the final task result and PR supply that immutable identifier. Only an explicit staged allowlist is authorized. Stop rather than force-push if the branch rejects the update. Local main and all old history remain intact.

**GO for making the reviewed MIT self-hosting source public after owner-approved PR merge and visibility action. NO-GO for claiming a live hosted NAVI service, automatic public bot installation or verified real-world notification delivery from this phase.** No secrets, runtime artifacts or private Git backups are release inputs.
