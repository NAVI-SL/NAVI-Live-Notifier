# Phase 18D — Local history rehearsal preflight

> Historical, canceled plan: Phase 19 records the owner's acceptance of existing commit-email disclosure. No history rewriting or VeraCrypt work is a release requirement or authorized continuation. Do not execute the old procedures below. Machine-specific paths have been replaced with generic examples.

Date: 2026-10-26. Status: **BLOCKED pending tool-install and backup-location approvals. No rehearsal has been executed.** This report is an approval checkpoint, not a completed cleanup report.

## Executed read-only checks

| Check                                      | Result               | Evidence                                                                                                                                                                 |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 18C plan reviewed                    | PASS                 | Email-only mapping, private backups, graph/tree checks, four signature losses and separate remote approval retained                                                      |
| Correct source branch                      | PASS                 | release/phase-18-mit-self-hosting; HEAD 8979360afac987803fd78cd02efa97b2985249ab                                                                                         |
| Local refs and dirty work identified       | PASS                 | Three local heads, two remote-tracking heads and origin/HEAD alias; eight existing modified/untracked candidate files, no staged files                                   |
| Reachable history                          | PASS                 | Seven distinct commits; seven targeted author fields, three targeted committer fields; four signature headers; no tags                                                   |
| Replacement identity                       | PASS                 | Exact owner-confirmed noreply address from Phase 18C; no personal address reproduced here                                                                                |
| GitHub remote read-only comparison         | PASS                 | main 8979360afac987803fd78cd02efa97b2985249ab; feature/phase-15-cloud-architecture 3e1377f80abb3a774ba521282bc369f86537505d; refs/pull/1/head remains at the feature tip |
| Git filter-repo command and Python module  | BLOCKED              | Neither is available; installation requires explicit approval                                                                                                            |
| Backup volume encryption                   | BLOCKED / unverified | BitLocker status unavailable with current permissions; no encryption assurance is claimed                                                                                |
| Backup creation and verified restore       | BLOCKED              | No location approved and no backup stored                                                                                                                                |
| Disposable mirror rewrite                  | BLOCKED              | Must wait for tool and verified backups                                                                                                                                  |
| Changed-ID map, tree/parent/ref comparison | BLOCKED              | No rewritten commits exist yet; do not invent new hashes                                                                                                                 |
| Actual signature removal                   | BLOCKED              | Four signatures are expected to be stripped in the disposable copy, but none has been removed                                                                            |

No failed application test is reported. No application code changed, and tests/builds were not rerun for this approval checkpoint. Earlier Phase 18B test evidence remains dated evidence, not proof of a rehearsal.

## Proposed storage and installation for approval

The following new locations are proposed, not created:

- Private root: **<PRIVATE_BACKUP_ROOT>**. It does not currently exist. Use only if the owner confirms it is on an encrypted, non-synced/private volume; otherwise provide an alternative mounted encrypted location.
- Immutable backup set: **<PRIVATE_BACKUP_ROOT>\Phase18D\<unique-timestamp>\backups**.
- Disposable mirror and restore-validation fixtures: **<PRIVATE_BACKUP_ROOT>\Phase18D\<unique-timestamp>\scratch**.
- Isolated tool environment: **<PRIVATE_BACKUP_ROOT>\tools\git-filter-repo-2.47.0**.

Before storage, verify resolved paths, encryption and owner-controlled access; restrict new directories to the owner and required system access, with no public/cloud-sync sharing. Do not change ACLs on existing project directories. Backups and the private mapping contain the original identifying metadata and must never be uploaded. A same-disk private backup supports this local rehearsal but is not independent disaster recovery.

Requested tool scope: install only pinned git-filter-repo 2.47.0 in a new isolated Python environment, verify the release/source hash and entry point, then check compatibility with the installed Python. Do not install globally or change NAVI dependencies. Stop on compatibility/version discrepancies; do not silently upgrade. The candidate pin and exact rewrite options are documented in the [Phase 18C plan](PHASE_18C_GIT_PRIVACY_CLEANUP_PLAN.md).

## Rehearsal sequence after approvals

1. Recheck private remote visibility and all refs/status. Record branch/tag/symbolic ref manifests and compare to this checkpoint. Preserve the stale local main pointer separately; never use it to replace current remote main.
2. Create an immutable remote mirror backup and a local all-ref bundle. Preserve symbolic-ref targets and worktree/index status in a private manifest. Copy every reviewed modified/untracked candidate file byte-for-byte and SHA-256 manifest it, including this new report and any newly approved report edits. Re-enumerate paths rather than hardcoding the previous eight-file count. Do not overwrite source files, stash/reset/clean the source, or copy filled environments into the release candidate. The original repository and ignored runtime data remain untouched.
3. Verify bundles/fsck, restore into fresh validation fixtures, compare branch/tag/object coverage and candidate file hashes. **Stop immediately if any backup or restore check fails.** No rewrite may start on an unverified backup.
4. Install/verify the approved tool in its isolated environment. Exclusively create the private email-only mapping from raw local metadata without printing the old address. Only the confirmed target is replaced; existing GitHub noreply identities and names remain unchanged.
5. Clone a separate mirror from the immutable remote backup without shared local objects. Apply the Phase 18C email-only filter with message encoding/hash-reference preservation and pruning disabled. Never rewrite the original checkout or the only backup. Treat fresh-clone safety refusal as a stop condition, not a reason to use --force.
6. Read the old/new commit map privately. Compare every mapped tree, ordered parent relationship, dates/messages/names, unaffected identity and ref tip. Expect seven changed IDs, the original merge topology and four stripped signatures. Tag count must remain zero; if new refs/tags appear, stop for scope review. Record actual new IDs only after successful verification.
7. Recreate the corresponding local release branch in the scratch result and restore candidate files only after original-history tree verification; distinguish the metadata-only comparison from the later uncommitted file overlay. Do not commit restored files or configure future Git identities without separate approval.
8. Re-read all original refs, original candidate content hashes/status and remote refs. Assert they are unchanged except explicitly requested documentation edits. Record PASS/FAIL/BLOCKED evidence and retain backups privately. Do not push any ref.

## Remote migration proposal — not authorized

After a successful local rehearsal and separate approval, freeze collaborator writes, review branch protections, refresh expected remote tips and validate the sanitized clone. Proposed remote replacement scope is main and feature/phase-15-cloud-architecture only, using explicit per-ref force-with-lease and atomic update if supported. Never push --mirror, private backups, replace refs or refs/pull. A new release-preparation remote branch requires separate authorization. Inspect actual remote tips after any uncertain response before another action. The exact conceptual push/refspec and rollback conditions are in the Phase 18C plan; none will execute in Phase 18D.

GitHub's read-only PR #1 head, commit/diff caches, direct old-SHA URLs, old fixture/collaborator clones and possible external copies are not erased by a local rewrite. Any Support request or acceptance of residual retention is a separate owner decision; no purge is guaranteed. Original signatures cannot be retained for changed commit metadata. Re-signing would be a new attestation, not restoration of the four old signatures.

## Approval checkpoint and decision

Approval is required for the isolated pinned tool install and the proposed backup/scratch locations. The owner must confirm the volume is encrypted/non-synced or provide another approved encrypted location. The requested local rehearsal is otherwise authorized subject to these gates; original and GitHub history must remain unchanged. Any destructive cleanup requires further approval.

**Current result: preflight PASS; backup/restore/rewrite validation BLOCKED; public release NO-GO.** No tool installation, backup, private mailmap, rewrite, force-push, branch/tag deletion, visibility change, deployment or notification occurred. Stop at this checkpoint pending owner approval.
