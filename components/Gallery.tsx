import { getGalleryItems } from "@/lib/content";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { SECTION_IDS, gallery as galleryCopy } from "@/data/site";
import GalleryGrid from "./GalleryGrid";
import styles from "./Gallery.module.css";

/**
 * The public gallery.
 *
 * Photos come from the `gallery_items` table (managed in the dashboard) and
 * are rendered by a client component so the lightbox — keyboard and swipe —
 * works. This wrapper stays a Server Component so the section HTML, captions
 * and alt texts are in the initial payload for crawlers and slow connections.
 *
 * With no Supabase configured, or no photos yet, the section shows an honest
 * empty state rather than stock imagery — this restaurant's site never fakes
 * content.
 */
export default async function Gallery(): Promise<React.JSX.Element> {
  const rows = await getGalleryItems();
  const items = rows.map((row: GalleryItemRow) => ({
    id: row.id,
    src: row.image_url,
    alt: row.alt_text || row.caption || "Traveling Roots",
    ...(row.caption ? { caption: row.caption } : {}),
  }));

  return (
    <section
      id={SECTION_IDS.gallery}
      className={styles.section}
      aria-labelledby="gallery-heading"
    >
      <div className="shell">
        <div className={styles.head}>
          <p className="eyebrow">{galleryCopy.eyebrow}</p>
          <h2 id="gallery-heading" className={styles.headline}>
            {galleryCopy.headline}
          </h2>
          <p className={styles.lede}>{galleryCopy.lede}</p>
        </div>

        <GalleryGrid items={items} emptyMessage={galleryCopy.empty} />
      </div>
    </section>
  );
}
