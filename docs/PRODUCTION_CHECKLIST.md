# Production checklist

## Implemented in this repository

- [x] Managed Supabase Auth integration with email verification and recovery
- [x] Cookie-based server-side sessions
- [x] Server-side authorization checks on protected routes
- [x] Postgres RLS and explicit grants
- [x] Role protection against self-promotion
- [x] Server-side Zod validation
- [x] Parameterized Supabase queries/RPC calls
- [x] Per-action database-backed rate limiting
- [x] Supabase Auth CAPTCHA and rate-limit integration points
- [x] Private Supabase Storage bucket and signed downloads
- [x] File type and size validation
- [x] Quarantine and external malware-scanner callback workflow
- [x] No server secrets in browser code
- [x] Security headers and private cache controls
- [x] Audit logs for application writes and organizer decisions
- [x] Health endpoint and structured logging
- [x] Transactional email provider integration
- [x] Privacy, terms, code-of-conduct, retention, access, incident, and deployment drafts
- [x] CI, dependency updates, secret scanning, tests, encrypted database backup, and separate encrypted Storage-object backup templates
- [x] Separate staging configuration guidance

## Must be completed by organizers

- [ ] School/board approves privacy notice, terms, code of conduct, waivers, guardian consent, photo consent, and retention periods
- [ ] Production and staging Supabase projects/branches exist
- [ ] Production secrets are configured in the hosting provider
- [ ] Service-role key has never been committed or exposed
- [ ] Turnstile is enabled in Supabase and tested
- [ ] Auth redirect URLs and custom SMTP are configured
- [ ] Organizer accounts use MFA
- [ ] External file-scanning provider is configured; `ALLOW_UNSCANNED_FILES=false`
- [ ] Email domain has SPF, DKIM, and DMARC
- [ ] Database and Storage-object backups are enabled and restoration tests have succeeded
- [ ] `/api/health` is monitored from outside the hosting provider
- [ ] Alert recipients and escalation contacts are current
- [ ] Staging load, security, accessibility, and end-to-end tests pass
- [ ] Production data exports are restricted and audited
- [ ] Domain registrar uses MFA, organization-controlled recovery, and auto-renewal
- [ ] A named technical owner and backup owner are documented
- [ ] Former organizers are removed promptly
- [ ] Retention cleanup is scheduled only after approval

## Launch-blocking conditions

Do not accept real applications if any of these are true:

- RLS migration has not been applied and reviewed.
- The service-role key appears in client code, Git history, or browser network requests.
- The Storage bucket is public.
- Email confirmation is disabled.
- Organizer MFA is unavailable or not enforced operationally.
- File scanning is required but not configured.
- Backups cannot be restored.
- Legal/privacy text is unapproved.
- No one is monitoring incidents and outages.
