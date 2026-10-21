# Security, risks and dependencies

**Current Phase 13 — 2026-10-20:** [unified mentions](NOTIFICATION_MENTIONS.md) governs both automatic YouTube and Kick, superseding the older YouTube-only exception below. Everyone remains explicit/permission-gated; previews/tests never ping everyone. [Stabilization](PHASE_13_IMPLEMENTATION.md) adds private bounded telemetry and console alerts; bearer protection, current guild checks and restrictions remain. No credentials, raw provider data or templates in metrics. Four moderate advisories and real release/policy/restore gates remain open.

**Subsequent YouTube mention exception — 2026-10-18:** the user explicitly authorized a default-off, administrator-enabled everyone option for automatic YouTube alerts. Current manager authorization, bot effective channel permission and an explicit allowed-mention allowlist are required; raw template mentions remain blocked. Previews/tests never ping everyone; Kick is unchanged. [Current safety contract](YOUTUBE_NOTIFICATION_EMBEDS.md) supersedes older unconditional no-everyone statements for this narrow case only.

**Current Phase 8:** [security findings and corrections](PHASE_08_IMPLEMENTATION.md) and [production release checklist](PRODUCTION_CHECKLIST.md) now govern deployment preparation. Runtime secret files, least-privilege role grants, private readiness probes and bounded ingress/logging are prepared; required-platform readiness, monotonic cooldown, contention/completion diagnostics and expired-key backoff are corrected. Container/TLS/backup/live integration evidence and four moderate dependency findings remain release gates. No public deployment or secret changes occurred.

**Phase 7:** [current reliability controls](PHASE_07_IMPLEMENTATION.md) add generation-protected webhook hints, activation/attempt fencing, current leadership checks, bounded safe pre-send retry, private health and shutdown draining. Ambiguous/post-send failure is uncertain with no blind replay. Health is bearer-protected on loopback and must not be exposed by the webhook proxy. Real provider delivery, policy/retention and moderate tooling-advisory risks remain open; historical phase boundaries below do not describe the current worker as idle.

Phase 6 adds official API LIVE confirmation, HTTPS-origin webhook configuration with RSA/HMAC verification, bounded ingress without XML entities, durable replay/session/delivery identities, provider admission budgets and current bot permissions. The worker uses the private broker secret but never the bot token. Its public TLS enforcement remains a reverse-proxy/operator responsibility. [Phase 6 limitations](PHASE_06_IMPLEMENTATION.md) explicitly retain the YouTube coverage/Premiere, live acceptance, external database and existing tooling advisory gates; implementation is not proof of production readiness.

Status: proposed controls and acceptance gates; not an assertion of an implemented security posture.

Phase 4 implements registration-specific input/SSRF boundaries, current guild authorization on CRUD/lookup, signed confirmations, bounded provider requests, safe errors, API cooldowns, minimal notices and metadata expiry/deletion. See [the current registration contract](PHASE_04_STREAMER_REGISTRATION.md). Daily cleanup, backup deletion, live credential checks and public-release policy review remain operator acceptance gates; no exemption for personal API tests is assumed. Future webhook/delivery controls below remain proposals.

## Trust boundaries and controls

Phase 5 applies fresh manager authorization, exact-Origin mutations, scoped subscription access, composite tenant FKs, bot-side permission overwrite/role verification, explicit allowed_mentions, labelled sample rendering, persistent test admission and uncertainty handling. [The Phase 5 contract](PHASE_05_NOTIFICATION_SETTINGS.md) distinguishes safe restrictive disable, saved configuration snapshots, in-flight races and future automatic-send requirements. Bot credentials remain bot-only; the authenticated loopback broker now supports explicit test sends and must remain private. No automatic notification or exactly-once delivery guarantee is introduced.

| Boundary / threat | Required control | Verification |
| --- | --- | --- |
| Browser → OAuth/session | One-use unpredictable state, exact registered redirects, no open redirects, Secure/HttpOnly/SameSite cookies, session rotation, expiry/logout, CSRF and Origin checks on mutations | Missing/reused state, cross-origin POST, session fixation and logout tests |
| Developer dashboard access | Discord account allowlist during personal stage, enforced server-side after login and on session use | Unlisted Discord account cannot access dashboard/API |
| User → guild data (IDOR) | Current Discord manager check per mutation/test-send; scoped reads; guild-scoped resource queries and composite foreign keys | Two-guild tests, forged route/channel IDs, permission revocation during active session |
| OAuth refresh and secrets | Encrypted token storage, refresh lock/version check, least privilege, secret redaction, rotation procedure; no secrets in NEXT_PUBLIC values, Git, logs, job payloads or browser | Search built assets/logs and test concurrent refresh/revocation |
| Public webhook ingress | TLS, raw body preservation, signature verification for Kick, topic checks and REST confirmation for YouTube, bounded JSON/XML parsing, DTD/XXE disabled, request throttles | Forged signature, changed byte, oversized body, unknown topic, malicious XML and malformed event tests |
| Kick replay | Message-ID deduplication; timestamp plausibility check; proposed initial 5-minute skew allowance, revisited against observed retry timestamps | Replayed ID is harmless; stale event cannot cause fresh send; rejected old retries trigger reconciliation rather than silent loss |
| External URLs / SSRF | Parse only allowlisted YouTube/Kick URL formats; resolve via fixed official API origins; prevent fetch redirects to private addresses; no arbitrary thumbnail proxying | Localhost, metadata-service URL, disguised host, credentials in URL, redirects and malformed URL tests |
| Templates / metadata | Fixed placeholders, bounded strings, escape dashboard text/Markdown as appropriate, CSP, explicit Discord mention allowlist | Malicious title/template cannot run script or ping unselected roles/everyone |
| Bot authorization | Minimum permissions, channel overwrites, role mentionability, no privileged Gateway intents | Removed posting permission blocks delivery and produces actionable status |
| Queues and concurrency | DB uniqueness, leases, bounded retries, outbox replay, per-route send coordination | Duplicate jobs, process termination, Redis loss and disable-vs-send race tests |
| Host / data services | Loopback/private database and Redis, strong local secrets, separate dev/prod credentials, tunnel path restriction | External probes cannot reach admin/database/Redis surfaces |

