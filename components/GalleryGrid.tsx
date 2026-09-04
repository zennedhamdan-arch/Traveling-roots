"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import GalleryLightbox, { type GalleryPhoto } from "./GalleryLightbox";
import styles from "./GalleryGrid.module.css";

/**
 * The full gallery grid (masonry via CSS columns) with the shared lightbox
 * and, when photos carry categories, a quiet filter row — at a hundred
 * photos, "just the food" should be one tap.
 *
 * Accessibility is not optional here: every photo is a <button> with a real
 * label (its alt text), the filter buttons announce their state, and the
 * grid never causes horizontal scroll.
 */

export type { GalleryPhoto };

type Props = Readonly<{
  items: readonly GalleryPhoto[];
  emptyMessage: string;
}>;

export default function GalleryGrid({ items, emptyMessage }: Props): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  /* Categories in order of first appearance — the owner's ordering, not the
     alphabet's. Shown only when there are at least two to filter between. */
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (item.category && !seen.includes(item.category)) seen.push(item.category);
    }
    return seen;
  }, [items]);

  const visible = useMemo(
    () => (activeCategory === null ? items : items.filter((i) => i.category === activeCategory)),
    [items, activeCategory],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
  }, []);

  /* The lightbox pages through the filtered list, not the whole collection:
     arrows should walk what the visitor is looking at. */
  const show = useCallback(
    (index: number) => {
      setOpenIndex(((index % visible.length) + visible.length) % visible.length);
    },
    [visible.length],
  );

  /* A filter change while the lightbox is open would leave a stale index;
     close it — the visitor re-opens from the newly filtered grid. */
  const chooseCategory = useCallback((category: string | null) => {
    setOpenIndex(null);
    setActiveCategory(category);
  }, []);

  if (items.length === 0) {
    return (
      <p className={styles.empty} role="status">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      {categories.length >= 2 ? (
        <div className={styles.filters} role="group" aria-label="Filter photos by category">
          <button
            type="button"
            className={activeCategory === null ? styles.filterActive : styles.filter}
            aria-pressed={activeCategory === null}
            onClick={() => chooseCategory(null)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? styles.filterActive : styles.filter}
              aria-pressed={activeCategory === category}
              onClick={() => chooseCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className={styles.empty} role="status">
          No photos in this category yet.
        </p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((item, index) => (
            <li key={item.id} className={styles.cell}>
              <button
                type="button"
                className={styles.photoButton}
                onClick={() => {
                  openerRef.current = null;
                  show(index);
                }}
                ref={index === 0 ? openerRef : undefined}
                aria-label={`Open photo: ${item.alt}`}
              >
                {/* Admin-uploaded photos on Supabase's CDN; next/image would need
                  remotePatterns config and buy nothing on a masonry grid. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.photo}
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                />
                {item.caption ? <span className={styles.photoCaption}>{item.caption}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <GalleryLightbox
        items={visible}
        index={openIndex}
        onClose={close}
        onShow={show}
        openerRef={openerRef}
      />
    </>
  );
}
