"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="auth-layout">
          <section className="card auth-card">
            <h1 className="page-title">OTHacks is temporarily unavailable</h1>
            <p className="page-lede">Please retry. If the problem continues, contact the organizers.</p>
            <button className="button" type="button" onClick={reset}>Retry</button>
          </section>
        </main>
      </body>
    </html>
  );
}
