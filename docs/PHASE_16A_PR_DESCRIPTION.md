# feat: add opt-in PostgreSQL dashboard command architecture

The dashboard's loopback-only bot broker prevents hosting the website separately from the Discord backend. Add an opt-in PostgreSQL command path with authenticated guild-scoped admission, execution-time authorization, durable acknowledgments and dashboard status polling. Keep the existing HTTP path as the default and preserve the private broker for monitoring delivery.

Include strict schemas, idempotency, concurrency-safe claims/leases, bounded recovery and explicit uncertain outcomes without blind send retries. Preserve immediate notification disabling and existing YouTube/Kick delivery protections. Include required earlier security/recovery fixes, additive migration 0007, reviewed least-privilege grants and disabled-by-default cloud preparation templates.

Validation in the independent GitHub checkout: 537 automated tests, TypeScript/lint/format, native production builds, 27 isolated PostgreSQL command scenarios and five local Redis probes passed. Full/production npm audits and bounded source/history/client credential scans found no matches/findings. Discord/provider responses in these tests are simulated; no real notifications were sent.

Migration 0007 and service-role provisioning require separate target approval; prior SQL migration bytes remain unchanged. No production flags, credentials, services or hosting resources were activated. Complete free/no-card continuous hosting and public release remain NO-GO. Review PHASE_16A_GITHUB_SYNC_REPORT.md and PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md for rollback and manual gates.
