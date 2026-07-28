import { AppShell } from "@/components/AppShell";
import { OrganizerApplicationTable } from "@/components/OrganizerApplicationTable";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Organizer dashboard" };
export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  await requireOrganizer();
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("applications")
    .select("id,status,legal_name,school,grade,submitted_at,profiles(email)")
    .order("created_at", { ascending: false });

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell>
      <h1 className="page-title">Organizer dashboard</h1>
      <p className="page-lede">Review applications, record decisions, and keep every change auditable.</p>
      {error ? <p className="error">Applications could not be loaded.</p> : null}
      <div className="kpis">
        <div className="kpi"><strong>{rows?.length ?? 0}</strong><span>Total</span></div>
        <div className="kpi"><strong>{counts.submitted ?? 0}</strong><span>Submitted</span></div>
        <div className="kpi"><strong>{counts.accepted ?? 0}</strong><span>Accepted</span></div>
        <div className="kpi"><strong>{counts.waitlisted ?? 0}</strong><span>Waitlisted</span></div>
      </div>
      <OrganizerApplicationTable rows={(rows ?? []) as never} />
    </AppShell>
  );
}
