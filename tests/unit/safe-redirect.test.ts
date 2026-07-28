import { describe, expect, it } from "vitest";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";

describe("getSafeAuthRedirect", () => {
  it.each([
    "/dashboard",
    "/organizer",
    "/settings/security",
    "/auth/update-password",
  ])("allows the known internal destination %s", (path) => {
    expect(getSafeAuthRedirect(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\evil.example",
    "/dashboard/../organizer",
    "/dashboard?next=https://evil.example",
    "/unknown",
    "",
    null,
    undefined,
  ])("rejects unapproved redirect input %s", (path) => {
    expect(getSafeAuthRedirect(path)).toBe("/dashboard");
  });

  it("supports the password-update fallback without trusting input", () => {
    expect(getSafeAuthRedirect("https://evil.example", "/auth/update-password")).toBe(
      "/auth/update-password",
    );
  });
});
