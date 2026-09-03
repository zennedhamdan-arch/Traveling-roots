import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

/**
 * Every dashboard page is guarded here, on the server.
 *
 * Middleware already bounced anonymous requests, but middleware only inspects
 * a cookie. This re-verifies the JWT with Supabase and re-checks the
 * `admin_users` allow-list on every request, so removing someone's access
 * takes effect immediately rather than when their token happens to expire.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const session = await getAdminUser();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <AdminNav email={session.admin.email} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
