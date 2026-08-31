"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HeroVideoContent } from "@/lib/content";
import { useMotionMode } from "@/lib/useMediaQuery";
import { hero as heroCopy } from "@/data/site";
import BrandMark from "./BrandMark";
import styles from "./HeroVideo.module.css";

type HeroVideoProps = Readonly<{
  content: HeroVideoContent;
  /** Rendered under the headline; the scroll cue for the rest of the page. */
  scrollTargetId: string;
}>;

/**
 * The cinematic hero video.
 *
 * Replaces the 29-frame scroll-scrubbed sequence. The trade-off, stated
 * plainly: the sequence gave the visitor control of the timeline, which the
 * video does not. What the video gives back is real motion at 30fps instead of
 * 8 source frames interpolated to 29, and an owner who can change it from a
 * phone without a deploy.
 *
 * The autoplay rules are not optional decoration — a video that fails to
 * autoplay silently shows a black box:
 *
 *   muted + playsInline  Safari on iOS refuses inline autoplay without both.
 *   poster               Something to look at during the first bytes.
 *   preload="metadata"   Don't spend a mobile visitor's data on a file they
 *                        may never see; the poster covers the gap.
 *
 * `prefers-reduced-motion` gets the poster as a still image and no video at
 * all — not a paused video, which would still download.
 */
export default function HeroVideo({
  content,
  scrollTargetId,
}: HeroVideoProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  const motionMode = useMotionMode();
  const isReduced = motionMode === "reduced";

  const headline = content.title ?? heroCopy.headline.join(" ");
  const supporting = content.subtitle ?? heroCopy.supporting;

  /* Pause when scrolled out of view. A hero video decoding behind three
     screens of menu burns battery and main-thread time for nothing. */
  useEffect(() => {
    if (isReduced || hasFailed) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            /* Autoplay refused; the poster stays. Not an error worth surfacing. */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [isReduced, hasFailed]);

  const togglePlayback = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const showVideo = !isReduced && !hasFailed;

  return (
    <div className={styles.stage}>
      {showVideo ? (
        <video
          ref={videoRef}
          className={styles.video}
          src={content.videoUrl}
          poster={content.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          // Decorative: the headline beside it carries the meaning, and the
          // poster covers the still case. Announcing it would add noise.
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setHasFailed(true)}
        />
      ) : content.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.video}
          src={content.posterUrl}
          alt=""
          aria-hidden="true"
          decoding="async"
        />
      ) : null}

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        <BrandMark className={styles.brand} size="hero" />
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.supporting}>{supporting}</p>

        <a className={styles.scrollCue} href={`#${scrollTargetId}`}>
          <span className={styles.scrollCueLabel}>{heroCopy.scrollIndicator}</span>
          <span className={styles.scrollCueTrack} aria-hidden="true">
            <span className={styles.scrollCueDot} />
          </span>
        </a>
      </div>

      {showVideo ? (
        <button
          type="button"
          className={styles.playToggle}
          onClick={togglePlayback}
          // A visitor must be able to stop motion they did not ask for. This
          // is WCAG 2.2.2 for anything that plays for more than five seconds.
          aria-label={isPlaying ? "Pause background video" : "Play background video"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      ) : null}
    </div>
  );
}
