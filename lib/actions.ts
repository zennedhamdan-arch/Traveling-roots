/**
 * Every call to action on the site, derived from verified contact data.
 *
 * If a piece of contact information is missing from `data/restaurant.ts`, the
 * corresponding action is simply omitted — nothing is faked, and no dead link
 * is ever rendered.
 */

import { restaurant, telHref } from "@/data/restaurant";
import { SECTION_IDS } from "@/data/site";

export type SiteAction = Readonly<{
  id: string;
  label: string;
  href: string;
  external: boolean;
  /** Extra context for screen readers, e.g. the number being dialled. */
  hint?: string;
}>;

/** "Reserve a Table" — reservations are taken by phone, so this dials. */
export const reserveAction: SiteAction | null = telHref
  ? {
      id: "reserve",
      label: "Reserve a Table",
      href: telHref,
      external: false,
      hint: `Call ${restaurant.phone?.display ?? ""} to reserve`,
    }
  : null;

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
