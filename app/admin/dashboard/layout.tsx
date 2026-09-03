import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

/**
 * Every dashboard page is guarded here, on the server.
 *
 * Middleware already bounced anonymous requests, but middleware only inspects
 * a cookie. This re-verifies the JWT with Supabase and re-checks the
 * `admin_users` allow-list on every request, so removing someone's access
 * takes effect immediately rather than when their token happens to expire.
 */

const NAV = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/dashboard/hero", label: "Hero video" },
  { href: "/admin/dashboard/menu", label: "Menu" },
  { href: "/admin/dashboard/orders", label: "Pickup orders" },
  { href: "/admin/dashboard/reservations", label: "Reservations" },
] as const;

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const session = await getAdminUser();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link className="admin-brand" href="/admin/dashboard">
            Traveling Roots
          </Link>
          <div className="admin-header-right">
            <span className="admin-who">{session.admin.email}</span>
            <Link className="admin-link" href="/" target="_blank" rel="noreferrer">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav className="admin-nav" aria-label="Dashboard sections">
          {NAV.map((item) => (
            <Link key={item.href} className="admin-nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
