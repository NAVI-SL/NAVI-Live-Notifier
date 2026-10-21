# Decision record and review checklist

**Phase 8 authorization — 2026-10-17–18:** the user explicitly authorized security/deployment preparation and confirmed there is no selected hosting/domain/production database. Prepare files for local Windows/Docker review; no purchases, DNS, public deployment or production credential modifications are authorized. [Deployment guide](DEPLOYMENT_GUIDE.md) records a proposed single-host container arrangement and estimates, not an approved provider choice or release sign-off. No Phase 9 is authorized. Older scope/authorization statements below are historical.

## Phase 7 authorization — 2026-10-17

The user explicitly authorized reliability, duplicate prevention and recovery. The existing PostgreSQL queue and bot sender are retained. [Phase 7](PHASE_07_IMPLEMENTATION.md) records implementation choices: generation-safe reconciliation, attempt/activation checks, bounded safe retry versus uncertainty, adaptive YouTube polling, private operational health and abort/drain shutdown. Earlier unstarted/unauthorized Phase 7 statements are historical. This does not approve YouTube completeness/Premiere claims or fabricate real stream/message acceptance. Phase 8 remains unauthorized.

## Phase 6 authorization — 2026-10-17

The user explicitly authorized automatic YouTube/Kick detection and delivery as Phase 6. This supersedes earlier unauthorized/unimplemented phase-status statements below. The implemented personal topology uses a PostgreSQL durable queue/coordination rather than adding BullMQ, optional HTTPS webhook ingress in the independent worker, provider credentials selected only for their server processes and the existing bot-owned sender. The [Phase 6 record](PHASE_06_IMPLEMENTATION.md) documents engineering choices and unresolved coverage/acceptance limits. It does not fabricate approval of YouTube completeness, Premiere discrimination, live Discord delivery or all broader historical T01–T10 proposals. Phase 7 remains unauthorized.

Recorded 2026-10-16. Decision status distinguishes direct user instructions from recommendations. Technical decisions are not represented as approved until the user reviews them.

## Phase 2 update

The user explicitly authorized Discord OAuth2 authentication and bot installation as Phase 2, and selected **Better Auth** in clarification. Current numbering is in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md). Implemented authentication details and library-native schema differences are in [PHASE_02_AUTHENTICATION.md](PHASE_02_AUTHENTICATION.md).

Concrete implementation choices for review: Better Auth 1.7.10/Drizzle/PostgreSQL; encrypted OAuth credentials; native signed-cookie sessions with a 24-hour absolute limit; minimal identify/guilds scopes and personal allowlist; separate bot-only loopback membership API; no bot token in web/worker config selection; no Gateway or delivery behavior. These choices implement the authorized task and do not claim that all original future technical proposals were individually approved.

The Phase 1 URL-validation defect is corrected and regression-tested. The stale phase numbering and current bot ownership contract are reconciled in the canonical roadmap/architecture. Service-specific environment selection is implemented, with shared local filesystem/shell limitations explicitly documented. Historical audit files remain unchanged. Phase 3 and provider feasibility work remain unstarted.

## Confirmed vision and scope

| ID | Status | Decision / source |
| --- | --- | --- |
| V01 | User-confirmed | Build toward a full-stack web dashboard and Discord bot for YouTube/Kick livestream notifications, OAuth2, installation, multi-server management, registration and preferences; original request. |
| V02 | User-confirmed | Current delivery is research and planning saved in docs only; do not implement the application yet. |
| V03 | User-confirmed | Develop and test personally for now; no public beta launch target. Clarification: “For now, I only want to develop and test the Discord bot and web dashboard myself.” |
| V04 | User-confirmed | First release covers livestream starts only; clarification selected the start-only option. |

## Recommended technical decisions

| ID | Status | Recommendation, rationale and tradeoff |
| --- | --- | --- |
| T01 | Proposed | TypeScript, Next.js dashboard/API, independent Node.js worker with discord.js, PostgreSQL, Redis/BullMQ. Shares types and separates persistent work, at the cost of running two backing services. Database-only queue is an alternative. |
| T02 | Proposed | Discord authorization code with identify/guilds; separate guild bot installation; owner/Admin/Manage Guild authorization and personal account allowlist. Avoids collecting unnecessary user data. |
| T03 | Proposed | Public YouTube Data API plus feed hints, candidate checks and budgeted reconciliation. No owner broadcast API or scraping; discovery completeness is a feasibility gate. |
| T04 | Proposed | Kick app tokens plus signed livestream.status.updated webhooks and targeted users/livestreams reconciliation. Avoids mandatory streamer OAuth where official app authorization suffices. |
| T05 | Proposed | Global provider-channel registry with per-guild routes. Monitoring cost depends on unique sources, while send volume depends on destinations. No cross-guild configuration sharing. |
| T06 | Proposed | PostgreSQL inbox/outbox, session/delivery uniqueness, leased workers and deterministic Discord nonce. Durable at-least-once processing with explicit uncertain send status; no permanent exactly-once claim. |
| T07 | Proposed | Local services and narrow HTTPS callback tunnel; allowlisted development dashboard. One developer, at least two test guilds and a proposed cap of 10 unique sources. Local downtime means monitoring downtime. |
| T08 | Proposed | No automatic already-live onboarding/backfill, 10-minute fresh-start catch-up, no resend on title/template changes, separate simultaneous platform notifications. Prevents surprise historical pings. |
| T09 | Proposed | Ordinary text destinations, mentions off by default, optional mentionable role, fixed template placeholders. More flexible channel types and commands are deferred. |
| T10 | Proposed | Bounded history/retention, encrypted tokens and explicit deletion; provider metadata lifecycle reviewed before release. Operational convenience cannot override provider requirements. |

