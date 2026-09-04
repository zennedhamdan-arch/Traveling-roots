import type { Metadata } from "next";

import GalleryGrid from "@/components/GalleryGrid";
import { getGalleryItems } from "@/lib/content";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { galleryPage } from "@/data/site";
import styles from "./page.module.css";

/**
 * The full public gallery — every published photograph, in the owner's
 * chosen order. The homepage shows only a featured drift; this page is the
 * whole collection, laid out as a masonry grid with the shared lightbox.
 *
 * Lives in the (public) group, so it carries the navbar, the floating
 * WhatsApp button and smooth anchor scrolling — it is a page of the site,
 * not a task utility like /reservation.
 *
 * RLS does the gating: this renders through the public (anon) client, which
 * can only ever select rows where published = true. Unpublished photos are
 * not "hidden by the UI" — the database refuses them.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gallery — Traveling Roots",
  description:
    "Explore the food, garden, atmosphere and experiences at Traveling Roots — every photograph, as it is.",
};

function altFor(row: GalleryItemRow): string {
  if (row.alt_text.trim().length > 0) return row.alt_text;
  if (row.caption && row.caption.trim().length > 0) return row.caption;
  return row.category
    ? `Traveling Roots restaurant — ${row.category.toLowerCase()}`
    : "Traveling Roots restaurant";
}

export default async function GalleryPage(): Promise<React.JSX.Element> {
  const rows = await getGalleryItems();
  const items = rows.map((row) => ({
    id: row.id,
    src: row.image_url,
    alt: altFor(row),
    ...(row.caption ? { caption: row.caption } : {}),
    ...(row.category ? { category: row.category } : {}),
  }));

  return (
    <section className={styles.page} aria-labelledby="gallery-page-heading">
      <div className={`shell ${styles.inner}`}>
        <div className={styles.head}>
          <p className="eyebrow">{galleryPage.eyebrow}</p>
          <h1 id="gallery-page-heading" className={styles.headline}>
            {galleryPage.headline}
          </h1>
          <p className={styles.lede}>{galleryPage.lede}</p>
        </div>

        <GalleryGrid items={items} emptyMessage={galleryPage.empty} />
      </div>
    </section>
  );
}
