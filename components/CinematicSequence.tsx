"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  FRAME_BACKGROUND,
  FRAME_DIMENSIONS,
  FRAME_FIT,
  INITIAL_ORIENTATION,
  LAST_FRAME_INDEX,
  SEQUENCE_TUNING,
  frameSrc,
  frames,
  orientationOf,
  progressToFrame,
  type Orientation,
  type Viewport,
} from "@/lib/sequence";
import { SequenceLoader, type SequenceProgress } from "@/lib/sequenceLoader";
import { useIsomorphicLayoutEffect, useMotionMode } from "@/lib/useMediaQuery";
import { SECTION_IDS, cinematicCaptions, hero, sequenceMedia } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import BrandMark from "./BrandMark";
import styles from "./CinematicSequence.module.css";

// GSAP plugins must be registered explicitly — never rely on auto-registration.
gsap.registerPlugin(ScrollTrigger);

/** Fade band, in normalised progress, at each end of a caption's window. */
const CAPTION_FADE = 0.05;
/** Normalised progress by which the hero lock-up has cleared the frame. */
const HERO_EXIT_END = 0.08;

export default function CinematicSequence(): React.JSX.Element {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const captionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const loaderRef = useRef<SequenceLoader | null>(null);
  /** Currently painted frame — a ref, so scrubbing never re-renders React. */
  const paintedFrameRef = useRef<number>(-1);
  const rafRef = useRef<number>(0);
  const pendingFrameRef = useRef<number>(0);
  /**
   * Frame orientation, measured from the first decoded frame rather than
   * assumed. Held in a ref for the paint loop and mirrored into state so CSS
   * can react — the paint path must never depend on React state.
   */
  const orientationRef = useRef<Orientation>(INITIAL_ORIENTATION);

  const motionMode = useMotionMode();
  const isReduced = motionMode === "reduced";

  const [orientation, setOrientation] = useState<Orientation>(INITIAL_ORIENTATION);
  const [progress, setProgress] = useState<SequenceProgress>({
    loaded: 0,
    failed: 0,
    total: frames.length,
    ratio: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  const registerCaption = useCallback(
    (id: string) =>
      (node: HTMLParagraphElement | null): void => {
        if (node) captionRefs.current.set(id, node);
        else captionRefs.current.delete(id);
      },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Painting                                                                */
  /* ---------------------------------------------------------------------- */

  /** Draws `index` (or the nearest available frame) at its true aspect ratio. */
  const paint = useCallback((index: number): void => {
    const canvas = canvasRef.current;
    const loader = loaderRef.current;
    if (!canvas || !loader) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const image = loader.frameAt(index);
    if (!image) return;

    const boxW = canvas.clientWidth;
    const boxH = canvas.clientHeight;
    if (boxW === 0 || boxH === 0) return;

    const dpr = canvas.width / boxW;
    if (!Number.isFinite(dpr) || dpr <= 0) return;

    const viewport: Viewport =
      boxW >= SEQUENCE_TUNING.desktopBreakpoint ? "desktop" : "mobile";
    const layout = SEQUENCE_TUNING.layout[orientationRef.current][viewport];

    // Keep the subject clear of the nav and the caption overlay by shrinking
    // the *destination box*. With "contain" the frame is never cropped.
    const availTop = boxH * layout.safeTop;
    const availH = boxH * (1 - layout.safeTop - layout.safeBottom);

    const iw = image.naturalWidth || 1;
    const ih = image.naturalHeight || 1;
    const scale =
      FRAME_FIT === "cover"
        ? Math.max(boxW / iw, availH / ih)
        : Math.min(boxW / iw, availH / ih);

    const drawW = iw * scale;
    const drawH = ih * scale;

    // Position horizontally around `focusX`, then clamp so the frame can
    // never leave the canvas on a narrow viewport.
    const maxDx = Math.max(0, boxW - drawW);
    const dx = Math.min(Math.max(boxW * layout.focusX - drawW / 2, 0), maxDx);
    const dy = availTop + (availH - drawH) / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boxW, boxH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, dx, dy, drawW, drawH);

    paintedFrameRef.current = index;
  }, []);

  /** Coalesces paint requests into at most one per animation frame. */
  const requestPaint = useCallback(
    (index: number): void => {
      pendingFrameRef.current = index;
      if (rafRef.current !== 0) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        paint(pendingFrameRef.current);
      });
    },
    [paint],
  );

  /** Sizes the backing store to the CSS box × capped devicePixelRatio. */
  const resizeCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const boxW = canvas.clientWidth;
    const boxH = canvas.clientHeight;
    if (boxW === 0 || boxH === 0) return;

    const viewport: Viewport =
      boxW >= SEQUENCE_TUNING.desktopBreakpoint ? "desktop" : "mobile";
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      SEQUENCE_TUNING.maxDpr[viewport],
    );

    const nextW = Math.round(boxW * dpr);
    const nextH = Math.round(boxH * dpr);
    if (canvas.width === nextW && canvas.height === nextH) return;

    canvas.width = nextW;
    canvas.height = nextH;
    paint(paintedFrameRef.current < 0 ? 0 : paintedFrameRef.current);
  }, [paint]);

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    // "pending" → motion preference not resolved yet, don't fetch anything.
    // "reduced" → the still <img> below is used instead; downloading 29
    //             frames for someone who will never see them is pure waste.
    if (motionMode !== "full") return;

    const loader = new SequenceLoader(frames, {
      onProgress: (next) => {
        setProgress(next);
        const enough = Math.min(SEQUENCE_TUNING.minFramesToStart, next.total);
        if (next.loaded >= enough) setIsReady(true);
      },
      onFirstFrame: (image) => {
        // Learn the composition from the frames themselves rather than
        // assuming an aspect ratio. Portrait frames get the split layout.
        const next = orientationOf(
          image.naturalWidth || 1,
          image.naturalHeight || 1,
        );
        orientationRef.current = next;
        setOrientation(next);
        resizeCanvas();
        requestPaint(0);
      },
      onSettled: (next) => {
        setIsReady(true);
        if (next.loaded === 0) setAllFailed(true);
        // The pin was measured while the loader overlay was up — remeasure.
        ScrollTrigger.refresh();
      },
    });

    loaderRef.current = loader;
    void loader.start();

    return () => {
      loader.abort();
      loaderRef.current = null;
    };
  }, [motionMode, requestPaint, resizeCanvas]);

  /* ---------------------------------------------------------------------- */
  /* Resize                                                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(canvas);

    // Orientation changes don't always fire a resize on the canvas box.
    const onOrientation = (): void => resizeCanvas();
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [resizeCanvas, motionMode]);

  /* ---------------------------------------------------------------------- */
  /* Scroll timeline                                                         */
  /* ---------------------------------------------------------------------- */

  useIsomorphicLayoutEffect(() => {
    if (motionMode !== "full" || !isReady || allFailed) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    // gsap.context() scopes every tween and ScrollTrigger created inside it,
    // so ctx.revert() is a complete, leak-free teardown on unmount.
    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth >= SEQUENCE_TUNING.desktopBreakpoint;
      const scrub = isDesktop
        ? SEQUENCE_TUNING.scrub.desktop
        : SEQUENCE_TUNING.scrub.mobile;

      /**
       * Scroll distance is recomputed on every refresh (function-based `end`
       * plus invalidateOnRefresh), so rotating a phone or resizing a window
       * re-tunes the sequence instead of breaking it.
       */
      const endDistance = (): string => {
        const desktop = window.innerWidth >= SEQUENCE_TUNING.desktopBreakpoint;
        const pct = desktop
          ? SEQUENCE_TUNING.scrollDistanceVh.desktop
          : SEQUENCE_TUNING.scrollDistanceVh.mobile;
        return `+=${Math.round((window.innerHeight * pct) / 100)}`;
      };

      /**
       * ONE ScrollTrigger drives everything: the frame playhead, the hero
       * exit and all five captions. Fewer triggers means no ordering races,
       * one set of measurements, and one thing to tear down.
       *
       * The timeline is exactly 1 unit long, so every position parameter
       * below reads directly as scroll progress (0 → 1).
       */
      const master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: endDistance,
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub,
          invalidateOnRefresh: true,
          refreshPriority: 1,
          // Guarantees an exact paint at both ends of the range, even if the
          // snapped tween value hasn't ticked at that precise pixel.
          onUpdate: (self) => {
            if (self.progress === 0 || self.progress === 1) {
              const edge = progressToFrame(self.progress);
              if (edge !== paintedFrameRef.current) requestPaint(edge);
            }
          },
        },
      });

      /* ---- Frame playhead ------------------------------------------------
       * A plain object is the tween target; scroll drives `frame` and each
       * tick paints. Nothing autoplays — the scrollbar IS the timeline. Scroll
       * back and the sequence scrubs backwards from wherever it is, 29 → 1.
       * It never restarts and never jumps.
       */
      const playhead = { frame: 0 };

      master.to(
        playhead,
        {
          frame: LAST_FRAME_INDEX,
          duration: 1,
          snap: { frame: 1 },
          onUpdate: () => {
            const target = Math.round(playhead.frame);
            if (target !== paintedFrameRef.current) requestPaint(target);
          },
        },
        0,
      );

      /* ---- Hero lock-up clears out of the way ---- */
      if (heroRef.current) {
        master.to(
          heroRef.current,
          { autoAlpha: 0, y: -40, duration: HERO_EXIT_END },
          0,
        );
      }

      /* ---- Captions cross-fade in their own progress windows ---- */
      for (const caption of cinematicCaptions) {
        const el = captionRefs.current.get(caption.id);
        if (!el) continue;

        gsap.set(el, { autoAlpha: 0, y: 20 });

        master.to(
          el,
          { autoAlpha: 1, y: 0, duration: CAPTION_FADE },
          caption.enterAt ?? caption.from,
        );

        if (caption.to < 1) {
          master.to(
            el,
            { autoAlpha: 0, y: -20, duration: CAPTION_FADE },
            caption.to - CAPTION_FADE,
          );
        }
      }
    }, sectionRef);

    // Web fonts and lazily-decoded media below the fold can shift layout.
    const onLoad = (): void => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert();
    };
  }, [motionMode, isReady, allFailed, requestPaint]);

  /* ---------------------------------------------------------------------- */
  /* Repaint when the measured orientation changes the composition           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    // `orientation` flips the CSS layout, which can resize the canvas box.
    // Re-measure and repaint the frame that is currently on screen.
    resizeCanvas();
    requestPaint(paintedFrameRef.current < 0 ? 0 : paintedFrameRef.current);
    ScrollTrigger.refresh();
  }, [orientation, resizeCanvas, requestPaint]);

  /* ---------------------------------------------------------------------- */
  /* Cancel any in-flight rAF on unmount                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(
    () => () => {
      if (rafRef.current !== 0) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  const percent = Math.round(progress.ratio * 100);
  const showLoader = motionMode !== "reduced" && !isReady && !allFailed;

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.cinematic}
      className={styles.section}
      data-reduced={isReduced ? "true" : "false"}
      data-orientation={orientation}
      /* The stage blends into the frames' own backdrop, so "contain"
         letterboxing is invisible. Sampled from the frames at build time. */
      style={{ "--frame-bg": FRAME_BACKGROUND } as React.CSSProperties}
      aria-labelledby="cinematic-heading"
    >
      <div ref={stageRef} className={styles.stage}>
        {isReduced ? (
          /* Reduced motion: one still frame, no canvas, no scroll animation,
             and 28 fewer image requests. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frameSrc(LAST_FRAME_INDEX)}
            alt={sequenceMedia.stillAlt}
            className={styles.still}
            width={FRAME_DIMENSIONS.width}
            height={FRAME_DIMENSIONS.height}
            decoding="async"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={sequenceMedia.canvasLabel}
          />
        )}

        {allFailed ? (
          <p className={styles.failure} role="status">
            The cinematic sequence couldn&apos;t load. Everything else on this
            page works as normal.
          </p>
        ) : null}

        {/* ---------------- Hero lock-up ---------------- */}
        <div ref={heroRef} className={styles.hero}>
          <BrandMark className={styles.heroBrand} size="hero" />
          <h1 id="cinematic-heading" className={styles.headline}>
            {hero.headline.map((line) => (
              <span key={line} className={styles.headlineLine}>
                {line}
              </span>
            ))}
          </h1>
          <p className={styles.supporting}>{hero.supporting}</p>
        </div>

        {/* ---------------- Scroll-driven captions ----------------
            GSAP animates autoAlpha, which toggles `visibility` — hidden
            captions are removed from the accessibility tree automatically,
            with no aria-hidden bookkeeping. Under reduced motion GSAP never
            runs and CSS lays the same copy out as a readable static list. */}
        <div className={styles.captions}>
          {cinematicCaptions.map((caption) => (
            <p
              key={caption.id}
              ref={registerCaption(caption.id)}
              className={styles.caption}
            >
              {caption.lines.map((line) => (
                <span key={line} className={styles.captionLine}>
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* ---------------- Scroll indicator ---------------- */}
        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollHintLabel}>{hero.scrollIndicator}</span>
          <span className={styles.scrollHintTrack}>
            <span className={styles.scrollHintDot} />
          </span>
        </div>

        {/* ---------------- Loader ---------------- */}
        {showLoader ? (
          <div className={styles.loader}>
            <p className={styles.loaderBrand}>{restaurant.name}</p>
            <p className={styles.loaderText}>Loading experience…</p>
            <div
              className={styles.loaderTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Loading the cinematic sequence"
            >
              <span
                className={styles.loaderBar}
                style={{ transform: `scaleX(${progress.ratio})` }}
              />
            </div>
            <p className={styles.loaderCount}>{percent}%</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
