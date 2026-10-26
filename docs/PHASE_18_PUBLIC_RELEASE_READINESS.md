# Phase 18 — MIT public self-hosting release readiness

## Current disposition — Phase 19

The owner explicitly accepts possible disclosure of existing personal email addresses in Git commit metadata. That privacy gate is resolved by informed acceptance, not by redaction. History rewriting and VeraCrypt setup/rehearsal are canceled, and no success is claimed for them. The complete MIT notice is 2026 NAVI-SL. The [Phase 19 readiness report](PHASE_19_PUBLIC_RELEASE_READINESS.md) is authoritative for the current source-publication decision. Earlier PASS/FAIL/BLOCKED decisions below are dated historical findings, not current rewrite prerequisites. Hosted-bot launch and cloud production readiness remain separate.

Date: 2026-10-26. **Preparation complete; NO-GO for public GitHub visibility.** The owner has selected MIT. The updated license now names NAVI-SL; Git author/committer email privacy review remains a publication gate. See the Phase 18B review below. This is a source-distribution review, separate from launching a centrally hosted NAVI bot.

## Branch, scope and changes

Created release/phase-18-mit-self-hosting from current origin/main (8979360afac987803fd78cd02efa97b2985249ab). Existing uncommitted Phase 18 documentation/example work was preserved. Local main was not checked out or modified, and the preparation branch has no upstream that could accidentally target main. Repository metadata still reports private. No commit, push, merge, release, public visibility change or deployment was performed.

Changed files:

- [LICENSE](../LICENSE): complete standard MIT text, copyright year 2026, holder NAVI-SL; no extra license terms.
- [README](../README.md): selected MIT status, default-branch clone instructions and independent self-hosting boundaries.
- [CONTRIBUTING](../CONTRIBUTING.md): replaces obsolete no-license statement with MIT/holder status and contributor rights/notice guidance.
- [SELF_HOSTING](SELF_HOSTING.md): own Discord/YouTube/Kick credentials, safe local setup, continuous-operation prerequisites and explicit verification limits.
- [.env.example](../.env.example): own-credential reminder and explicit HTTP transport/disabled queue flags retained from the prior Phase 18 review.
- This report and [sanitized evidence](evidence/phase18-results.json).

No application behavior, migration, package/lockfile, real configuration, credential or existing database was changed. Safe local fixtures/logs remain ignored and must not be published.

## MIT and third-party licensing

