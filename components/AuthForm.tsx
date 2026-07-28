"use client";

import Link from "next/link";
import { FormEvent, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";

type Mode = "login" | "signup" | "forgot" | "update";

export function AuthForm({ mode, turnstileSiteKey = "" }: { mode: Mode; turnstileSiteKey?: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const onToken = useCallback((token: string) => setCaptchaToken(token), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const fullName = String(data.get("fullName") ?? "").trim();
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });
        if (authError) throw authError;
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        window.location.assign(getSafeAuthRedirect(requestedNext));
      } else if (mode === "signup") {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            captchaToken: captchaToken || undefined,
          },
        });
        if (authError) throw authError;
        setMessage("Check your email to verify your account before signing in.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
          captchaToken: captchaToken || undefined,
        });
        if (authError) throw authError;
        setMessage("If that address exists, a password-reset email has been sent.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. You can continue to your dashboard.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Sign in" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Choose a new password";

  return (
    <main className="auth-layout">
      <section className="card auth-card">
        <img className="auth-mascot" src="/assets/othacks-mascot.png" alt="OTHacks devil mascot" />
        <h1 className="page-title">{title}</h1>
        {error ? <p className="error" role="alert">{error}</p> : null}
        {message ? <p className="success" role="status">{message}</p> : null}
        <form className="stack" onSubmit={submit}>
          {mode === "signup" ? (
            <label>
              Full name
              <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} />
            </label>
          ) : null}
          {mode !== "update" ? (
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <label>
              Password
              <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={12} maxLength={128} />
              {mode !== "login" ? <span className="help">Use at least 12 characters and a password manager.</span> : null}
            </label>
          ) : null}
          {mode !== "update" ? <Turnstile siteKey={turnstileSiteKey} onToken={onToken} /> : null}
          <button className="button" type="submit" disabled={busy}>{busy ? "Working…" : title}</button>
        </form>
        <div className="auth-links">
          {mode !== "login" ? <Link href="/auth/login">Sign in</Link> : <Link href="/auth/sign-up">Create account</Link>}
          {mode !== "forgot" && mode !== "update" ? <Link href="/auth/forgot-password">Forgot password?</Link> : null}
          {mode === "update" && message ? <Link href="/dashboard">Continue</Link> : null}
        </div>
      </section>
    </main>
  );
}
