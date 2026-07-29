"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AuthForm.module.css";

type VerifyEmailFormProps = {
  tokenHash: string;
};

export function VerifyEmailForm({ tokenHash }: VerifyEmailFormProps) {
  const [error, setError] = useState(tokenHash ? "" : "This verification link is invalid or incomplete.");
  const [busy, setBusy] = useState(false);

  async function verifyEmail() {
    if (!tokenHash || busy) return;

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });

      if (verifyError) throw verifyError;

      // Email verification creates a session. End it so the user is taken to
      // the sign-in page and deliberately signs in with their new password.
      await supabase.auth.signOut({ scope: "local" });
      window.location.assign("/auth/login?verified=1");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Email verification failed.";
      setError(
        message.toLowerCase().includes("expired") || message.toLowerCase().includes("invalid")
          ? "This verification link is invalid or has expired. Create your account again to receive a new link."
          : message,
      );
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <Link className="button secondary auth-home-link" href="/">← Return home</Link>
      <section className="card auth-card">
        <img className="auth-mascot" src="/assets/othacks-mascot.png" alt="OTHacks devil mascot" />
        <h1 className="page-title">Verify your email</h1>
        <div className="stack">
          <p className={styles.instructions}>Press the button below to verify your email address and finish creating your OTHacks account.</p>
          {error ? <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p> : null}
          <button className="button" type="button" onClick={verifyEmail} disabled={busy || !tokenHash}>
            {busy ? "Verifying…" : "Verify email"}
          </button>
        </div>
        <div className="auth-links">
          <Link href="/auth/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
