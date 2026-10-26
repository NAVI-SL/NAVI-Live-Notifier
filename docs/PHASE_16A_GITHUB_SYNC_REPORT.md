# Phase 16A — GitHub feature-branch synchronization

Date: **2026-10-25**, Asia/Colombo. **GO for reviewed private feature-branch upload, subject to explicit commit/push approval. NO-GO for deployment, queue activation or public launch.** Nothing was committed, pushed, merged or deployed. No real Discord message, Gateway login or livestream monitoring was initiated.

## 1. Original versus GitHub project differences

Compared the original development project at `D:\Project\NAVI Live Notifier` with the existing GitHub checkout at `D:\Project\NAVI-Live-Notifier-GitHub`. The original is not a Git repository. The GitHub checkout was clean on `main`, with no staged or untracked files, before any synchronization. Its remote is `https://github.com/NAVI-SL/NAVI-Live-Notifier.git`.

Fetched `origin/main` read-only; local main and fetched main were identical at **69c75f4b6d723067349534ab6bfaea92196f0cfb**, with zero ahead/behind commits. GitHub repository metadata independently confirmed **private** visibility and `main` as the default branch. No repository settings were changed.

Initial filtered inventory: **352 original files versus 277 GitHub files**. There were 79 original-only files, four GitHub-only files, 55 substantive text differences and 215 differences consisting solely of CRLF/LF conversion. Three additional files were byte-identical. These are source-tree counts, not counts of generated dependencies or every nested excluded artifact.

The GitHub copy deliberately differed through stronger upload/container ignores, replacement-only environment examples, an isolated local Compose project/ports, a portable README and redacted historical evidence. These are not older functionality to overwrite. Reviewed Phase 15A–15F reports, application/configuration code, tests, migration/journal and deployment files before preparing a hash-guarded plan.

## 2. Files synchronized and preserved

The guarded synchronization **added 79 files and updated 39 files**. It verified source and destination hashes before writing, skipped unchanged/line-ending-only content, sanitized new/updated documentation in memory, rejected known credential matches and performed no deletion. The complete copied-file list and final SHA-256 values are in [sync manifest](PHASE_16A_SYNC_MANIFEST.json).

| Area               | Included changes                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord backend    | Command Discord adapter, processor/runtime, opt-in startup, acknowledgment and existing private broker compatibility.                                                                              |
| Dashboard          | Command submission/status routes, UI acknowledgment states, authenticated guild-scoped integration, safe immediate disable and existing HTTP mode.                                                 |
| Shared packages    | Strict command schemas, environment flags, durable repository/admission, private role readiness and schema exports.                                                                                |
| Database           | Additive migration `0007_phase15c_commands.sql`, its snapshot and journal entry. **Existing SQL migrations 0000–0006 match their committed blobs exactly.** No normal database migration executed. |
| Deployment/tooling | Reviewed Render/backend examples, role-grant SQL, mode-aware preflight, health/start/proxy configuration, integration and safe operational scripts.                                                |
| Dependencies/tests | Verified manifests and lockfile, focused command/recovery/security/cloud tests and supporting earlier Phase 14 fixes absent from main. No new dependency version chosen in this task.              |
| Documentation      | Phase 14B–15F implementation/audit/plan evidence and required active roadmap/progress/deployment/security updates. Historical results remain historical.                                           |

Preserved all four GitHub-only artifacts: `docs/GITHUB_FILE_MANIFEST.json`, `docs/GITHUB_READINESS_REPORT.md`, `docs/evidence/UPLOAD_PRIVACY_NOTE.md` and `docs/evidence/github-readiness-results.json`. Existing privacy-only historical differences were retained. Older manifests/reports are explicitly dated and are not current verification receipts.

Preserved the local Compose name `navi-github-local`, loopback PostgreSQL/Redis ports **55432/56379**, private-password requirement and all safe local example placeholders. Existing stronger ignore rules were retained and extended for ECDSA/DSA SSH key names, `.pgpass` and `.envrc`. The portable README was augmented with current Phase 15 guidance rather than replaced by the original README.

