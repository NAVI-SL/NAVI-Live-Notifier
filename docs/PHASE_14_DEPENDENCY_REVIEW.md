# Phase 14 — moderate dependency advisory review

**Subsequent remediation — 2026-10-22:** [verified correction](PHASE_14_REMEDIATION.md) replaces the stale nested loader resolution with an exact patched esbuild override, without a Drizzle/ORM downgrade or unrelated version updates. Clean install, behavioral/config/generation/SQL regressions, native/Linux builds and actual production-image resolution PASS; current full/production audits return zero findings. npm 11 workspace listing/update behavior remains an explicit caveat: preserve the lock, use `npm ci` and new guards. The failed four-moderate snapshot below remains historical. Wider release stays NO-GO for the independent operational/live acceptance blockers.

Reviewed **2026-10-20** using current installed tree, registry metadata, full/production `npm audit` and the [esbuild maintainer advisory GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99). **Advisory check: FAIL; four moderate remain.** No high/critical finding returned; this is not a complete vulnerability certificate.

## Actual chain and scope

| Reported package          | Installed version | Finding                                                                                                |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `drizzle-kit`             | 0.31.11           | Direct/inherited meta-advisory via old loader chain; registry current version observed is also 0.31.11 |
| `@esbuild-kit/esm-loader` | 2.6.5             | Inherits affected core utility dependency                                                              |
| `@esbuild-kit/core-utils` | 3.3.2             | Pins esbuild `~0.18.20`                                                                                |
| Nested `esbuild`          | 0.18.20           | Underlying moderate development-server cross-origin response exposure advisory                         |

These are **four package findings rooted in one underlying advisory**, not four independently demonstrated NAVI exploits. The maintainer identifies versions through 0.24.2 as affected and 0.25.0 onward as patched. The risk concerns esbuild's serve feature. NAVI's reviewed loader utility uses transform functions; no `.serve(` reference was found there or exposed esbuild server demonstrated. This reduces observed reachability, but does not remove the vulnerable package or establish that every tooling path is safe.

Other installed branches already use esbuild 0.25.12 (Drizzle directly) and 0.28.2 (tsx/Vite). Updating those branches alone does not repair the nested 0.18.20. The audit also appears with `--omit=dev`; do not assume a development-labelled database tool is absent from this workspace/runtime dependency graph.

## Compatibility decision

The audit recommends Drizzle Kit 0.18.1 as a semver-major fix. That backward change has no demonstrated compatibility with the current ORM/schema/journal and is **not accepted**. A narrowly scoped pinned override and a version-bounded override were tried with lifecycle scripts disabled; neither changed the resolved nested tree/lockfile. Both were reverted, with original root manifest and lockfile hashes verified. No forced audit repair, prerelease upgrade, removal of working migration tooling or ineffective configuration is retained.

Current Drizzle Kit journal check passes, actual application migration hashes match, and full checks/builds pass. These verify the retained current setup, **not a patched dependency**. A future workaround needs clean-install tree verification, transformer/config loading, scratch generation/migration/restore and full Linux/native regressions; a zero audit count alone is insufficient.

## Required follow-up

Keep affected development serve tooling closed; do not expose Drizzle/esbuild tooling publicly or launch untrusted tooling pages as a workaround. Prefer an upstream compatible loader/tool release or a reproducible targeted fix with the above compatibility proof. Record explicit bounded risk acceptance if the owner elects to proceed with a private experiment; no public risk waiver is inferred here. Scan the actual Linux image/dependency SBOM with an approved scanner before wider launch. No scanning service purchase, upload or new service was configured.

See [complete Phase 14 results](PHASE_14_VERIFICATION_REPORT.md). Both full and production audit summaries remain four moderate/zero high/critical; the operational launch decision stays NO-GO.
