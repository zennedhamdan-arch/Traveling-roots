import "server-only";

import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  ExperienceRow,
  GalleryItemRow,
  HeroMediaRow,
  MenuCategoryRow,
  MenuItemRow,
  MenuSectionRow,
  OfferRow,
  SocialLinkRow,
  TestimonialRow,
} from "@/lib/supabase/types";
import {
  menu as staticMenu,
  type DietaryTag,
  type MenuCategoryData,
  type MenuItem,
  type MenuSection,
} from "@/data/menu";
import { restaurant as staticRestaurant, type RestaurantData } from "@/data/restaurant";

/**
 * The public site's content layer.
 *
 * Every loader follows the same rule:
 *
 *   Supabase configured and returns rows  →  use the database
 *   Supabase absent, erroring, or empty   →  use the committed data in data/
 *
 * The fallback is not defensive padding, it is the product decision. The
 * restaurant's phone number, address and full menu are already correct in the
 * repo. A missing environment variable, a paused Supabase project or a network
 * blip must not take that off the internet — the worst outcome should be that
 * a recent edit isn't shown yet, never a blank menu.
 *
 * `cache()` deduplicates within a single render pass, so a loader used by both
 * the page and the structured data runs one query, not two.
 */

/** RWF has no minor unit, so an integer is the whole price. */
export function formatPrice(amount: number | null): string | null {
  if (amount === null) return null;
  return `${amount.toLocaleString("en-US")} RWF`;
}

/** Slug-safe id, so DB-backed items keep working as anchors and React keys. */
function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : fallback;
}

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

type MenuQueryResult = {
  categories: MenuCategoryRow[];
  sections: MenuSectionRow[];
  items: MenuItemRow[];
};

function buildMenu({ categories, sections, items }: MenuQueryResult): MenuCategoryData[] {
  const sectionsByCategory = new Map<string, MenuSectionRow[]>();
  for (const section of sections) {
    const list = sectionsByCategory.get(section.category_id) ?? [];
    list.push(section);
    sectionsByCategory.set(section.category_id, list);
  }

  const itemsBySection = new Map<string, MenuItemRow[]>();
  for (const item of items) {
    const list = itemsBySection.get(item.section_id) ?? [];
    list.push(item);
    itemsBySection.set(item.section_id, list);
  }

  return categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category): MenuCategoryData => {
      const categorySections = (sectionsByCategory.get(category.id) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section, sectionIndex): MenuSection => {
          const sectionItems = (itemsBySection.get(section.id) ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            // `available` is the owner's "86 it for tonight" switch. RLS still
            // returns the row so the admin can see it; the public view hides it.
            .filter((item) => item.available)
            .map(
              (item): MenuItem => ({
                id: slugify(item.name, item.id),
                name: item.name,
                ...(item.description ? { description: item.description } : {}),
                price: formatPrice(item.price),
                ...(item.variants.length > 0
                  ? {
                      variants: item.variants.map((variant) => ({
                        label: variant.label,
                        price: formatPrice(variant.price) ?? "",
                      })),
                    }
                  : {}),
                ...(item.image_url ? { image: item.image_url } : {}),
                ...(item.dietary.length > 0
                  ? { dietary: item.dietary as readonly DietaryTag[] }
                  : {}),
                ...(item.availability_note
                  ? { availability: item.availability_note }
                  : {}),
              }),
            );

          return {
            id: slugify(section.title ?? `${category.slug}-${sectionIndex}`, section.id),
            ...(section.title ? { title: section.title } : {}),
            ...(section.note ? { note: section.note } : {}),
            items: sectionItems,
          };
        })
        // An empty section would render a heading with nothing under it.
        .filter((section) => section.items.length > 0);

      return {
        id: category.slug,
        category: category.name,
        ...(category.intro ? { intro: category.intro } : {}),
        sections: categorySections,
      };
    })
    .filter((category) => category.sections.length > 0);
}

export const getMenu = cache(async (): Promise<readonly MenuCategoryData[]> => {
  if (!isSupabaseConfigured) return staticMenu;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const [categories, sections, items] = await Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_sections").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);

    if (categories.error || sections.error || items.error) throw new Error("menu query failed");
    if (!categories.data || categories.data.length === 0) return staticMenu;

    const built = buildMenu({
      categories: categories.data,
      sections: sections.data ?? [],
      items: items.data ?? [],
    });

    return built.length > 0 ? built : staticMenu;
  } catch {
    return staticMenu;
  }
});

