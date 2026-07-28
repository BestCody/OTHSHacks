"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="button secondary"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.assign("/landing.html");
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
