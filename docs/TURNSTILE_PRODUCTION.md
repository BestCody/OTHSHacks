# Turnstile production configuration

The application fails closed when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing. Production builds also reject Cloudflare's public test sitekeys.

## Environment separation

Use a separate Cloudflare widget and Supabase project for each environment:

- Production: `oths-hacks.vercel.app` and any approved custom production hostname only.
- Preview/staging: its own widget, sitekey, secret, and Supabase project.
- Local/E2E: Cloudflare's published test keys or a dedicated development widget.

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` separately in Vercel's Production, Preview, and Development scopes. Store the Turnstile secret only in the matching Supabase project's Auth CAPTCHA settings; never expose it as a `NEXT_PUBLIC_` value or commit it.

## Cloudflare widget

Configure the production widget as follows:

- Mode: **Managed**
- Hostnames: exactly `oths-hacks.vercel.app` plus explicitly approved custom production hostnames
- Pre-clearance / clearance level: **No clearance** unless the site is later placed behind a Cloudflare WAF rule that requires it
- Widget name: a descriptive production name such as `OTHacks production auth`

Review Turnstile Analytics for unexpected hostnames, elevated failure rates, and unusual traffic. Rotate the secret after staff changes, suspected exposure, or as part of the regular security review.

## Supabase Auth

In **Authentication → Bot and Abuse Protection**:

- Enable CAPTCHA protection.
- Select **Cloudflare Turnstile**.
- Store the secret from the matching environment's Cloudflare widget.

The browser sends a one-time token to Supabase Auth for sign-in, sign-up, and password-reset requests. The secret remains inside Supabase.

## Automated dashboard configuration

The configuration script updates the existing Cloudflare widget to Managed mode, replaces its hostname list with the approved list, disables pre-clearance, and enables matching Turnstile CAPTCHA protection in Supabase. It performs a dry run unless `--apply` is supplied.

Use narrowly scoped, temporary management tokens and keep them out of Vercel runtime variables. The Cloudflare token needs **Turnstile Sites Write** for configuration (or **Turnstile Sites Read** for audit-only use). The Supabase token needs Auth configuration write permission for configuration and read permission for audits:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="..."
$env:CLOUDFLARE_API_TOKEN="..."
$env:SUPABASE_ACCESS_TOKEN="..."
$env:SUPABASE_PROJECT_REF="trlrtsafdxpxudblwrkd"
$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."
$env:TURNSTILE_EXPECTED_HOSTNAMES="oths-hacks.vercel.app"
npm run turnstile:configure
npm run turnstile:configure -- --apply
```

When Cloudflare redacts the secret returned by its API, set `TURNSTILE_SECRET` for the apply command. Remove all management-token environment variables when the command finishes.

## Automated configuration audit

Create read-only Cloudflare and Supabase management tokens, then run:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="..."
$env:CLOUDFLARE_API_TOKEN="..."
$env:SUPABASE_ACCESS_TOKEN="..."
$env:SUPABASE_PROJECT_REF="trlrtsafdxpxudblwrkd"
$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY="..."
$env:TURNSTILE_EXPECTED_HOSTNAMES="oths-hacks.vercel.app"
npm run turnstile:verify
```

The audit verifies Managed mode, the exact hostname allowlist, clearance configuration, Supabase CAPTCHA enablement, provider selection, and—when both APIs return unredacted values—secret equality.

## E2E testing

Playwright uses Cloudflare's published non-production sitekey, intercepts the Turnstile client script and Supabase Auth requests, and covers sign-in, sign-up, and password reset. The tests verify that:

- Submit starts disabled and enables only after a token arrives.
- The first token is sent with the authentication request.
- A consumed token is cleared and the widget resets.
- Submit remains disabled until a different replacement token arrives.
- A second authentication request uses the replacement token rather than the consumed token.

Cloudflare's published test sitekeys remain restricted to non-production environments.
