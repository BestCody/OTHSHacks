import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import { jsonError } from "@/lib/http";

const schema = z.object({
  email: z.string().trim().email().max(254),
});

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
    const normalizedEmail = email.toLowerCase();
    const admin = createAdminClient();
    const perPage = 1000;

    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(`Email check failed: ${error.message}`);

      if (data.users.some((user) => user.email?.toLowerCase() === normalizedEmail)) {
        return NextResponse.json({ inUse: true });
      }

      if (data.users.length < perPage) break;
    }

    return NextResponse.json({ inUse: false });
  } catch (error) {
    return jsonError(error, "Email availability check failed.");
  }
}
