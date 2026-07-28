import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestFingerprint(userId?: string | null) {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = h.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${userId ?? "anon"}|${ip}|${agent}`).digest("hex");
}

export async function enforceRateLimit(options: {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_action: options.action,
    p_identifier: options.identifier,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }
  if (!data) {
    const err = new Error("Too many requests. Please try again later.");
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
}
