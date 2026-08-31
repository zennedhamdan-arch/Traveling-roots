/**
 * Loads an image sequence, tracks progress, and survives individual failures.
 *
 * Framework-agnostic on purpose: no React, no GSAP. Easy to reason about and
 * easy to test.
 */

export type SequenceProgress = Readonly<{
  /** Successfully decoded frames. */
  loaded: number;
  /** Frames that failed and will never arrive. */
  failed: number;
  /** Total frames requested. */
  total: number;
  /** 0 → 1, counting settled (loaded + failed) frames. */
  ratio: number;
}>;

export type SequenceLoaderOptions = Readonly<{
  onProgress?: (progress: SequenceProgress) => void;
  /** Fired once, as soon as the very first frame is paintable. */
  onFirstFrame?: (image: CanvasImageSource) => void;
  /** Fired once every frame has either decoded or failed. */
  onSettled?: (progress: SequenceProgress) => void;
}>;

export class SequenceLoader {
  private readonly urls: readonly string[];
  private readonly images: (HTMLImageElement | null)[];
  private readonly options: SequenceLoaderOptions;

  private loaded = 0;
  private failed = 0;
  private firstFrameAnnounced = false;
  private aborted = false;

  constructor(urls: readonly string[], options: SequenceLoaderOptions = {}) {
    this.urls = urls;
    this.images = new Array<HTMLImageElement | null>(urls.length).fill(null);
    this.options = options;
  }

  get total(): number {
    return this.urls.length;
  }

  private get progress(): SequenceProgress {
    const settled = this.loaded + this.failed;
    return {
      loaded: this.loaded,
      failed: this.failed,
      total: this.total,
      ratio: this.total === 0 ? 1 : settled / this.total,
    };
  }

  /**
   * Returns the frame at `index`, or the nearest earlier frame that did load.
   * This is the graceful-degradation rule: a broken frame 17 shows frame 16
   * instead of tearing a hole in the page.
   */
  frameAt(index: number): HTMLImageElement | null {
    for (let i = Math.min(index, this.images.length - 1); i >= 0; i -= 1) {
      const image = this.images[i];
      if (image) return image;
    }
    // Nothing before it yet — look forward so we can still paint something.
    for (let i = index + 1; i < this.images.length; i += 1) {
      const image = this.images[i];
      if (image) return image;
    }
    return null;
  }

  isLoaded(index: number): boolean {
    return this.images[index] != null;
  }

  /**
   * Kicks off loading. Frame 1 is requested on its own and awaited first so
   * the page can paint immediately; the rest stream in behind it.
   */
  async start(): Promise<void> {
    if (this.urls.length === 0) {
      this.options.onSettled?.(this.progress);
      return;
    }

    // Frame 1 first — it unblocks the whole experience.
    await this.load(0);

    if (this.aborted) return;

    await Promise.all(this.urls.map((_, index) => (index === 0 ? null : this.load(index))));

    if (!this.aborted) this.options.onSettled?.(this.progress);
  }

  /** Stops progress reporting and detaches handlers. Safe to call twice. */
  abort(): void {
    this.aborted = true;
    for (const image of this.images) {
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
    }
  }

  private load(index: number): Promise<void> {
    const url = this.urls[index];
    if (url == null) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const image = new Image();
      // Sequential frames: let the browser fetch them eagerly but off the
      // critical path for anything below the fold.
      image.decoding = "async";
      image.fetchPriority = index === 0 ? "high" : "low";

      const settle = (ok: boolean): void => {
        if (this.aborted) {
          resolve();
          return;
        }
        if (ok) {
          this.images[index] = image;
          this.loaded += 1;
          if (!this.firstFrameAnnounced) {
            this.firstFrameAnnounced = true;
            this.options.onFirstFrame?.(image);
          }
        } else {
          this.failed += 1;
        }
        this.options.onProgress?.(this.progress);
        resolve();
      };

      image.onload = () => {
        // decode() keeps the first paint off the main thread where supported.
        if (typeof image.decode === "function") {
          image.decode().then(
            () => settle(true),
            () => settle(true), // decode() can reject spuriously; the bitmap is still usable.
          );
        } else {
          settle(true);
        }
      };
      image.onerror = () => settle(false);
      image.src = url;
    });
  }
}
