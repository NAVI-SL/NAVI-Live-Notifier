# Security policy

NAVI Live Notifier is controlled-beta source, not an approved public deployment. There is no promised supported-version window, security SLA or public contact email established yet. No contact or legal identity is invented here.

## Report privately

Use the existing approved private communication channel with the repository owner. If GitHub offers a private vulnerability-reporting action for this repository and the owner has enabled it, that is another private route; its availability has not been verified. Otherwise agree on a private channel before sending sensitive details. If you do not already have a private route, open an issue containing only a request for a private reporting channel; do not disclose the vulnerability there. The owner should establish/verify a private intake route before public operation.

Do not open a public issue with exploit details, tokens, OAuth callbacks/codes, cookies, webhook signatures, user/server information or database contents. Start with a sanitized description, affected commit/component, impact and reproducible steps using synthetic data. Do not send secrets to demonstrate a leak.

If you suspect a credential exposure, privately notify the owner. Credential revocation/rotation and any infrastructure changes require the owner's separate action/approval; never paste the value into Git history or merely remove the latest copy while leaving history exposed.

## Controls to preserve

- Better Auth server sessions, OAuth state/redirect validation and approved user scope; server-management checks on protected guild requests and command execution.
- Minimal Discord permissions and only the Guilds Gateway intent; private authenticated broker and internal health endpoints.
- Explicit allowed_mentions, validated guild destinations/roles and deliberate @everyone selection with effective channel permission. Preview sends nothing; tests never ping @everyone.
- Verified webhook signatures/capabilities, official API LIVE confirmation, bounded input/timeouts and rate-limit handling.
- Persistent uniqueness, bounded claims/retries and quarantined uncertain external sends. Do not reset evidence or blindly retry an ambiguous send.
- Private least-privilege database roles, protected migration-owner credentials, verified TLS where required and separately tested backups/restores.

## Source-publication scope

The owner accepted disclosure of existing commit-email metadata in Phase 19. This acceptance does not authorize publishing tokens, private user data or infrastructure credentials. History cleanup and VeraCrypt setup are canceled. The project MIT license does not replace third-party notices or certify hosted-service readiness.

## Secret handling and deployment gates

Store your own credentials in private service-specific settings, not source, NEXT_PUBLIC variables, build arguments, screenshots or logs. Environment examples contain blanks/replacement placeholders, not working credentials. .gitignore/.dockerignore exclusions must be checked against actual staged/image contents; previously tracked files and manual uploads require review too.

Audit dependencies with the committed lockfile:

```sh
npm audit
npm audit --omit=dev
```

Do not use npm audit fix --force without compatibility review. Dated zero-finding scans are not a guarantee about future advisories, OS images or unknown secrets. The existing esbuild override/tooling limitations and release gates remain documented in [Phase 15F](docs/PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md).

Public installation still needs verified hosting, HTTPS callbacks, real integration evidence, alert/restore/capacity checks, approved support/deletion contacts and policy review. No public service, compliance certification or responsible-disclosure contact is claimed by this file.
