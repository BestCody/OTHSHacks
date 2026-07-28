import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import { jsonError } from "@/lib/http";

const schema = z.object({
  kind: z.enum(["error", "unhandledrejection"]),
  message: z.string().max(1000),
  stack: z.string().max(5000).optional(),
  path: z.string().max(500),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit({ action: "client_error", identifier: await requestFingerprint(), limit: 20, windowSeconds: 60 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 12_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const parsed = schema.parse(await request.json());
    await logEvent("error", "client_error", parsed);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error, "Error report rejected.");
  }
}
