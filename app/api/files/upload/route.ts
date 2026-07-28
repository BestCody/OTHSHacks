import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedUploadTypes, MAX_UPLOAD_BYTES } from "@/lib/validation";
import { enforceRateLimit, requestFingerprint } from "@/lib/rate-limit";
import { getServerEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { logEvent } from "@/lib/logger";
import { assertSameOrigin, matchesDeclaredFileType } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    await enforceRateLimit({
      action: "file_upload",
      identifier: await requestFingerprint(auth.user.id),
      limit: 5,
      windowSeconds: 300,
    });

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_UPLOAD_BYTES + 200_000) return NextResponse.json({ error: "Upload request is too large." }, { status: 413 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Files must be between 1 byte and 5 MB." }, { status: 400 });
    const extension = allowedUploadTypes.get(file.type);
    if (!extension) return NextResponse.json({ error: "Only PDF, PNG, and JPEG files are allowed." }, { status: 400 });
    if (!(await matchesDeclaredFileType(file))) return NextResponse.json({ error: "The file contents do not match the declared file type." }, { status: 400 });

    const admin = createAdminClient();
    const { count: existingCount, error: countError } = await admin
      .from("application_files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id);
    if (countError) throw new Error(countError.message);
    if ((existingCount ?? 0) >= 5) return NextResponse.json({ error: "A maximum of five private documents is allowed per applicant." }, { status: 409 });

    const path = `${auth.user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from("application-files").upload(path, file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const env = getServerEnv();
    const scanStatus = "pending" as const;
    const { data: metadata, error: metadataError } = await admin
      .from("application_files")
      .insert({
        user_id: auth.user.id,
        storage_path: path,
        original_name: file.name.slice(0, 240),
        mime_type: file.type,
        size_bytes: file.size,
        scan_status: scanStatus,
      })
      .select("id,storage_path,scan_status")
      .single();

    if (metadataError) {
      await admin.storage.from("application-files").remove([path]);
      throw new Error(metadataError.message);
    }

    if (env.ALLOW_UNSCANNED_FILES === "true" && metadata) {
      await admin.from("application_files").update({ scan_status: "clean", scan_details: "Development bypass", scanned_at: new Date().toISOString() }).eq("id", metadata.id);
      metadata.scan_status = "clean";
    } else if (env.FILE_SCAN_WEBHOOK_URL && metadata) {
      const { data: signed } = await admin.storage.from("application-files").createSignedUrl(path, 600);
      if (!signed?.signedUrl) throw new Error("Could not create the scanner URL.");
      const response = await fetch(env.FILE_SCAN_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileId: metadata.id,
          downloadUrl: signed.signedUrl,
          callbackUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/files/scan-callback`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) await logEvent("warn", "file_scanner_enqueue_failed", { fileId: metadata.id, status: response.status });
    }

    await logEvent("info", "file_uploaded", { userId: auth.user.id, fileId: metadata?.id, size: file.size, type: file.type });
    return NextResponse.json({ file: metadata });
  } catch (error) {
    await logEvent("error", "file_upload_failed", { error: error instanceof Error ? error.message : String(error) });
    return jsonError(error, "The file could not be uploaded.");
  }
}
