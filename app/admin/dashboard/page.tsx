import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PickupOrderRow, ReservationRequestRow } from "@/lib/supabase/types";
import { formatRestaurantDateTime } from "@/lib/time";

/**
 * Overview.
 *
 * Counts are read with the admin's own session, so RLS applies here exactly as
 * it does everywhere else — there is no service-role key in this app at all.
 * A dashboard that bypassed RLS to "just show the numbers" would be a second,
 * untested authorization path.
 *
 * Zero is a real number: an empty restaurant shows 0 with a hint, never a
 * spinner that never stops or a misleading dash.
 */
export default async function OverviewPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const [
    items,
    categories,
    reservations,
    pending,
    orders,
    newOrders,
    gallery,
    experiences,
    activeOffers,
    recentReservations,
    recentOrders,
  ] = await Promise.all([
    supabase.from("menu_items").select("*", { count: "exact", head: true }),
    supabase.from("menu_categories").select("*", { count: "exact", head: true }),
    supabase.from("reservation_requests").select("*", { count: "exact", head: true }),
    supabase
      .from("reservation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("pickup_orders").select("*", { count: "exact", head: true }),
    supabase.from("pickup_orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("gallery_items").select("*", { count: "exact", head: true }),
    supabase.from("experiences").select("*", { count: "exact", head: true }),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("reservation_requests")
      .select("id, name, phone, party_size, preferred_at, status")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ReservationRequestRow[]>(),
    supabase
      .from("pickup_orders")
      .select("id, customer_name, phone, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PickupOrderRow[]>(),
  ]);

  const stats = [
    { label: "Menu items", value: items.count ?? 0, href: "/admin/dashboard/menu" },
    { label: "Categories", value: categories.count ?? 0, href: "/admin/dashboard/menu" },
    { label: "Gallery photos", value: gallery.count ?? 0, href: "/admin/dashboard/gallery" },
    { label: "Experiences", value: experiences.count ?? 0, href: "/admin/dashboard/experiences" },
    { label: "Active offers", value: activeOffers.count ?? 0, href: "/admin/dashboard/offers" },
    {
      label: "New reservations",
      value: pending.count ?? 0,
      href: "/admin/dashboard/reservations",
      highlight: (pending.count ?? 0) > 0,
    },
    {
      label: "All reservations",
      value: reservations.count ?? 0,
      href: "/admin/dashboard/reservations",
    },
    {
      label: "New pickup orders",
      value: newOrders.count ?? 0,
      href: "/admin/dashboard/orders",
      highlight: (newOrders.count ?? 0) > 0,
    },
    { label: "All pickup orders", value: orders.count ?? 0, href: "/admin/dashboard/orders" },
  ];

  const quickActions = [
    { label: "Edit the menu", href: "/admin/dashboard/menu" },
    { label: "Upload gallery photos", href: "/admin/dashboard/gallery" },
    { label: "Manage the hero video", href: "/admin/dashboard/hero" },
    { label: "Add an experience", href: "/admin/dashboard/experiences" },
    { label: "View reservations", href: "/admin/dashboard/reservations" },
  ];

  /** Restaurant-local (Africa/Kigali) — the same wall-clock guests picked. */
  const formatWhen = (value: string): string => formatRestaurantDateTime(value);

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

      <h2 className="admin-section-title">Quick actions</h2>
      <div className="admin-row">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-button admin-button-quiet">
            {action.label}
          </Link>
        ))}
      </div>

      <div className="admin-overview-columns">
        <section aria-labelledby="recent-reservations">
          <h2 id="recent-reservations" className="admin-section-title">
            Recent reservations
          </h2>
          {recentReservations.error || (recentReservations.data ?? []).length === 0 ? (
            <p className="admin-muted">
              No reservation requests yet. When a guest sends the form on the website,
              it appears here.
            </p>
          ) : (
            <ul className="admin-list admin-list-compact">
              {(recentReservations.data ?? []).map((row) => (
                <li key={row.id} className="admin-list-item">
                  <div className="admin-list-body">
                    <p className="admin-list-meta">
                      <span className="admin-badge">{row.status}</span>
                      <strong>{row.name}</strong>
                      <span>{formatWhen(row.preferred_at)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link className="admin-link" href="/admin/dashboard/reservations">
            All reservations →
          </Link>
        </section>

        <section aria-labelledby="recent-orders">
          <h2 id="recent-orders" className="admin-section-title">
            Recent pickup orders
          </h2>
          {recentOrders.error || (recentOrders.data ?? []).length === 0 ? (
            <p className="admin-muted">
              No pickup orders yet. Orders from the website&apos;s order page appear
              here.
            </p>
          ) : (
            <ul className="admin-list admin-list-compact">
              {(recentOrders.data ?? []).map((row) => (
                <li key={row.id} className="admin-list-item">
                  <div className="admin-list-body">
                    <p className="admin-list-meta">
                      <span className="admin-badge">{row.status}</span>
                      <strong>{row.customer_name}</strong>
                      <span>{(row.total ?? 0).toLocaleString("en-US")} RWF</span>
                      <span>{formatWhen(row.created_at)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link className="admin-link" href="/admin/dashboard/orders">
            All pickup orders →
          </Link>
        </section>
      </div>
    </>
  );
}
