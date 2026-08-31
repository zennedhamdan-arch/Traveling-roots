import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PickupOrderRow } from "@/lib/supabase/types";
import OrderList from "./OrderList";

export default async function PickupOrdersPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("pickup_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<PickupOrderRow[]>();

  return (
    <>
      <h1 className="admin-title">Pickup orders</h1>
      <p className="admin-muted admin-lede">
        Orders submitted from the website. The guest has not paid — nothing is
        charged online — so <strong>call or WhatsApp them to confirm</strong>,
        then move the order along so the kitchen can see where it stands. Totals
        were computed by the database from the menu at order time.
      </p>
      <OrderList initial={data ?? []} />
    </>
  );
}
