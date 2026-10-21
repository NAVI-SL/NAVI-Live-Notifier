# Phase-by-phase roadmap

Historical initial proposal. The user's subsequent phase definitions supersede this numbering; use [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) for current scope and stop boundaries. Do not infer completion of provider feasibility experiments from Phase 2 authentication completion.

This is a future development plan. Phase 0 is the only work performed by the current task. Effort estimates are rough focused developer days, exclude account approvals/provider delays, and are not delivery dates. Each gate requires evidence before moving forward.

| Phase | Scope and deliverables | Dependencies | Exit / acceptance gate | Estimate |
| --- | --- | --- | --- | --- |
| 0 — Research and approval | Vision, official API research, architecture, schema, security/risk register, acceptance criteria and decision log | User direction | Documents reviewed; open blocking decisions explicitly accepted/resolved; separate implementation authorization | Current task |
| 1 — API feasibility experiments | Disposable later test harnesses for Discord OAuth/install/post, YouTube discovery matrix/quota, Kick app token/resolve/subscription/signature/reconciliation; record redacted results | Phase 0 approval, provider accounts, public callback, controlled streams | Both platforms demonstrated; actual quotas recorded; YouTube false-negative/latency and Premiere limitations agreed; no unofficial endpoints needed | 2–4 days plus live-test time |
| 2 — Foundation | TypeScript workspace, web/worker separation, local DB/queue setup, migrations, validation/config, test harness, safe logs, minimal health endpoints, CI checks | Phase 1 evidence and stack approval | Local processes start reproducibly, migrations work from empty DB, no committed credentials, DB/outbox recovery test passes | 1–2 days |
| 3 — Identity and guild control | Discord OAuth/session lifecycle, developer allowlist, server picker, separate install flow, Gateway guild/channel/role sync, manager authorization | Phase 2, Discord app | F01–F03/F11; two-guild isolation, revoked manager, denied consent and bot removal tested | 2–3 days |
| 4 — Registration and preferences | Provider resolution, global source registry, routes, defaults, pause, role selection, bounded templates, preview/test send and audit entries | Phase 3 and validated provider adapters | F04/F05/F08/F09; duplicate source resolution, channel/role mismatch, disabled routes and labelled tests verified | 2–3 days |
| 5 — Durable detection | Inbox/outbox, provider subscriptions, polling scheduler, quota reservations, baseline state, session transitions and freshness suppression | Phase 4; Phase 1 strategy | F06; both providers detect controlled starts; duplicates/out-of-order events and Premieres follow agreed policy; no send from unconfirmed feed hint | 3–5 days |
| 6 — Discord delivery | Durable fan-out, unique deliveries, coordinated sender, permission checks, safe rendering, nonce handling, retry/uncertain states and history UI | Phase 5 | F07/F10; repeated jobs do not duplicate; 429 delay respected; ambiguous response and disable/send race tests pass | 2–3 days |
| 7 — Personal end-to-end hardening | Full dashboard usability, accessibility review, backup/restore, retention cleanup, credential rotation, downtime and quota experiments, setup/runbook docs | Phases 3–6 | Acceptance matrix below complete, limitations documented, developer can reproduce end-to-end notifications with dashboard closed | 2–4 days |
| 8 — Optional public-service planning | Revisit scale, hosting costs, abuse, privacy/policies, operator support, Discord verification, production backups/uptime | Explicit future user request | Separate approved public deployment plan and budget | Deferred |

Indicative implementation effort through Phase 7: 14–24 focused days after approval, with substantial uncertainty in Phase 1. Do not schedule a fixed completion date until feasibility is demonstrated.

## Phase 1 experiment matrix

| Experiment | Evidence to save later | Failure decision |
| --- | --- | --- |
| Discord login → choose → install → send | Redacted scopes, permissions, guild IDs, message outcome; negative manager test | Resolve authorization/installation model before dashboard implementation |
| YouTube scheduled start and long-scheduled start | Actual start, feed arrivals, uploads visibility, candidate API status, detected time and API usage | Adjust candidate retention/cadence; document coverage |
| YouTube unscheduled and already-live registration | Whether feed/playlist reveals video ID, search use, baseline behavior and misses | Scope/latency/quota approval required if discovery unreliable |
| YouTube normal upload, metadata change, Premiere, private/deleted video | Official fields and classifier result; no false start message | Cannot claim Premiere exclusion without evidence |
| Kick start/end and restart | Signed payload/raw-byte verification, normalized timestamps/session keys, targeted API response | Fix session correlation; validate new endpoint before relying on polling |
| Kick non-owner subscription and renewal/recovery | App-token permissions, subscription inventory, controlled callback failure and restoration | If unsupported, revise streamer-authorization requirement explicitly |
| Provider bursts and quota reservation | Requests per API bucket, batch sizes, retry overhead and headroom | Lower source cap/cadence or seek approved capacity |

## Release acceptance matrix

- Identity: F01/F11 login, logout, expiration, revocation, state replay and account allowlist pass.
- Guild control: F02/F03 install verification, pagination and two-guild authorization isolation pass, including an active session after permission revocation.
- Configuration: F04/F05/F08/F09 URL normalization, source rename, multiple routes, role mentions, server pause, preview and test-send authorization pass.
- Detection: F06 live start for each provider, scheduled/unscheduled coverage as agreed, baseline suppression, duplicate and metadata-only events, stale catch-up and concurrent YouTube sessions pass.
- Delivery: F07 unique destination delivery, safe mention rendering, Discord limits, transient error retries, permission loss, deletion and uncertain response handling pass.
- Resilience: F10 worker crash before/after send, queue rebuild, stale lease, outbox replay, temporary guild unavailability, subscription repair and provider outage pass.
- Operations: local setup reproduces behavior, secrets remain private, cleanup and backup restore are exercised, dashboard displays stale/degraded monitoring and recent outcomes.
- Evidence: record commands, redacted fixtures, observed latency/quota, outcomes and known limitations in a later `docs/validation/` report. Provider credentials and raw tokens never enter test fixtures.

Unit tests should focus on authorization decisions, normalization, state transitions, template safety, quota accounting and retry classification. Database integration tests verify uniqueness, tenant foreign keys and transaction/lease behavior. End-to-end tests exercise the real browser/OAuth flow in a controlled environment; provider sandbox fixtures supplement, but do not replace, at least one controlled public stream per platform. Manual provider-dependent checks must be labelled as such and kept out of unattended tests that would post unexpected messages.

No deployment, public signup, live Discord message or API provisioning is authorized by this planning document itself.
