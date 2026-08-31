/**
 * Cinematic image-sequence configuration.
 *
 * All tuning lives here — no magic numbers scattered through the component.
 */

/** EXACTLY 29 frames. Do not change unless the source sequence changes. */
export const FRAME_COUNT = 29;

/** Index of the last frame (28). Used everywhere instead of `FRAME_COUNT - 1`. */
export const LAST_FRAME_INDEX = FRAME_COUNT - 1;

const FRAME_DIR = "/sequence";
const FRAME_PREFIX = "frame-";
const FRAME_EXT = "webp";
const FRAME_PAD = 2;

/** `/sequence/frame-07.webp` for index 6. */
export function frameSrc(index: number): string {
  const n = String(index + 1).padStart(FRAME_PAD, "0");
  return `${FRAME_DIR}/${FRAME_PREFIX}${n}.${FRAME_EXT}`;
}

/** The 29 frame URLs, built programmatically. Never hand-listed. */
export const frames: readonly string[] = Array.from(
  { length: FRAME_COUNT },
  (_, index) => frameSrc(index),
);

/** Maps normalised scroll progress (0→1) to a frame index (0→28). */
export function progressToFrame(progress: number): number {
  const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.round(clamped * LAST_FRAME_INDEX);
}

export const SEQUENCE_TUNING = {
  /**
   * Scroll distance travelled *while pinned*, as a percentage of viewport
   * height. GSAP inserts a pin-spacer of this size, so the total section is
   * this plus one screen.
   *
   * Desktop 380vh over 29 frames ≈ 13vh of scroll per frame — enough travel
   * for the scrub to feel like physical control without dragging on.
   * Mobile is shorter: less scrolling on a small screen feels better, and the
   * shorter travel keeps the scrub responsive on weak hardware.
   */
  scrollDistanceVh: { mobile: 280, desktop: 380 },

  /**
   * GSAP scrub smoothing, in seconds.
   * Desktop 0.5 reads as "weighted and cinematic".
   * Mobile is tighter — momentum scrolling plus a long scrub feels laggy.
   */
  scrub: { mobile: 0.25, desktop: 0.5 },

  /**
   * Cap the backing-store resolution. Rendering at a phone's native 3x DPR
   * costs ~2.25x the fill rate of 2x for no visible gain on a photographic
   * frame, and it is exactly what stalls weak Android GPUs.
   */
  maxDpr: { mobile: 2, desktop: 2 },

  /** Viewport width (px) at and above which "desktop" tuning applies. */
  desktopBreakpoint: 768,

  /**
   * Safe-area insets (fractions of the canvas box) kept clear of the drawn
   * frame so the fixed nav and the caption overlay never sit on top of the
   * subject. Applied as a "contain" shrink, so the image is never cropped.
   */
  safeArea: {
    mobile: { top: 0.1, bottom: 0.2 },
    desktop: { top: 0.09, bottom: 0.14 },
  },

  /**
   * How many frames must be decoded before the experience is released.
   * Frame 1 alone is enough to paint; we wait for a small head-start so the
   * first flick of the scrollbar doesn't hit an undecoded frame.
   */
  minFramesToStart: 6,
} as const;

/** Presentation fit. "contain" guarantees the subject is never cropped. */
export type FrameFit = "contain" | "cover";
export const FRAME_FIT: FrameFit = "contain";
