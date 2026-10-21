# NAVI Live Notifier — Privacy Policy draft

**REVIEW REQUIRED — NOT EFFECTIVE OR APPROVED FOR PUBLIC PUBLICATION.** Prepared 2026-10-18. Service name confirmed by the owner; intended operating country **Sri Lanka, subject to confirmation**. This is a factual implementation-based draft, not a declaration of legal/platform compliance.

| Publication field              | Value awaiting confirmation                                 |
| ------------------------------ | ----------------------------------------------------------- |
| Operator/legal identity        | **[OPERATOR_LEGAL_NAME — TO BE CONFIRMED]**                 |
| Service website                | **[WEBSITE_URL — TO BE CONFIRMED]**                         |
| Public support                 | **[PUBLIC_SUPPORT_CONTACT — TO BE CONFIRMED]**              |
| Privacy/data deletion contact  | **[DATA_DELETION_CONTACT — TO BE CONFIRMED]**               |
| Operating country/jurisdiction | **[SRI LANKA — PROVISIONAL; JURISDICTION TO BE CONFIRMED]** |
| Effective date/version         | **[EFFECTIVE_DATE_AND_VERSION — TO BE APPROVED]**           |

No personal email address, phone number or residential address is supplied by this draft. Establish a suitable public contact and any legally required operator disclosures through owner review before release.

## What NAVI does

NAVI helps authorized Discord server managers register public YouTube/Kick channels and configure livestream-start notifications. The current application is restricted to approved private-beta accounts; public use is not yet activated. NAVI is independently operated and does not claim endorsement by Discord, Google/YouTube or Kick.

## Information processed and purposes

| Information                                                                                                           | Purpose and current storage                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord account ID, display name, avatar                                                                              | Sign-in and dashboard identity. An internal synthetic email identifier is derived from Discord ID; NAVI does not request Discord email scope. Stored in PostgreSQL.                                                                                       |
| Discord OAuth access/refresh credentials, scopes and expiry                                                           | Retrieve identity/server memberships and refresh authorized access. Credentials encrypted by the authentication library using a separately held secret; not sent to browser code. Database/disk security still requires operational configuration.        |
| Session token/cookie, expiry, optional IP/user-agent fields                                                           | Maintain authenticated sessions and access controls. Browser uses an HTTP-only session cookie; Secure on the configured HTTPS origin. Server session records may include library-supplied IP/user-agent; not a promise those fields are always populated. |
| Discord guild membership/permission and bot guild/channel/role information                                            | Check server-management rights, installation and safe notification destinations/mentions. Membership/target reads have short process caches; selected guild/channel/role IDs persist with settings.                                                       |
| Entered channel identifier, platform stable ID, public name/URL, verification timestamps                              | Resolve and manage registered streaming accounts. Provider identity is shared internally; server subscriptions/preferences remain separate.                                                                                                               |
| Destination, message template, enabled flag, mention choice and settings version                                      | Deliver administrator-configured messages safely and protect concurrent edits.                                                                                                                                                                            |
| Public livestream title/URL/start, optional profile/category/thumbnail URLs, candidate video IDs and webhook metadata | Verify current LIVE state, reconcile missed hints, render alerts and prevent duplicates. No private Google/Kick account login is requested by the current integration.                                                                                    |
| Test/delivery IDs, hashed session keys, destination IDs, attempts/states/times and sanitized error codes              | Deduplication, safe retry/uncertainty handling, diagnosis and recovery. Hashes/opaque IDs are not assumed anonymous or exempt from retention review.                                                                                                      |

No advertising, tracking analytics, payment processing, chat-content collection or Message Content privileged intent is implemented. Essential cookies do not imply consent for future tracking. Proxy/hosting/backup services may process transport/log data when selected; list actual providers and transfers before publication rather than implying none.

## Platforms and other recipients

Discord receives OAuth operations and notification messages in the server/channel chosen by its manager. YouTube and Kick receive account lookup/monitoring requests. Published messages contain selected public stream metadata and optional mentions and are visible to people with channel access. Discord and image/CDN services may process image/link requests when recipients view content. Existing previews use sample data; a preview is not a live platform feed.