## Open requirements and decisions

| ID | Question | Proposed default | Decision deadline |
| --- | --- | --- | --- |
| Q01 | Approve stack or prefer simpler queue/another language? | T01; no library/version pins until compatibility check | Before Phase 2 |
| Q02 | Which development runtime/container tooling and stable tunnel can the owner use? | Local containers plus HTTPS callback tunnel | Before Phase 1 |
| Q03 | Which test accounts/guilds and broadcaster channels are available? | Two guilds, one non-manager scenario, controllable YouTube/Kick streams | Before Phase 1 |
| Q04 | What YouTube discovery delay/coverage is acceptable after experiments? | No guarantee yet; known candidates targeted within 120 seconds | Phase 1 exit; blocks final detection contract |
| Q05 | Can official API responses reliably exclude Premieres? | Exclude if proven; otherwise disclose and agree limitation | Phase 1 exit |
| Q06 | Approve already-live suppression, freshness window, reconnect identity and separate simulcast notifications? | T08 and requirements document semantics | Before Phase 5 |
| Q07 | Approve per-route content/embed and optional role mention preferences? Need quiet hours, filters or cross-platform grouping? | Start-only, explicit route settings, no quiet hours/filtering/grouping | Before Phase 4; added features require scope update |
| Q08 | Is a slash-command interface required initially? | No; dashboard controls bot, REST posts automatically | Before Phase 3 |
| Q09 | Approve history, account deletion, guild removal recovery and Discord-message lifecycle handling? | Proposed schema retention; resolve provider-data edge cases explicitly | Before Phase 7 |
| Q10 | Need always-on notifications during personal tests, or only while the local worker runs? | Local worker runtime only; no hosting spend authorized | Before any hosting purchase/deployment |

## Approval procedure

The user has approved V01–V04. T01–T10 and their detailed schemas/targets are proposals. Review can approve the proposed planning baseline with named exceptions, or request amendments. Record approval date, exact accepted decision IDs, and any unresolved experiment-dependent conditions here. Phase 1 can only begin after explicit authorization to start implementation/integration work; nothing in this task's documentation creates that authorization.

Approval record: **pending**. No approver/date fabricated. API feasibility conditions remain open even if the planning baseline is approved.

## Phase 3 implementation update

The user authorized Discord server selection and the protected web dashboard as Phase 3. `PHASE_03_DASHBOARD.md` records that phase's protected route contract and recovery corrections. Phase 4 was not yet authorized at that time; the later Phase 4/5 updates below supersede that historical status. No additional provider behavior was approved by implication. Dated audit assessments remain historical evidence; subsequent real OAuth and PostgreSQL checks are recorded in `OAUTH_LOGIN_DEBUG.md`, `PROGRESS.md` and the Phase 5 audit.

## Phase 4 implementation update — 2026-10-17

The user's subsequent instruction explicitly authorizes YouTube/Kick registration and supersedes Phase 4's earlier unauthorized status. Implemented decisions are documented in `PHASE_04_STREAMER_REGISTRATION.md`: official public lookup in the web service; Kick app client credentials; signed confirmation; shared stable identity and separate guild subscriptions; a configurable 10-source development default; and 29-day metadata expiry with disclosed operator cleanup. These engineering choices do not fabricate blanket approval of all earlier T01–T10 proposals. Notices and cleanup operations address the real-data timing concern from planning audit M11, with remaining maintenance/policy limits explicit. The following Phase 5 authorization supersedes this phase's original deferral of notification settings and explicit tests. Detection and automatic delivery remain unauthorized.

## Phase 5 implementation update — 2026-10-17

The subsequent user instruction authorizes Discord notification settings, preview and explicit labelled test sends as Phase 5. It supersedes the older detection-phase numbering and previous deferral of preferences/tests. The [Phase 5 contract](PHASE_05_NOTIFICATION_SETTINGS.md) records engineering choices: one destination per existing subscription, plain-text sample previews, mentionable unmanaged roles only, enabled=false defaults, versioned persistence, restrictive disable without new destination input, 30-second per-guild test admission, seven-day deduplication/outcome retention and conservative uncertain results without automatic resend. These are not blanket approval of the broader future defaults/pause/embed/multi-destination proposals. Automatic detection/delivery and Phase 6 remain unstarted and unauthorized.
