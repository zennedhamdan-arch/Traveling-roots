import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Overview.
 *
 * Counts are read with the admin's own session, so RLS applies here exactly as
 * it does everywhere else — there is no service-role key in this app at all.
 * A dashboard that bypassed RLS to "just show the numbers" would be a second,
 * untested authorization path.
 */
export default async function OverviewPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [items, categories, reservations, pending, hero, experiences, orders, newOrders] =
    await Promise.all([
      supabase.from("menu_items").select("*", { count: "exact", head: true }),
      supabase.from("menu_categories").select("*", { count: "exact", head: true }),
      supabase.from("reservation_requests").select("*", { count: "exact", head: true }),
      supabase
        .from("reservation_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabase.from("hero_media").select("video_url").eq("is_active", true).maybeSingle(),
      supabase.from("experiences").select("*", { count: "exact", head: true }),
      supabase.from("pickup_orders").select("*", { count: "exact", head: true }),
      supabase
        .from("pickup_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
    ]);

  const stats = [
    { label: "Menu items", value: items.count ?? 0, href: "/admin/dashboard/menu" },
    { label: "Categories", value: categories.count ?? 0, href: "/admin/dashboard/menu" },
    {
      label: "New orders",
      value: newOrders.count ?? 0,
      href: "/admin/dashboard/orders",
      highlight: (newOrders.count ?? 0) > 0,
    },
    {
      label: "All orders",
      value: orders.count ?? 0,
      href: "/admin/dashboard/orders",
    },
    {
      label: "New requests",
      value: pending.count ?? 0,
      href: "/admin/dashboard/reservations",
      highlight: (pending.count ?? 0) > 0,
    },
    {
      label: "All requests",
      value: reservations.count ?? 0,
      href: "/admin/dashboard/reservations",
    },
    { label: "Experiences", value: experiences.count ?? 0, href: "/admin/dashboard" },
  ];

  return (
    <>
      <h1 className="admin-title">Overview</h1>

      <div className="admin-stats">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="admin-stat"
            data-highlight={stat.highlight ? "true" : "false"}
          >
            <span className="admin-stat-value">{stat.value}</span>
            <span className="admin-stat-label">{stat.label}</span>
          </Link>
        ))}
      </div>

      <section className="admin-card">
        <h2 className="admin-subtitle">Hero video</h2>
        {hero.data?.video_url ? (
          <p className="admin-muted">
            A hero video is live on the homepage.{" "}
            <Link className="admin-inline-link" href="/admin/dashboard/hero">
              Manage it
            </Link>
            .
          </p>
        ) : (
          <p className="admin-muted">
            No hero video yet — the homepage is showing the image sequence.{" "}
            <Link className="admin-inline-link" href="/admin/dashboard/hero">
              Upload one
            </Link>
            .
          </p>
        )}
      </section>
    </>
  );
}
