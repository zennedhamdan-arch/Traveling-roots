/**
 * Site-level copy, navigation and section ids.
 * Centralised so no component hard-codes strings or anchor targets.
 */

export const SECTION_IDS = {
  hero: "top",
  cinematic: "cinematic",
  story: "our-story",
  experiences: "experiences",
  menu: "menu",
  reserve: "reserve",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/**
 * Brand mark.
 *
 * The official Traveling Roots logo is NOT recreated or approximated here.
 * Until the real asset is supplied, `logo.src` stays `null` and every brand
 * lock-up falls back to a clean typographic wordmark.
 *
 * TO USE THE REAL LOGO:
 *   1. Save it to `public/images/logo.png` (or .svg / .webp).
 *   2. Set `src` to that path and `width` / `height` to its intrinsic size.
 * It then appears in the hero, the navbar and the footer automatically.
 */
export const brand = {
  logo: {
    src: null as string | null,
    width: 512,
    height: 505,
  },
  /** Wordmark fallback, split so it can be set on two lines. */
  wordmark: { top: "Traveling", bottom: "Roots" },
} as const;

export type NavLink = Readonly<{ label: string; href: string }>;

export const navLinks: readonly NavLink[] = [
  { label: "Menu", href: `#${SECTION_IDS.menu}` },
  { label: "Our Story", href: `#${SECTION_IDS.story}` },
  { label: "Experiences", href: `#${SECTION_IDS.experiences}` },
  { label: "Contact", href: `#${SECTION_IDS.contact}` },
];

export const hero = {
  /** Two lines, rendered as one <h1>. */
  headline: ["Food with roots.", "Flavours without borders."],
  supporting: "Discover Traveling Roots.",
  scrollIndicator: "Scroll to explore",
} as const;

/**
 * Captions driven by cinematic scroll progress.
 * `from`/`to` are normalised progress values (0 → 1) and must stay ordered
 * and non-overlapping. Mirrors the agreed storyboard:
 *   0–20 · 20–45 · 45–70 · 70–90 · 90–100
 */
export type CinematicCaption = Readonly<{
  id: string;
  lines: readonly string[];
  from: number;
  to: number;
  /**
   * Optional override for when the caption starts fading in, if it shouldn't
   * appear at the very start of its window. Defaults to `from`.
   */
  enterAt?: number;
}>;

export const cinematicCaptions: readonly CinematicCaption[] = [
  {
    id: "cap-1",
    lines: ["Traveling Roots"],
    from: 0.0,
    to: 0.2,
    // Hold until the hero lock-up has cleared, so the wordmark and this
    // caption never say the same thing on screen at the same time.
    enterAt: 0.08,
  },
  {
    id: "cap-2",
    lines: ["Where ingredients", "become experiences."],
    from: 0.2,
    to: 0.45,
  },
  { id: "cap-3", lines: ["Thoughtfully made."], from: 0.45, to: 0.7 },
  { id: "cap-4", lines: ["More than a meal."], from: 0.7, to: 0.9 },
  { id: "cap-5", lines: ["Explore the menu."], from: 0.9, to: 1.0 },
];

export const story = {
  eyebrow: "Our Story",
  headline: "From the garden to the table.",
  /** Body copy comes from `restaurant.about` — the restaurant's own words. */
  pillars: [
    {
      id: "garden",
      title: "Our own chef's garden",
      body: "The kitchen grows what it can, a few steps from where you sit.",
    },
    {
      id: "waste",
      title: "A mission to minimise waste",
      body: "Self-sustainability shapes how every plate is planned and prepared.",
    },
    {
      id: "world",
      title: "Cuisines from around the globe",
      body: "Flavours that travel, cooked with what grows here in Musanze.",
    },
  ],
} as const;

/**
 * "Experiences" — only things confirmed by the restaurant's own site or by
 * consistent first-hand visitor reports. Nothing invented.
 */
export const experiences = {
  eyebrow: "Experiences",
  headline: "More than a meal.",
  items: [
    {
      id: "garden-dining",
      title: "Garden dining",
      body: "A relaxed garden setting close to the centre of Musanze — bring something warm when it rains.",
    },
    {
      id: "coffee-bar",
      title: "Outdoor coffee bar",
      body: "Coffee served outside, alongside the murals that give the place its character.",
    },
    {
      id: "theme-nights",
      title: "Theme nights",
      body: "The kitchen runs regular theme nights — call ahead to hear what's on.",
    },
  ],
} as const;

export const reservation = {
  headline: "Ready to experience Traveling Roots?",
  body: "Reserve a table, or send us a message — we'll take it from there.",
} as const;

export const seo = {
  title: "Traveling Roots | Restaurant in Musanze, Rwanda",
  description:
    "Traveling Roots is a garden restaurant in Musanze, Rwanda. Globally inspired, sustainably cooked food from our own chef's garden. Open daily 12:00–22:00.",
  keywords: [
    "Traveling Roots",
    "restaurant Musanze",
    "Musanze Rwanda restaurant",
    "Ruhengeri restaurant",
    "Volcanoes National Park dining",
    "vegan Musanze",
  ],
} as const;

export const legal = {
  privacyHref: "/privacy",
  termsHref: "/terms",
} as const;
