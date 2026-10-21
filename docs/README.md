# NAVI Live Notifier — planning index

**Phase 14 — 2026-10-20:** [complete verification](PHASE_14_VERIFICATION_REPORT.md), [moderate dependency review](PHASE_14_DEPENDENCY_REVIEW.md), [controlled livestream plan](CONTROLLED_LIVESTREAM_VERIFICATION.md). Local infrastructure, actual PostgreSQL concurrency/restore, isolated Redis restart and Linux build/synthetic web validation now PASS. Four moderate advisories, actual runtime/send approvals and wider release gates remain open. Existing data/credentials/access preserved; public NO-GO; no later phase.

**Phase 13 — 2026-10-20:** [implementation](PHASE_13_IMPLEMENTATION.md), [stabilization results](PHASE_13_STABILIZATION_REPORT.md), [production health report](PRODUCTION_HEALTH_REPORT.md). Confirmed recovery/readiness fixes and private telemetry delivered locally; 357 tests pass. No verified rollout, actual beta feedback or current two-platform receipts. Wider launch NO-GO; no Phase 14.

**Phase 12 — 2026-10-20:** [controlled-release plan](PHASE_12_RELEASE_PLAN.md), [actual results](PHASE_12_TEST_REPORT.md), [external beta guide](BETA_USER_GUIDE.md), [monitoring/rollback](RELEASE_MONITORING.md) and [feedback intake](BETA_FEEDBACK_TEMPLATE.md). Preparation only, maximum five scoped servers, activation NO-GO. Current code corrects retained YouTube candidate starvation and adds optional web/worker guild restrictions; historical audit findings retain their original results. No external admission, public installation or deployment activated.

**Phase 11 — 2026-10-18:** [launch readiness](PHASE_11_LAUNCH_READINESS.md), [public checklist](PUBLIC_LAUNCH_CHECKLIST.md), [operations/scaling](OPERATIONS_AND_SCALING.md) and [user guide](USER_GUIDE.md) prepare a future release without activating it. [Privacy](PRIVACY_POLICY_DRAFT.md), [Terms](TERMS_OF_SERVICE_DRAFT.md) and [deletion process](DATA_DELETION_PROCESS.md) are review-only drafts with explicit unresolved operator/contact/URL/legal fields. Next launch remains private beta, 10 servers/10 global sources, free hosting preferred, no spending authorized. Public NO-GO; Phase 10 blockers remain open. Current scope is controlled by the roadmap and these dated pointers; older phase authorization statements below are historical.

**Phase 10 — 2026-10-18:** controlled private-beta preparation is authorized. Read [beta plan](PHASE_10_BETA_PLAN.md), [test report](PHASE_10_TEST_REPORT.md), [operations](OPERATIONS_RUNBOOK.md) and [rollback](ROLLBACK_PLAN.md). Activation is NO-GO while Phase 9 real acceptance gates remain open. No deployment/public launch occurred; older authorization statements below remain historical.

**Current verification — 2026-10-18:** the user explicitly authorized Phase 9. Read [the end-to-end test report](PHASE_09_TEST_REPORT.md) and [release readiness](RELEASE_READINESS.md): automated checks pass, real acceptance remains BLOCKED and private beta is NO-GO. Earlier current/unauthorized statements below are historical. No Phase 10 or public deployment is authorized.

**Subsequent standalone update — 2026-10-18:** [YouTube rich notifications](YOUTUBE_NOTIFICATION_EMBEDS.md) documents screenshot-based formatting, the explicitly authorized default-off everyone option, permission/deduplication tests and required additive migration. Phase 8 deployment gates remain open; this does not authorize another phase.

**Current Phase 8:** explicitly authorized deployment/security preparation for local review only. See [implementation evidence](PHASE_08_IMPLEMENTATION.md), [deployment guide](DEPLOYMENT_GUIDE.md) and [production checklist](PRODUCTION_CHECKLIST.md). No hosting/domain was selected, public deployment is on HOLD and Phase 9 is not authorized. This supersedes older authorization/status-only statements below without changing historical audit evidence.

**Current scope:** Phase 7 reliability is user-authorized and implemented for controlled testing. Read [PHASE_07_IMPLEMENTATION.md](PHASE_07_IMPLEMENTATION.md) for current architecture, health, recovery and actual evidence. Phase 6 setup remains applicable, while older scope/status paragraphs are historical. Live stream/webhook/Discord-message acceptance remains pending. Phase 8 is not authorized.

Prepared: 2026-10-16 (Asia/Colombo). Research checked against official documentation on that date.

Subsequent standalone request: [Discord Gateway presence](DISCORD_GATEWAY_PRESENCE.md) adds Online / Watching livestreams to the existing bot, with local process ownership and no additional intents. Presence was visually verified in Discord; this does not close the Phase 7 audit or authorize Phase 8.

This directory contains planning, audit and implementation records. Phases 1–5 provide initialization, Discord authentication/install, the protected dashboard, streamer registration and notification configuration with explicit test sends. The [current development roadmap](DEVELOPMENT_ROADMAP.md), [authentication setup](PHASE_02_AUTHENTICATION.md), [dashboard contract](PHASE_03_DASHBOARD.md), [registration contract](PHASE_04_STREAMER_REGISTRATION.md), [notification contract](PHASE_05_NOTIFICATION_SETTINGS.md) and [progress](PROGRESS.md) describe implemented scope. Historical audits retain their dated evidence; the [Phase 5 audit](PHASE_05_AUDIT.md) includes subsequent corrections and remaining manual acceptance.

## Approval status

The [Discord configuration review](DISCORD_CONFIGURATION_REVIEW.md) records the actual Developer Portal inspection, remaining local setup gaps, current test results and configuration instructions as of 2026-10-17.

Phase 5 added notification configuration and explicit tests; Phase 6 added automatic detection/delivery; Phase 7 improves recovery and health. The current roadmap/progress/implementation contracts supersede older status-only, idle-worker and unimplemented-delivery descriptions. Historical audits retain their original scopes and findings.

**User-confirmed vision:** develop and test a full-stack dashboard and Discord bot personally; support YouTube and Kick livestream-start notifications, Discord OAuth2, bot installation, multiple Discord servers, streamer registration, and configurable channels/preferences. The user confirmed personal development/testing and start-only notifications on 2026-10-16.

**Technical decisions:** the user's later instructions authorize Phase 1 initialization and Phase 2 authentication/installation, with Better Auth explicitly selected. The current roadmap and authentication document record those implemented decisions. Broader schema, polling intervals, retention periods, operational targets and future provider behavior in the original proposal remain recommendations pending review.

## Read order

1. [Vision, requirements, and acceptance criteria](01-requirements.md)
2. [Official API research and feasibility](02-api-research.md)
3. [System architecture and processing contracts](03-architecture.md)
4. [Proposed database schema](04-database-schema.md)
5. [Security, risks, and operational dependencies](05-security-and-risks.md)
6. [Development roadmap and phase gates](06-roadmap.md)
7. [Decision record and open questions](07-decisions.md)

The largest unresolved dependency is reliable YouTube discovery without assuming that feed notifications represent live transitions or that frequent search polling fits the API quota. Future provider feasibility work must measure this before committing to a detection guarantee.

## Scope control

The user authorized Phases 1–7 and the earlier audit corrections. Detection/reconciliation and automatic delivery remain behind explicit worker opt-in. Provider coverage and live Discord acceptance remain unverified; simulated tests do not imply controlled stream experiments succeeded. Phase 8 is not authorized or started.
