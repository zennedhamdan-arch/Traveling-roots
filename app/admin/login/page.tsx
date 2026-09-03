import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

/**
 * An admin who is already signed in AND past the TOTP challenge has nothing to
 * do here — straight to the dashboard. (A signed-in-but-not-challenged
 * session is not an admin session, and gets the full sign-in flow.)
 */
export default async function AdminLoginPage(): Promise<React.JSX.Element> {
  const session = await getAdminUser();
  if (session) redirect("/admin/dashboard");

  return (
    <main className="admin-shell admin-centered">
      <div className="admin-card admin-narrow">
        <p className="admin-eyebrow">Traveling Roots</p>
        <h1 className="admin-title">Sign in</h1>
        <Suspense fallback={<p className="admin-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
