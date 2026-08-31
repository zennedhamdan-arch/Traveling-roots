/**
 * TRAVELING ROOTS — menu data.
 *
 * ============================================================================
 *  SOURCE
 * ============================================================================
 *  Transcribed verbatim from the official 4-page Traveling Roots menu
 *  (the Canva menu, supplied by the restaurant, August 2026).
 *
 *  Nothing here is invented. Dish names, descriptions, prices and dietary
 *  marks all come from that document.
 *
 *  PRICES: the printed menu writes thousands as "6K" and the coffee list
 *  writes the same amounts long-hand as "2000rwf". Both are Rwandan francs,
 *  so "6K" is rendered here as "6,000 RWF" for clarity. No amount has been
 *  converted, rounded or altered.
 *
 *  TYPOS: obvious typography slips in the source ("CABAGE", "BEFF",
 *  "PINAPPLE", "TALAPIA") are corrected here for the website. Dish names are
 *  otherwise left exactly as printed, including house names like "Winnaz
 *  Chicken", "Orky Porky" and "Hard Tac".
 *
 *  ⚠ DIETARY MARKS — PLEASE CONFIRM
 *  The printed menu marks dishes with two small badges: vegan and gluten-free.
 *  They are transcribed below as read from the artwork, and every one is
 *  consistent with the dish's own listed ingredients. Even so, dietary
 *  information is safety-relevant: please have the kitchen check this list
 *  once before the site goes live.
 * ============================================================================
 *
 *  TO EDIT: change the data below. The UI adapts on its own — a category
 *  whose items have photos renders as a card grid, one without renders as an
 *  editorial price list.
 */

/** Dietary badges. Extend the union rather than passing loose strings. */
export type DietaryTag = "Vegan" | "Gluten-free";

/** A priced option within a single dish, e.g. portion sizes. */
export type MenuVariant = Readonly<{
  label: string;
  price: string;
}>;

export type MenuItem = Readonly<{
  /** Stable id — used as a React key and as an anchor target. */
  id: string;
  name: string;
  /** Omit when the printed menu gives no description. */
  description?: string;
  /**
   * Display price including currency, e.g. "9,500 RWF".
   * `null` when the dish is priced by variant instead.
   */
  price: string | null;
  /** Portion or option pricing, e.g. 400g / 500g / 1kg. */
  variants?: readonly MenuVariant[];
  /** Path under /public, e.g. "/images/food/veggie-burger.webp". */
  image?: string;
  dietary?: readonly DietaryTag[];
  /** Availability note, e.g. "Ask if available". */
  availability?: string;
}>;

/** A group of items inside a category. Most categories have exactly one. */
export type MenuSection = Readonly<{
  id: string;
  /** Only set on categories that hold several groups, e.g. Drinks. */
  title?: string;
  /** A note that applies to the whole group, e.g. "Served with chips". */
  note?: string;
  items: readonly MenuItem[];
}>;

export type MenuCategoryData = Readonly<{
  /** Stable id — used for tab state, anchors and `aria-controls`. */
  id: string;
  category: string;
  /** Short line under the category heading. Only from the printed menu. */
  intro?: string;
  sections: readonly MenuSection[];
}>;

export const MENU_STATUS = {
  /** The real menu is in. Prices are shown and no notice is rendered. */
  isPlaceholder: false,
  notice: "",
} as const;

/** Shorthands, so the tables below stay readable. */
const V: readonly DietaryTag[] = ["Vegan"];
const GF: readonly DietaryTag[] = ["Gluten-free"];
const VGF: readonly DietaryTag[] = ["Vegan", "Gluten-free"];

/** Wraps a flat item list as a category's single, untitled section. */
function one(id: string, items: readonly MenuItem[]): readonly MenuSection[] {
  return [{ id, items }];
}

