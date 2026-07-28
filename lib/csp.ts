const commonDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://plausible.io",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
];

export function buildAppCsp(nonce: string, environment = process.env.NODE_ENV) {
  const developmentSource = environment === "development" ? " 'unsafe-eval'" : "";

  return [
    ...commonDirectives.slice(0, 5),
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentSource} https://challenges.cloudflare.com https://plausible.io`,
    ...commonDirectives.slice(5),
  ].join("; ");
}

export function buildLandingCsp() {
  return [
    ...commonDirectives.slice(0, 5),
    "script-src 'self' https://plausible.io",
    ...commonDirectives.slice(5),
  ].join("; ");
}
