import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GalleryItemRow } from "@/lib/supabase/types";
import GalleryManager from "./GalleryManager";

export default async function GalleryPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<GalleryItemRow[]>();

  return (
    <>
      <h1 className="admin-title">Gallery</h1>
      <p className="admin-muted admin-lede">
        Upload photos of the food and the room, give each a caption and an
        alt-text (what the photo shows, for screen readers), pick a category,
        and set the order they appear in. Mark up to 8 photos
        as <strong>Featured</strong> to drift through the homepage showcase;
        everything published appears on the full gallery page. Unpublished
        photos stay stored but are not shown — hiding is enforced by the
        database, not just the interface.
      </p>
      <GalleryManager initial={data ?? []} />
    </>
  );
}
