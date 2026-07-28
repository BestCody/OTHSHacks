import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { statusSchema } from "@/lib/validation";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { jsonError } from "@/lib/http";
import { logEvent } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (!profile || !["organizer", "admin"].includes(profile.role)) return NextResponse.json({ error: "Organizer role required." }, { status: 403 });
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return NextResponse.json({ error: "Multi-factor authentication is required." }, { status: 403 });
    const user = auth.user;
    await enforceRateLimit({
      action: "organizer_status_change",
      identifier: await requestFingerprint(user.id),
      limit: 30,
      windowSeconds: 60,
    });

    const { id } = await context.params;
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 8_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid application status." }, { status: 400 });

    const { data, error } = await supabase.rpc("set_application_status", {
      p_application_id: id,
      p_status: parsed.data.status,
      p_note: parsed.data.note,
    });
    if (error) throw new Error(error.message);

    const application = Array.isArray(data) ? data[0] : data;
    let emailWarning = false;
    if (application?.email && ["accepted", "waitlisted", "rejected"].includes(parsed.data.status)) {
      const label = parsed.data.status.charAt(0).toUpperCase() + parsed.data.status.slice(1);
      try {
        await sendEmail({
          to: application.email,
          subject: `OTHacks application update: ${label}`,
          text: `Your OTHacks application status is now ${parsed.data.status}. Sign in to your dashboard for the latest information.`,
          html: `<p>Your OTHacks application status is now <strong>${parsed.data.status}</strong>.</p><p>Sign in to your dashboard for the latest information.</p>`,
        });
      } catch (emailError) {
        emailWarning = true;
        await logEvent("warn", "decision_email_failed", { applicationId: id, error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    await logEvent("info", "application_status_changed", { actorId: user.id, applicationId: id, status: parsed.data.status });
    return NextResponse.json({ application, emailWarning });
  } catch (error) {
    return jsonError(error, "The application status could not be changed.");
  }
}
