"use client";

import { FormEvent, useState } from "react";

type Application = {
  status?: string;
  legal_name?: string | null;
  preferred_name?: string | null;
  school?: string | null;
  grade?: string | null;
  dietary_requirements?: string | null;
  accessibility_needs?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  experience_level?: string | null;
  project_interests?: string | null;
  code_of_conduct_accepted?: boolean | null;
  privacy_accepted?: boolean | null;
  guardian_consent_confirmed?: boolean | null;
};

export function ApplicationForm({ initial }: { initial: Application | null }) {
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = ["accepted", "waitlisted", "rejected"].includes(initial?.status ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: "save" | "submit" = submitter?.value === "submit" ? "submit" : "save";
    setBusy(intent);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      intent,
      legalName: String(form.get("legalName") ?? ""),
      preferredName: String(form.get("preferredName") ?? ""),
      school: String(form.get("school") ?? ""),
      grade: String(form.get("grade") ?? ""),
      dietaryRequirements: String(form.get("dietaryRequirements") ?? ""),
      accessibilityNeeds: String(form.get("accessibilityNeeds") ?? ""),
      emergencyContactName: String(form.get("emergencyContactName") ?? ""),
      emergencyContactPhone: String(form.get("emergencyContactPhone") ?? ""),
      experienceLevel: String(form.get("experienceLevel") ?? ""),
      projectInterests: String(form.get("projectInterests") ?? ""),
      codeOfConductAccepted: form.get("codeOfConductAccepted") === "on",
      privacyAccepted: form.get("privacyAccepted") === "on",
      guardianConsentConfirmed: form.get("guardianConsentConfirmed") === "on",
    };

    try {
      const response = await fetch("/api/application", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the application.");
      setMessage(intent === "submit" ? "Application submitted." : "Draft saved.");
      if (intent === "submit") window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the application.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="inline application-heading">
        <div>
          <h2>Application</h2>
          <p className="help">Sensitive fields are visible only to authorized organizers.</p>
        </div>
        <span className={`status-pill ${initial?.status ?? "draft"}`}>{initial?.status ?? "draft"}</span>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}
      {locked ? <p className="warning">This application is locked because a final decision has been recorded.</p> : null}
      <fieldset className="stack application-fieldset" disabled={locked || busy !== null}>
        <div className="grid-2">
          <label>Legal name<input name="legalName" required maxLength={120} defaultValue={initial?.legal_name ?? ""} autoComplete="name" /></label>
          <label>Preferred name<input name="preferredName" maxLength={80} defaultValue={initial?.preferred_name ?? ""} /></label>
          <label>School<input name="school" required maxLength={160} defaultValue={initial?.school ?? ""} /></label>
          <label>Grade<select name="grade" required defaultValue={initial?.grade ?? ""}><option value="" disabled>Select grade</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="other">Other</option></select></label>
          <label>Experience<select name="experienceLevel" required defaultValue={initial?.experience_level ?? ""}><option value="" disabled>Select experience</option><option value="new">Never coded</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
          <label>Emergency contact phone<input name="emergencyContactPhone" required maxLength={40} defaultValue={initial?.emergency_contact_phone ?? ""} autoComplete="tel" /></label>
        </div>
        <label>Emergency contact name<input name="emergencyContactName" required maxLength={120} defaultValue={initial?.emergency_contact_name ?? ""} /></label>
        <label>Dietary requirements<textarea name="dietaryRequirements" maxLength={1000} defaultValue={initial?.dietary_requirements ?? ""} /></label>
        <label>Accessibility needs<textarea name="accessibilityNeeds" maxLength={1000} defaultValue={initial?.accessibility_needs ?? ""} /></label>
        <label>Project interests<textarea name="projectInterests" maxLength={1200} defaultValue={initial?.project_interests ?? ""} /></label>
        <label className="checkbox-row"><input type="checkbox" name="codeOfConductAccepted" defaultChecked={Boolean(initial?.code_of_conduct_accepted)} required />I agree to the OTHacks code of conduct.</label>
        <label className="checkbox-row"><input type="checkbox" name="privacyAccepted" defaultChecked={Boolean(initial?.privacy_accepted)} required />I have read the privacy notice and understand how my information will be used.</label>
        <label className="checkbox-row"><input type="checkbox" name="guardianConsentConfirmed" defaultChecked={Boolean(initial?.guardian_consent_confirmed)} />Where required, I confirm that a parent or guardian has approved my participation.</label>
        <div className="inline">
          <button className="button secondary" type="submit" value="save" disabled={locked || busy !== null}>{busy === "save" ? "Saving…" : "Save draft"}</button>
          <button className="button" type="submit" value="submit" disabled={locked || busy !== null}>{busy === "submit" ? "Submitting…" : "Submit application"}</button>
        </div>
      </fieldset>
    </form>
  );
}
