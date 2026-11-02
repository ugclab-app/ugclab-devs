import { reidBlocks, type HomeBlock } from "@ugclab/tenant/store-theme";
import type { StoreThemePreset, ThemeLayoutPreview } from "./store-themes";

type PackSpec = {
  id: string;
  label: string;
  description: string;
  category: StoreThemePreset["category"];
  layout: Exclude<ThemeLayoutPreview, "default">;
  primary: string;
  secondary: string;
  background: string;
  font: "serif" | "sans" | "display" | "helvetica";
  button: "square" | "pill" | "rounded";
  hero: string;
  subtitle: string;
  heroImage: string;
  galleryUrls?: string[];
  storyImage?: string;
  announcement?: string;
};

const FONT = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Plus Jakarta Sans", system-ui, sans-serif',
  display: '"Space Grotesk", system-ui, sans-serif',
  helvetica: '"Helvetica Neue", Arial, sans-serif',
} as const;

const U = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

function blocks(def: Omit<HomeBlock, "id">[]): HomeBlock[] {
  return reidBlocks(
    def.map((block) => ({
      ...block,
      id: `tpl_${Math.random().toString(36).slice(2, 9)}`,
    }))
  );
}

function homeFor(spec: PackSpec): HomeBlock[] {
  const hero: Omit<HomeBlock, "id"> = {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: spec.hero,
    subtitle: spec.subtitle,
    imageUrl: spec.heroImage,
    ctaLabel: "Shop now",
    ctaPath: "/collections",
  };
  const products: Omit<HomeBlock, "id"> = {
    type: "products",
    title: "Shop",
    paddingY: "lg",
  };
  const story: Omit<HomeBlock, "id"> = {
    type: "image_text",
    title: spec.label,
    subtitle: spec.subtitle,
    imageUrl: spec.storyImage ?? spec.heroImage,
    imagePosition: "right",
    paddingY: "lg",
  };
  const gallery: Omit<HomeBlock, "id"> | null = spec.galleryUrls?.length
    ? {
        type: "gallery",
        title: "Lookbook",
        galleryUrls: spec.galleryUrls,
        paddingY: "md",
      }
    : null;

  if (spec.layout === "editorial" || spec.layout === "luxury") {
    return blocks([
      hero,
      ...(gallery ? [gallery] : [{ type: "gallery" as const, title: "Lookbook", paddingY: "md" as const }]),
      { type: "new_arrivals", title: "New arrivals", paddingY: "lg" },
      products,
      story,
      {
        type: "newsletter",
        title: "The list",
        subtitle: "First look at new drops.",
        paddingY: "lg",
        bgColor: spec.background,
      },
    ]);
  }
  if (spec.layout === "beauty") {
    return blocks([
      hero,
      {
        type: "features",
        title: "The ritual",
        features: [
          { title: "Clean", text: "Short ingredient lists." },
          { title: "Daily", text: "Made for the morning shelf." },
          { title: "Refill", text: "Come back for the set." },
        ],
      },
      { type: "featured_collection", title: "Bestsellers", collectionSlug: "", paddingY: "lg" },
      products,
      story,
      { type: "reviews", title: "Notes", paddingY: "md" },
    ]);
  }
  if (spec.layout === "food") {
    return blocks([
      hero,
      {
        type: "features",
        title: "From the kitchen",
        features: [
          { title: "Crafted", text: "Small batches, real materials." },
          { title: "Everyday", text: "Pieces you reach for first." },
          { title: "Gift-ready", text: "Sets that ship well." },
        ],
      },
      products,
      ...(gallery ? [gallery] : []),
      story,
      { type: "reviews", title: "Regulars", paddingY: "md" },
    ]);
  }
  if (spec.layout === "sports") {
    return blocks([
      hero,
      {
        type: "features",
        title: "Built outside",
        features: [
          { title: "Weather", text: "Layers that hold up." },
          { title: "Packable", text: "Stows when you need room." },
          { title: "Trail-ready", text: "From trailhead to town." },
        ],
      },
      { type: "sale", title: "Trail edit", paddingY: "md" },
      products,
      ...(gallery ? [gallery] : []),
      {
        type: "cta",
        title: "Free shipping over $100",
        ctaLabel: "Shop gear",
        ctaPath: "/collections",
        bgColor: spec.primary,
        textColor: "#fff",
        align: "center",
      },
    ]);
  }
  if (spec.layout === "bold") {
    return blocks([
      hero,
      { type: "sale", title: "This week", paddingY: "md" },
      products,
      ...(gallery ? [gallery] : [{ type: "gallery" as const, title: "Campaign", paddingY: "md" as const }]),
      {
        type: "cta",
        title: spec.announcement ?? "New drop",
        ctaLabel: "Shop the drop",
        ctaPath: "/collections",
        bgColor: spec.primary,
        textColor: "#fff",
        align: "center",
      },
    ]);
  }
  // catalog default
  return blocks([
    hero,
    {
      type: "columns",
      title: "Shop by edit",
      columnCount: 3,
      columns: [
        { title: "New", text: "Just in." },
        { title: "Core", text: "The pieces that stay." },
        { title: "Gifts", text: "Ready to wrap." },
      ],
    },
    { type: "featured_collection", title: "Featured", collectionSlug: "", paddingY: "lg" },
    products,
    story,
  ]);
}

