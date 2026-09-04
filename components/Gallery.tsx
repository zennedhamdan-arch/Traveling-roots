import { getFeaturedGallery, getGalleryItems } from "@/lib/content";
import type { GalleryItemRow } from "@/lib/supabase/types";
import { SECTION_IDS, gallery as galleryCopy } from "@/data/site";
import ButtonLink from "@/components/Button";
import GalleryLoop from "@/components/GalleryLoop";
import styles from "./Gallery.module.css";

/**
 * The homepage gallery: a curated showcase, not the whole archive.
 *
 * The loop drifts through photos the owner marked Featured (published +
 * featured, display order, first 8). Until the owner curates some, the newest
 * published photos stand in — an explicitly designed fallback, never faked
 * imagery and never unpublished rows (the database's RLS already refuses
 * those to this public client). The full collection lives on /gallery, one
 * click away.
 *
 * This wrapper stays a Server Component: the photos, captions and alt texts
 * are in the initial payload for crawlers and slow connections, while the
 * drift and the lightbox run in the client component.
 */

/** How many photos the homepage loop shows. 8 keeps the section light even
 *  when the gallery holds hundreds. */
const SHOWCASE_LIMIT = 8;

/** Fallback showcase size while nothing is marked featured yet. */
const FALLBACK_LIMIT = 6;

function altFor(row: GalleryItemRow): string {
  if (row.alt_text.trim().length > 0) return row.alt_text;
  if (row.caption && row.caption.trim().length > 0) return row.caption;
  return row.category
    ? `Traveling Roots restaurant — ${row.category.toLowerCase()}`
    : "Traveling Roots restaurant";
}

export default async function Gallery(): Promise<React.JSX.Element> {
  const featured = await getFeaturedGallery(SHOWCASE_LIMIT);
  const rows =
    featured.length > 0 ? featured : (await getGalleryItems()).slice(0, FALLBACK_LIMIT);

  const items = rows.map((row) => ({
    id: row.id,
    src: row.image_url,
    alt: altFor(row),
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
      </div>

      {items.length > 0 ? (
        <GalleryLoop items={items} />
      ) : (
        <div className="shell">
          <p className={styles.empty} role="status">
            {galleryCopy.empty}
          </p>
        </div>
      )}

      {/* The CTA stays even when the loop is empty: the full gallery page is
          always one click away. */}
      <div className={styles.cta}>
        <ButtonLink href="/gallery" variant="secondary" size="lg">
          {galleryCopy.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
