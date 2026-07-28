# OTHacks production starter

A production-oriented OTHacks website and registration portal built with Next.js 16 and Supabase.

## Included

- Existing OTHacks public landing page and mascot assets
- Supabase email/password authentication with email verification and recovery
- Cloudflare Turnstile integration for Supabase Auth bot protection
- Applicant dashboard and application workflow
- Organizer dashboard and role-based authorization
- Supabase Postgres schema, migrations, RLS policies, audit logs, and rate limiting
- Private Supabase Storage bucket with per-user paths and short-lived signed downloads
- External malware-scanner webhook integration and quarantine states
- Server-side validation with Zod
- Security headers, private-page cache controls, and protected routes
- Transactional email integration through the Resend HTTP API
- Health endpoint for uptime monitoring
- Privacy-conscious analytics switch
- Unit, end-to-end, accessibility, and load-test starters
- CI, dependency updates, secret scanning, encrypted database and Storage-object backup workflows, incident response, and retention documentation

## Important limitation

This folder implements the application and configuration, but it cannot create or operate your external accounts. Before accepting real applications you must create Supabase/Vercel/Turnstile/email/monitoring accounts, supply secrets, apply the migration, configure production settings, review the legal text with the school, run the tests, and verify backups by restoring them. Security is not a one-time code feature.

## Local setup

1. Install Node.js 20+ and the Supabase CLI.
2. Copy `.env.example` to `.env.local`.
3. Start local Supabase:

```bash
supabase start
supabase db reset
```

4. Copy the local project URL, publishable key, and service-role key into `.env.local`.
5. Install and run:

```bash
npm install
npm run dev
```

6. Open `http://localhost:3000`.

## Create the first organizer

Create and verify an account, then run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ORGANIZER_EMAIL';
```

Only an existing admin should promote later organizers.

## Production deployment

See `docs/DEPLOYMENT.md`. Recommended topology:

- Vercel: Next.js frontend/backend-for-frontend
- Supabase production project: Auth, Postgres, private Storage
- Supabase persistent branch or second project: staging
- Cloudflare Turnstile: bot protection
- Resend: transactional email
- External scanner: malware scanning webhook
- UptimeRobot/Better Stack: `/api/health` monitoring
- Vercel logs or a configured `LOG_DRAIN_URL`: centralized error/security logs

## Required Supabase dashboard settings

- Enable email confirmations.
- Set the site URL and callback URLs.
- Set minimum password length to 12 or stronger.
- Enable leaked-password protection if available on the plan.
- Enable Turnstile under Auth → Bot and Abuse Protection.
- Review Auth rate limits.
- Apply migrations with `supabase db push`.
- Verify the `application-files` bucket is private.
- Enable daily database backups or PITR according to the recovery target. Database backups do not contain Storage object bytes, so configure the separate encrypted S3-compatible Storage backup workflow too.
- Configure staging/preview branches.

## Routes

- `/landing.html` public landing page
- `/auth/sign-up`, `/auth/login`, `/auth/forgot-password`
- `/dashboard` applicant application and private documents
- `/organizer` organizer dashboard
- `/api/health` monitoring endpoint
- `/privacy`, `/terms`, `/code-of-conduct`

## Security model

The browser uses only the Supabase publishable key. Authorization is enforced in Postgres using RLS and in every protected server route. The service-role key is server-only and is used only inside authenticated server routes for rate limiting, validated private uploads, signed URLs after authorization, scanner callbacks, and operational jobs. No Storage API permissions are granted directly to browser users.

Review `docs/PRODUCTION_CHECKLIST.md` before launch.
