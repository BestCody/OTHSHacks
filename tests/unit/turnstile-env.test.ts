import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const validator = join(process.cwd(), "scripts", "validate-turnstile-env.mjs");

function validate(siteKey: string | undefined, environment = "production") {
  const env = { ...process.env, VERCEL_ENV: environment };
  if (siteKey === undefined) delete env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  else env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = siteKey;

  return spawnSync(process.execPath, [validator], {
    env,
    encoding: "utf8",
  });
}

describe("Turnstile environment validation", () => {
  it("fails closed when the sitekey is missing", () => {
    const result = validate(undefined);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required");
  });

  it("rejects Cloudflare test sitekeys in production", () => {
    const result = validate("1x00000000000000000000AA");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("test sitekeys are forbidden");
  });

  it("accepts a configured production sitekey", () => {
    const result = validate("0x4AAAAAAA-production-placeholder");
    expect(result.status).toBe(0);
  });
});
