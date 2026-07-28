"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string; status: string };

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaManager() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) setError(listError.message);
    else setFactors(data.totp ?? []);
  }

  useEffect(() => { void refresh(); }, []);

  async function enroll() {
    setBusy(true); setError(""); setMessage("");
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "OTHacks organizer" });
    if (enrollError) setError(enrollError.message);
    else setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setBusy(false);
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
    if (challengeError) { setError(challengeError.message); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollment.factorId, challengeId: challenge.id, code });
    if (verifyError) setError(verifyError.message);
    else {
      setEnrollment(null);
      setMessage("MFA is active and this session is now AAL2.");
      await refresh();
    }
    setBusy(false);
  }

  async function challengeExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const factorId = String(new FormData(event.currentTarget).get("factorId") ?? "");
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) { setError(challengeError.message); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (verifyError) setError(verifyError.message);
    else { setMessage("Second factor verified. Organizer access is unlocked for this session."); window.setTimeout(() => window.location.assign("/organizer"), 500); }
    setBusy(false);
  }

  return (
    <section className="card stack">
      <h2>Multi-factor authentication</h2>
      <p className="help">Organizer and administrator sessions must reach AAL2 before private applicant data can be viewed or changed.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}

      {factors.filter((factor) => factor.status === "verified").map((factor) => (
        <form className="stack" key={factor.id} onSubmit={challengeExisting}>
          <input type="hidden" name="factorId" value={factor.id} />
          <label>Authenticator code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
          <button className="button" type="submit" disabled={busy}>Verify existing factor</button>
        </form>
      ))}

      {enrollment ? (
        <form className="stack" onSubmit={verify}>
          <p>Scan this QR code with your authenticator app.</p>
          <img src={enrollment.qrCode} alt="QR code for adding OTHacks to an authenticator app" style={{ width: 240, maxWidth: "100%" }} />
          <p className="help">Manual secret: <code>{enrollment.secret}</code></p>
          <label>Six-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
          <button className="button" type="submit" disabled={busy}>Verify and enable MFA</button>
        </form>
      ) : factors.filter((factor) => factor.status === "verified").length === 0 ? (
        <button className="button" type="button" disabled={busy} onClick={enroll}>Set up authenticator app</button>
      ) : null}
    </section>
  );
}
