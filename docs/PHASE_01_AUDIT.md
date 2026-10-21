# NAVI Live Notifier — Phase 01 implementation audit

Audit date: 2026-10-16 (Asia/Colombo).

**Final decision: FAIL — correct the environment-validation defect and reconcile the configuration/phase contracts before proceeding to Phase 2.** The scaffold builds and its existing automated checks pass. A passing check suite does not cover the independently reproduced failure described in M01.

Findings: **0 critical issues, 3 major issues, 5 minor improvements.** Live database/service verification has outstanding evidence gaps, recorded separately from source-code defects.

## Scope and evidence

Reviewed all ten existing Markdown documents in `docs/`: the planning index, requirements, API research, architecture, database schema, security/risk register, numbered roadmap, decisions, planning audit and progress record. Also reviewed root setup instructions, every application/shared-package source and configuration file, package manifests, the lockfile/dependency graph, environment template, ignore rules, Compose configuration and both test files.

**`docs/DEVELOPMENT_ROADMAP.md` does not exist.** The available roadmap is [06-roadmap.md](06-roadmap.md). It calls API feasibility Phase 1 and foundations Phase 2. [PROGRESS.md](PROGRESS.md) explicitly uses the later user-authorized scope, **Phase 1 — Project Initialization and Environment Setup**. This audit judges the ten initialization tasks against that scope, rather than requiring OAuth2, detection or domain migrations that the user expressly deferred.

The original planning audit remains open; this implementation audit does not declare its provider feasibility or security design findings resolved. Existing documents were read as supplied, including their pending technical-decision labels. The user's initialization instruction authorized the scaffold; it did not establish every later architectural decision.

No application fix, dependency change, domain migration, provider call or Phase 2 feature was implemented during this audit. The authored deliverable is this report. Checks regenerated ignored build/type artifacts. `next dev` also generated `apps/web/AGENTS.md`; its instructions were read, and that audit-created file was removed after the dev server stopped. `next typegen` restored the original production-oriented generated declaration references without editing application logic. Test servers were stopped.

## Test results

Runtime actually used: **Node.js 25.3.0, npm 11.15.0, Windows**. Node 24 LTS is the recommended project runtime but was not available for an independent run. Docker, `psql` and `redis-cli` were not found on PATH. No real provider credentials or `.env` were created; URL-dependent checks used explicit local development values in the command environment.