/* -------------------------------------------------------------------------- */
/* Pickup-order menu                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The menu as the ORDER FORM needs it — which is not what `getMenu()` returns.
 *
 * The public menu renders slugged ids and formatted prices ("6,000 RWF")
 * because that is all display needs. An order line must carry the real
 * `menu_items.id` and the numeric price so the database can resolve it, so
 * this loader keeps the raw row values.
 *
 * There is deliberately NO static fallback: without a database there is
 * nowhere to submit an order, so the page falls back to the phone number
 * instead of rendering a form that can never succeed.
 */
export type OrderableVariant = Readonly<{ label: string; price: number | null }>;

export type OrderableItem = Readonly<{
  id: string;
  name: string;
  price: number | null;
  variants: readonly OrderableVariant[];
  dietary: readonly string[];
}>;

export type OrderableSection = Readonly<{
  title: string | null;
  items: readonly OrderableItem[];
}>;

export type OrderableCategory = Readonly<{
  slug: string;
  name: string;
  sections: readonly OrderableSection[];
}>;

export const getOrderMenu = cache(async (): Promise<readonly OrderableCategory[] | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");

    const [categories, sections, items] = await Promise.all([
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_sections").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);

    if (categories.error || sections.error || items.error) throw new Error("menu query failed");
    if (!categories.data || categories.data.length === 0) return null;

    const sectionsByCategory = new Map<string, MenuSectionRow[]>();
    for (const section of sections.data ?? []) {
      const list = sectionsByCategory.get(section.category_id) ?? [];
      list.push(section);
      sectionsByCategory.set(section.category_id, list);
    }

    const itemsBySection = new Map<string, MenuItemRow[]>();
    for (const item of items.data ?? []) {
      const list = itemsBySection.get(item.section_id) ?? [];
      list.push(item);
      itemsBySection.set(item.section_id, list);
    }

    /* The read policies already exclude unpublished categories; `available`
       (the owner's "86 it for tonight" switch) is filtered here, exactly as
       buildMenu does for the display menu. */
    const built = categories.data.map((category): OrderableCategory => {
      const categorySections = (sectionsByCategory.get(category.id) ?? [])
        .map((section): OrderableSection => {
          const sectionItems = (itemsBySection.get(section.id) ?? [])
            .filter((item) => item.available)
            .map(
              (item): OrderableItem => ({
                id: item.id,
                name: item.name,
                price: item.price,
                variants: item.variants.map((variant) => ({
                  label: variant.label,
                  price: variant.price,
                })),
                dietary: item.dietary,
              }),
            );

          return {
            title: section.title,
            items: sectionItems,
          };
        })
        .filter((section) => section.items.length > 0);

      return {
        slug: category.slug,
        name: category.name,
        sections: categorySections,
      };
    });

    const flat = built.filter((category) => category.sections.length > 0);
    return flat.length > 0 ? flat : null;
  } catch {
    return null;
  }
});

/* -------------------------------------------------------------------------- */
/* Business info                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Database values override the committed ones field by field.
 *
 * A partial row must not blank out a phone number that is already correct in
 * the repo, so every field falls back individually rather than the record
 * being replaced wholesale.
 */
export const getRestaurant = cache(async (): Promise<RestaurantData> => {
  if (!isSupabaseConfigured) return staticRestaurant;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase
      .from("business_info")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return staticRestaurant;

    return {
      ...staticRestaurant,
      name: data.name || staticRestaurant.name,
      legalName: data.legal_name || staticRestaurant.legalName,
      tagline: data.tagline || staticRestaurant.tagline,
      streetAddress: data.street || staticRestaurant.streetAddress,
      city: data.city || staticRestaurant.city,
      country: data.country || staticRestaurant.country,
      plusCode: data.plus_code || staticRestaurant.plusCode,
      email: data.email || staticRestaurant.email,
      website: data.website || staticRestaurant.website,
      directionsUrl: data.directions_url || staticRestaurant.directionsUrl,
      phone: data.phone
        ? { display: formatPhone(data.phone), e164: data.phone }
        : staticRestaurant.phone,
      whatsapp: data.whatsapp
        ? {
            display: formatPhone(data.whatsapp),
            e164: data.whatsapp,
            href: `https://wa.me/${data.whatsapp.replace(/[^\d]/g, "")}`,
          }
        : staticRestaurant.whatsapp,
    };
  } catch {
    return staticRestaurant;
  }
});

/** "+250794317286" -> "+250 794 317 286". */
function formatPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("250")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return e164;
}

/* -------------------------------------------------------------------------- */
/* Hero media                                                                 */
/* -------------------------------------------------------------------------- */

