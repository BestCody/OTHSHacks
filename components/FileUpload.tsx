"use client";

import { FormEvent, useState } from "react";

type FileRecord = {
  id: string;
  original_name: string;
  size_bytes: number;
  scan_status: "pending" | "clean" | "rejected";
  created_at: string;
};

export function FileUpload({ files }: { files: FileRecord[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      setMessage("File uploaded and placed in the private scanning queue.");
      event.currentTarget.reset();
      window.setTimeout(() => window.location.reload(), 700);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack">
      <div>
        <h2>Private documents</h2>
        <p className="help">PDF, PNG, or JPEG only; maximum 5 MB. Files remain private and cannot be downloaded until the configured malware scanner marks them clean.</p>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}
      <form className="inline" onSubmit={upload}>
        <label className="file-upload-field">
          Upload résumé, consent form, or supporting document
          <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required />
        </label>
        <button className="button" type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      </form>
      <div className="stack">
        {files.length === 0 ? <p className="help">No documents uploaded.</p> : files.map((file) => (
          <div className="file-row" key={file.id}>
            <div>
              <strong>{file.original_name}</strong>
              <div className="help">{Math.ceil(file.size_bytes / 1024)} KB · scan: {file.scan_status}</div>
            </div>
            {file.scan_status === "clean" ? <a className="button secondary" href={`/api/files/download/${file.id}`}>Download</a> : <span className={`status-pill ${file.scan_status}`}>{file.scan_status}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