The tunnel hostname is public and unpredictable URLs are not authentication. Public health responses must not expose detailed errors. Audit changes and test sends with actor and guild context, but redact tokens, OAuth query codes, raw signatures and unnecessary personal data.

## Risk register

| ID | Risk / impact | Likelihood | Mitigation and stop condition |
| --- | --- | --- | --- |
| R01 | YouTube feed/playlist discovery misses unscheduled or long-scheduled livestreams | High | Phase 1 controlled coverage matrix; measure false negatives. Stop a general go-live promise until a supported discovery strategy is demonstrated. Owner approval needed for limitations. |
| R02 | YouTube quota prevents intended frequency/coverage | High | Separate search/regular budgets, batching, global monitoring, cap sources, reserve headroom. Check actual console quota; reduce cadence/scope before exhaustion. |
| R03 | Local machine/tunnel downtime loses callbacks | High | Durable inbox, subscription reconciliation and bounded catch-up. No local uptime promise. Stable tunnel URL and health display; always-on hosting is a later decision. |
| R04 | Kick API changes, subscription deletion or key rotation break monitoring | Medium | Current official targeted endpoint, key refresh on validation failure with bounded retry, periodic subscription inventory, payload-version checks and alerts. |
| R05 | Duplicate/out-of-order provider events cause repeated or incorrect notifications | High | Stable session keys, monotonic transitions, uniqueness, replay tests and polling verification for contradictions. |
| R06 | Discord accepted message but acknowledgment lost | Medium | Deterministic enforced nonce, short bounded retry, persistent uncertain outcome; no claim of permanent exactly-once delivery. |
| R07 | Stale access/permission caches allow cross-server configuration or leaked data | High impact | Current per-write manager check, guild-scoped queries, server-side allowlist and adversarial isolation tests. Fail closed on auth verification errors. |
| R08 | Bot removed or target channel/role changes | Medium | Gateway lifecycle plus REST reconciliation, pre-send validation, suspend blocked destinations and expose repair steps. Never repeatedly hit forbidden endpoints. |
| R09 | Template mentions create unwanted mass pings | High impact | Mentions off by default, explicit role selection, safe allowed_mentions, test-send labels and cooldown. |
| R10 | Data lifecycle conflicts with provider policy or user expectations | Medium | Bounded cache retention, deletion workflow, review identifiers and Discord message persistence, release gate for unresolved policy handling. No compliance guarantee from documentation alone. |
| R11 | Redis/DB loss or expired worker leases lose jobs or double-process | Medium | PostgreSQL authority, outbox, idempotent handlers, reclaimable leases, backup/restore experiment. Redis loss is recoverable from DB. |
| R12 | Premieres misclassified as actual livestreams | Medium | Compare official responses for Premiere/live fixtures. Stop claiming reliable exclusion if the API cannot distinguish them. |
| R13 | Personal project grows into public service without operational capacity | Low initially | Keep developer allowlist; reopen requirements before public use, verification thresholds, abuse controls, budget and uptime commitments. |

The developer owns these risks during the personal stage. Severity prioritizes R01/R02 feasibility and R07/R09 security before feature expansion.

## Dependencies before integration

- Discord developer account/application, bot token, client ID/secret, registered redirect URI, and at least two test guilds with manager access. A second account or downgraded manager role is needed to verify denial paths.
- Google Cloud project with YouTube Data API enabled, restricted server key, visible quota dashboard, and access to a channel capable of controlled public broadcasts. Live-stream eligibility is external to NAVI.
- Kick developer application, app credentials, webhook settings, and a broadcaster/channel usable for controlled stream tests. Verify actual app-token subscriptions to a non-owner channel.
- Local Node.js supported runtime, package manager, PostgreSQL and Redis; Docker/container tooling is proposed, with native services acceptable if preferred. No installation occurs in this task.
- Stable public HTTPS callback endpoint/tunnel, local TLS/origin strategy for OAuth cookies, synchronized system clock and working outbound provider access.
- A chosen secret store or untracked local environment file, external encryption key, and an initial backup location/procedure. Do not put real values in documentation.
- Later public deployment: domain, compute that supports a persistent worker, paid-resource budget, operator contact, privacy/terms notices, and provider verification/policy review as applicable.

## Operations and observability

Record structured request/event/delivery IDs, provider API timing and status, source last successful check, queue age, renewal failures, invalid signature counts, retry counts, terminal failures, uncertain sends and quota remaining. Measure provider detection latency separately from NAVI processing latency so a fast queue does not hide late discovery.

Dashboard should show degraded/stale monitoring explicitly. Raise local operator diagnostics when subscriptions are absent, polling repeatedly fails, quota falls below reserve, the Gateway disconnects persistently, or queued work exceeds its freshness window. For this personal stage, use logs and dashboard status; external alert destinations are undecided.

Recovery exercises: restart every process; delete Redis queued state and rebuild from DB; simulate API outages/429; rotate a credential; restore PostgreSQL backup; reconcile subscriptions; reapply deletion records after restore. Proposed local recovery target is within one hour after the developer begins intervention, with at most one day's loss from daily backup; this is a development objective, not a production SLA.

An unresolved ambiguous Discord delivery must be visible to the developer and cannot be silently retried after the nonce window. Manual resolution must record an audit entry and explain the duplicate risk.
