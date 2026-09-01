/**
 * Every call to action on the site, derived from verified contact data.
 *
 * If a piece of contact information is missing from `data/restaurant.ts`, the
 * corresponding action is simply omitted — nothing is faked, and no dead link
 * is ever rendered.
 */

import { restaurant } from "@/data/restaurant";
import { SECTION_IDS } from "@/data/site";

export type SiteAction = Readonly<{
  id: string;
  label: string;
  href: string;
  external: boolean;
  /** Extra context for screen readers, e.g. the number being dialled. */
  hint?: string;
}>;

/**
 * "Reserve a Table" — opens the dedicated reservation page.
 *
 * Every Reserve CTA on the site funnels here: the navbar button, the reserve
 * section and the footer. The phone number stays available as a separate,
 * clearly-labelled action — but the promise "Reserve" makes is "take me to
 * the form", not "start a phone call".
 */
export const reserveAction: SiteAction = {
  id: "reserve",
  label: "Reserve a Table",
  href: "/reservation",
  external: false,
  hint: "Go to the reservation form",
};

export const whatsappAction: SiteAction | null = restaurant.whatsapp
  ? {
      id: "whatsapp",
      label: "WhatsApp Us",
      href: restaurant.whatsapp.href,
      external: true,
      hint: `Message ${restaurant.whatsapp.display} on WhatsApp`,
    }
  : null;

export const menuAction: SiteAction = {
  id: "menu",
  label: "View Menu",
  href: `#${SECTION_IDS.menu}`,
  external: false,
};

export const pickupAction: SiteAction = {
  id: "pickup",
  label: "Order Pickup",
  href: "/order",
  external: false,
};

export const directionsAction: SiteAction | null = restaurant.directionsUrl
  ? {
      id: "directions",
      label: "Get Directions",
      href: restaurant.directionsUrl,
      external: true,
      hint: `Directions to ${restaurant.name} in ${restaurant.city}`,
    }
  : null;

const instagramLink = restaurant.socials.find((s) => s.label === "Instagram");

export const instagramAction: SiteAction | null = instagramLink
  ? {
      id: "instagram",
      label: "Follow on Instagram",
      href: instagramLink.href,
      external: true,
    }
  : null;

/** Compact list used by the reservation section and the footer. */
export const primaryActions: readonly SiteAction[] = [
  reserveAction,
  whatsappAction,
].filter((a): a is SiteAction => a !== null);

export const secondaryActions: readonly SiteAction[] = [
  pickupAction,
  menuAction,
  directionsAction,
  instagramAction,
].filter((a): a is SiteAction => a !== null);
