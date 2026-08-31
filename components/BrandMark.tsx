import Image from "next/image";

import { brand } from "@/data/site";
import { restaurant } from "@/data/restaurant";
import styles from "./BrandMark.module.css";

type BrandMarkSize = "hero" | "nav" | "footer";

type BrandMarkProps = Readonly<{
  size?: BrandMarkSize;
  className?: string;
  /** Renders the wordmark on two lines. Ignored when a logo image is set. */
  stacked?: boolean;
}>;

const PIXEL_SIZE: Record<BrandMarkSize, number> = {
  hero: 132,
  nav: 40,
  footer: 84,
};

/**
 * The Traveling Roots lock-up.
 * Uses the official logo when one has been supplied (see `brand.logo`),
 * otherwise a typographic wordmark — never an invented logo.
 */
export default function BrandMark({
  size = "nav",
  className,
  stacked = false,
}: BrandMarkProps): React.JSX.Element {
  const classes = [styles.root, styles[size], className].filter(Boolean).join(" ");
  const { src, width, height } = brand.logo;

  if (src) {
    const rendered = PIXEL_SIZE[size];
    return (
      <span className={classes}>
        <Image
          src={src}
          alt={`${restaurant.name} logo`}
          width={width}
          height={height}
          sizes={`${rendered}px`}
          priority={size === "hero"}
          className={styles.image}
        />
      </span>
    );
  }

  return (
    <span className={classes} data-stacked={stacked ? "true" : "false"}>
      <span className={styles.wordmark}>
        <span className={styles.word}>{brand.wordmark.top}</span>
        <span className={styles.word}>{brand.wordmark.bottom}</span>
      </span>
    </span>
  );
}
