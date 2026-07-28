import "server-only";
import { getServerEnv } from "@/lib/env";
import { logEvent } from "@/lib/logger";

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    await logEvent("warn", "email_skipped_no_provider", { to: input.to, subject: input.subject });
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    await logEvent("error", "email_send_failed", { status: response.status, detail: detail.slice(0, 500) });
    throw new Error("Transactional email could not be sent.");
  }

  return response.json();
}
