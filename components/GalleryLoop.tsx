"use client";

import { useCallback, useRef, useState } from "react";

import GalleryLightbox, { type GalleryPhoto } from "./GalleryLightbox";
import styles from "./GalleryLoop.module.css";

/**
 * The homepage gallery showcase: a slow, seamless horizontal drift through
 * the featured photos. Calm by design — a photograph should have time to be
 * appreciated, not scrolled past.
 *
 * How the loop works (and why it stays cheap):
 *
 *  - The strip is rendered twice inside a `width: max-content` track and
 *    animated with a single CSS keyframe: translate3d(0 → -50%). One half is
 *    exactly one copy of the photos, so -50% lands pixel-perfectly on the
 *    second copy — the "seam" never exists. Card spacing uses margins, not
 *    the track's gap, precisely so the half is exact.
 *
 *  - transform-only animation = composited on the GPU; no layout, no paint,
 *    no requestAnimationFrame loop, no JS at all until a photo is tapped.
 *
 *  - The duration scales with the number of photos (`--loop-count`), so the
 *    perceived speed stays constant whether there are 4 photos or 8.
 *
 *  - Hover (on pointers that hover) and keyboard focus pause the drift, so a
 *    photo can be studied and clicked. `prefers-reduced-motion` stops the
 *    movement entirely and shows the photos as a static wrapped row.
 *
 *  - With fewer than 3 photos an infinite loop reads as a glitch, not a
 *    feature — they render as the same static row, no animation.
 *
 * Images are `loading="lazy"`: this section is below the fold, and the
 * duplicates only load as the drift brings them toward the viewport. The
 * homepage never downloads the full gallery — the caller passes at most ~8
 * featured photos.
 */
export default function GalleryLoop({
  items,
}: Readonly<{ items: readonly GalleryPhoto[] }>): React.JSX.Element | null {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const show = useCallback(
    (index: number) => {
      setOpenIndex(((index % items.length) + items.length) % items.length);
    },
    [items.length],
  );

  if (items.length === 0) return null;

  const looping = items.length >= 3;
  /* Small collections are doubled inside each half so one half still spans
     the viewport on wide screens; the halves themselves stay identical. */
  const half = items.length < 6 ? [...items, ...items] : [...items];
  const copies: readonly { item: GalleryPhoto; original: number }[] = [
    ...half.map((item, original) => ({ item, original })),
    ...half.map((item, original) => ({ item, original })),
  ];

  return (
    <>
      <div className={styles.shell}>
        <ul
          className={looping ? styles.track : styles.row}
          aria-label="Featured photos"
          style={{ "--loop-count": half.length } as React.CSSProperties}
        >
          {copies.map(({ item, original }, position) => (
            <li key={`${item.id}-${position}`} className={styles.slide}>
              <button
                type="button"
                className={styles.card}
                aria-label={`Open photo: ${item.alt}`}
                onClick={(event) => {
                  openerRef.current = event.currentTarget;
                  show(original);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.image}
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                />
                {item.caption ? <span className={styles.caption}>{item.caption}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <GalleryLightbox
        items={items}
        index={openIndex}
        onClose={close}
        onShow={show}
        openerRef={openerRef}
      />
    </>
  );
}
