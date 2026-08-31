import type { Metadata } from "next";

import "./admin.css";

/**
 * Nothing under /admin is ever prerendered.
 *
 * These pages depend on the request's session cookie, and at build time the
 * Supabase environment variables may not exist at all. Without this, `next
 * build` tries to statically render the dashboard and fails.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Traveling Roots — Admin",
  // The dashboard must never appear in search results, and must not be
  // followed or cached by a crawler that happens to find a link to it.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return <div className="admin-root">{children}</div>;
}
