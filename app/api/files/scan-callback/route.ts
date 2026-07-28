import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { logEvent } from "@/lib/logger";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";

const callbackSchema = z.object({
  fileId: z.string().uuid(),
  result: z.enum(["clean", "rejected"]),
  details: z.string().max(1000).optional(),
});

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ action: "scan_callback", identifier: await requestFingerprint(), limit: 60, windowSeconds: 60 });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 8_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const env = getServerEnv();
    if (!env.FILE_SCAN_CALLBACK_SECRET) return NextResponse.json({ error: "Scanner callback is not configured." }, { status: 503 });
    const supplied = request.headers.get("x-scan-secret") ?? "";
    if (!sameSecret(supplied, env.FILE_SCAN_CALLBACK_SECRET)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = callbackSchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: file, error: fileError } = await admin
      .from("application_files")
      .select("storage_path")
      .eq("id", parsed.fileId)
      .single();
    if (fileError || !file) throw new Error(fileError?.message ?? "File record not found.");

    if (parsed.result === "rejected") {
      const { error: removeError } = await admin.storage.from("application-files").remove([file.storage_path]);
      if (removeError) await logEvent("warn", "rejected_file_delete_failed", { fileId: parsed.fileId, error: removeError.message });
    }

    const { error } = await admin
      .from("application_files")
      .update({ scan_status: parsed.result, scan_details: parsed.details ?? null, scanned_at: new Date().toISOString() })
      .eq("id", parsed.fileId);
    if (error) throw new Error(error.message);
    await logEvent("info", "file_scan_completed", { fileId: parsed.fileId, result: parsed.result });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "The scan result could not be recorded.");
  }
}
