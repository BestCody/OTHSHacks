import { AppShell } from "@/components/AppShell";
import { MfaManager } from "@/components/MfaManager";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  await requireUser();
  return (
    <AppShell>
      <h1 className="page-title">Security settings</h1>
      <p className="page-lede">Protect organizer access with an authenticator app.</p>
      <div className="security-settings-content"><MfaManager /></div>
    </AppShell>
  );
}
