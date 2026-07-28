# Data inventory and retention

This draft requires school and privacy review.

| Data | Purpose | Access | Proposed retention |
|---|---|---|---|
| Account email/name | authentication and communication | user, authorized organizers | delete/anonymize within 1 year after event |
| Application answers | admission and event planning | authorized organizers | rejected/draft: 90 days after event; accepted: 1 year |
| Dietary/accessibility needs | safe event support | minimum operational staff | delete within 30 days after event where possible |
| Emergency contact | event safety | designated safety staff | delete within 30 days after event |
| Uploaded documents | application/consent | authorized organizers | delete within 90 days after event unless required longer |
| Audit/security logs | fraud and incident investigation | administrators | 1 year, longer only for active incidents |
| Aggregate statistics | event reporting | organizers/public | retain only when de-identified |

The repository includes `scripts/retention-cleanup.mjs`. It defaults to a dry run and deletes Storage objects through the Storage API before deleting database records only when `--execute` is supplied. Approve the policy, take and test backups, run it on staging, and review the dry-run count before scheduling it.
