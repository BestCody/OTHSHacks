"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";
import styles from "./AuthForm.module.css";

type Mode = "login" | "signup" | "forgot" | "update";
type CaptchaMode = Exclude<Mode, "update">;
type AuthFormProps =
  | { mode: "update"; turnstileSiteKey?: never }
  | { mode: CaptchaMode; turnstileSiteKey: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm(props: AuthFormProps) {
  const mode = props.mode;
  const turnstileSiteKey = mode === "update" ? "" : props.turnstileSiteKey;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const submittingRef = useRef(false);
  const onToken = useCallback((token: string) => {
    setCaptchaToken(token);
    if (token) setCaptchaError("");
  }, []);
  const captchaRequired = mode !== "update";
  const captchaAction = mode === "login" ? "auth_login" : mode === "signup" ? "auth_signup" : "auth_password_reset";

  useEffect(() => {
    if (mode !== "login") return;
    const verified = new URLSearchParams(window.location.search).get("verified");
    if (verified === "1") setMessage("Email verified. You can sign in.");
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (captchaRequired && !captchaToken) return;

    setError("");
    setMessage("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const fullName = String(data.get("fullName") ?? "").trim();

    if (mode === "signup" && fullName.length < 2) {
      setError("Full name should be at least 2 characters.");
      return;
    }

    if (mode !== "update") {
      if (!email) {
        setError("Email is required.");
        return;
      }
      if (!emailPattern.test(email)) {
        setError("Enter a valid email address.");
        return;
      }
    }

    if (mode !== "forgot") {
      if (!password) {
        setError("Password is required.");
        return;
      }
      if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return;
      }
    }

    if (mode === "signup" || mode === "update") {
      if (!confirmPassword) {
        setError("Confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("The passwords do not match.");
        return;
      }
    }

    submittingRef.current = true;
    setBusy(true);
    const supabase = createClient();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/$/, "");

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (authError) throw authError;
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        window.location.assign(getSafeAuthRedirect(requestedNext));
      } else if (mode === "signup") {
        const response = await fetch("/api/auth/email-in-use", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const result = await response.json() as { inUse?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Email availability check failed.");
        if (result.inUse) {
          setError("Email already in use.");
          return;
        }

        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            captchaToken,
          },
        });
        if (authError) throw authError;
        setMessage("Check your email for a verification link.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
          captchaToken,
        });
        if (authError) throw authError;
        setMessage("If that address exists, a password-reset email has been sent.");
      } else {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error("This password-reset link is invalid or has expired. Request a new one.");

        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated successfully. You can continue to your dashboard.");
      }
    } catch (caught) {
      const authMessage = caught instanceof Error ? caught.message : "Authentication failed.";
      const normalized = authMessage.toLowerCase();
      const duplicateEmail = normalized.includes("user already registered") || normalized.includes("email_exists");
      setError(
        normalized.includes("timeout-or-duplicate")
          ? "The security check expired. It has been refreshed; please try again."
          : mode === "signup" && duplicateEmail
            ? "Email already in use."
            : authMessage,
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
      if (captchaRequired) {
        setCaptchaToken("");
        turnstileRef.current?.reset();
      }
    }
  }

  const title = mode === "login" ? "Sign in" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Choose a new password";

  return (
    <main className="auth-layout">
      <Link className="button secondary auth-home-link" href="/">← Return home</Link>
      <section className="card auth-card">
        <img className="auth-mascot" src="/assets/othacks-mascot.png" alt="OTHacks devil mascot" />
        <h1 className="page-title">{title}</h1>
        <form className="stack" onSubmit={submit} noValidate>
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
              <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} maxLength={128} />
            </label>
          ) : null}
          {mode === "signup" || mode === "update" ? (
            <label>
              Confirm password
              <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={128} />
            </label>
          ) : null}
          {mode !== "update" ? <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} action={captchaAction} onToken={onToken} onError={setCaptchaError} /> : null}
          {error ? <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p> : null}
          {captchaError ? <p className={`${styles.message} ${styles.error}`} role="alert">{captchaError}</p> : null}
          {message ? <p className={`${styles.message} ${styles.success}`} role="status">{message}</p> : null}
          <button className="button" type="submit" disabled={busy || (captchaRequired && !captchaToken)}>{busy ? "Working…" : title}</button>
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
