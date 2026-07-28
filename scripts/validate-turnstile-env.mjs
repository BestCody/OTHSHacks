const testSiteKeys = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const deploymentEnvironment = process.env.VERCEL_ENV ?? process.env.TURNSTILE_ENV ?? process.env.NODE_ENV ?? "local";

if (!siteKey) {
  console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required before the application can be built.");
  process.exit(1);
}

if (deploymentEnvironment === "production" && testSiteKeys.has(siteKey)) {
  console.error("Cloudflare Turnstile test sitekeys are forbidden in production deployments.");
  process.exit(1);
}

console.log(`Turnstile environment validated for ${deploymentEnvironment}.`);
