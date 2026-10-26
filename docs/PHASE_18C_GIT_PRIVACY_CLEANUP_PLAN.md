# Phase 18C — Git email privacy cleanup plan

> Historical, canceled plan: Phase 19 records the owner's acceptance of existing commit-email disclosure. No history rewriting or VeraCrypt work is a release requirement or authorized continuation. Do not execute the old procedures below. Machine-specific paths have been replaced with generic examples.

Date: 2026-10-26. **Plan only; no history rewrite, install, force-push, commit, branch/tag deletion or visibility change performed.** Repository remains private. Working branch: release/phase-18-mit-self-hosting. Public source release remains **NO-GO**.

## 1. Verified scope

Inspection refreshed remote branches/tags, enumerated every local ref and advertised remote ref, read raw commit signature headers, and inspected GitHub PR metadata. Five non-symbolic local/remote-tracking branch refs reach seven distinct commits. No tags or replace refs were found. GitHub advertises main, feature/phase-15-cloud-architecture, and refs/pull/1/head; HEAD aliases main. There is one merge commit.

E1 is an opaque label for the one distinct non-noreply address found. Its actual value must never be copied into this document or a tracked mapping file. All seven author fields and three committer fields use E1; existing noreply committer identities must remain unchanged.

| Old commit ID                            | Author address class | Committer address class | Signature header            |
| ---------------------------------------- | -------------------- | ----------------------- | --------------------------- |
| 8979360afac987803fd78cd02efa97b2985249ab | E1                   | noreply                 | Present; trust not verified |
| 3e1377f80abb3a774ba521282bc369f86537505d | E1                   | E1                      | Absent                      |
| a6fec23397d7b00f65725ecfaccb0db550044ec5 | E1                   | E1                      | Absent                      |
| 69c75f4b6d723067349534ab6bfaea92196f0cfb | E1                   | E1                      | Absent                      |
| da063301685c7f5893750d0de204e8a7bb4966ed | E1                   | noreply                 | Present; trust not verified |
| c98cab894dbe89d4312ae40508c72f8b0f8e1c39 | E1                   | noreply                 | Present; trust not verified |
| 405726afc9ef7f6abbb4f9db50e065b630981229 | E1                   | noreply                 | Present; trust not verified |

Four commits contain signature headers. This is presence inspection, **not** cryptographic trust validation. No signed or unsigned tags exist at this snapshot. Git 2.52.0.windows.1 is available; git-filter-repo is not installed/available as a Git command. Python is present, but a suitable pinned filter-repo installation has not been tested or approved.

The local main branch is stale at 69c75f4b6d723067349534ab6bfaea92196f0cfb; GitHub main is 8979360afac987803fd78cd02efa97b2985249ab. Never use the stale local main as the replacement for GitHub main. The local release-preparation branch points to GitHub main but has seven uncommitted candidate files, including the untracked LICENSE/report/evidence. This plan adds another untracked documentation file. Git history alone does not back up that work.

GitHub PR [#1](https://github.com/NAVI-SL/NAVI-Live-Notifier/pull/1) is closed/merged. Its head is 3e1377f80abb3a774ba521282bc369f86537505d and its merge commit is 8979360afac987803fd78cd02efa97b2985249ab. Current accessible PR search returned one PR; no open PR was returned. The advertised refs/pull/1/head still points to the old head. Server-internal unadvertised refs, draft releases, artifacts, caches, forks, branch protections and collaborator clones have not been exhaustively verified. Do not infer their absence from local refs.

Three known disposable fixture clones remain privately under .local/phase18 and .local/phase18-mit. Five tracked Markdown/JSON files mention old commit IDs. Old audit hashes are historical evidence, not current refs; changing metadata does not edit those file contents. References in other sites or clones cannot be comprehensively enumerated here.

## 2. Exact replacement address — owner-confirmed

The GitHub connector profile exposes a non-noreply address, not the account's exact privacy address. Neither that address nor a numeric-ID-plus-login guess verifies the replacement. The owner has now explicitly supplied **226720061+NAVI-SL@users.noreply.github.com** and confirmed it is copied from GitHub Settings. This exact value is approved for use in this plan. It was not derived from the profile ID or login and has not been configured or applied to history.

Verification source: the owner's direct confirmation that the value came from [GitHub Settings → Emails](https://github.com/settings/emails) for NAVI-SL. The settings page was not independently inspected in this phase. This owner-attestation boundary is explicit; profile data, numeric derivation or syntax alone did not verify it. [GitHub's commit-email instructions](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address) explain account privacy and per-repository configuration; a future identity change does not alter prior commits.

