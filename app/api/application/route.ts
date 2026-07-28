import { NextResponse } from "next/server";
import { applicationSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { jsonError } from "@/lib/http";
import { sendEmail } from "@/lib/email";
import { logEvent } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const identifier = await requestFingerprint(auth.user.id);
    await enforceRateLimit({ action: "application_write", identifier, limit: 12, windowSeconds: 60 });

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 32_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please correct the highlighted application fields.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { intent, ...application } = parsed.data;
    const { data, error } = await supabase.rpc("save_my_application", {
      p_payload: application,
      p_submit: intent === "submit",
    });
    if (error) throw new Error(error.message);

    if (intent === "submit" && auth.user.email) {
      try {
        await sendEmail({
          to: auth.user.email,
          subject: "Your OTHacks application was submitted",
          text: "Your OTHacks application has been submitted. You can sign in to view its current status.",
          html: "<p>Your OTHacks application has been submitted.</p><p>You can sign in to view its current status.</p>",
        });
      } catch (emailError) {
        await logEvent("warn", "submission_email_failed", { userId: auth.user.id, error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    await logEvent("info", "application_saved", { userId: auth.user.id, intent });
    return NextResponse.json({ application: data });
  } catch (error) {
    await logEvent("error", "application_save_failed", { error: error instanceof Error ? error.message : String(error) });
    return jsonError(error, "The application could not be saved.");
  }
}
