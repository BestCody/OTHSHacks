import Link from "next/link";
import { getCurrentRole, getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole() : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand-link" href="/">
          <img src="/assets/othacks-mascot.png" alt="" aria-hidden="true" />
          <span>OTHacks</span>
        </Link>
        <nav className="app-nav" aria-label="Application navigation">
          <Link href="/">Home</Link>
          {user ? <Link href="/dashboard">Application</Link> : null}
          {user ? <Link href="/settings/security">Security</Link> : null}
          {role === "organizer" || role === "admin" ? <Link href="/organizer">Organizer</Link> : null}
          {user ? <LogoutButton /> : <Link className="button" href="/auth/login">Sign in</Link>}
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="site-footer">
        <p>© 2026 OTHacks · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/code-of-conduct">Code of conduct</Link></p>
      </footer>
    </div>
  );
}
