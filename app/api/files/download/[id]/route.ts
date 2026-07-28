import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: file, error } = await supabase
      .from("application_files")
      .select("storage_path,scan_status")
      .eq("id", id)
      .single();
    if (error || !file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    if (file.scan_status !== "clean") return NextResponse.json({ error: "The file is not available until scanning is complete." }, { status: 409 });

    const admin = createAdminClient();
    const { data: signed, error: signedError } = await admin.storage.from("application-files").createSignedUrl(file.storage_path, 60, { download: true });
    if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "Could not sign file URL.");
    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    return jsonError(error, "The file could not be downloaded.");
  }
}