export type HeroVideoContent = Readonly<{
  videoUrl: string;
  posterUrl: string | null;
  title: string | null;
  subtitle: string | null;
}>;

/**
 * The active hero video, or null to fall back to the frame-sequence hero.
 *
 * Returns null unless there is genuinely something to play: an active row, a
 * video URL on it, and the global switch on. A hero that renders an empty
 * <video> is worse than no video at all.
 */
export const getHeroVideo = cache(async (): Promise<HeroVideoContent | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");

    const [settings, hero] = await Promise.all([
      supabase.from("site_settings").select("hero_video_enabled").eq("id", 1).maybeSingle(),
      supabase
        .from("hero_media")
        .select("*")
        .eq("is_active", true)
        .maybeSingle<HeroMediaRow>(),
    ]);

    if (settings.data && settings.data.hero_video_enabled === false) return null;
    if (hero.error || !hero.data?.video_url) return null;

    return {
      videoUrl: hero.data.video_url,
      posterUrl: hero.data.poster_url,
      title: hero.data.title,
      subtitle: hero.data.subtitle,
    };
  } catch {
    return null;
  }
});

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

async function selectAll<T>(
  table: "experiences" | "gallery_items" | "offers" | "testimonials" | "social_links",
): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase.from(table).select("*").order("sort_order");
    if (error || !data) return [];
    return data as T[];
  } catch {
    return [];
  }
}

export const getExperiences = cache(() => selectAll<ExperienceRow>("experiences"));
export const getGalleryItems = cache(() => selectAll<GalleryItemRow>("gallery_items"));
export const getOffers = cache(() => selectAll<OfferRow>("offers"));
export const getTestimonials = cache(() => selectAll<TestimonialRow>("testimonials"));

/**
 * The homepage showcase: published AND featured, in display order, capped.
 *
 * RLS already limits the public client to published rows — the extra
 * `.eq("published", true)` documents the contract and keeps the query honest
 * even if the policy ever changes shape. Kept separate from `selectAll` so
 * the homepage never pulls the whole collection's metadata, let alone images.
 */
export const getFeaturedGallery = cache(async (limit: number): Promise<GalleryItemRow[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createSupabasePublicClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("gallery_items")
      .select("*")
      .eq("published", true)
      .eq("featured", true)
      .order("sort_order")
      .limit(limit);
    return (data ?? []) as GalleryItemRow[];
  } catch {
    return [];
  }
});

/* -------------------------------------------------------------------------- */
/* Floating WhatsApp button                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The floating WhatsApp button's configuration — a GLOBAL conversion element,
 * so it is content: the number comes from business_info (editable under
 * Business → Business info), and the on/off switch plus the pre-filled
 * message come from site_settings (editable on the same page).
 *
 * Everything degrades to sane defaults: no database, or the row missing,
 * means the button still appears with the verified number and the standard
 * greeting. `null` means "do not render it at all" (switched off, or no
 * number anywhere).
 */
export type WhatsAppFloating = Readonly<{
  /** Full wa.me deep link, message included when one is set. */
  href: string;
  message: string;
}>;

const WHATSAPP_DEFAULT_MESSAGE = "Hello Traveling Roots, I'd like to make an enquiry.";

export const getWhatsAppFloating = cache(async (): Promise<WhatsAppFloating | null> => {
  const restaurant = await getRestaurant();
  if (!restaurant.whatsapp) return null;

  const digits = restaurant.whatsapp.e164.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;

  let enabled = true;
  let message = WHATSAPP_DEFAULT_MESSAGE;

  if (isSupabaseConfigured) {
    try {
      const supabase = createSupabasePublicClient();
      if (supabase) {
        const { data } = await supabase
          .from("site_settings")
          .select("whatsapp_floating_enabled, whatsapp_default_message")
          .eq("id", 1)
          .maybeSingle();

        if (data) {
          enabled = data.whatsapp_floating_enabled;
          if (typeof data.whatsapp_default_message === "string"
            && data.whatsapp_default_message.trim().length > 0) {
            message = data.whatsapp_default_message;
          }
        }
      }
    } catch {
      /* The button is an enhancement; the verified defaults stand. */
    }
  }

  if (!enabled) return null;

  return {
    href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
    message,
  };
});

/** Social links, falling back to the verified ones in data/restaurant.ts. */
export const getSocialLinks = cache(async () => {
  const rows = await selectAll<SocialLinkRow>("social_links");
  if (rows.length === 0) return staticRestaurant.socials;
  return rows.map((row) => ({
    platform: row.platform,
    label: row.label,
    href: row.url,
  }));
});
