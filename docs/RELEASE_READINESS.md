# Release readiness — private beta

Assessed **2026-10-18 (Asia/Colombo)**. **NO-GO.** See the [Phase 9 test report](PHASE_09_TEST_REPORT.md) and [sanitized results](evidence/phase09-results.json). Phase 9 verification is recorded; acceptance is blocked. No Phase 10 or public deployment is authorized.

| Gate                                                      | Current evidence                                                                                | Decision                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| TypeScript, lint, formatting, unit/integration fixtures   | `npm run check`: 249 tests / 23 files, exit 0                                                   | PASS                                                                    |
| Native production build                                   | Next.js/shared/bot/worker build, exit 0                                                         | PASS; Linux Node 24 remains unverified                                  |
| Limited Chrome/HTTP acceptance                            | Home/login/error/recovery/private-route guards/privacy navigation; ten HTTP checks              | PASS within isolated synthetic HTTP configuration                       |
| Real Discord user journey                                 | Fresh login/logout, picker, Install NAVI/status, registration/preferences not completed         | BLOCKED — M01/M03                                                       |
| Real official API authentication                          | YouTube channels, Kick token/inventory/key, Discord bot identity/application match; app private | PASS read-only; not stream/delivery verification                        |
| Actual controlled YouTube and Kick starts/received alerts | No controlled starts or real messages observed in Phase 9                                       | BLOCKED — M03/M04                                                       |
| Duplicate prevention, multi-server isolation, uncertainty | Embedded SQL and mocked external responses pass                                                 | PASS automated; real two-guild/restart acceptance BLOCKED               |
| External PostgreSQL migrations/restart/restore            | Connection refused; isolated integration command exits 1                                        | BLOCKED — M01                                                           |
| Production containers/TLS/process recovery                | Compose model passes; Docker Linux engine absent, image build exits 1                           | BLOCKED — M02                                                           |
| Webhook signatures and safe mentions                      | Adversarial/permission tests pass; no actual external signed callback/mention observed          | PASS simulated; real ingress acceptance BLOCKED                         |
| Browser asset secret scan                                 | 19 assets, 12 candidate fields, no exact-value matches                                          | PASS scoped scan; image/host secret handling still unverified           |
| Dependencies                                              | Four moderate Drizzle/esbuild findings, no high/critical                                        | FAIL advisory check; N01 requires compatible fix or recorded acceptance |
| Operational ownership/alerts/backups                      | Runbooks supplied; no verified restore, alert delivery or production operator setup             | BLOCKED — M02                                                           |
| YouTube supported coverage                                | Candidate-only discovery; no measured completeness/Premiere decision                            | BLOCKED — M04                                                           |

No critical security defect was demonstrated. The four major findings are acceptance/product/operations gaps, not fabricated code exploits. Current configuration has monitoring disabled and no configured public callback origin/secret. The existing bot's private REST health is OK; Gateway connection and received delivery are separate checks.

Before a private beta GO:

- [ ] Restore the intended local database; review/apply migrations through 0006 and verify runtime roles, independent connections, settings persistence, ledger recovery and isolated backup restore.
- [ ] Name approved test guilds/channels/accounts and controllable YouTube/Kick broadcasters. Complete fresh real browser login/logout, install/status and tenant permission tests. Preserve private application/allowlist and default-off mass mentions.
- [ ] Observe actual labelled test messages and actual automatic starts on both platforms; record correct title/URL/platform/YouTube embed and exact per-destination counts. Test repeats/reconnects, two servers and actual worker restart/web-off operation.
- [ ] Run the prepared local container/TLS/health/restart/proxy acceptance with separate review secrets; keep one Gateway owner across Windows/Docker. Validate backups and operational failure/alert procedures appropriate to the beta.
- [ ] Measure/accept YouTube discovery and Premiere limitations, quotas and local downtime behavior; disclose any unsupported cases to testers.
- [ ] Resolve or explicitly accept named moderate dependency/residual risks, with owner/date and a bounded exposure assessment.
- [ ] Rerun affected checks after corrections, update the Phase 9 evidence and obtain explicit owner release sign-off.

For a local personal beta, no hosting purchase/domain selection is required just to close controlled testing gates. A public beta additionally needs approved hosting/hostname/budget, trusted HTTPS/callback setup, secret storage, persistent database and encrypted offsite backups/alerts. Keep [the production checklist](PRODUCTION_CHECKLIST.md) open until those separately authorized gates pass. Do not enable Public Bot or expand the personal allowlist implicitly.

Current permission: continued local verification only. **Release owner/sign-off date: not supplied. Real delivery evidence: not supplied.** Passing simulations cannot substitute for either.