After verification and approval, use that exact value for E1 only. Preserve author/committer names and all unrelated identities. Future local commits should use the verified noreply address through a separately approved per-repository user.email setting. Account web-commit privacy and blocking personal-email pushes should be reviewed manually; no setting is changed here. Do not use a global Git setting without a separate decision affecting other repositories.

## 3. Recommended approach

Use a **new disposable mirror cloned without local-object sharing from an immutable GitHub mirror backup**, rather than rewriting the dirty working repository. Preserve the current checkout and its private backups intact. Remote branch heads define the canonical published scope. The current release branch introduces no extra committed objects; map its old tip through the rewrite and recreate the corresponding release branch in the clean checkout later, with approval. If refreshed local-only commits appear, stop and expand the import/backup plan before rewriting; never discard them or bypass a fresh-clone safety refusal.

A private, email-only mailmap should map E1 to the verified replacement, outside every publishable repository. Its schematic single row is:

```text
<226720061+NAVI-SL@users.noreply.github.com> <OLD_EMAIL_E1>
```

The replacement is the exact owner-confirmed public noreply address. OLD_EMAIL_E1 is a deliberately unresolved private token: obtain its actual bytes only from local metadata after approval and never put them in a tracked file. Do not commit .mailmap containing E1: display remapping alone leaves raw metadata intact and would publish the address in a file. Git documents [email-only mailmap forms](https://git-scm.com/docs/gitmailmap); filter-repo can apply these to author, committer and tagger metadata.

Proposed rewrite invocation, **not executed**, inside the approved fresh mirror after backups and version checks:

```powershell
# privateMailmap is a verified absolute path OUTSIDE the publishable repository.
git filter-repo --mailmap "$privateMailmap" --preserve-commit-hashes --preserve-commit-encoding --prune-empty never --prune-degenerate never --replace-refs delete-no-add
```

Do not run this against the current checkout. Do not add --force to bypass fresh-clone checks, restrict it to only one contaminated branch, or expose/push replace refs. The hash-preservation option preserves literal hashes in messages, **not commit IDs**. Pruning is disabled to retain the original graph. The email-only mapping preserves names; file trees are expected identical. Existing signatures cannot survive changed metadata, and export/import strips them. The [filter-repo manual](https://github.com/newren/git-filter-repo/blob/main/Documentation/git-filter-repo.txt) documents filtering and safety behavior; use a reviewed, recorded version and inspect its installed help before executing. No version or dry run was executed today.

All seven original commit IDs will change because each author field changes; descendants also reference rewritten parents. Branch tips and any associated tags must follow the mapping. The one merge and all source trees must remain. Existing Verified labels/signatures are not preserved. Re-signing with another key would be a new attestation, not restoration of GitHub's or another signer's signature; do not impersonate those signers. Accepting signature loss is an explicit approval gate. If a tag appears before execution, stop for tagger/signature/release review rather than silently updating or deleting it.

## 4. Backup and freeze plan — prepare before any rewrite

1. Obtain a maintenance window and ask collaborators to stop pushes. Re-inventory remote heads, PR refs, tags, rules and local work; abort on unexpected movement. Record expected remote OIDs for later explicit leases.
2. Choose an owner-approved encrypted private backup location outside the publishable repository, with tested access. Backups contain the original personal metadata. Do not upload them, put them on a public branch, or assume .gitignore encrypts them.
3. Create a remote mirror backup including advertised PR refs and a separate local all-ref bundle. Verify each with Git bundle verification/fsck and test-restoring into a second isolated location. [Git bundle documentation](https://git-scm.com/docs/git-bundle) covers ref/object archives; bundles do not capture working-tree files.
4. Separately copy the reviewed modified/untracked candidate files with a path/content-hash manifest, preserving exact bytes. Record staged and unstaged state and newly added plan/report files. Filled environments, dependencies, caches and logs are not release files. If runtime secrets need disaster recovery, handle them separately in owner-controlled encrypted storage, never in the release patch/archive.
5. A binary diff can supplement backups for tracked changes but does not include untracked LICENSE/docs. Avoid Windows PowerShell text redirection for binary patches; use a byte-preserving API or Git's native output option. Do not stash, reset, clean, overwrite or delete the current worktree as a shortcut.
6. Keep an immutable backup plus a separate scratch mirror for filtering; do not filter the only backup. Verify backup restoration, checksums, tree/ref coverage and the current uncommitted file manifest before proceeding.

Backups and restoration are **planned, not performed or verified in this phase**. New backup paths and encryption keys are not invented. The working repository and three old fixture clones remain private and unmodified; after approved replacement, quarantine them from pushes until explicitly retired or safely migrated. Their old objects are intentional retained private backups, not evidence that the cleaned clone is clean.

## 5. Verification gates for the rewritten clone

All gates below are future checks; none is claimed as a successful rewrite today.

| Check                  | Acceptance criterion                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete map           | Every old reachable commit maps to one nonzero new commit; seven expected at this snapshot; no missing/new unexplained graph nodes                                                              |
| File integrity         | Each old tree equals its mapped new tree; blobs/migrations/lockfile/application bytes unchanged                                                                                                 |
| Graph integrity        | Parent OIDs equal mapped old parents; root/merge counts and parent ordering preserved                                                                                                           |
| Identity precision     | Raw commit/tag objects contain no E1 in author, committer or tagger fields; only E1 became the verified address; other identities, names, dates and messages remain unchanged                   |
| Signatures             | Four prior signature headers have the explicitly approved expected removal; no assertion of preserved verification                                                                              |
| Refs                   | Every approved head/tag/private audit PR ref resolves to its mapped object; no refs/original or replace aliases retain old objects; no branch/tag silently dropped                              |
| Secrets and PII        | Repeat bounded checks across all reachable blobs AND commit/tag objects; do not rely on mailmap-formatted Git log output; no old address in working files, messages, tags or exported artifacts |
| Repository health      | git fsck passes in scratch; object/ref inventory matches expectations; actual tool/version/logs retained privately                                                                              |
| Candidate work         | Restore only reviewed candidate files onto the mapped release branch in a new clean checkout; compare their manifests; do not merge old ancestry                                                |
| Application regression | Run dependency install, type/lint/format checks, full sequential suite and builds from sanitized source with synthetic fixtures; no real monitoring or sends                                    |
| Remote verification    | After separately approved updates, fresh independent remote clone has the exact new ref tips, no contaminated reachable raw metadata and expected file trees                                    |

Keep the old/new commit map private for troubleshooting and rollback. A private rewritten PR ref is not proof the GitHub-managed PR ref changed. Git fsck alone does not certify privacy. Historical SHA links in audit documentation may still point at server-retained commits; annotate them as historical rather than mass-editing application files or claiming those objects disappeared.

## 6. GitHub references and publication limits

Local history cleanup cannot remove GitHub-managed refs/pull/1/head, old PR commit/diff pages, cached/direct commit views, release assets, workflow logs/artifacts, forks, existing clones or third-party links. GitHub's [removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) explains read-only pull refs and server-side retention. A successful branch rewrite is not complete server-side privacy cleanup.

Review PR #1 with GitHub Support if necessary, including the effect on its diff/history. Support decides whether a personal-email request qualifies; assistance and purge are not guaranteed. No ticket or message was sent. Forks and external copies require owner coordination; no zero-retention promise is possible. Inspect inaccessible releases/artifacts, fork relationships, branch rules and external SHA consumers before deciding the residual risk is acceptable. A second new repository is not an automatic solution and must not be created without separate approval.

After verification, a **separate authorization** must name each remote branch permitted for replacement, including main. Do not use push --mirror, blanket --force or deletion refspecs. Plan an explicit atomic push with per-ref force-with-lease values captured at the freeze, conditional on server support; if atomic update is unavailable or a lease fails, stop rather than silently downgrade safety. Only the two existing remote heads are currently in replacement scope; any new release branch is a separate reviewed creation. Do not push refs/pull, backups, replace refs or private email mappings. If filter-repo removes origin, reconnect only to the independently verified private repository after local validation.

Check relevant branch protection/rules with the owner before any push; changes require separate approval and restoration afterward. A timeout has an uncertain remote outcome: inspect all remote tips before retrying. Keep the repository private through cleanup and external-reference review. Commit/push of license/docs, GitHub release creation, repository visibility and deployment remain separate actions, none authorized by approving a local rehearsal.

## 7. Rollback and existing clones

- Before push: leave the current worktree and immutable backups alone. Retain the failed scratch result privately, diagnose, and seek approval before deleting anything. No remote rollback is needed because no remote write occurred.
- After an approved remote replacement: freeze writes again. Prefer fixing forward on cleaned history. Restoring old refs is a last-resort separately approved operation using saved pre-rewrite refs and leases against the observed new refs. **It restores the personal metadata**, so keep visibility private and explicitly approve that privacy regression. Do not force an uncertain/stale rollback over collaborator work.
- Restore reviewed candidate work from its byte-preserving manifest, never by merging an old branch. Verify restoration in an isolated location before replacing any checkout.
- Owners/collaborators should create fresh clean clones after the update and archive old clones privately. Do not run a normal pull/merge from old history or push old branches/tags. Uncommitted work may be reapplied as reviewed file changes; any old commits to transplant need an explicit reviewed identity/parent strategy.
- Complete a post-rollback/post-migration ref, privacy and source-integrity audit. No destructive cleanup or remote rollback happens automatically.

## 8. Concrete staged procedure for approval — NOT EXECUTED

This is a proposed operator sequence, not a script to run now. Every stage stops if an exit code/check fails. The owner must first approve the private encrypted backup location, pinned tool installation, local rehearsal and loss of four signatures. A second approval is required for remote updates. Do not change these into one unattended command chain.

### A. Freeze and protect the work

Affected remote branches are **main** and **feature/phase-15-cloud-architecture**. The local **release/phase-18-mit-self-hosting** pointer/candidate work must also be preserved and later recreated on the mapped tip. No tags currently exist. The read-only **refs/pull/1/head** is audit/retention scope, not a writable push target. Keep the stale local main pointer in the private local backup only; it is not the canonical remote tip.

The following future PowerShell variables select a NEW private workspace only after the owner has verified its encryption/access controls. Check that it is outside the publishable repository; stop if any target directory/file exists. Source reads are permitted; do not move/delete the source repository.

```powershell
$repoPath = (Resolve-Path -LiteralPath (Read-Host 'Your local repository path')).Path
$remoteUrl = 'https://github.com/NAVI-SL/NAVI-Live-Notifier.git'
$privateRoot = (Resolve-Path -LiteralPath (Read-Host 'Approved encrypted private directory')).Path
$backupDir = Join-Path $privateRoot ('navi-history-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$remoteBackup = Join-Path $backupDir 'remote-before.git'
$rewriteDir = Join-Path $privateRoot ('navi-rewrite-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$privateMailmap = Join-Path $backupDir 'email-map.private'
# Before creating anything: check these resolved paths, encryption, ACLs,
# no existing destinations, and that neither directory is inside repoPath.
New-Item -ItemType Directory -Path $backupDir
git clone --mirror $remoteUrl $remoteBackup
git -C $remoteBackup fsck --full
git -C $remoteBackup bundle create (Join-Path $backupDir 'remote-all.bundle') --all
git -C $repoPath bundle create (Join-Path $backupDir 'local-all.bundle') --all
git -C $repoPath bundle verify (Join-Path $backupDir 'remote-all.bundle')
git -C $repoPath bundle verify (Join-Path $backupDir 'local-all.bundle')
$unstagedPatch = Join-Path $backupDir 'unstaged.patch'
$stagedPatch = Join-Path $backupDir 'staged.patch'
git -C $repoPath diff --binary "--output=$unstagedPatch"
git -C $repoPath diff --cached --binary "--output=$stagedPatch"
```

The diff output paths are passed as single arguments; do not use text redirection to write these patches. Check each command's exit status before the next command; the bare sequence above does not implement that guard automatically.

Separately copy and SHA-256 manifest these **eight current candidate paths** into a protected files/ directory: .env.example, CONTRIBUTING.md, README.md, docs/SELF_HOSTING.md, LICENSE, docs/PHASE_18_PUBLIC_RELEASE_READINESS.md, docs/PHASE_18C_GIT_PRIVACY_CLEANUP_PLAN.md and docs/evidence/phase18-results.json. Preserve bytes and directory paths. Before copying, compare this list to actual modified/untracked Git paths; stop on extras. Never copy filled environments, node_modules or the .local audit directory into the release snapshot. The patches alone cannot recover untracked files.

Restore each bundle into separate fresh validation directories and compare refs/object coverage. Restore the eight-file snapshot into a third fixture and verify every manifest hash. Save remote ref snapshots with a byte-preserving API and record main/feature lease OIDs. At today's snapshot they are 8979360afac987803fd78cd02efa97b2985249ab and 3e1377f80abb3a774ba521282bc369f86537505d respectively. Refresh immediately before any future push; do not assume these values remain current. No backup/restore operation has been carried out here.

### B. Prepare the private mapping and reviewed tool

Generate the actual email-only mapping without printing E1: parse raw author/committer metadata locally, exclude existing GitHub noreply addresses, assert exactly one distinct old address, and exclusively create email-map.private containing one line with the exact replacement above and E1 read from metadata. Assert E1 ownership/scope with the owner; abort on an unexpected second address. Read and validate it privately, never echo it or commit it. The private generator below is for review only; no populated mapping has been created in this phase.

The following proposed generator reads the old address from Git metadata and creates the private file exclusively; it does not display or hardcode the old address. **It has not been executed.**

```powershell
@'
import pathlib, re, subprocess, sys
repo, filename = sys.argv[1:]
replacement = b'226720061+NAVI-SL@users.noreply.github.com'
raw = subprocess.check_output(
    ['git', '-C', repo, 'log', '--all', '--format=%ae%x00%ce'],
    stderr=subprocess.PIPE,
)
addresses = {value.strip() for value in raw.replace(b'\n', b'\0').split(b'\0') if value.strip()}
old = {value for value in addresses if not (
    value.lower().endswith(b'@users.noreply.github.com') or value.lower() == b'noreply@github.com'
)}
if len(old) != 1:
    raise SystemExit('Unexpected identity count; stop without printing addresses.')
previous = next(iter(old))
if not re.fullmatch(rb'[^<>\s]+@[^<>\s]+', previous):
    raise SystemExit('Unexpected identity syntax; stop.')
with pathlib.Path(filename).open('xb') as handle:
    handle.write(b'<' + replacement + b'> <' + previous + b'>\n')
print('Private mapping created; values omitted.')
'@ | py - "$repoPath" "$privateMailmap"
```

Proposed pinned candidate: git-filter-repo **2.47.0**, as listed by [PyPI](https://pypi.org/project/git-filter-repo/). Use a private virtual environment rather than altering NAVI dependencies or global Python. Installation and Python 3.14 compatibility remain untested and require approval. One proposed installation sequence is:

```powershell
$toolDir = Join-Path $privateRoot 'navi-filter-repo-tool-2.47.0'
# Require toolDir not to exist; run only after tool-install approval.
py -m venv $toolDir
$toolPython = Join-Path $toolDir 'Scripts\python.exe'
& $toolPython -m pip install --only-binary=:all: 'git-filter-repo==2.47.0'
$filterRepo = Join-Path $toolDir 'Scripts\git-filter-repo.exe'
& $filterRepo --version
& $filterRepo -h
```

Verify the downloaded package against the reviewed PyPI release hash/source and record the resolved version before use. Do not treat a successful install as privacy validation. If the entry point/Python/options differ, stop for review rather than guessing or upgrading silently.

### C. Local-only rewrite and comparison

```powershell
git clone --mirror --no-local $remoteBackup $rewriteDir
Push-Location -LiteralPath $rewriteDir
try {
    & $filterRepo --mailmap $privateMailmap --preserve-commit-hashes --preserve-commit-encoding --prune-empty never --prune-degenerate never --replace-refs delete-no-add
    # Stop on a nonzero exit; do not override fresh-clone checks with --force.
} finally {
    Pop-Location
}
git -C $rewriteDir fsck --full
git -C $rewriteDir rev-parse --path-format=absolute --git-path filter-repo/commit-map
```

Read the commit map privately and run every Section 5 gate against the immutable backup, including all seven tree comparisons, mapped parents, exact targeted emails and expected signature loss. No old commit should map to zero. Inspect every rewritten ref, including the local audit copy of the pull ref. Only after these checks, create the local release-preparation branch in the new clean repository at the mapped original release tip; restore the eight reviewed files and verify their hashes. Keep the original checkout and all old fixture clones quarantined from pushes. Configuring the verified noreply for future commits, committing the candidate and creating a remote release branch remain separate approved steps.

### D. Remote replacement — separate future approval only

After all local validation and owner sign-off, recheck private visibility, branch rules, maintenance freeze and current remote OIDs. Prepare an explicit atomic push that names only main and the feature branch and uses both recorded leases. The conceptual form is:

```powershell
# In the validated rewrite mirror, after restoring ONLY the verified origin.
# expectedMain/expectedFeature are independently checked freeze-snapshot OIDs.
git push --atomic "--force-with-lease=refs/heads/main:$expectedMain" "--force-with-lease=refs/heads/feature/phase-15-cloud-architecture:$expectedFeature" origin 'refs/heads/main:refs/heads/main' 'refs/heads/feature/phase-15-cloud-architecture:refs/heads/feature/phase-15-cloud-architecture'
```

Do not run this under current approval. Do not add --mirror, --force, tags or refs/pull. If atomic updates/protections/leases prevent it, stop. On a lost response, inspect remote tips before further action. Publishing the new release branch needs its own reviewed refspec/approval. A fresh remote clone must then pass the raw-email/tree/ref checks, and PR #1/server retention still needs independent resolution. No local Git command can guarantee deletion from GitHub caches or other clones.

## 9. Required approvals and decision

| Gate                                                                       | Current status                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Exact account-provided noreply address                                     | Owner-confirmed from Settings; exact value recorded above, not yet applied             |
| Install/pin git-filter-repo and create encrypted private backups/rehearsal | Not performed; approve location/tool and validate restoration first                    |
| Accept four stripped signatures and all seven changed IDs                  | Explicit owner approval required                                                       |
| GitHub PR #1 retention, protections and external references                | Partially verified; residual privacy decision and any support contact require approval |
| Local scratch rewrite                                                      | Not authorized in this phase                                                           |
| Remote main/feature replacement and optional new release branch            | Separate explicit push authorization and maintenance window required                   |
| Public visibility / release / deployment                                   | Not authorized; remain NO-GO                                                           |

The MIT license (2026 NAVI-SL) remains complete. Phase 18B's 537 passing tests/builds remain dated evidence; no application code changed here and the suite was not rerun merely for this plan. Today's executed checks were read-only ref/signature/PR inspection, tool availability, plan link/format validation, whitespace and bounded candidate-secret checks. All 479 local documentation links resolve; six proposed PowerShell blocks parse with zero errors, and the proposed Python generator passes AST parsing only. All Git refs remain unchanged; 373 prospective files plus 19 generated client assets had zero credential matches. No populated mailmap, private backup, rewrite rehearsal or remote update was created/executed. No rewrite or rollback is represented as tested. **GO for owner review of the plan; NO-GO for execution or public release pending the gates above.**
