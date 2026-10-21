# Private beta feedback intake template

Prepared mechanism only; no external recipient, invitation, web form, email or issue tracker is created. The operator must confirm a private intake channel before invitations. `/support` explains this workflow without inventing contact details. Do not use a public issue for a security/privacy incident.

Copy only necessary fields:

```text
Case ID: operator assigns BETA-YYYYMMDD-NNN
Observed time and timezone (UTC preferred):
Feature: login / install / registration / settings / live alert / other
Steps to reproduce:
Expected result:
Actual result and visible safe error code:
Reproducible: always / sometimes / once
Public stream URL and start/end time, if relevant:
Message observed in approved channel: yes / no / uncertain
Normal message count for that stream/destination:
Redacted screenshot or safe log reference, if needed:
Impact: blocked / degraded / cosmetic / security or privacy concern
```

Never include passwords, tokens, API keys, OAuth callback URLs/codes/state, cookies, connection strings, raw webhook signatures or private member lists. Redact personal names/server/channel IDs and screenshots unless privately required for verification. Do not log message content or credentials in case records.

Operator procedure: privately acknowledge, verify reporter/approved target, assign ID, severity and next review time, link to sanitized evidence, record correction/test and notify reporter only through the agreed authorized channel. Suggested response target: security/unsafe-send concern immediately during supervised sessions; blocking issues before cohort expansion; cosmetic issues at the next review. These are proposed operational targets, not a staffed SLA.

Optional local case storage is protected ignored `.local/beta-feedback/`; no cases or personal data were created by this task. Decide ACLs/retention/deletion and a working intake channel before use. Do not publish case data into repository docs. Confirmation that feedback receipt works requires an approved end-to-end report/acknowledgment test; a template alone does not prove receipt.
