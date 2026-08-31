/**
 * TRAVELING ROOTS — verified business data.
 *
 * SINGLE SOURCE OF TRUTH.
 * No component may hard-code business information. Import from here.
 *
 * ----------------------------------------------------------------------------
 * PROVENANCE / VERIFICATION
 * ----------------------------------------------------------------------------
 * Every field below is marked with where it was verified. Anything that could
 * NOT be verified is `null` and the UI degrades gracefully instead of inventing
 * a value. Do not fill these in with guesses.
 *
 *  [official]  https://www.travelingrootsltdrwanda.com/  (the restaurant's own site)
 *  [petitfute] https://www.petitfute.co.uk/ ... /c1165-restaurants/  (street address)
 *  [facebook]  https://www.facebook.com/people/Traveling-Roots-Rwanda/61559122592817/
 *  [listings]  Google/Wanderlog/Evendo business listings (hours, locality)
 */

export type WeekdayHours = Readonly<{
  /** Human label for the day range, e.g. "Monday – Sunday". */
  days: string;
  /** 24h opening time, e.g. "12:00". */
  opens: string;
  /** 24h closing time, e.g. "22:00". */
  closes: string;
  /** schema.org dayOfWeek values covered by this row. */
  schemaDays: readonly string[];
}>;

export type SocialLink = Readonly<{
  label: string;
  href: string;
  /** Shown in `aria-label` / screen-reader context. */
  a11yLabel: string;
}>;

export type RestaurantData = Readonly<{
  name: string;
  legalName: string;
  tagline: string;
  city: string;
  /** The town is officially Musanze; "Ruhengeri" is the widely used former name. */
  cityAlternate: string;
  country: string;
  streetAddress: string | null;
  /** Plus Code used by the restaurant's own "Directions" link. */
  plusCode: string | null;
  phone: Readonly<{ display: string; e164: string }> | null;
  whatsapp: Readonly<{ display: string; e164: string; href: string }> | null;
  email: string | null;
  website: string | null;
  directionsUrl: string | null;
  /** Official Canva menu. Kept ONLY as a downloadable fallback, never as the primary menu. */
  externalMenuUrl: string | null;
  hours: readonly WeekdayHours[];
  socials: readonly SocialLink[];
  /** The restaurant's own description of itself, from their official website. */
  about: readonly string[];
  cuisine: readonly string[];
  priceRange: string;
}>;

const PHONE_E164 = "+250794317286";
const WHATSAPP_E164 = "+250736652490";

export const restaurant: RestaurantData = {
  name: "Traveling Roots",
  legalName: "Traveling Roots Ltd", // [official]
  tagline: "Sustainable food bliss, traveled food infusion", // [facebook]
  city: "Musanze", // [official]
  cityAlternate: "Ruhengeri", // [listings]
  country: "Rwanda", // [official]
  streetAddress: "NM 227 St", // [petitfute]
  plusCode: "FJVH+XW", // [official] — used in their own Google Maps directions link
  phone: {
    display: "+250 794 317 286", // [official]
    e164: PHONE_E164,
  },
  whatsapp: {
    display: "+250 736 652 490", // [official] — their site's WhatsApp button
    e164: WHATSAPP_E164,
    href: `https://wa.me/${WHATSAPP_E164.replace("+", "")}`,
  },
  email: "TravelingRootsRwanda@gmail.com", // [facebook]
  website: "https://www.travelingrootsltdrwanda.com/", // [official]
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=FJVH%2BXW%2C%20Ruhengeri%2C%20Rwanda", // [official]
  externalMenuUrl: "https://canva.link/16q8f4snq9jurbg", // [official]
  hours: [
    {
      days: "Monday – Sunday",
      opens: "12:00",
      closes: "22:00",
      schemaDays: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
  ], // [official] "Monday - Sunday 12:00 - 22:00"
  socials: [
    {
      label: "Facebook",
      href: "https://www.facebook.com/people/Traveling-Roots-Rwanda/61559122592817/",
      a11yLabel: "Traveling Roots on Facebook (opens in a new tab)",
    },
    // ---------------------------------------------------------------------
    // INSTAGRAM — NOT YET VERIFIED.
    // An official Traveling Roots Rwanda Instagram account could not be
    // confirmed. Uncomment and set the real handle when you have it; the
    // "Follow on Instagram" action appears automatically everywhere.
    // ---------------------------------------------------------------------
    // {
    //   label: "Instagram",
    //   href: "https://www.instagram.com/<HANDLE>/",
    //   a11yLabel: "Traveling Roots on Instagram (opens in a new tab)",
    // },
  ],
  about: [
    // Verbatim source: the restaurant's own "Who We Are" text. [official]
    "We're all about flavorful journeys and eco-friendly eats. Inspired by cuisines from around the globe, our kitchen thrives on self-sustainability.",
    "With our own chef's garden and a mission to minimize waste, every plate tells a delicious tale of care and creativity.",
    "But it's not just about the food — our staff is here to make you feel right at home, serving up hospitality alongside every dish.",
  ],
  cuisine: ["International", "Rwandan"], // [petitfute] / [listings]
  priceRange: "$$",
} as const;

/** Convenience: "Musanze, Rwanda". */
export const locationLabel = `${restaurant.city}, ${restaurant.country}` as const;

/** Convenience: full one-line address used in the footer + structured data. */
export const addressLine = [
  restaurant.streetAddress,
  restaurant.cityAlternate,
  restaurant.country,
]
  .filter(Boolean)
  .join(", ");

export const instagram = restaurant.socials.find((s) => s.label === "Instagram") ?? null;
export const facebook = restaurant.socials.find((s) => s.label === "Facebook") ?? null;

/** `tel:` href, or null when no verified phone exists. */
export const telHref = restaurant.phone ? `tel:${restaurant.phone.e164}` : null;
