function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRedacted(value) {
  return !value || value.includes("*") || value.toLowerCase().includes("redacted");
}

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const cloudflareToken = required("CLOUDFLARE_API_TOKEN");
const siteKey = required("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
const supabaseToken = required("SUPABASE_ACCESS_TOKEN");
const projectRef = required("SUPABASE_PROJECT_REF");
const expectedHostnames = new Set(
  (process.env.TURNSTILE_EXPECTED_HOSTNAMES ?? "oths-hacks.vercel.app")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean),
);
const expectedClearance = process.env.TURNSTILE_EXPECTED_CLEARANCE ?? "no_clearance";

const cloudflareResponse = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/challenges/widgets/${encodeURIComponent(siteKey)}`,
  { headers: { Authorization: `Bearer ${cloudflareToken}` } },
);
const cloudflarePayload = await cloudflareResponse.json();
assert(cloudflareResponse.ok && cloudflarePayload.success, "Cloudflare widget configuration could not be read.");

const widget = cloudflarePayload.result;
assert(widget.mode === "managed", `Turnstile widget mode must be managed, received ${widget.mode}.`);
assert(widget.clearance_level === expectedClearance, `Turnstile clearance level must be ${expectedClearance}, received ${widget.clearance_level}.`);

const actualHostnames = new Set(widget.domains ?? []);
for (const hostname of expectedHostnames) {
  assert(actualHostnames.has(hostname), `Turnstile widget is missing required hostname ${hostname}.`);
}
for (const hostname of actualHostnames) {
  assert(expectedHostnames.has(hostname), `Turnstile widget contains unapproved hostname ${hostname}.`);
}

const supabaseResponse = await fetch(
  `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
  { headers: { Authorization: `Bearer ${supabaseToken}` } },
);
const authConfig = await supabaseResponse.json();
assert(supabaseResponse.ok, "Supabase Auth configuration could not be read.");
assert(authConfig.security_captcha_enabled === true, "Supabase CAPTCHA protection is not enabled.");
assert(authConfig.security_captcha_provider === "turnstile", `Supabase CAPTCHA provider must be turnstile, received ${authConfig.security_captcha_provider}.`);
assert(Boolean(authConfig.security_captcha_secret), "Supabase does not have a CAPTCHA secret configured.");

if (!isRedacted(widget.secret) && !isRedacted(authConfig.security_captcha_secret)) {
  assert(widget.secret === authConfig.security_captcha_secret, "Supabase CAPTCHA secret does not match the Cloudflare widget secret.");
} else {
  console.warn("The APIs redacted at least one secret, so secret equality could not be compared automatically.");
}

console.log("Turnstile and Supabase CAPTCHA configuration passed all available checks.");
