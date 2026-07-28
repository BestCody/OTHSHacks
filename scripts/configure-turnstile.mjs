function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response, provider) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details = payload ? JSON.stringify(payload) : `${response.status} ${response.statusText}`;
    throw new Error(`${provider} configuration request failed: ${details}`);
  }
  return payload;
}

function isRedacted(value) {
  return !value || value.includes("*") || value.toLowerCase().includes("redacted");
}

const apply = process.argv.includes("--apply");
const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const cloudflareToken = required("CLOUDFLARE_API_TOKEN");
const siteKey = required("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
const supabaseToken = required("SUPABASE_ACCESS_TOKEN");
const projectRef = required("SUPABASE_PROJECT_REF");
const domains = (process.env.TURNSTILE_EXPECTED_HOSTNAMES ?? "oths-hacks.vercel.app")
  .split(",")
  .map((hostname) => hostname.trim())
  .filter(Boolean);
const clearanceLevel = process.env.TURNSTILE_EXPECTED_CLEARANCE ?? "no_clearance";

assert(domains.length > 0, "At least one TURNSTILE_EXPECTED_HOSTNAMES value is required.");
assert(domains.length <= 10, "Cloudflare Turnstile supports at most 10 hostnames per widget.");

const widgetUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/challenges/widgets/${encodeURIComponent(siteKey)}`;
const currentResponse = await fetch(widgetUrl, {
  headers: { Authorization: `Bearer ${cloudflareToken}` },
});
const currentPayload = await readJson(currentResponse, "Cloudflare");
assert(currentPayload.success && currentPayload.result, "Cloudflare did not return the requested widget.");
const currentWidget = currentPayload.result;

const widgetName = process.env.TURNSTILE_WIDGET_NAME?.trim() || currentWidget.name || "OTHacks production auth";
const widgetUpdate = {
  domains,
  mode: "managed",
  name: widgetName,
  clearance_level: clearanceLevel,
  ...(typeof currentWidget.bot_fight_mode === "boolean" ? { bot_fight_mode: currentWidget.bot_fight_mode } : {}),
  ...(typeof currentWidget.ephemeral_id === "boolean" ? { ephemeral_id: currentWidget.ephemeral_id } : {}),
  ...(typeof currentWidget.offlabel === "boolean" ? { offlabel: currentWidget.offlabel } : {}),
};

console.log("Cloudflare widget configuration:");
console.log(JSON.stringify(widgetUpdate, null, 2));
console.log(`Supabase project: ${projectRef}`);

if (!apply) {
  console.log("Dry run only. Re-run with --apply to update Cloudflare and Supabase.");
  process.exit(0);
}

const updateResponse = await fetch(widgetUrl, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${cloudflareToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(widgetUpdate),
});
const updatePayload = await readJson(updateResponse, "Cloudflare");
assert(updatePayload.success && updatePayload.result, "Cloudflare did not confirm the widget update.");

const configuredWidget = updatePayload.result;
const turnstileSecret = process.env.TURNSTILE_SECRET?.trim() || configuredWidget.secret || currentWidget.secret;
assert(!isRedacted(turnstileSecret), "Cloudflare redacted the widget secret. Set TURNSTILE_SECRET before applying the Supabase configuration.");

const supabaseResponse = await fetch(
  `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${supabaseToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      security_captcha_enabled: true,
      security_captcha_provider: "turnstile",
      security_captcha_secret: turnstileSecret,
    }),
  },
);
await readJson(supabaseResponse, "Supabase");

console.log("Cloudflare Managed Turnstile and Supabase CAPTCHA configuration were updated successfully.");
