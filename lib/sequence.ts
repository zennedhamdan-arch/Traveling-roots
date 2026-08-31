/**
 * Cinematic image-sequence configuration.
 *
 * All tuning lives here — no magic numbers scattered through the component.
 */

import { frameBackground, frameDimensions } from "@/data/frames.generated";

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

export type Viewport = "mobile" | "desktop";
/** Detected from the frames themselves at runtime — never hard-coded. */
export type Orientation = "portrait" | "landscape";

export type FrameLayout = Readonly<{
  /** Fraction of canvas height kept clear at the top (for the nav). */
  safeTop: number;
  /** Fraction kept clear at the bottom (for captions / scroll hint). */
  safeBottom: number;
  /**
   * Horizontal centre of the drawn frame, as a fraction of canvas width.
   * 0.5 centres it. Pushing it right on wide screens leaves a text column
   * beside a tall frame instead of two dead margins.
   */
  focusX: number;
}>;

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
   * Composition, per frame orientation and per viewport.
   *
   * A tall 9:16 frame contained inside a 16:9 desktop viewport only occupies
   * about a third of the width. Centring it wastes both margins, so on
   * desktop the frame is pushed right and the copy takes the left column —
   * an editorial split rather than a small object floating in space.
   *
   * These shrink the *destination box*; the frame itself is never cropped.
   */
  layout: {
    portrait: {
      mobile: { safeTop: 0.07, safeBottom: 0.19, focusX: 0.5 },
      desktop: { safeTop: 0.05, safeBottom: 0.05, focusX: 0.7 },
    },
    landscape: {
      mobile: { safeTop: 0.1, safeBottom: 0.2, focusX: 0.5 },
      desktop: { safeTop: 0.09, safeBottom: 0.14, focusX: 0.5 },
    },
  } satisfies Record<Orientation, Record<Viewport, FrameLayout>>,

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

/** Classifies a frame's aspect ratio. Portrait drives the split layout. */
export function orientationOf(width: number, height: number): Orientation {
  return width / height < 0.95 ? "portrait" : "landscape";
}

/**
 * Intrinsic frame size, measured from the real files at build time by
 * scripts/measure-frames.mjs. Used to render the correct composition on the
 * server, so the layout doesn't jump once the first frame decodes.
 */
export const FRAME_DIMENSIONS = frameDimensions;

export const INITIAL_ORIENTATION: Orientation = orientationOf(
  frameDimensions.width,
  frameDimensions.height,
);

/**
 * The frames' own backdrop colour, sampled from their corners at build time.
 *
 * "contain" letterboxes the frame, so the stage around it must match or the
 * frame reads as a rectangle pasted onto a different background. Painting the
 * stage this colour makes the letterboxing invisible and the food appear to
 * float in the page.
 */
export const FRAME_BACKGROUND = frameBackground;
