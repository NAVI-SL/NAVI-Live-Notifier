# Rollback and incident recovery plan

Prepared 2026-10-18 for the controlled personal beta. **Plan only: no deployed release, verified previous image or tested restore is currently available.** Do not use this document as approval to change production infrastructure. See [deployment guide](DEPLOYMENT_GUIDE.md) and [operations](OPERATIONS_RUNBOOK.md).

## Preconditions and stop conditions

Before activation record the release artifact/source hashes, lockfile, migration journal, intended environment, approved destinations, owner, compatible previous artifact and unique encrypted backup with separate stable auth secret. Verify the backup by isolated restore. Current placeholders are unresolved, not invented release IDs.

Pause the beta on any unauthorized destination/access, unexpected mass mention, duplicate normal notification, uncertain delivery not reconciled, missing schema, sustained dependency/Gateway failure, broken callback authentication or unrecoverable settings. Preserve redacted timestamps, logical delivery/attempt IDs and actual message observations. Keep credentials/signatures/cookies out of incident notes.

## Contain before changing state

1. Stop **only the actual monitoring worker** using its owning terminal/process supervisor. In the separately approved local Compose review project the targeted command is:

   ```powershell
   docker compose -f compose.production.yaml stop worker
   ```

   This instruction was not executed in this task. Do not kill arbitrary Node processes. A request already sent to Discord cannot be recalled by stopping; inspect in-flight messages.

2. Preserve database session/delivery/deduplication records and installed application files. Keep bot/web running for diagnosis if safe; if the bot sender itself is producing unsafe requests, stop that actual instance too. Do not start duplicate Gateway owners.
3. Inspect affected Discord channels before any retry. Keep `sending`/`uncertain` conservative. Do not clear the ledger, change stream session IDs or mark all jobs pending. Explicit labelled tests are separate from automatic alerts and are not proof of recovered live behavior.
4. Use existing authorized disable controls for affected preferences once the database is safe. Disabling does not authorize a replacement destination. Retain defaults that keep everyone off.

## Application rollback

Prefer restoring a known compatible artifact while retaining the current database. For local source development use a previously preserved reviewed copy; no Git repository/known commit is assumed. For future image releases pin immutable image tags/digests and retain the previous tested artifact. `local-review` and floating base tags are not a rollback target.

Check schema compatibility **before** switching code. Migrations through 0006 are additive, but that alone does not prove every older release compatible with the current schema/queue semantics. Do not auto-run down migrations. Back up first, keep worker stopped, switch only to a reviewed compatible application version, start web and one bot, validate auth/settings, schema/health and approved targets, then resume worker only after uncertainty review. Recreate apps together if the shared edge network namespace changed. Do not change credentials to force an older build to run.

If no compatible previous artifact exists, keep monitoring paused and repair/rebuild the current version; do not fabricate successful rollback. Verify TypeScript/lint/security/tests/build and approved real delivery before reopening the beta.

## Database recovery

Use deployment guide procedures to restore a verified archive into a **new isolated database/project**, never overwrite the active database or delete its volume. Recreate nonsuperuser roles/grants, verify journal through required migration, authentication encryption-key availability, settings/subscriptions, monitor baseline/session/delivery states and constraints. Keep synthetic/disabled monitoring and no public ingress during validation.

An old backup may omit messages already sent after its timestamp. Reconcile the actual Discord channels and safe delivery evidence before allowing any catch-up. If authoritative deduplication history cannot be recovered, remain paused and choose an explicitly reviewed safe baseline; do not bulk replay pending jobs. The current product has no automated operator reconciliation/resend feature; no such function is claimed by this plan. Record any intentional suppression/data-loss tradeoff and owner approval.

Do not rotate `BETTER_AUTH_SECRET` as a database recovery shortcut; that can invalidate encrypted tokens/sessions. Keep key backup separate from SQL backups. Connection credential changes and recovery of any suspected compromised secret are owner-controlled actions, not automatic rollback steps.

## Resume checklist and evidence

- [ ] Root cause and affected targets identified; no unsafe permission/mention expansion.
- [ ] Correct schema/runtime roles, settings, ledger and encryption secret verified privately.
- [ ] Compatible artifact identified and relevant automated checks pass.
- [ ] Health/ticks/Gateway ownership and approved target inventory checked; real auth/install status where affected.
- [ ] One approved labelled sample observed, followed by a newly controlled eligible live start; repeats do not duplicate.
- [ ] Web-off worker behavior and affected restart/recovery paths observed.
- [ ] Backup/recovery timing and data-loss scope recorded; owner explicitly approves resume.

Proposed initial RPO 24 hours/RTO four hours remain **unmeasured**. No real rollback, restore or recovery SLA was demonstrated in Phase 10. If checks fail, maintain NO-GO and continue local repair; never proceed automatically to public release.
