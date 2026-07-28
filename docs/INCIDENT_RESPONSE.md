# Incident response plan

## Roles

- Incident lead: coordinates decisions and communications.
- Technical lead: containment, investigation, recovery.
- School/privacy contact: legal, school-board, parent, and participant notification decisions.
- Communications lead: approved external messages.

Record named people and backup contacts outside this repository.

## Severity

- SEV-1: confirmed personal-data exposure, domain/account takeover, destructive compromise, or event-day outage.
- SEV-2: suspected unauthorized access, degraded registration, failed email delivery, or exposed non-sensitive internal data.
- SEV-3: contained bug or vulnerability without known exploitation.

## First 30 minutes

1. Start an incident log with UTC timestamps.
2. Preserve logs and deployment/database state.
3. Revoke compromised sessions, secrets, accounts, and API keys.
4. Disable affected routes or place the service in maintenance mode.
5. Restrict access; do not delete evidence.
6. Notify the incident lead and school/privacy contact.

## Investigation and containment

- Identify affected users, fields, files, time range, and systems.
- Review Supabase Auth, database, Storage, audit logs, hosting logs, email logs, and deployment history.
- Rotate secrets and verify no service-role key reached the browser.
- Patch the root cause in staging and test authorization boundaries.

## Recovery

- Restore from a verified backup when necessary.
- Reapply migrations and validate RLS/storage policies.
- Confirm health checks, login, uploads, decisions, and email.
- Increase monitoring before reopening.

## Notification

The school/privacy contact determines legal and school-board reporting, participant/parent notification, and breach-record requirements. Communicate facts, affected data, protective steps, and contact information without speculation.

## After action

Within seven days, document timeline, cause, impact, controls that failed, corrective actions, owners, and deadlines. Retest the correction and update this plan.