export const menu: readonly MenuCategoryData[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "starters",
    category: "Starters",
    sections: one("starters-main", [
      { id: "soup-of-the-day", name: "Soup of the Day", price: "6,000 RWF", dietary: GF },
      { id: "crumbed-mushrooms", name: "Crumbed Mushrooms", price: "6,000 RWF", dietary: V },
      { id: "hummus-flatbread", name: "Hummus & Flatbread", price: "6,000 RWF", dietary: V },
      { id: "mezze-plate", name: "Mezze Plate", price: "8,000 RWF", dietary: V },
      {
        id: "spring-rolls",
        name: "Spring Rolls (3 large)",
        description: "Veg or savoury.",
        price: "7,000 RWF",
        dietary: V,
      },
      {
        id: "samoosas",
        name: "Samoosas (3 large)",
        description: "Veg or savoury.",
        price: "7,000 RWF",
      },
      { id: "bean-pate-flatbread", name: "Bean Paté & Flatbread", price: "3,500 RWF", dietary: V },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "tapas",
    category: "Tapas",
    sections: one("tapas-main", [
      {
        id: "tacos",
        name: "Tacos",
        description:
          "Crispy chicken, Mexicana or slow-cooked beef — served with salsa, guacamole and a side cabbage salad.",
        price: "9,500 RWF",
      },
      {
        id: "chicken-wings",
        name: "Chicken Wings",
        description: "3 chicken wings served with a side of potato chips.",
        price: "7,000 RWF",
        dietary: GF,
      },
      {
        id: "cheese-board",
        name: "Cheese Board",
        description:
          "3x cheeses, caramelized onions, olives, pickled peppers, 3 slices salami, smoked salmon, homemade crackers.",
        price: "18,000 RWF",
      },
      {
        id: "potato-stuffed-spud",
        name: "Potato Stuffed Spud",
        description:
          "2x stuffed potatoes — stuffed with peppers, onion, garlic, cheese. Optional bacon bits at 1,500 RWF.",
        price: "6,500 RWF",
        dietary: VGF,
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "light-mains",
    category: "Light Mains",
    sections: one("light-mains-main", [
      {
        id: "beef-kofta",
        name: "Beef Kofta",
        description: "2x beef koftas served with tzatziki, ciabatta & garden salad.",
        price: "9,000 RWF",
      },
      {
        id: "tortilla-quesadilla",
        name: "Tortilla / Quesadilla",
        description:
          "Crispy chicken, veggie or tuna, served with a side of chips. Please let us know if you'd like something left out.",
        price: "10,000 RWF",
        dietary: V,
      },
      {
        id: "chicken-salad",
        name: "Chicken Salad",
        description: "Lettuce, cucumber, tomato, avocado, pickled cabbage, chicken pieces.",
        price: "9,500 RWF",
        dietary: GF,
      },
      {
        id: "afri-fused-fish-dish",
        name: "Afri-Fused Fish Dish",
        description:
          "Tilapia fillet steamed in banana leaves, served on ku wunga & isombe.",
        price: "13,000 RWF",
        dietary: GF,
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "heavy-mains",
    category: "Heavy Mains",
    sections: one("heavy-mains-main", [
      {
        id: "chicken-schnitzel",
        name: "Chicken Schnitzel",
        description:
          "Crumbed chicken fillet topped with cheese & mushroom sauce, served with roasted veg & potato wedges.",
        price: "14,000 RWF",
      },
      {
        id: "beef-stew",
        name: "Beef Stew",
        description: "Beef stew with veg, served with rice or ku wunga.",
        price: "10,000 RWF",
        dietary: GF,
      },
      {
        id: "brochette-meal",
        name: "Brochette Meal",
        description:
          "2x chicken, beef, goat or fish brochette served with chips and side salad.",
        price: "10,000 RWF",
        dietary: GF,
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "smoked",
    category: "Smoked",
    sections: one("smoked-main", [
      {
        id: "pork-ribs",
        name: "Pork Ribs",
        price: null,
        availability: "Ask if available",
        dietary: GF,
        variants: [
          { label: "400g", price: "13,500 RWF" },
          { label: "500g", price: "16,500 RWF" },
          { label: "1kg", price: "26,500 RWF" },
        ],
      },
      {
        id: "chicken-drumsticks",
        name: "Chicken Drumsticks",
        description: "Served with chips and salad.",
        price: null,
        availability: "Ask if available",
        dietary: GF,
        variants: [
          { label: "2x drumsticks", price: "8,000 RWF" },
          { label: "4x drumsticks", price: "14,000 RWF" },
          { label: "6x drumsticks", price: "21,000 RWF" },
        ],
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "burgers",
    category: "Burgers",
    sections: one("burgers-main", [
      {
        id: "winnaz-chicken",
        name: "Winnaz Chicken",
        description:
          "Crunchy Winnaz-coated chicken, mushroom sauce, caramelized onion, served with chips.",
        price: "10,000 RWF",
      },
      {
        id: "smash-beef",
        name: "Smash Beef",
        description: "Pure beef patty, lettuce, caramelized onion, tomato, cheese sauce.",
        price: "10,000 RWF",
      },
      {
        id: "veggie-burger",
        name: "Veggie",
        description: "Veggie or tofu patty, lettuce, cabbage, tomato, burger sauce.",
        price: "10,000 RWF",
        dietary: V,
      },
      {
        id: "chicken-kebab-burger",
        name: "Chicken Kebab",
        description: "Marinated chicken patty, cheese, tomato, cabbage, burger sauce.",
        price: "10,000 RWF",
      },
      {
        id: "de-lux",
        name: "De-Lux",
        description:
          "2x beef, chicken or veggie patties, caramelized onion, bacon, grilled pineapple or pickled cabbage, cheese, mushroom sauce or cheese sauce.",
        price: "12,000 RWF",
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "pizza",
    category: "Pizza",
    intro: "All pizzas made with mozzarella.",
    sections: one("pizza-main", [
      {
        id: "orky-porky",
        name: "Orky Porky",
        description: "Smoked pork pieces, caramelized onions, garlic, peppers, mushrooms.",
        price: "12,000 RWF",
      },
      {
        id: "mexicana-pizza",
        name: "Mexicana",
        description: "Spiced beef, onions, garlic, peppers, served with guacamole.",
        price: "13,000 RWF",
      },
      {
        id: "veggie-delight",
        name: "Veggie Delight",
        description: "Mushrooms, onions, peppers, tomato, garlic, olives.",
        price: "11,500 RWF",
      },
      {
        id: "tastebud-supreme",
        name: "Tastebud Supreme",
        description: "Salami, blue cheese, sweet secret.",
        price: "14,000 RWF",
      },
      {
        id: "margherita",
        name: "Margherita",
        description: "Tomato basting, mozzarella & basil.",
        price: "9,500 RWF",
      },
      {
        id: "hawaiian",
        name: "Hawaiian",
        description: "Chicken or ham, pineapple.",
        price: "11,500 RWF",
      },
      {
        id: "creamy-chicken",
        name: "Creamy Chicken",
        description: "Creamy chicken and mushroom, onion, garlic.",
        price: "12,000 RWF",
      },
      {
        id: "the-godfather",
        name: "The Godfather",
        description: "Meaty bolognaise, pecorino cheese shavings, basil pesto.",
        price: "14,000 RWF",
      },
      {
        id: "fully-loaded",
        name: "Fully Loaded",
        description:
          "Pepperoni, chicken, olives, peppers, caramelized onions, sliced jalapeño.",
        price: "14,000 RWF",
      },
      {
        id: "julan",
        name: "Julan",
        description: "Olives, garlic, basil pesto, onion, parmesan.",
        price: "13,500 RWF",
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "sides",
    category: "Sides",
    sections: one("sides-main", [
      { id: "avocado-salad", name: "Avocado Salad", price: "5,000 RWF", dietary: VGF },
      { id: "cabbage-salad", name: "Cabbage Salad", price: "5,000 RWF", dietary: VGF },
      {
        id: "mushroom-cheese-sauce",
        name: "Mushroom / Cheese Sauce",
        price: "4,000 RWF",
        dietary: GF,
      },
      {
        id: "zucchini-eggplant-fries",
        name: "Zucchini / Eggplant Fries",
        price: "2,500 RWF",
        dietary: V,
      },
      { id: "chips-side", name: "Chips", price: "3,000 RWF", dietary: VGF },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "kids-corner",
    category: "Kids Corner",
    sections: one("kids-main", [
      { id: "chicken-nuggets", name: "Chicken Nuggets", price: "5,000 RWF" },
      { id: "chips-kids", name: "Chips", price: "2,500 RWF", dietary: VGF },
      { id: "mini-ham-pizza", name: "Mini Ham Pizza", price: "6,500 RWF" },
      { id: "mini-margherita-pizza", name: "Mini Margherita Pizza", price: "5,500 RWF" },
      { id: "mini-burger", name: "Mini Burger", price: "5,000 RWF" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "desserts",
    category: "Desserts",
    sections: one("desserts-main", [
      {
        id: "ice-cream",
        name: "Ice Cream & Chocolate Sauce",
        description: "3 scoops.",
        price: "5,000 RWF",
      },
      { id: "fruit-plate", name: "Fruit Plate", price: "4,000 RWF" },
      {
        id: "crepe",
        name: "Crêpe",
        price: null,
        variants: [
          { label: "Lemon syrup", price: "4,500 RWF" },
          { label: "Nutella", price: "6,000 RWF" },
          { label: "Banana & honey", price: "6,000 RWF" },
        ],
      },
    ]),
  },

  /* ------------------------------------------------------------------ */
  {
    id: "drinks",
    category: "Drinks",
    sections: [
      {
        id: "tea",
        title: "Tea",
        items: [
          { id: "spice-tea", name: "Spice Tea", price: "3,000 RWF" },
          { id: "ginger-tea", name: "Ginger Tea", price: "3,000 RWF" },
          { id: "african-tea", name: "African Tea", price: "4,000 RWF" },
          {
            id: "english-breakfast-earl-grey",
            name: "English Breakfast / Earl Grey",
            price: "3,000 RWF",
          },
          { id: "mint-tea", name: "Mint", price: "3,000 RWF" },
        ],
      },
      {
        id: "coffee",
        title: "Coffee",
        items: [
          { id: "espresso", name: "Espresso", price: "2,000 RWF" },
          { id: "americano", name: "Americano", price: "3,000 RWF" },
          { id: "cafe-latte", name: "Café Latte", price: "5,000 RWF" },
          { id: "cappuccino", name: "Cappuccino", price: "4,000 RWF" },
          { id: "hot-chocolate", name: "Hot Chocolate", price: "5,000 RWF" },
        ],
      },
      {
        id: "soft-drinks",
        title: "Soft Drinks",
        items: [
          {
            id: "sodas",
            name: "Sodas",
            description: "Coca-Cola, Fantas.",
            price: "2,000 RWF",
          },
          {
            id: "water",
            name: "Water",
            description: "Still or sparkling.",
            price: "2,000 RWF",
          },
          {
            id: "juices",
            name: "Juices",
            price: null,
            variants: [
              { label: "From box", price: "2,500 RWF" },
              { label: "Fresh juices", price: "4,500 RWF" },
            ],
          },
        ],
      },
      {
        id: "mocktails",
        title: "Mocktails",
        items: [
          {
            id: "minted-lemonade",
            name: "Minted Lemonade / Virgin Mojito",
            price: "6,500 RWF",
          },
          { id: "coconut-lemonade", name: "Coconut Lemonade", price: "8,000 RWF" },
          { id: "iced-tea-sparkler", name: "Iced Tea Sparkler", price: "6,500 RWF" },
          {
            id: "virgin-tomato-cocktail",
            name: "Virgin Tomato Cocktail",
            price: "7,000 RWF",
          },
        ],
      },
      {
        id: "cocktails",
        title: "Cocktails",
        items: [
          { id: "african-og", name: "African OG", price: "6,000 RWF" },
          { id: "aperol-spritzer", name: "Aperol Spritzer", price: "8,000 RWF" },
          { id: "margarita", name: "Margarita", price: "7,000 RWF" },
          { id: "long-island", name: "Long Island", price: "8,000 RWF" },
          { id: "mojito", name: "Mojito", price: "8,000 RWF" },
          { id: "moscow-mule", name: "Moscow Mule", price: "8,000 RWF" },
          { id: "pina-colada", name: "Piña Colada", price: "8,000 RWF" },
        ],
      },
      {
        id: "ciders",
        title: "Ciders",
        items: [
          { id: "panache", name: "Panache", price: "2,000 RWF" },
          { id: "smirnoff-ice", name: "Smirnoff Ice", price: "4,000 RWF" },
          { id: "smirnoff-guarana", name: "Smirnoff Guarana", price: "4,000 RWF" },
          { id: "savana", name: "Savana", price: "5,500 RWF" },
        ],
      },
      {
        id: "beers",
        title: "Beers",
        items: [
          { id: "mutzig", name: "Mutzig", price: "2,000 RWF" },
          { id: "virunga", name: "Virunga", price: "2,000 RWF" },
          { id: "skol", name: "Skol", price: "2,000 RWF" },
          { id: "heineken", name: "Heineken", price: "3,000 RWF" },
          { id: "amstel", name: "Amstel", price: "3,000 RWF" },
        ],
      },
      {
        id: "hard-tac",
        title: "Hard Tac",
        items: [
          { id: "vodka", name: "Vodka", price: "3,000 RWF" },
          { id: "gin", name: "Gin", price: "3,000 RWF" },
          { id: "bicardi", name: "Bicardi", price: "3,500 RWF" },
          { id: "konyagi", name: "Konyagi", description: "25ml shot.", price: "2,000 RWF" },
          { id: "capt-morgan-dark", name: "Capt. Morgan Dark", price: "4,500 RWF" },
          { id: "southern-comfort", name: "Southern Comfort", price: "4,500 RWF" },
          { id: "jameson", name: "Jameson", price: "4,000 RWF" },
          { id: "kwv-brandy", name: "KWV Brandy", price: "3,500 RWF" },
          { id: "malibu", name: "Malibu", price: "3,500 RWF" },
          { id: "tequila", name: "Tequila", price: "3,500 RWF" },
        ],
      },
      {
        id: "wine",
        title: "Wine",
        items: [
          {
            id: "wine-service",
            name: "Wine",
            price: null,
            variants: [
              { label: "Per glass", price: "7,500 RWF" },
              { label: "Per bottle — white", price: "30,000 RWF" },
              { label: "Per bottle — red", price: "35,000 RWF" },
            ],
          },
        ],
      },
    ],
  },
];

/** Every item across every category and section. */
export const allMenuItems: readonly MenuItem[] = menu.flatMap((c) =>
  c.sections.flatMap((s) => s.items),
);

/** All dietary tags actually present in the data — drives the legend. */
export const dietaryLegend: readonly DietaryTag[] = Array.from(
  new Set(allMenuItems.flatMap((i) => i.dietary ?? [])),
);
