# Vision and requirements

## Approved project direction

NAVI Live Notifier lets a Discord server manager select YouTube and Kick channels and receive a Discord message when a public livestream begins. The web dashboard provides sign-in, server selection, configuration, and delivery diagnostics. Monitoring runs independently of whether the dashboard is open.

The initial audience is the owner developing and testing the system personally. Multi-server support remains a functional requirement, exercised with test servers; there is no public beta or paid hosting commitment. The first release sends **livestream-start notifications only**.

## Proposed release boundary

MVP includes public livestreams, ordinary guild text channels, per-streamer routes, optional role mentions, preview/test messages, enable/disable controls, and recent delivery history. Each platform channel is a separate monitored source; linking a person's YouTube and Kick identities is deferred. A simultaneous stream on both platforms produces two notifications.

Deferred: scheduled reminders, offline messages or edits, uploads/VOD notifications, private/member-only content, direct messages, threads/forums, announcement crossposting, arbitrary webhook destinations, streaming/chat moderation, billing, public signup, custom dashboard roles, mobile apps, analytics, and multi-region hosting. YouTube Premieres are excluded as a product intention, subject to API discrimination validation in Phase 1; if reliable classification is unavailable, document and obtain approval for the resulting limitation before claiming that exclusion.

## Personas and authorization

- Owner/developer: runs local services, holds application credentials, uses an allowlisted Discord account during development, and inspects diagnostics.
- Server manager: Discord guild owner or member whose current guild permissions include Administrator or Manage Guild. This is the eventual authorization model, also enforced during personal tests.
- Bot: a guild-installed application that posts notifications with a separate bot token. User login alone does not install it.

An account allowlist limits access during personal development but never replaces guild authorization. No permanent local membership record grants access after Discord permissions are revoked.

## Functional requirements and acceptance

| ID | Requirement | Acceptance evidence required before release |
| --- | --- | --- |
| F01 | Discord OAuth2 authorization-code login and logout | Valid login produces a server-side session; denied consent, invalid/reused state, expired code, logout and revoked refresh credentials fail safely. No provider tokens in browser storage. |
| F02 | Server picker and installation flow | Paginated manageable guilds appear with installed/not installed/unavailable status. Installing into another guild cannot grant access to the selected guild. Installation is verified independently of callback parameters. |
| F03 | Multi-server isolation | Two test guilds have independent settings. Tampering with guild, channel, route or history IDs never exposes or mutates the other guild. A non-manager is denied by direct API calls. |
| F04 | Resolve and register streamers | Accept canonical YouTube channel IDs, channel URLs and handles; Kick channel slugs/URLs. Resolve with official APIs, show confirmation, store stable provider IDs. Reject malformed/unsupported URLs; rename does not duplicate the source. Unsupported legacy URL formats get a useful error. |
| F05 | Configure notification routes | Select a supported channel belonging to the active guild, one route per source/destination, enabled flag, bounded content template, embed flag, optional mentionable role. Server-wide pause overrides routes. |
| F06 | Start detection for both providers | Controlled public test streams exercise offline-to-live detection. Scheduled videos, normal uploads, metadata-only events, duplicate callbacks and replayed jobs do not generate additional start messages. Private/deleted/unavailable content displays unknown/unavailable status. |
| F07 | Delivery and diagnostics | Message contains streamer/platform, title when available, and canonical watch URL. Dashboard exposes pending, sent, suppressed, failed and uncertain deliveries, reason codes and last monitoring check. Permission failures are actionable. |
| F08 | Preview and explicit test send | Preview has no Discord side effects. Explicit test send goes through guild authorization and current bot permissions, is rate limited and clearly labelled TEST; it cannot create a real stream session. |
| F09 | Preferences and disable/delete | Guild defaults initialize new routes; each saved route has explicit preferences. Disabling stops queued unsent work after revalidation; removing a route stops future work and preserves bounded audit history. |
| F10 | Lifecycle recovery | Worker restart, duplicate/out-of-order callbacks, Redis interruption, expired subscription, permission removal, channel deletion, and bot removal have documented recovery tests. Temporary guild unavailability does not erase installation state. |
| F11 | Personal development access | Only configured developer account(s) can enter dashboard routes during this stage, while OAuth login and guild checks remain real. |

## Proposed notification semantics

One logical notification per stream session, guild destination channel, and event type. Multiple video IDs on one YouTube channel are independent sessions. Repeated observations or title changes never re-notify. A new Kick `started_at` is a new session; a repeated session key is not. A YouTube video ID is notified once, including reconnects to that broadcast.

Registering a source or enabling a route while it is already live establishes a baseline and does not send an automatic message. A separate labelled test message is available. Baseline initialization must complete before a route becomes active. Disabled intervals are not backfilled.

On recovery, send a newly discovered start only if the stream is still confirmed live and its actual start is within a proposed 10-minute freshness window, and the route was active before that start. Otherwise record suppression with a reason. Do not replay old notifications in bulk. Disable/delete and worker-send are serialized per route so a committed disable prevents subsequent send initiation; a request already sent to Discord cannot be recalled.

Templates use a fixed allowlist (`streamer`, `platform`, `title`, `url`), with plain substitution and length limits. No executable expressions or arbitrary HTML. Mentions default off. User/metadata text cannot enable `@everyone` or `@here`; role mentions require explicit selection and Discord permission checks.

## Nonfunctional targets (proposed, not provider guarantees)

- Local baseline: one developer, at least two test guilds, up to 10 unique sources across both providers; configurable cap enforced before registration. Hosting budget: none committed; cloud hosting deferred.
- Durable event ingestion: acknowledge only after database commit; target p95 under 2 seconds in local integration tests.
- App processing: p95 under 30 seconds from a verified live observation to successful Discord response under normal conditions, excluding provider delay and mandatory rate-limit waits.
- Detection experiment target: Kick webhook arrival within 60 seconds of controlled starts; known YouTube candidates within 120 seconds on a 60-second polling interval. Unknown YouTube stream discovery has no promised bound until Phase 1 succeeds.
- Dashboard: keyboard-operable controls, labelled forms, visible errors, responsive server configuration; target WCAG 2.2 AA for implemented flows, verified in later UI QA.
- Database is the durable authority; processes can restart without resetting deduplication. All persisted instants use UTC; UI displays a chosen/local timezone.
- No formal uptime SLA for local development: notifications stop when the machine, worker or internet is off. Dashboard closing alone does not stop the worker.

## Requirements still needing a decision

See [decision record](07-decisions.md) for budget/deployment, notification semantics, Premiere behavior, data lifecycle, optional slash commands, and feasible YouTube coverage. These are implementation gates where material, rather than assumed user commitments.