Repository-specific preparation adds `.gitattributes`, this report, the sync manifest, [sanitized verification evidence](evidence/phase16a-results.json) and [proposed PR description](PHASE_16A_PR_DESCRIPTION.md). Source/configuration functionality otherwise matches the verified original after normalizing harmless line endings. No newer GitHub-only files were removed.

## 3. Excluded files and privacy handling

Excluded actual `.env`/service environment files, credentials, tokens, private keys, Git metadata from the source, `node_modules`, `.next`/dist/out/coverage, caches, logs, `.local`, temporary files, database data/dumps/backups, archives, personal tooling folders, generated Next files/assistant instructions and private evidence images. Only safe environment **examples** were included. Intake recorded 26 skipped file/directory entries; directory contents were intentionally not enumerated/copied.

New/updated historical documentation and JSON evidence were redacted for Discord identifiers, original machine paths and any known credential candidates before writing. Existing redactions were preserved. Test fixtures keep their synthetic IDs/credentials so authorization, signatures and deduplication remain testable. No real credential values appear in this report or verification output.

Dependencies/build outputs were generated independently inside this checkout for verification; they remain ignored and must not be uploaded. Disposable PostgreSQL/Redis containers used synthetic credentials, loopback-only dynamic ports and tmpfs data, and were removed. No original volume or database was used or deleted.

## 4. Branch, index and diff status

Created **feature/phase-15-cloud-architecture** directly from the verified fetched main using `git switch --no-track -c feature/phase-15-cloud-architecture origin/main`. Existing Git history, main and origin/main remain at the original base commit. No merge/rebase or new commit was performed.

Only the reviewed file allowlist is staged for approval. **126 reviewed files are staged: 84 additions and 42 modifications, with zero deletions and no unstaged content changes.** Final index checks are recorded in the evidence. No sensitive/generated file is staged. No branch upstream was assigned; no branch was pushed. Diff review confirms the expected additions/updates and **zero deleted files**.

The first checkout check failed formatting because global `core.autocrlf=true` produced CRLF files while existing Prettier requires LF. Normalized text without changing substantive content and added `* text=auto eol=lf`. Diff review caught one historical SQL blob whose committed bytes are CRLF; restored it byte-for-byte and added `packages/database/migrations/*.sql -text`. All prior SQL migration blobs are unchanged. Five newly privacy-formatted JSON files also needed Prettier formatting. Final checks pass; these intermediate failures are not concealed.

## 5. Tests and actual results

All commands executed from the GitHub checkout using its own `node_modules`. No original dependencies/build outputs or private environment files were copied.