| Check executed during this audit                                                       | Result                                                   | Evidence / limitation                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                        | **PASS, exit 0**                                         | Shared build, all app/tooling TypeScript checks, ESLint with zero warnings, Prettier and Vitest completed                                                              |
| Vitest within `check`                                                                  | **PASS: 2 files, 8 tests**                               | Environment defaults/protocols/redaction, disconnected bot, scaffold worker, liveness response and lazy database construction; test duration 839 ms in this run        |
| `npm run build`                                                                        | **PASS on unrestricted retry, exit 0**                   | Shared packages, Next.js production build, bot and worker compiled; website routes `/`, `/_not-found` and `/api/health` generated                                      |
| Initial sandboxed build attempt                                                        | **Could not complete, exit 1**                           | Windows sandbox denied a generated `.next` directory creation with `EPERM`; unchanged code built successfully outside the sandbox                                      |
| `npm run env:check:example`                                                            | **PASS, exit 0**                                         | Template schema validated without making a connection                                                                                                                  |
| `npm run env:check` with explicit local DB/Redis URLs                                  | **PASS, exit 0**                                         | Valid process environment accepted; this is not live service readiness                                                                                                 |
| `npm run smoke --workspace=@navi/bot`                                                  | **PASS, exit 0**                                         | Source entry point initialized and exited without Discord login                                                                                                        |
| `npm run smoke --workspace=@navi/worker`                                               | **PASS, exit 0**                                         | Source entry point initialized and exited without external connections                                                                                                 |
| `node apps/bot/dist/index.js --smoke`                                                  | **PASS, exit 0**                                         | Compiled bot entry point initialized and exited                                                                                                                        |
| `node apps/worker/dist/index.js --smoke`                                               | **PASS, exit 0**                                         | Compiled worker entry point initialized and exited                                                                                                                     |
| `npm run start --workspace=@navi/web` + HTTP checks                                    | **PASS**                                                 | Production home returned 200 and contained the project title; `/api/health` returned 200, minimal scaffold JSON and `Cache-Control: no-store`                          |
| `npm run dev` + HTTP checks                                                            | **PASS for startup/basic serving**                       | Shared watcher reported zero errors; web, bot and worker started; development home and health each returned 200. Hot-reload after editing shared source was not tested |
| `npm exec --workspace=@navi/web -- next typegen`                                       | **PASS, exit 0**                                         | Generated route types and regenerated the framework declaration file                                                                                                   |
| `npm exec --workspace=@navi/database -- drizzle-kit export --config=drizzle.config.ts` | **PASS, exit 0**                                         | Empty schema/config loaded; no application SQL generated; no database connection made                                                                                  |
| `npm ls --all --json`                                                                  | **PASS, exit 0**                                         | Installed dependency tree had no npm-reported missing/invalid dependency error                                                                                         |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund`                               | **PASS, exit 0**                                         | Manifest/lock/workspace consistency checked; **not** a real clean install or lifecycle-script validation                                                               |
| `npm audit --omit=dev --json`                                                          | **PASS, exit 0**                                         | Zero reported production dependency vulnerabilities at audit time                                                                                                      |
| `npm audit --json`                                                                     | **FAIL, exit 1**                                         | Four moderate development-only package findings; zero high/critical; details below                                                                                     |
| `npm run db:check`                                                                     | **FAIL, exit 1**                                         | Local PostgreSQL connection could not be established; redacted error and bounded connection failure observed                                                           |
| Malformed URL probes for DB, worker and web configuration                              | **FAIL against the intended error/redaction contract**   | All three threw `TypeError: Invalid URL`, omitted the variable name and retained the synthetic input in the error object                                               |
| Compiled worker with a malformed synthetic DB URL                                      | **FAIL against the intended redaction contract, exit 1** | Uncaught error printed the fake secret sentinel in its `input` field; no real credential used                                                                          |

HTTP and the main check suite were run outside Windows sandbox restrictions where necessary. These permissions were not bypassed by disabling a test or suppressing a compiler error.

### Tests not executed or not established

- **Live Compose/PostgreSQL/Redis success:** unavailable tooling and no working development services supplied. `db:check` was attempted and failed; a lazy-pool test is not evidence of a successful database connection.
- **Migration application/rollback:** intentionally not executed. The schema is empty and no migrations exist. Creating domain tables solely to satisfy this audit would exceed Phase 1.
- **Actual clean install:** only a dry run was performed; existing `node_modules`, generated shared outputs and framework caches were present.
- **Node 24 or Node 22 runtime matrix:** not run; only the available Node 25 runtime was exercised.
- **Browser interaction/accessibility, shared-source hot reload, process signal cleanup assertions and root environment-file precedence:** no dedicated automated coverage currently proves these behaviors. HTTP serving and source inspection provide narrower evidence.
- **Discord login/install, provider webhooks, detection, delivery, tenant isolation/outbox recovery:** deliberately out of scope and not claimed as passed. These are later features, not missing initialization implementations.

## Review of the implementation

| Area                      | Assessment                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo organization     | npm workspaces correctly separate three apps from four shared packages. Manifests are private; root commands build shared exports before consumers. No circular dependency was observed                                |
| Next.js initialization    | Valid App Router layout/page, local styles, metadata and minimal health route. Dev/start bind to loopback; production compilation and HTTP serving work. No authenticated dashboard behavior is claimed                |
| Bot setup                 | Factory constructs a disconnected discord.js client with only `Guilds`, mentions disabled and explicit destruction. Entry point never calls login or sends messages, even if a token is supplied                       |
| Worker setup              | Idle scaffold validates configuration and has a separate process entry point. No scheduler, polling, queue consumer or false dependency-readiness claim                                                                |
| Shared TypeScript/imports | Strict options and ESM/NodeNext configuration are present. Dist exports and build ordering resolve correctly. Web and tooling configs use the appropriate bundler resolution; root type checks pass                    |
| PostgreSQL/ORM            | Drizzle/pg tooling, lazy pool, finite connection timeout, explicit close and read-only `SELECT 1` check are present. Schema correctly remains empty. Live connectivity is unproven, not inferred from ORM construction |
| Environment/secrets       | Template/ignore rules are appropriate and future provider keys are not required yet. Returned schemas filter unrelated fields, but M01 and M03 prevent treating validation and process isolation as complete           |
| Lint/format/type tooling  | Standard JS/TypeScript lint and shared strict compiler settings pass. Prettier preserves prior reviewed planning files. Framework lint and generated-file handling can improve                                         |
| Tests                     | Eight basic checks are meaningful for this scaffold, but redaction coverage is too narrow and startup/lifecycle contracts are not all automated                                                                        |
| Dependencies              | Lockfile and installed graph are consistent. Production audit is clean; remaining development findings are acknowledged rather than hidden                                                                             |
| Architecture consistency  | Current scaffold fits the explicitly requested apps. Future bot-versus-worker ownership and secret confinement differ from/are unresolved in the written architecture; see M02/M03                                     |
| Acceptance                | Initialization artifacts exist; the malformed-input security failure, missing current roadmap and outstanding evidence must remain visible before the next gate                                                        |

## Critical issues

**None identified in the current disconnected, local scaffold.** There is no demonstrated remote exploit or real secret exposure. M01 is a reproduced input-retention/logging defect and is major; it must not be dismissed because no real credentials were used. Critical provider-feasibility findings in the older planning audit remain a separate future integration gate.

## Major issues

### M01 — Malformed URLs escape validation and expose their input through uncaught errors

**Locations:** `packages/config/src/index.ts:24–38`; `apps/worker/src/index.ts:5–6`; `packages/database/src/check.ts:4–6`; `tests/environment.test.ts:15–41`.

`urlWithProtocol` calls `new URL(value)` inside `.refine()`. Invalid URL format can produce a continuing validation issue, after which this refinement throws. `schema.safeParse()` does not convert that thrown exception into the field-only error created by the wrapper.

This was reproduced for `DATABASE_URL`, `REDIS_URL` and `WEB_ORIGIN`. The error had name `TypeError`, message `Invalid URL`, and own properties `code` and `input`. With the compiled worker, Node printed the synthetic `input` value in the uncaught exception. The database check also performs environment parsing before its protected query block. This contradicts the README/progress claim that environment failures identify fields without leaking their values.

The existing redaction test supplies a syntactically valid HTTPS URL with an invalid database protocol. That case follows the safe validation path, so the test passes while malformed-input handling remains broken. Zod's official documentation states that refinement functions should not throw and that thrown errors are not caught. [Zod refinements](https://zod.dev/api#refinements).

**Recommended correction:** Use a protocol-aware URL schema or a nonthrowing guarded refinement/validation pipeline. Ensure every rejected environment input becomes a sanitized, field-named error, including at process entry points. Add malformed URL, empty/whitespace, missing, bad protocol and bad port cases for each URL field. Add a child-process assertion that stderr/error serialization contains the field name but not a fake credential sentinel. Do not merely catch and stringify the raw error object.

**Acceptance to close:** All rejected cases fail with the intended nonzero exit/field message and retain no raw secret input in outward error objects or logs; existing valid-input tests continue to pass.

### M02 — The authoritative next-phase roadmap and component ownership are not synchronized

**Locations:** missing `docs/DEVELOPMENT_ROADMAP.md`; `docs/06-roadmap.md:7–10`; `docs/03-architecture.md:28`; `docs/PROGRESS.md`, current scope and bot ownership notes; `README.md`, phase boundary.

The requested roadmap filename is absent. The existing numbered roadmap still calls API experiments Phase 1 and foundations Phase 2, while the implementation/progress uses the user's newer initialization naming. Progress makes the discrepancy explicit, but no single roadmap establishes what the next Phase 2 includes, excludes and depends on.

The architecture assigns Gateway/Discord REST behavior and bot-token custody to the worker. The current instruction explicitly required a bot app and a worker app, so creating those shells was authorized. However, their future responsibilities are intentionally left undecided; that cannot be treated as a resolved architectural contract when integration begins. The decision record also still labels technical decisions proposed. This is not a claim that initialization lacked user authorization.

**Recommended correction:** Reconcile the roadmap into the requested canonical file or an explicitly approved alias; retain the original as history if needed. Record phase acceptance/stop boundaries and choose the owner of Gateway, Discord REST sending and token custody. Document whether the bot is an independently deployed service or a module of the worker, and approve any eventual interprocess contract before implementing it. Do not invent completion of the older provider feasibility phase.

**Acceptance to close:** One named next-phase definition is available and consistent across roadmap, architecture, decisions and progress; component ownership is unambiguous. No Phase 2 features need to be written to close this documentation issue.

### M03 — Per-service schema results do not enforce the stated process-level secret boundary

**Locations:** `packages/config/src/index.ts:8–13,43–71`; `apps/web/next.config.mjs:1–4`; bot/worker entry points; root `.env.example`; `tests/environment.test.ts:45–48`.

Every app calls a loader that loads the entire root `.env` into its process environment. Although `readWebEnvironment()` returns only web fields, that does not remove other fields from `process.env`. With a real token added later, the same shared file makes it available to the web server and worker as well as the bot. Development children also inherit their parent's environment.

The existing test verifies only the shape returned by the web schema. It does not establish that a bot credential is confined to its intended process. The `server-only` comment is a convention, not an explicit process-secret boundary. This is a source/data-flow finding; **no real token or browser leak was observed**, and the scaffold currently performs no provider authentication.

**Recommended correction:** Choose per-service secret injection/loading for integration, or explicitly document the shared local development file as a limited exception rather than asserting confinement. Bind this decision to M02's chosen token owner. Keep public/web-safe and server-runtime package entry points distinct; add checks that synthetic provider secrets do not appear in web client output and are not loaded into unrelated service environments under the intended execution topology.

**Acceptance to close:** The documented secret boundary matches actual loading/inheritance, with synthetic-secret evidence. A stripped schema return value alone must not be accepted as process isolation.

## Minor improvements

### N01 — Add framework lint coverage when introducing interactive web code

`eslint.config.mjs` enables standard JS and TypeScript recommended rules, without React Hooks, accessibility or Next-specific rules. Current simple TSX passes, but that cannot establish framework-specific correctness. Select compatible maintained rules without restoring the vulnerable dependency chain removed during setup. This is a tooling improvement, not an existing hook bug. [Next.js ESLint guidance](https://nextjs.org/docs/app/api-reference/config/eslint).

### N02 — Treat generated Next declarations as generated input

`apps/web/next-env.d.ts` is present in source but absent from `.gitignore`; it changes imports between dev and production generated paths. Current official guidance says the file is framework-managed and should be ignored. Consider generating types explicitly before standalone web type checks so a clean environment has the same inputs as this populated workspace. No clean-checkout type-check failure was demonstrated here. [Next.js TypeScript guidance](https://nextjs.org/docs/app/api-reference/config/typescript#next-envdts).

### N03 — Track the four moderate development dependency findings with an owner

`drizzle-kit@0.31.11` pulls `@esbuild-kit/esm-loader@2.6.5`, `@esbuild-kit/core-utils@3.3.2` and nested `esbuild@0.18.20`. npm counts four affected packages for the chain; this is not four independent root vulnerabilities. The esbuild advisory concerns its development serving API. No such server is started by the scaffold, and the production audit is clean. [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

Retain the documented exposure restriction and choose a reviewed compatible patch/tool upgrade when available. npm suggests a breaking Drizzle Kit downgrade; do not automatically apply `npm audit fix --force`. Assign a revisit condition before enabling Studio/other tooling servers. No upgrade or risk acceptance is fabricated by this audit.

### N04 — Make process and environment-loading smoke checks repeatable

The current suite imports factories/health handlers; direct CLI smoke checks were run manually in this audit. Add bounded automated child-process cases for successful boot, failed validation, signal exit and root file loading/shell precedence. The existing `--smoke` path stops before installing signal handlers, so it does not test shutdown-handler behavior. Empty schema export and lazy pool construction should remain labelled as configuration checks rather than connectivity tests.

### N05 — Strengthen configuration typing and shared-package boundaries

`next.config.mjs` has a `NextConfig` JSDoc annotation but no `@ts-check`; the tools TypeScript project does not include MJS/checkJs. Its shape is therefore not fully covered by the advertised `tsc` gate, although Next currently loads it successfully. Consider a checkJs-enabled configuration target. Also split browser-safe constants/status types from Node process lifecycle helpers in `@navi/core` before client components use that package. The current server-rendered placeholder does not demonstrate a client-bundle failure.

## Missing requirements and acceptance evidence

| Phase 1 item / evidence                                                | Status                                                      | Required next action                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| TypeScript monorepo, web, bot, worker and shared packages              | Present and verified for the current scaffold               | Preserve separation; settle future ownership under M02                                                    |
| Lint, formatting, environment validation                               | Present; normal inputs pass, malformed-input contract fails | Correct M01 and expand regression coverage                                                                |
| PostgreSQL tooling and empty schema                                    | Configured; export works; live connectivity fails           | Supply working local service and rerun the existing read-only check before claiming environment readiness |
| `.env.example`, `.gitignore` and setup README                          | Present                                                     | Clarify secret isolation under M03 and generated file handling under N02                                  |
| Vitest and smoke checks                                                | Eight tests pass; manual entry-point/HTTP checks pass       | Add the specific missing failure-path coverage rather than inflate passing-test counts                    |
| Current `DEVELOPMENT_ROADMAP.md` / next-phase acceptance               | Missing                                                     | Resolve M02 before choosing Phase 2 work                                                                  |
| Node 24 verification and real clean install                            | Not established                                             | Run in a clean local/CI environment when available; current evidence is Node 25 plus install dry run      |
| Compose/PostgreSQL/Redis service success                               | Not established                                             | Docker/tooling and services unavailable; do not mark passed from source review                            |
| Reviewed handling of development-tool vulnerabilities                  | Disclosed, not fully remediated                             | Track N03 and explicit exposure restrictions                                                              |
| OAuth2, bot login, provider detection, queue/outbox, domain migrations | Intentionally deferred, not missing Phase 1 features        | Keep outside this audit and require later explicit phase scope                                            |

No new requirement for production hosting, real provider credentials, tenant tables or a full dashboard is imposed on this initialization phase.

## Recommended corrections and follow-up order

1. **Fix M01 first:** make URL validation nonthrowing and sanitize every process failure; prove it with fake-secret child-process regression tests.
2. **Resolve M02:** provide the canonical roadmap and phase boundaries, and approve the bot/worker responsibility split.
3. **Resolve M03:** align actual service environment loading with the documented secret boundary or explicitly approve a bounded local-development exception.
4. **Complete available environment evidence:** rerun DB/Compose checks with actual services, and validate Node 24/clean setup when available. Keep blocked checks labelled blocked until then.
5. **Apply N01–N05 as appropriate:** framework/configuration checks, generated-file policy, development dependency tracking and targeted smoke coverage. Do not add unrelated application features.

Existing planning/audit documents should be amended only through the chosen review process; this report proposes corrections rather than silently rewriting them.

## Final PASS/FAIL decision

**FAIL for advancing to Phase 2 on an unqualified Phase 1 acceptance.** The demonstrated URL error/redaction bypass is a concrete foundation defect despite eight passing tests. The roadmap/ownership and secret-loading contracts also require reconciliation before integration.

The monorepo, three app shells, shared packages and ordinary build/check workflow are otherwise functioning. Missing Docker/database evidence is an environmental verification limit, not proof that the ORM or Compose configuration is wrong. Moderate development-only dependency findings do not imply a demonstrated production exploit.

A re-audit can pass after M01's regression checks succeed and M02/M03 are resolved or explicitly accepted with accurate boundaries. Live-service and clean-runtime evidence must then either pass or remain expressly excluded from any claimed acceptance. No Phase 2 implementation was performed.
