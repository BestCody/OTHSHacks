"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-layout">
      <section className="card auth-card">
        <img className="auth-mascot" src="/assets/othacks-mascot.png" alt="OTHacks devil mascot" />
        <h1 className="page-title">Something went wrong</h1>
        <p className="page-lede">The error was recorded. Try the action again.</p>
        <button className="button" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