const SPECS: PackSpec[] = [
  {
    id: "verdant",
    label: "Verdant",
    description:
      "Home greenery storefront — lime split hero, plant photography, and a calm product grid.",
    category: "minimal",
    layout: "catalog",
    primary: "#4d7c0f",
    secondary: "#d9f99d",
    background: "#f7fee7",
    font: "sans",
    button: "pill",
    hero: "Bring the outside in",
    subtitle: "Plants, pots, and the tools that keep them thriving.",
    heroImage: U("photo-1463320726281-696a485928f7"),
    storyImage: U("photo-1416879595882-3373a0480b5b"),
    galleryUrls: [
      U("photo-1485955900006-10f4d324d411", 800),
      U("photo-1459411552884-841db9b3cc2a", 800),
      U("photo-1466781783364-36c955e42a7f", 800),
    ],
    announcement: "Free shipping on plant kits over $60",
  },
  {
    id: "bloom",
    label: "Bloom",
    description:
      "Wellness and supplements — soft lilac lifestyle, ritual features, bestsellers first.",
    category: "beauty",
    layout: "beauty",
    primary: "#7c3aed",
    secondary: "#ddd6fe",
    background: "#faf5ff",
    font: "sans",
    button: "pill",
    hero: "Daily ritual",
    subtitle: "Supplements and soft care for a quieter morning.",
    heroImage: U("photo-1556228720-195a672e8a03"),
    storyImage: U("photo-1515377905703-c4788e51af15"),
    galleryUrls: [
      U("photo-1570194065650-d99fb4b38b17", 800),
      U("photo-1598440947619-2c35fc9aa908", 800),
      U("photo-1608571423902-eed4a5ad8108", 800),
    ],
  },
  {
    id: "clay",
    label: "Clay",
    description:
      "Kitchen and drinkware — taupe earth tones, tabletop photography, warm serif headlines.",
    category: "food",
    layout: "food",
    primary: "#78716c",
    secondary: "#d6d3d1",
    background: "#fafaf9",
    font: "serif",
    button: "rounded",
    hero: "Made for the table",
    subtitle: "Mugs, bowls, and the pieces you set out every day.",
    heroImage: U("photo-1556910103-1c02745aae4d"),
    storyImage: U("photo-1514228742587-6b1558fccfd3"),
    galleryUrls: [
      U("photo-1610701596007-11502861dcfa", 800),
      U("photo-1578500494198-246f612d3b3d", 800),
      U("photo-1495474472287-4d71bcdd2085", 800),
    ],
  },
  {
    id: "nightrest",
    label: "Nightrest",
    description:
      "Bedding and sleep — deep navy calm, soft photography, quiet luxury spacing.",
    category: "minimal",
    layout: "luxury",
    primary: "#1e3a5f",
    secondary: "#94a3b8",
    background: "#f1f5f9",
    font: "serif",
    button: "pill",
    hero: "Rest well",
    subtitle: "Sheets, duvets, and the quiet of a made bed.",
    heroImage: U("photo-1522771739844-6a9f6d5f14af"),
    storyImage: U("photo-1631049307264-da0ec9d70304"),
    galleryUrls: [
      U("photo-1586075010923-2dd457ba8392", 800),
      U("photo-1505693416388-ac5ce068fe85", 800),
      U("photo-1616594039964-ae9021a400a0", 800),
    ],
  },
  {
    id: "crunch",
    label: "Crunch",
    description:
      "Bold snack DTC — burnt orange field, huge type, campaign-first product grid.",
    category: "bold",
    layout: "bold",
    primary: "#c2410c",
    secondary: "#fdba74",
    background: "#fff7ed",
    font: "display",
    button: "square",
    hero: "CRUNCH",
    subtitle: "Snacks with a short label and a loud pack.",
    heroImage: U("photo-1599490659213-e2b9527bd087"),
    storyImage: U("photo-1621939514649-280e2ee25f60"),
    galleryUrls: [
      U("photo-1566478989037-eec170784d0b", 800),
      U("photo-1551024506-0bccd828d307", 800),
      U("photo-1587132137056-bfbf0166836e", 800),
    ],
    announcement: "Bundle & save — this week only",
  },
  {
    id: "playkit",
    label: "Playkit",
    description:
      "Kids apparel and accessories — soft grey-blue, playful photography, giftable edits.",
    category: "fashion",
    layout: "catalog",
    primary: "#64748b",
    secondary: "#bfdbfe",
    background: "#f8fafc",
    font: "sans",
    button: "pill",
    hero: "Little adventures",
    subtitle: "Clothes and kits for the day outside.",
    heroImage: U("photo-1519238263530-99bdd11df2ea"),
    storyImage: U("photo-1503919545881-bde2740bd6e0"),
    galleryUrls: [
      U("photo-1515488042361-ee00e0ddd4e4", 800),
      U("photo-1566576912321-d58ddd7a6088", 800),
      U("photo-1471286174890-9c112ffca5b4", 800),
    ],
  },
  {
    id: "sprint",
    label: "Sprint",
    description:
      "Sneakers and athletic — huge wordmark over shoe photography, dense product tiles.",
    category: "sports",
    layout: "sports",
    primary: "#0f172a",
    secondary: "#f97316",
    background: "#fafafa",
    font: "display",
    button: "square",
    hero: "SPRINT",
    subtitle: "Shoes built for the next mile.",
    heroImage: U("photo-1542291026-7eec264c27ff"),
    storyImage: U("photo-1460353581641-37baddab0fa2"),
    galleryUrls: [
      U("photo-1606107557195-0e29a4b5b4aa", 800),
      U("photo-1595950653106-6c9ebd614d3a", 800),
      U("photo-1552346154-21d32810aba3", 800),
    ],
    announcement: "New colorways — Friday drop",
  },
  {
    id: "ridge",
    label: "Ridge",
    description:
      "Outdoor techwear — moody landscape hero, jacket grid, performance-forward copy.",
    category: "sports",
    layout: "sports",
    primary: "#0c1222",
    secondary: "#64748b",
    background: "#f1f5f9",
    font: "helvetica",
    button: "square",
    hero: "Take the ridge",
    subtitle: "Shells, insulation, and the layer system.",
    heroImage: U("photo-1551632811-561732d1e306"),
    storyImage: U("photo-1547949003-9792a18a2601"),
    galleryUrls: [
      U("photo-1620799140408-edc6dcb6d633", 800),
      U("photo-1504280390367-361c6d9f38f4", 800),
      U("photo-1601924994987-69e26d50dc26", 800),
    ],
  },
];

export const PREMIUM_THEME_PACK: StoreThemePreset[] = SPECS.map((spec) => ({
  id: spec.id,
  label: spec.label,
  description: spec.description,
  category: spec.category,
  featured: true,
  layoutPreview: spec.layout,
  preview: {
    primary: spec.primary,
    secondary: spec.secondary,
    background: spec.background,
  },
  primaryColor: spec.primary,
  homeBlocks: homeFor(spec),
  theme: {
    secondaryColor: spec.secondary,
    fontFamily: FONT[spec.font],
    buttonStyle: spec.button,
    pageBgColor: spec.background,
    containerMaxPx: spec.layout === "bold" || spec.layout === "editorial" ? 1440 : 1280,
    blockGap: spec.layout === "luxury" ? "lg" : "md",
    scrollAnimation: spec.layout === "bold" || spec.layout === "sports" ? "slide" : "fade",
    announcementEnabled: Boolean(spec.announcement),
    announcementText: spec.announcement,
    announcementColor: spec.primary,
    trustBadgesEnabled: true,
  },
}));
