import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ApplicationForm } from "@/components/ApplicationForm";
import { FileUpload } from "@/components/FileUpload";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: application }, { data: files }] = await Promise.all([
    supabase.from("applications").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("application_files").select("id,original_name,size_bytes,scan_status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  return (
    <AppShell>
      <h1 className="page-title">Your OTHacks application</h1>
      <p className="page-lede">Save a draft at any time. Submit only when the required information is complete.</p>
      <div className="inline" style={{ marginTop: 20 }}>
        <Link className="button secondary" href="/">← Return home</Link>
      </div>
      <div className="stack" style={{ marginTop: 32 }}>
        <ApplicationForm initial={application} />
        <FileUpload files={files ?? []} />
      </div>
    </AppShell>
  );
}
