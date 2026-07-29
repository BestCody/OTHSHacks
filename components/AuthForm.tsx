"use client";

import Link from "next/link";
import { FormEvent, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { getSafeAuthRedirect } from "@/lib/safe-redirect";
import styles from "./AuthForm.module.css";

type Mode = "login" | "signup" | "forgot" | "update";
type CaptchaMode = Exclude<Mode, "update">;
type AuthFormProps =
  | { mode: "update"; turnstileSiteKey?: never }
  | { mode: CaptchaMode; turnstileSiteKey: string };

const usernamePattern = /^[a-z0-9_]{3,30}$/;

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (captchaRequired && !captchaToken) return;

    setError("");
    setMessage("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const fullName = String(data.get("fullName") ?? "").trim();
    const username = String(data.get("username") ?? "").trim().toLowerCase();

    if (mode === "signup" && !usernamePattern.test(username)) {
      setError("Username must be 3–30 characters and use only lowercase letters, numbers, or underscores.");
      return;
    }

    if ((mode === "signup" || mode === "update") && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    const supabase = createClient();

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
        const { data: usernameAvailable, error: usernameError } = await supabase.rpc("is_username_available", {
          p_username: username,
        });
        if (usernameError) throw new Error("We could not check that username. Please try again.");
        if (usernameAvailable !== true) {
          setError("That username is already taken.");
          return;
        }

        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, username },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            captchaToken,
          },
        });
        if (authError) throw authError;
        setMessage("Account created successfully. Check your email to verify your account before signing in.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
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
      setError(
        normalized.includes("timeout-or-duplicate")
          ? "The security check expired. It has been refreshed; please try again."
          : mode === "signup" && (normalized.includes("username") || normalized.includes("duplicate key"))
            ? "That username is already taken."
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
        <form className="stack" onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <label>
                Full name
                <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} />
              </label>
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-z0-9_]{3,30}"
                  title="Use 3–30 lowercase letters, numbers, or underscores."
                />
                <span className={styles.help}>3–30 lowercase letters, numbers, or underscores.</span>
              </label>
            </>
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
              <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required maxLength={128} />
            </label>
          ) : null}
          {mode === "signup" || mode === "update" ? (
            <label>
              Confirm password
              <input name="confirmPassword" type="password" autoComplete="new-password" required maxLength={128} />
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
