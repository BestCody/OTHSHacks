import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import { jsonError } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().email().max(254),
});

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit({
      action: "signup_email_check",
      identifier: await requestFingerprint(),
      limit: 20,
      windowSeconds: 300,
    });

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 2_000) {
      const error = new Error("Request is too large.");
      (error as Error & { status?: number }).status = 413;
      throw error;
    }

    const { email } = schema.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", escapeLikePattern(email))
      .limit(1);

    if (error) throw new Error(`Email check failed: ${error.message}`);

    return NextResponse.json({ inUse: (data?.length ?? 0) > 0 });
  } catch (error) {
    return jsonError(error, "Email availability check failed.");
  }
}