| Check                                            | Result / evidence boundary                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --include=dev --no-audit --no-fund`      | **PASS**, exit 0, 312 packages installed from the synchronized lockfile. Legacy esbuild-kit deprecation warnings remain; they are not reported as vulnerabilities.                                                                                                          |
| `npm run check`                                  | **PASS**, TypeScript workspaces/tools, ESLint zero warnings, Prettier and **537 tests / 43 files**. External Discord/provider/OAuth test responses are simulated.                                                                                                           |
| `npm run build`                                  | **PASS**, shared packages, Next.js optimized production output, bot and worker. No configured service startup.                                                                                                                                                              |
| `npm run env:check:example`                      | **PASS**, structural examples only; no services contacted. Real environment readiness is not established.                                                                                                                                                                   |
| Isolated command integration                     | **PASS, 27 scenarios**, actual fresh local PostgreSQL 17, migrations through 0007, strict service-role grants, HTTP admission/status, concurrency, expired leases, owned fixture crashes, recovery, uncertain effects and rollback. Discord/session adapters are synthetic. |
| Isolated Redis compatibility                     | **PASS, five probes**, native TCP, SET NX/TTL, transactions, Pub/Sub and list queue. Local Redis 7 only; not Upstash cloud TLS.                                                                                                                                             |
| Fixture cleanup                                  | **PASS**, both newly created tmpfs containers removed; normal database unused.                                                                                                                                                                                              |
| Full and production `npm audit --json`           | **PASS**, exit 0, **zero vulnerabilities** in both graphs at verification. No forced fix or package update.                                                                                                                                                                 |
| `git diff --check` / staged equivalent           | **PASS**, no whitespace errors or unexpected deletions.                                                                                                                                                                                                                     |
| Source parity / preservation                     | **PASS**, 352 inventoried original source files unchanged; synchronized application/tooling/manifests match verified source after line-ending normalization. Prior SQL blobs unchanged.                                                                                     |
| Secret and ignore checks                         | **PASS within coverage**; see section 6 and evidence for final counts.                                                                                                                                                                                                      |
| Cloud/live Discord/provider/production readiness | **BLOCKED / not attempted**; outside preparation approval. Prior Phase 15F Linux image results are historical, not a new Phase 16A cloud or ARM64 validation.                                                                                                               |

The copied integration harness was invoked through fresh temporary fixture URLs, not an operator's normal database. Its 29 PASS lines consist of **27 test scenarios plus two fixture-cleanup confirmations**. No real sender or monitoring entrypoint was started.

## 6. Secret-scan and staging review

Compared all **361 prospective source files** and 19 generated browser assets against **eight known credential candidates** read privately in memory. Also checked six pattern families: private-key blocks, Google API keys, GitHub tokens, AWS access keys, Discord tokens and credential-bearing Discord webhook URLs. **Zero matches**. No credential value was printed or written to evidence.

The same bounded scan examined **276 existing Git history blobs**: **zero matches**. Existing history was preserved, not rewritten. These scans are bounded and cannot certify absence of every unknown secret or historical personal identifier. Commit-author metadata was not altered.

Verified **35 ignore/keep cases**, including root/nested environment files, SSH keys, private local credential files, dependencies/build output, logs, caches and dumps. Safe environment examples, the lockfile and SQL migrations remain includable. Final scanning covers staged blobs as well as source/client assets; counts and any residual risks are in the evidence. Only the reviewed allowlist was staged, with no deletion or sensitive filename.

## 7. Remaining risks and manual gates

1. **Commit/push/PR creation require owner approval.** No upload occurred. Re-fetch main and review any changes before a later upload; do not automatically merge or overwrite newer remote work.
2. Real external OAuth/install/livestream sends, continuous operation, HTTPS callbacks, operational alerts, offsite recovery, measured capacity and cloud/provider eligibility remain unverified. See [Phase 15F plan](PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md). Automated success is not live production evidence.
3. Complete continuously running free/no-card deployment remains **NO-GO**. No host, budget, credentials, DNS or public bot settings were changed.
4. HTTP remains the default; consumer remains disabled. Migration 0007/role grants and feature activation require a separately approved target and sequence. Do not apply them to normal development data as part of upload.
5. Old source manifests/evidence are dated historical records, with privacy images omitted. Use the new report/manifest/evidence for this handoff; do not claim their old hashes describe the new branch.
6. Dependency audits do not certify OS images, platform compliance or unknown vulnerabilities. Deprecated transitive tooling and earlier documented npm override-listing caveats were not disguised as fixed by this synchronization.

## 8. Proposed commit, push and Pull Request

Proposed commit/title: **feat: add opt-in PostgreSQL dashboard command architecture**.

Proposed PR body is saved in [PHASE_16A_PR_DESCRIPTION.md](PHASE_16A_PR_DESCRIPTION.md). Proposed base: `main`; head: `feature/phase-15-cloud-architecture`. No PR was created.

**Commands below are proposals only, to run after explicit approval and a fresh staged-secret/diff review:**

```powershell
Set-Location 'D:\Project\NAVI-Live-Notifier-GitHub'
git fetch origin main
git rev-list --left-right --count main...origin/main
git status --short --branch
git diff --cached --check
git diff --cached --stat
# If origin/main advanced or new local changes exist, stop and review first.
# Reviewed files are already staged; do not stage new secrets or build output.
git commit -m "feat: add opt-in PostgreSQL dashboard command architecture"
git push --set-upstream origin feature/phase-15-cloud-architecture
```

Keep the repository private. After approved upload, use the saved description to propose a PR into main for review. Do not auto-merge, activate flags or deploy. This task does not authorize executing these commands.

## 9. Recommendation

**GO for a reviewed private feature-branch upload after owner approval.** Independent installation/checks/builds, disposable integration tests, bounded source/history/client secret scanning, source parity and a reviewed staged diff support that narrow decision.

**NO-GO for public launch, cloud deployment or PostgreSQL mode activation.** Stop after Phase 16A and wait for approval before committing or pushing.
