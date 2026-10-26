# Contributing to NAVI Live Notifier

This is a private, controlled-beta repository. Coordinate through an existing approved private project channel before starting work. Do not publish personal contact details, create public invites or change repository visibility to obtain access.

## Scope and workflow

1. Read the [README](README.md), [architecture](docs/03-architecture.md), current [cloud plan](docs/PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md) and relevant phase report.
2. Work on an explicitly approved feature branch; do not modify or push directly to main. Keep unrelated fixes, dependency upgrades and infrastructure changes out of a documentation change.
3. Preserve existing user data, migration history, guild authorization, private broker boundaries, safe mentions, deduplication and uncertain-delivery evidence.
4. Describe the concrete problem and behavior in a proposed PR, with actual test results, migration/flag implications and remaining manual checks. Obtain approval before committing/pushing when the task requires it; no automatic merge or deployment.

## Local validation

Use the locked dependencies and documented Node/npm versions:

```sh
npm ci
npm run check
npm run build
npm run env:check:example
```

Run PostgreSQL/Redis integration scripts only with separately prepared disposable targets; the SQL reliability tools must not be pointed at a normal database casually. Follow [self-hosting](docs/SELF_HOSTING.md) and the [Phase 15E validation boundaries](docs/PHASE_15E_VALIDATION_REPORT.md).

Use LF for normal text. Applied SQL migration files are byte-sensitive and excluded from automatic line-ending conversion; add new migrations instead of editing old ones. Do not regenerate migration snapshots or run forced audit repairs merely to make checks green. Prefer focused regression tests for confirmed functional defects; documentation-only work needs link, command/configuration and formatting validation.

## Safety and reporting

Never include real environment files, secrets, cookies, OAuth codes, webhook signatures, database exports, private keys, generated output or raw logs. Report only sanitized status codes/timestamps and minimal reproduction steps. Read [SECURITY.md](SECURITY.md) before reporting a suspected vulnerability.

Tests should use synthetic external responses unless a separately approved integration test specifies the accounts, guilds, destinations and allowed effects. Starting a configured bot logs into Discord; starting an enabled worker can subscribe to external webhooks and send real messages. Do not use a runtime start as a casual smoke check.

## License

The owner selected the [MIT License](LICENSE). The copyright notice is 2026 NAVI-SL. Contributions must be yours to license and must preserve third-party notices. This document does not assert a separate contributor license agreement.
