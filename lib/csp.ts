const commonDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://plausible.io",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
];

export function buildAppCsp(nonce: string, environment = process.env.NODE_ENV) {
  const isDevelopment = environment === "development";
  const developmentScriptSource = isDevelopment ? " 'unsafe-eval'" : "";
  const styleSource = isDevelopment
    ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  const styleAttributeSource = isDevelopment ? "style-src-attr 'unsafe-inline'" : "style-src-attr 'none'";

  return [
    ...commonDirectives.slice(0, 5),
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentScriptSource} https://challenges.cloudflare.com https://plausible.io`,
    styleSource,
    styleAttributeSource,
    ...commonDirectives.slice(5),
  ].join("; ");
}

export function buildLandingCsp() {
  return [
    ...commonDirectives.slice(0, 5),
    "script-src 'self' https://plausible.io",
    "style-src 'self' https://fonts.googleapis.com",
    "style-src-attr 'none'",
    ...commonDirectives.slice(5),
  ].join("; ");
}