The complete [standard MIT terms](https://opensource.org/license/mit) are in LICENSE. The project-specific notice is **Copyright (c) 2026 NAVI-SL**, as supplied in the updated file. Phase 18B compared the complete permission, notice and disclaimer text with the public SPDX MIT reference, normalizing whitespace and quote typography: PASS. No extra terms or unresolved copyright field remain. This verifies the text, not independent legal ownership.

Reviewed all 413 locked external package entries using installed metadata where available and lock metadata for other-platform optional packages. Declared licenses include 307 MIT, 45 Apache-2.0, 15 ISC, 12 MPL-2.0, ten LGPL-3.0-or-later, four combined Apache/LGPL/MIT variants, one CC-BY-4.0 and other permissive/public-domain declarations. None lacked a metadata license. This is an inventory, not a legal certification or verification of every nested source file's provenance.

| Component                                                      | Finding / required treatment                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sharp/libvips optional native packages                         | LGPL-3.0-or-later and combined Apache/LGPL/MIT declarations across 14 platform variants. Preserve upstream notices and review source/relinking obligations before redistributing binaries/images. Do not relabel these MIT.                                                                                                                                                       |
| lightningcss and platform variants                             | MPL-2.0 declarations across 12 entries; preserve notices and review file-level source obligations for redistributed modifications.                                                                                                                                                                                                                                                |
| caniuse-lite                                                   | CC-BY-4.0 dataset; preserve upstream attribution.                                                                                                                                                                                                                                                                                                                                 |
| Core packages including Next/React, Discord.js, Drizzle and pg | Permissive metadata declarations; retain their respective notices.                                                                                                                                                                                                                                                                                                                |
| Tracked screenshots, fonts and binary assets                   | No tracked PNG/JPEG/WebP/SVG/ICO/GIF/font/video/PDF files found. The CSS names system/fallback fonts rather than bundling font files. Remote API images and platform names/trademarks are not relicensed by MIT.                                                                                                                                                                  |
| Docker/Redis/PostgreSQL/Node images                            | Separate third-party terms apply; the source license does not license container contents. Current Redis 7 image previously resolved to 7.4.11. [Redis's official licensing](https://redis.io/legal/licenses/) identifies 7.4–7.8 as RSALv2/SSPLv1, not the older BSD terms. Do not advertise every container dependency as MIT/open source. No image version/license was changed. |

Installed Sharp, lightningcss and caniuse-lite license files were inspected for their declared terms. No vendored third-party binaries were added. Source-only distribution does not grant platform trademark/image rights or certify a future binary/container release. Before such a release, preserve notices and complete the applicable third-party distribution review. The owner must also confirm rights in project-authored code and contributions.

## Security and Git-history audit

Bounded scans privately compared eight known credential candidates and six common credential-pattern families against candidate text and 421 unique reachable history blobs. **No credential matches found.** Seven reachable commits were reviewed. Eight contact-like file hits were reviewed as synthetic URI userinfo in tests, rather than real contacts. No confirmed private IDs, user-home paths, screenshots or personal infrastructure dependencies were identified in current distributable source. Final scan covered 372 prospective source/documentation files and 19 generated web-client assets: zero credential matches or sensitive filenames. All 477 local documentation links resolved across 103 Markdown files; 45 script references were recognized. Formatting and Git whitespace checks passed; nothing is staged.

**Major privacy finding:** seven reachable commits contain non-noreply author-email metadata. No raw email/name is reproduced in this report. Owner consent to disclosure or a separately approved coordinated history-sanitization plan is needed before public visibility. No Git identities/history were changed. No credential rotation is currently indicated by a confirmed match; if a real exposure is subsequently found, owner-authorized revocation/rotation is required, not merely deleting the file.

All 20 representative ignore probes passed, including filled root/service/nested environments, SSH keys, logs, dumps, local fixtures and build/dependency directories. Safe example files deliberately remain tracked. Loopback broker/database URLs are documented local defaults, not exposed endpoints; there is no original maintainer private backend required by an independent instance. Security scanning cannot prove arbitrary unknown secrets never existed; unreachable objects, reflogs, forks and provider-side scans are outside the bounded history check.

## Fresh-install results and actual commands

A new remote main clone was created under an ignored isolated directory. Only enumerated safe candidate files (MIT, examples and guides) were overlaid; no real environment or pre-existing node_modules was copied. Windows x64 ran Node 25.3.0/npm 11.15.0; the runtime harness uses bundled npm 11.6.2. Linux x64 used Node 24.22.1/npm 11.19.1. Node 24 remains recommended; Windows Node 24, native macOS and fresh ARM64 were not separately tested.

| Check                                          | Result                                     | Boundary                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| npm ci --include=dev --no-audit --no-fund      | PASS Windows and Linux                     | Linux full tracked-source archive from the new clone; no Windows dependencies copied                                                             |
| npm run typecheck / lint / format:check        | PASS Windows and Linux                     | No source assertions or compiler checks weakened                                                                                                 |
| npm run test -- --maxWorkers=1                 | PASS 537 tests / 43 files on each platform | Complete suites, synthetic external responses; Linux check container network disabled                                                            |
| npm run build                                  | PASS Windows and Linux                     | Shared packages, optimized Next.js, compiled bot/worker                                                                                          |
| npm run env:check:example                      | PASS                                       | Safe example validation; no external API connection                                                                                              |
| npm run db:migrate and db:check                | PASS                                       | Eight migrations in each of two fresh disposable PostgreSQL 17 databases, repeat safety and independent marker isolation                         |
| npm run test:commands:integration              | PASS 27 scenarios                          | Real isolated PostgreSQL/HTTP workflow; mocked Discord/session adapters                                                                          |
| npm run test:redis:compatibility               | PASS five probes                           | Disposable native Redis; not actual managed Upstash TLS certification                                                                            |
| npm run services:up / services:down            | PASS                                       | Uniquely scoped fixture Compose project, migrations persisted after restart; only newly created fixture volumes removed                          |
| Fresh runtime harness                          | PASS 18 scenarios                          | Synthetic OAuth state/client initiation, two independent database configurations, dev/compiled/smoke startup and web production-wrapper liveness |
| npm audit --json / npm audit --omit=dev --json | PASS zero findings                         | Registry state at execution time, not a future guarantee                                                                                         |

**Retained failures:** initial default-parallel validation overlapped Windows and Docker workloads. Windows first had 536 pass/one 5-second subprocess timeout; its next concurrent attempt had 535 pass/two CLI timing failures. Linux had 535 pass/two subprocess/loopback timeouts. The focused Windows startup test then passed, and complete sequential suites on both platforms passed with one worker and unchanged assertions. Scheduling-sensitive test deadlines remain a minor test-reliability risk; these failures are not silently erased or represented as clean first-run success. No application defect or workaround was introduced on this evidence.

The earlier review also found a separate production-Docker-context test limitation: .dockerignore excludes examples needed by one source-layout test. This round uses complete tracked source for Linux tests, rather than claiming the filtered production image contains every source test fixture.

## What startup verification proves

The website health route returned 200, anonymous protected APIs returned 401 and protected dashboard navigation returned 307. Synthetic OAuth initiation persisted state and generated the corresponding test client URL; it was not followed to Discord. Two isolated configurations had independent database markers. This supports independence from original developer infrastructure, not completed real OAuth sessions or simultaneous authenticated bots.

Bot and worker dev/compiled smoke checks used an empty bot token and disabled monitoring, therefore run **scaffolds**, not live Gateway/monitoring. Production guards intentionally reject missing credentials/disabled monitoring with exit one; this is fail-closed behavior, not healthy production readiness. Enabled-startup failure tests target an unreachable loopback database and cannot reach sends. Website backend HTTP liveness is not external HTTPS or all-dependency readiness, and db:check only performs connectivity.

All disposable application process trees/containers were stopped. Windows fixture termination is not proof of graceful production shutdown. Original PostgreSQL/Redis data and uncertain delivery records were not used or changed. No real Discord/YouTube/Kick credentials were supplied to test runtimes, no public webhook subscriptions were changed and no real notification was sent.

## Self-hosting guide and checklist

| Requirement                                                               | Status                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| README, CONTRIBUTING, SECURITY, installation/configuration guides         | PASS reviewed; links/scripts checked in final validation                    |
| MIT selection and complete text                                           | PASS; 2026 NAVI-SL notice and complete standard terms verified              |
| .gitignore and safe .env.example                                          | PASS                                                                        |
| Fresh install, migrations, datastore connectivity and non-sending startup | PASS within boundaries above                                                |
| Own Discord app, callback, bot invitation and minimum permissions         | PASS instructions/simulations; BLOCKED real consent/install/Gateway         |
| Own Google YouTube API and Kick developer credentials                     | PASS instructions; BLOCKED actual provider credentials/account lookup       |
| Real livestreams, webhooks and Discord delivery/dedup                     | BLOCKED owner-controlled external test; automated simulations are not proof |
| Persistent operation, backups, HTTPS and alerting on chosen host          | Documented prerequisites; BLOCKED hosted operational verification           |
| Git-history public privacy                                                | BLOCKED explicit owner decision                                             |
| Dependency/asset license review                                           | PASS metadata/asset inventory; manual notice/rights obligations remain      |
| Upload, merge, visibility change or GitHub release                        | NOT AUTHORIZED; none performed                                              |

The [self-hosting guide](SELF_HOSTING.md) covers clone/npm, private environment precedence, own Discord app and minimum Guilds intent, exact OAuth callback, own YouTube/Kick applications, local PostgreSQL/Redis, explicit migrations, separate app startup, dashboard registration/channel/template settings, health semantics and troubleshooting. It now explains continuous operation with a service manager and the owner's controlled monitoring activation. Local Compose supplies only datastores; a full send-capable one-command application installer was not added.

No paid managed service or original developer infrastructure is required to run source locally. Hardware, Internet, storage, public HTTPS/domain and backup resources may cost money. Docker Desktop and third-party images have separate terms. Sleeping free hosting cannot promise 24/7 monitoring; source readiness does not approve the full free-cloud architecture or a central hosted NAVI launch. The operator of each independent instance controls its own allowlists, applications and external-send approval.

## Outstanding issues and decision

1. **Resolved in Phase 18B:** copyright notice now names NAVI-SL; standard MIT terms match. The owner remains responsible for project/contribution rights.
2. **Major / manual:** approve Git metadata disclosure or a separate history-sanitization procedure; do not rewrite on this task's authority.
3. **Minor / documented:** parallel test timing is resource-sensitive; sequential complete-suite results are reproducible, but CI scheduling/deadlines warrant separate focused review.
4. **Manual release obligation:** preserve dependency notices and review applicable LGPL/MPL/attribution/image terms for any binary/image distribution. MIT covers project-owned material, not everything downloaded during installation.
5. **Unverified operations:** own-account consent/install, provider lookups, controlled LIVE notifications, continuous uptime, public HTTPS and offsite recovery remain operator checks requiring approval; no fake verification receipts.
6. **Approval gate:** review the local diff before separately authorizing commit/push. Publication, merging and deployment need separate approval.

**GO for owner review of the prepared MIT self-hosting candidate; NO-GO for public visibility now.** No further phase, public launch or infrastructure action is initiated.

## Phase 18B — Final license and Git privacy review

Date: 2026-10-26. The updated LICENSE contains the complete standard MIT terms with copyright 2026 NAVI-SL. The permission/notice/disclaimer body matches the public SPDX MIT text after whitespace/quote normalization. No copyright placeholder remains in LICENSE or active release statements. README and CONTRIBUTING were corrected to remove obsolete holder-pending claims. Environment-example placeholders deliberately remain safe; historical UI/configuration placeholders are unrelated to copyright.

Remote branches and tags were fetched read-only before reviewing every reachable local/remote branch. The audit covers 5 non-symbolic branch/tag refs and 7 unique reachable commits. Across the deduplicated history, 7 commits have non-noreply author addresses and 3 have non-noreply committer addresses (one distinct non-noreply address, not reproduced). Per-ref counts are in the sanitized evidence and overlap; do not sum them as unique commits. The addresses may identify the owner/contributors; a filled license does not authorize disclosing those addresses.

**Remaining major blocker:** explicit owner consent to publish the existing email metadata, or a separately approved coordinated sanitization plan followed by a re-audit. No identities, branches or history were rewritten. Existing public metadata cannot be made private merely by changing a future Git identity. Do not publish raw audit logs or email lists.

The refreshed security audit checks candidate files, historical blobs, and reachable commit/tag content against known credential candidates and common patterns. No match means no confirmed exposure within this bounded scan; it does not prove arbitrary unknown credentials are absent. Credentials discovered later require owner-authorized rotation/revocation before publication. Reflogs, unreachable objects and other forks remain outside the scan. Third-party metadata inventory still covers 413 locked packages, with 0 missing license declarations. LGPL/libvips, MPL/lightningcss, CC-BY/caniuse-lite and Redis image terms remain independent obligations; no dependency has been relicensed as MIT. Source-only readiness does not certify a binary/image redistribution.

Phase 18B final verification: **PASS** 537 tests / 43 files using one test worker, TypeScript, lint, formatting and production builds in the existing isolated Phase 18 clone with current safe review files overlaid. Full and production dependency audits each report zero vulnerabilities. The bounded scan found zero matches across 372 prospective files, 19 generated client assets, 421 historical blobs and seven commit/tag objects. All 20 representative ignore probes passed. All 478 local links resolve across 103 Markdown files, and 45 referenced scripts exist. The license header and complete terms passed comparison, with zero unresolved copyright declaration placeholders. Repository visibility remains private; nothing is staged. Exact sanitized results are in [the evidence](evidence/phase18-results.json). Earlier Windows/Linux installation and integration results remain dated Phase 18 evidence, including retained parallel-timing failures and successful sequential reruns. No real login, Gateway, live notification, production uptime or offsite recovery is newly verified.

**Decision: NO-GO for public GitHub release pending Git metadata privacy resolution and explicit publication/upload approval.** The license-holder blocker is resolved in the supplied file. No deploy, send, commit, push, merge or visibility change was performed.

## Phase 18C — History cleanup planning

A complete [Git privacy cleanup plan](PHASE_18C_GIT_PRIVACY_CLEANUP_PLAN.md) now covers email-only filter-repo mapping, private backups/restore, unchanged source-tree/graph verification, explicit remote leases, collaborator migration and rollback. All seven commits require new IDs; four contain signature headers (trust not verified), and no tags were found. Merged PR #1 has an advertised read-only pull head that cannot be removed by a local branch rewrite.

The owner has confirmed the exact GitHub-provided noreply address in the cleanup plan. Verification is owner attestation from Settings, not a derived address or independently inspected settings page; it has not been configured or applied. git-filter-repo is not installed. Installation, backup creation/restoration, local rewrite, signature removal, remote branch replacement (including main), PR/support actions and public visibility require their respective approvals. No history rewrite, installation, force-push, branch/tag deletion, code change or deployment occurred. The refreshed inventory and plan checks do not replace Phase 18B test evidence. Planning checks passed: 479 local links, six PowerShell syntax parses, Python AST parsing, format/whitespace, bounded secret scan and unchanged-ref comparison. These are not evidence of successful backup restoration or rewriting.

**Phase 18C decision: plan ready for review; execution BLOCKED and public source release NO-GO.** The noreply-value gate is resolved by owner confirmation. Approve the encrypted backup location, pinned tool installation, signature/hash impacts and local rehearsal first; separately approve any remote replacement and residual GitHub retention risk. The original checkout and all uncommitted candidate files remain preserved.

## Phase 18D — Local rehearsal approval checkpoint

The [local rehearsal preflight report](PHASE_18D_LOCAL_REHEARSAL_REPORT.md) records unchanged original/remote refs, seven reachable commits, four signature headers and no tags. Both the Git command and active Python lack git-filter-repo. No installation, backup storage or rewrite has occurred.

Proposed private storage is <PRIVATE_BACKUP_ROOT>, with isolated backups, scratch fixtures and a pinned tool environment. Drive encryption could not be verified with current permissions. Explicit installation/location approval and owner confirmation of an encrypted, non-synced location are required before storing original-history backups. Backup restoration must pass before any disposable rewrite; failure is a mandatory stop.

**Phase 18D: preflight PASS; rehearsal BLOCKED awaiting approvals; public release remains NO-GO.** This is not a completed rehearsal or a claim that rewritten IDs/signature losses have been verified. No original or remote history has changed.
