/**
 * Resolves authentication redirect targets from an explicit allowlist.
 *
 * Never return the caller-provided value directly. Browsers normalize some
 * backslash-based paths into protocol-relative URLs, so prefix checks such as
 * `startsWith("/")` are not sufficient protection against open redirects.
 */
export function getSafeAuthRedirect(
  requested: string | null | undefined,
  fallback: "/dashboard" | "/auth/reset-password" | "/auth/update-password" = "/dashboard",
): string {
  switch (requested) {
    case "/dashboard":
      return "/dashboard";
    case "/organizer":
      return "/organizer";
    case "/settings/security":
      return "/settings/security";
    case "/auth/reset-password":
      return "/auth/reset-password";
    case "/auth/update-password":
      return "/auth/update-password";
    default:
      return fallback;
  }
}
