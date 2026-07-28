import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildAppCsp, buildLandingCsp } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/proxy";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";

const protectedApplicant = ["/dashboard"];
const protectedOrganizer = ["/organizer"];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isStaticLanding = path === "/" || path === "/landing.html";
  const nonce = isStaticLanding ? null : Buffer.from(randomUUID()).toString("base64");
  const csp = nonce ? buildAppCsp(nonce) : buildLandingCsp();
  const requestHeaders = new Headers(request.headers);

  if (nonce) requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, userId } = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);

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
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
