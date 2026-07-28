# Deployment guide

## 1. Environments

Use separate Supabase environments for local, staging, and production. Supabase branching can create isolated preview environments, while a persistent branch is suitable for staging. Never copy real applicant data into staging.

## 2. Supabase

1. Create the production project in an approved region.
2. Link the CLI: `supabase link --project-ref YOUR_REF`.
3. Review and apply migrations: `supabase db push`.
4. Confirm every exposed table has RLS enabled.
5. Confirm `application-files` is private and limited to 5 MB with the allowed MIME types.
6. Configure Auth URL settings, custom SMTP, email confirmations, password policy, MFA for organizers, Turnstile, and rate limits.
7. Enable daily database backups or PITR. Configure the separate S3-compatible Storage-object backup because database backups contain Storage metadata but not the file bytes. Record RPO/RTO and perform restoration exercises for both.

## 3. Vercel or equivalent managed Next.js hosting

- Import the repository.
- Configure every value from `.env.example` in staging and production separately.
- Restrict who can change environment variables and production deployments.
- Turn on deployment protection for previews that expose organizer functionality.
- Configure an external uptime monitor for `/api/health`.
- Connect logs to a monitored log drain or use the provider’s alerting.

## 4. Domain and email

- Use an organization-controlled registrar account with MFA and auto-renewal.
- Configure the custom domain and verify automatic HTTPS.
- Configure SPF, DKIM, and DMARC for the transactional email domain.
- Test verification, recovery, submission, acceptance, waitlist, and rejection messages.

## 5. Bot and abuse protection

- Create a Cloudflare Turnstile site.
- Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Configure the Turnstile secret in Supabase Auth, not in the browser.
- Test automated signup and password-reset abuse controls.

## 6. File scanning

Configure a managed malware-scanning service that can accept a temporary signed URL and POST a result to `/api/files/scan-callback` with `x-scan-secret`. Keep `ALLOW_UNSCANNED_FILES=false` in production. Pending files are not downloadable.

## 7. Release process

1. Open a pull request.
2. CI must pass type checking, tests, build, and secret scan.
3. Deploy to staging and run e2e, accessibility, and load tests.
4. Review database migrations and rollback plan.
5. Deploy production during a staffed window.
6. Verify login, application save/submit, uploads, organizer decisions, email, and health checks.
7. Record the release and responsible person.
