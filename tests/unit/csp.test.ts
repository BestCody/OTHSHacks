import { describe, expect, it } from "vitest";
import { buildAppCsp, buildLandingCsp } from "../../lib/csp";

function getDirective(csp: string, name: string) {
  return csp.split("; ").find((directive) => directive.startsWith(`${name} `)) ?? "";
}

describe("Content Security Policy", () => {
  it("uses a request nonce and strict-dynamic for production application scripts", () => {
    const csp = buildAppCsp("test-nonce", "production");
    const scriptSrc = getDirective(csp, "script-src");

    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
  });

  it("nonces production application styles instead of allowing arbitrary inline styles", () => {
    const styleSrc = getDirective(buildAppCsp("test-nonce", "production"), "style-src");

    expect(styleSrc).toContain("'nonce-test-nonce'");
    expect(styleSrc).not.toContain("'unsafe-inline'");
    expect(getDirective(buildAppCsp("test-nonce", "production"), "style-src-attr")).toBe("style-src-attr 'none'");
  });

  it("allows development-only eval and inline styles required by the Next.js debugger", () => {
    expect(getDirective(buildAppCsp("test-nonce", "development"), "script-src")).toContain("'unsafe-eval'");
    expect(getDirective(buildAppCsp("test-nonce", "development"), "style-src")).toContain("'unsafe-inline'");
    expect(getDirective(buildAppCsp("test-nonce", "development"), "style-src-attr")).toContain("'unsafe-inline'");
  });

  it("keeps the static landing page compatible without allowing inline scripts or styles", () => {
    const csp = buildLandingCsp();
    const scriptSrc = getDirective(csp, "script-src");
    const styleSrc = getDirective(csp, "style-src");

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'nonce-");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(styleSrc).toContain("'self'");
    expect(styleSrc).not.toContain("'unsafe-inline'");
    expect(getDirective(csp, "style-src-attr")).toBe("style-src-attr 'none'");
  });
});
