import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReservationRequestRow } from "@/lib/supabase/types";
import ReservationList from "./ReservationList";

export default async function ReservationsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("reservation_requests")
    .select("*")
    .order("preferred_at", { ascending: true })
    .returns<ReservationRequestRow[]>();

  return (
    <>
      <h1 className="admin-title">Reservation requests</h1>
      <p className="admin-muted admin-lede">
        These are <strong>requests</strong>, not confirmed bookings. The website
        never tells a guest their table is held — call or WhatsApp them back,
        then mark the request here so the rest of the team can see it.
      </p>
      <ReservationList initial={data ?? []} />
    </>
  );
}
