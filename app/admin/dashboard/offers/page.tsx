import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OfferRow } from "@/lib/supabase/types";
import OfferManager from "./OfferManager";

export default async function OffersPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("offers")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<OfferRow[]>();

  return (
    <>
      <h1 className="admin-title">Offers</h1>
      <p className="admin-muted admin-lede">
        Specials and limited-time offers. Active offers are counted on the
        overview; the public site renders them once a section exists for them —
        managing them here means the content is ready the moment it is needed.
      </p>
      <OfferManager initial={data ?? []} />
    </>
  );
}
