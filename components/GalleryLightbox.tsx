"use client";

import { useEffect, useRef, type RefObject } from "react";

import styles from "./GalleryGrid.module.css";

/**
 * The photo lightbox, shared by the homepage showcase loop and the full
 * /gallery grid. Extracted from GalleryGrid when the loop needed it too —
 * one viewer, one set of behaviours:
 *
 *  - role="dialog" aria-modal, closes on Escape, arrows move between photos
 *  - focus starts on the close button and returns to the photo that opened it
 *  - swipe works on touch, and the page behind is scroll-locked while open
 */

export type GalleryPhoto = Readonly<{
  id: string;
  src: string;
  alt: string;
  caption?: string;
  /** Optional curation bucket (Food, Garden, …) — used by the grid filter. */
  category?: string;
}>;

type Props = Readonly<{
  items: readonly GalleryPhoto[];
  /** Index into `items`, or null when the lightbox is closed. */
  index: number | null;
  onClose: () => void;
  /** Ask the owner to show a neighbouring photo (it normalizes the index). */
  onShow: (index: number) => void;
  /** The element focus should return to on close (may be null/unattached). */
  openerRef?: RefObject<HTMLButtonElement | null>;
}>;

export default function GalleryLightbox({
  items,
  index,
  onClose,
  onShow,
  openerRef,
}: Props): React.JSX.Element | null {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  /* Keyboard + scroll lock while the lightbox is open. */
  useEffect(() => {
    if (index === null) return;

    // Captured now: the ref may be reassigned before the cleanup runs, but
    // focus must return to the exact photo that opened this lightbox.
    const opener = openerRef?.current ?? null;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onShow(index + 1);
      if (event.key === "ArrowLeft") onShow(index - 1);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Hand focus back to the photo that opened the lightbox.
      opener?.focus();
    };
  }, [index, onClose, onShow, openerRef]);

  /* Swipe (touch). A tap is not a swipe: require ~40px of horizontal travel. */
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent): void => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent): void => {
    if (touchStart.current === null || index === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 40) onShow(index + (delta < 0 ? 1 : -1));
    touchStart.current = null;
  };

  if (index === null) return null;
  const current = items[index];
  if (!current) return null;

  return (
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${items.length}: ${current.alt}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="Close photo viewer"
      >
        ✕
      </button>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
            onClick={() => onShow(index - 1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
            onClick={() => onShow(index + 1)}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      ) : null}

      <figure className={styles.lightboxFigure}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.lightboxImage} src={current.src} alt={current.alt} />
        {current.caption ? (
          <figcaption className={styles.lightboxCaption}>{current.caption}</figcaption>
        ) : null}
        <p className={styles.lightboxCount}>
          {index + 1} / {items.length}
        </p>
      </figure>
    </div>
  );
}
