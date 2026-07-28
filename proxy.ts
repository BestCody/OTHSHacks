import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";

const protectedApplicant = ["/dashboard"];
const protectedOrganizer = ["/organizer"];

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://plausible.io`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://plausible.io",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, userId } = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  const path = request.nextUrl.pathname;

  if ([...protectedApplicant, ...protectedOrganizer].some((prefix) => path.startsWith(prefix)) && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", getSafeAuthRedirect(path));
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return copyCookies(response, redirect);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
