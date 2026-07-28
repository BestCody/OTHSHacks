"use client";

import { useState } from "react";

type Row = {
  id: string;
  status: string;
  legal_name: string | null;
  school: string | null;
  grade: string | null;
  submitted_at: string | null;
  profiles: { email: string | null } | null;
};

export function OrganizerApplicationTable({ rows }: { rows: Row[] }) {
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(id: string, status: string) {
    if (["accepted", "rejected"].includes(status) && !window.confirm(`Record this application as ${status}?`)) return;
    setWorking(id);
    setError("");
    try {
      const response = await fetch(`/api/organizer/applications/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Status update failed.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status update failed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="card">
      <h2>Applications</h2>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Applicant</th><th>School</th><th>Grade</th><th>Status</th><th>Submitted</th><th>Decision</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.legal_name || "Unnamed"}</strong><br /><span className="help">{row.profiles?.email}</span></td>
                <td>{row.school}</td>
                <td>{row.grade}</td>
                <td><span className={`status-pill ${row.status}`}>{row.status}</span></td>
                <td>{row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : "—"}</td>
                <td>
                  <select
                    aria-label={`Change status for ${row.legal_name ?? "applicant"}`}
                    value={row.status}
                    disabled={working === row.id}
                    onChange={(event) => updateStatus(row.id, event.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="accepted">Accepted</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
