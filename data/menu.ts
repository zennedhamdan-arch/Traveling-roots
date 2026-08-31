/**
 * TRAVELING ROOTS — menu data.
 *
 * ============================================================================
 *  HOW TO INSERT THE REAL MENU
 * ============================================================================
 *  1. Set `MENU_STATUS.isPlaceholder` to `false`.
 *  2. Replace the `menu` array below with the real categories and items.
 *  3. Drop dish photography into `public/images/food/` and reference it as
 *     `/images/food/<file>.webp`. Omit `image` entirely if there is no photo —
 *     the card falls back to an elegant typographic tile, it does not break.
 *  4. Run `npm run typecheck`. The types below will catch any malformed row.
 *
 *  NOTHING HERE IS INVENTED AS FACT. While `isPlaceholder` is true the UI
 *  renders a visible "sample layout" notice and hides all prices, so no
 *  fabricated dish or price is ever presented to a visitor as real.
 * ============================================================================
 */

/** Dietary badges. Extend the union rather than passing loose strings. */
export type DietaryTag =
  | "Vegan"
  | "Vegetarian"
  | "Gluten-free"
  | "Contains nuts"
  | "Spicy";

export type MenuItem = Readonly<{
  /** Stable id — used as a React key and as an anchor target. */
  id: string;
  name: string;
  description: string;
  /**
   * Price as a display string including currency, e.g. "RWF 8,500".
   * `null` = price not published / not yet supplied. The UI shows nothing
   * rather than a fake number.
   */
  price: string | null;
  /** Path under /public, e.g. "/images/food/veggie-burger.webp". */
  image?: string;
  /** Only include tags that are actually confirmed by the restaurant. */
  dietary?: readonly DietaryTag[];
  /** Optional flag for a house speciality — renders a subtle marker. */
  signature?: boolean;
  /** Optional availability note, e.g. "Thursday – Saturday". */
  availability?: string;
}>;

export type MenuCategoryData = Readonly<{
  /** Stable id — used for tab state, anchors and `aria-controls`. */
  id: string;
  category: string;
  /** One short editorial line under the category heading. Optional. */
  intro?: string;
  items: readonly MenuItem[];
}>;

export const MENU_STATUS = {
  /**
   * TRUE  → sample layout, prices hidden, notice shown.
   * FALSE → real data, prices shown, notice hidden.
   */
  isPlaceholder: true,
  /** Shown to visitors while `isPlaceholder` is true. */
  notice:
    "Menu layout preview — the full Traveling Roots menu is being added. Please call or message us for today's dishes.",
} as const;

/**
 * Category shells reflect the kinds of food Traveling Roots is publicly known
 * for. The individual rows are LAYOUT PLACEHOLDERS and carry no prices.
 */
export const menu: readonly MenuCategoryData[] = [
  {
    id: "from-the-garden",
    category: "From the Garden",
    intro: "Picked from our own chef's garden.",
    items: [
      {
        id: "garden-1",
        name: "Garden Starter",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
        dietary: ["Vegan"],
      },
      {
        id: "garden-2",
        name: "Seasonal Salad",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
        dietary: ["Vegetarian"],
      },
      {
        id: "garden-3",
        name: "Soup of the Day",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
    ],
  },
  {
    id: "small-plates",
    category: "Small Plates",
    intro: "Made to share, or not.",
    items: [
      {
        id: "small-1",
        name: "Small Plate",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
      {
        id: "small-2",
        name: "Small Plate",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
    ],
  },
  {
    id: "main-courses",
    category: "Main Courses",
    intro: "The heart of the kitchen.",
    items: [
      {
        id: "main-1",
        name: "Main Course",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
        signature: true,
      },
      {
        id: "main-2",
        name: "Main Course",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
      {
        id: "main-3",
        name: "Main Course",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
        dietary: ["Vegan"],
      },
      {
        id: "main-4",
        name: "Main Course",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
    ],
  },
  {
    id: "from-the-bakery",
    category: "From the Bakery",
    intro: "Baked in-house, every day.",
    items: [
      {
        id: "bakery-1",
        name: "Bakery Item",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
      {
        id: "bakery-2",
        name: "Bakery Item",
        description: "Placeholder row — awaiting the official dish description.",
        price: null,
      },
    ],
  },
  {
    id: "drinks",
    category: "Drinks",
    intro: "Fresh juices, coffee, and the bar.",
    items: [
      {
        id: "drink-1",
        name: "Fresh Juice",
        description: "Placeholder row — awaiting the official drink description.",
        price: null,
      },
      {
        id: "drink-2",
        name: "Coffee",
        description: "Placeholder row — awaiting the official drink description.",
        price: null,
      },
      {
        id: "drink-3",
        name: "From the Bar",
        description: "Placeholder row — awaiting the official drink description.",
        price: null,
      },
    ],
  },
];

/** All dietary tags actually present in the data — drives the legend. */
export const dietaryLegend: readonly DietaryTag[] = Array.from(
  new Set(menu.flatMap((c) => c.items.flatMap((i) => i.dietary ?? []))),
);
