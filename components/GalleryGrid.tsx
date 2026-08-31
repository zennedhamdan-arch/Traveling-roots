"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./GalleryGrid.module.css";

/**
 * The gallery grid + lightbox. One client component because the two share
 * state: tapping a photo opens the lightbox at that photo.
 *
 * Accessibility is not optional here:
 *  - every photo is a <button> with a real label (its alt text)
 *  - the lightbox is a role="dialog" aria-modal, closes on Escape, arrows
 *    move between photos, focus starts on the close button and returns to
 *    the photo that opened it
 *  - swipe works on touch, and the grid never causes horizontal scroll
 */

export type GalleryPhoto = Readonly<{
  id: string;
  src: string;
  alt: string;
  caption?: string;
}>;

type Props = Readonly<{
  items: readonly GalleryPhoto[];
  emptyMessage: string;
}>;

export default function GalleryGrid({ items, emptyMessage }: Props): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const show = useCallback(
    (index: number) => {
      setOpenIndex(((index % items.length) + items.length) % items.length);
    },
    [items.length],
  );

  /* Keyboard + scroll lock while the lightbox is open. */
  useEffect(() => {
    if (openIndex === null) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") show(openIndex + 1);
      if (event.key === "ArrowLeft") show(openIndex - 1);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Hand focus back to the photo that opened the lightbox.
      openerRef.current?.focus();
    };
  }, [openIndex, close, show]);

  /* Swipe (touch). A tap is not a swipe: require ~40px of horizontal travel. */
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent): void => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent): void => {
    if (touchStart.current === null || openIndex === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 40) show(openIndex + (delta < 0 ? 1 : -1));
    touchStart.current = null;
  };

  if (items.length === 0) {
    return (
      <p className={styles.empty} role="status">
        {emptyMessage}
      </p>
    );
  }

  const current = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <ul className={styles.grid}>
        {items.map((item, index) => (
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

      {current && openIndex !== null ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${openIndex + 1} of ${items.length}: ${current.alt}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            ref={closeRef}
            type="button"
            className={styles.lightboxClose}
            onClick={close}
            aria-label="Close photo viewer"
          >
            ✕
          </button>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                onClick={() => show(openIndex - 1)}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                onClick={() => show(openIndex + 1)}
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
              {openIndex + 1} / {items.length}
            </p>
          </figure>
        </div>
      ) : null}
    </>
  );
}
