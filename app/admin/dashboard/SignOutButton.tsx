"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignOutButton(): React.JSX.Element {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  return (
    <button
      type="button"
      className="admin-link"
      disabled={isBusy}
      onClick={async () => {
        setIsBusy(true);
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
    >
      {isBusy ? "Signing out…" : "Sign out"}
    </button>
  );
}
