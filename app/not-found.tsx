import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-layout">
      <section className="card auth-card">
        <img className="auth-mascot" src="/assets/othacks-mascot.png" alt="OTHacks devil mascot" />
        <h1 className="page-title">Page not found</h1>
        <p className="page-lede">This pitchfork points nowhere.</p>
        <Link className="button" href="/landing.html">Return home</Link>
      </section>
    </main>
  );
}