This application uses **YouTube API Services**. See [Google's Privacy Policy](https://policies.google.com/privacy), [YouTube Terms](https://www.youtube.com/t/terms), [Discord Privacy Policy](https://discord.com/privacy) and [Kick Privacy Policy](https://kick.com/privacy-policy). Google authorization settings are available at [Google account permissions](https://security.google.com/settings/security/permissions); NAVI currently uses public API-key access rather than Google user OAuth. Discord authorization can be managed in your Discord account settings. Revoking access does not by itself prove NAVI's stored data has been erased; request deletion as described below.

No data sale or advertising sharing is implemented. Future hosting/support/backup processors, countries, purposes and agreements: **[PROCESSORS_AND_DATA_TRANSFER_DETAILS — TO BE CONFIRMED]**. Applicable processing basis, international transfers, age rules and rights disclosures require review for intended users and operator jurisdiction. No particular lawful basis or legal exemption is invented here.

## Retention — current behavior and review gaps

Sessions expire after 24 hours; logout deletes the current session, not all account data. Account/credentials persist until an appropriate deletion operation. Provider identities expire after 29 days unless refreshed; expired registrations are hidden and cleanup removes them. Stream payloads are cleared after 29 days by worker cleanup; receipt hashes/test history use seven-day cleanup. Physical deletion depends on running maintenance; expired rows are not guaranteed erased merely by displaying a date. Short read caches expire and require process/cache handling during deletion.

Session hashes/delivery outcomes, some candidate IDs and guild routing metadata currently remain while their source exists; shared sources can outlive one server subscription. Backups/logs do not yet have a verified enforced retention/erasure schedule. These are **unresolved publication gates**, not commitments to indefinite retention. Final policy must specify necessary periods and verified handling across active data, caches, logs, backups and restored copies: **[APPROVED_RETENTION_AND_BACKUP_EXPIRY — REQUIRED]**. Do not publish a claim that all data is erased in seven/29 days without testing every store.

YouTube's current policy requires bounded storage/refresh and provides deletion obligations, including seven-calendar-day requested-user-data deletion provisions. Applicable data categories and backup/Discord-message handling must be assessed; the code's cleanup timers alone do not establish compliance. [Official YouTube Developer Policies, III.E](https://developers.google.com/youtube/terms/developer-policies). Operator procedure aims to process applicable requests promptly and within those platform deadlines; it is not yet a validated public service commitment.

## Your choices and deletion requests

Managers can disable alerts or remove a server's streamer subscription in the dashboard. Shared identity deletion occurs only when no remaining subscription needs it. Logout ends a session. To request account data, correction, whole-server deletion or other applicable rights, contact **[DATA_DELETION_CONTACT — TO BE CONFIRMED]**. During private testing use the previously agreed operator channel. Verify identity/server authority without passwords or tokens. Account deletion must not delete other managers' independent guild configurations automatically. [Detailed process](DATA_DELETION_PROCESS.md).

Deleting NAVI records does not delete your Discord, YouTube or Kick account, source broadcasts, or copies of notifications already posted in Discord. Those require the platform's controls and appropriate channel authority. Before final publication decide how historic Discord notifications and immutable backups are handled; do not promise automatic erasure of messages when their IDs are not stored.

## Security, incidents and updates

NAVI uses authenticated server-side authorization, secret-separated processes, encrypted OAuth credentials, signed state/webhooks, fixed provider URLs and explicit mention permissions. Production HTTPS, full storage/backups encryption, provider access, retention and alerting are not yet verified. Never send support credentials, callback codes or session cookies. Report security concerns at **[SECURITY_CONTACT — TO BE CONFIRMED]**. Incident assessment/notifications must follow reviewed applicable obligations; no unverified deadline is claimed.

Publication/version notification process: **[POLICY_CHANGE_NOTICE_METHOD — TO BE CONFIRMED]**. Before public deployment confirm legal identity/contact, Sri Lanka jurisdiction and any applicable local/international requirements, actual host/processors/transfers, published links, deletion/retention tests and effective date. The existing website's development notice remains unchanged until an approved publication step.
