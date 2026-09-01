/**
 * Database types.
 *
 * Hand-written to match supabase/migrations/*.sql. They can be regenerated
 * with the Supabase CLI once a project exists:
 *
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * Until then these are the contract, and `npm run db:test` proves the SQL
 * matches them.
 */

export type DietaryTag = "Vegan" | "Gluten-free";

export type MenuVariantRow = Readonly<{ label: string; price: number | null }>;

export type OpeningHourRow = Readonly<{
  day: string;
  opens: string;
  closes: string;
}>;

export type SiteSettingsRow = {
  id: number;
  site_title: string;
  meta_description: string;
  canonical_url: string | null;
  hero_video_enabled: boolean;
  maintenance_mode: boolean;
  whatsapp_floating_enabled: boolean;
  whatsapp_default_message: string | null;
  updated_at: string;
};

export type BusinessInfoRow = {
  id: number;
  name: string;
  legal_name: string | null;
  tagline: string | null;
  street: string | null;
  city: string | null;
  country: string | null;
  plus_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  directions_url: string | null;
  website: string | null;
  opening_hours: OpeningHourRow[];
  updated_at: string;
};

export type HeroMediaRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  video_url: string | null;
  poster_url: string | null;
  video_path: string | null;
  poster_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuCategoryRow = {
  id: string;
  slug: string;
  name: string;
  intro: string | null;
  sort_order: number;
  published: boolean;
};

export type MenuSectionRow = {
  id: string;
  category_id: string;
  title: string | null;
  note: string | null;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  image_path: string | null;
  dietary: DietaryTag[];
  variants: MenuVariantRow[];
  availability_note: string | null;
  available: boolean;
  sort_order: number;
};

export type ExperienceRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  price: number | null;
  duration: string | null;
  active: boolean;
  sort_order: number;
};

export type GalleryItemRow = {
  id: string;
  image_url: string;
  image_path: string | null;
  caption: string | null;
  alt_text: string;
  published: boolean;
  sort_order: number;
};

export type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  sort_order: number;
};

export type TestimonialRow = {
  id: string;
  author: string;
  quote: string;
  source: string | null;
  rating: number | null;
  published: boolean;
  sort_order: number;
};

export type SocialLinkRow = {
  id: string;
  platform: string;
  label: string;
  url: string;
  active: boolean;
  sort_order: number;
};

export type ReservationStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "declined"
  | "archived";

export type ReservationRequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  party_size: number;
  preferred_at: string;
  notes: string | null;
  status: ReservationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "editor";
  created_at: string;
};

export type PickupOrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

/**
 * A line as STORED on an order: the database resolves every line against the
 * live menu and snapshots the price, so an order is immune to later menu
 * edits and to whatever numbers the client sent.
 */
export type PickupOrderLine = Readonly<{
  menu_item_id: string;
  name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
}>;

/** A line as SUBMITTED by a guest: no price, the database does not read it. */
export type PickupOrderDraftLine = Readonly<{
  menu_item_id: string;
  quantity: number;
  variant_label?: string;
}>;

export type PickupOrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  note: string | null;
  pickup_at: string | null;
  items: PickupOrderLine[];
  total: number;
  status: PickupOrderStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Shape consumed by `createClient<Database>()`. */
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: AdminUserRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Partial<SiteSettingsRow>;
        Update: Partial<SiteSettingsRow>;
        Relationships: [];
      };
      business_info: {
        Row: BusinessInfoRow;
        Insert: Partial<BusinessInfoRow>;
        Update: Partial<BusinessInfoRow>;
        Relationships: [];
      };
      hero_media: {
        Row: HeroMediaRow;
        Insert: Partial<HeroMediaRow>;
        Update: Partial<HeroMediaRow>;
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategoryRow;
        Insert: Partial<MenuCategoryRow>;
        Update: Partial<MenuCategoryRow>;
        Relationships: [];
      };
      menu_sections: {
        Row: MenuSectionRow;
        Insert: Partial<MenuSectionRow>;
        Update: Partial<MenuSectionRow>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItemRow;
        Insert: Partial<MenuItemRow>;
        Update: Partial<MenuItemRow>;
        Relationships: [];
      };
      experiences: {
        Row: ExperienceRow;
        Insert: Partial<ExperienceRow>;
        Update: Partial<ExperienceRow>;
        Relationships: [];
      };
      gallery_items: {
        Row: GalleryItemRow;
        Insert: Partial<GalleryItemRow>;
        Update: Partial<GalleryItemRow>;
        Relationships: [];
      };
      offers: {
        Row: OfferRow;
        Insert: Partial<OfferRow>;
        Update: Partial<OfferRow>;
        Relationships: [];
      };
      testimonials: {
        Row: TestimonialRow;
        Insert: Partial<TestimonialRow>;
        Update: Partial<TestimonialRow>;
        Relationships: [];
      };
      social_links: {
        Row: SocialLinkRow;
        Insert: Partial<SocialLinkRow>;
        Update: Partial<SocialLinkRow>;
        Relationships: [];
      };
      reservation_requests: {
        Row: ReservationRequestRow;
        Insert: Pick<
          ReservationRequestRow,
          "name" | "phone" | "party_size" | "preferred_at"
        > &
          Partial<Pick<ReservationRequestRow, "email" | "notes">>;
        Update: Partial<ReservationRequestRow>;
        Relationships: [];
      };
      pickup_orders: {
        Row: PickupOrderRow;
        Insert: Pick<PickupOrderRow, "customer_name" | "phone"> &
          Partial<Pick<PickupOrderRow, "note" | "pickup_at">> & {
            items: readonly PickupOrderDraftLine[];
          };
        Update: Partial<PickupOrderRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
