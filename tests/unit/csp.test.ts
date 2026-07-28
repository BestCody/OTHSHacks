import { describe, expect, it } from "vitest";
import { buildAppCsp, buildLandingCsp } from "../../lib/csp";

function getDirective(csp: string, name: string) {
  return csp.split("; ").find((directive) => directive.startsWith(`${name} `)) ?? "";
}

describe("Content Security Policy", () => {
  it("uses a request nonce and strict-dynamic for application scripts", () => {
    const csp = buildAppCsp("test-nonce", "production");
    const scriptSrc = getDirective(csp, "script-src");

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("allows unsafe-eval only for the Next.js development runtime", () => {
    expect(getDirective(buildAppCsp("test-nonce", "development"), "script-src")).toContain("'unsafe-eval'");
    expect(getDirective(buildAppCsp("test-nonce", "production"), "script-src")).not.toContain("'unsafe-eval'");
  });

  it("keeps the static landing page compatible with its self-hosted script", () => {
    const scriptSrc = getDirective(buildLandingCsp(), "script-src");

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'nonce-");
  });
});
