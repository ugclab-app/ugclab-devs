import type { HomeBlock, StoreTheme } from "@ugclab/tenant/store-theme";
import { cloneBlocks, reidBlocks } from "@ugclab/tenant/store-theme";

export type StoreThemeCategory =
  | "all"
  | "minimal"
  | "fashion"
  | "food"
  | "digital"
  | "bold";

export type StoreThemePreset = {
  id: string;
  label: string;
  description: string;
  category: Exclude<StoreThemeCategory, "all">;
  /** Card preview colors */
  preview: { primary: string; secondary: string; background: string };
  primaryColor: string;
  homeBlocks: HomeBlock[];
  theme: Partial<
    Pick<
      StoreTheme,
      | "secondaryColor"
      | "fontFamily"
      | "buttonStyle"
      | "containerMaxPx"
      | "pageBgColor"
      | "blockGap"
      | "scrollAnimation"
      | "announcementEnabled"
      | "announcementText"
      | "announcementColor"
      | "navLinks"
      | "hideDefaultNav"
      | "socialLinks"
      | "trustBadgesEnabled"
    >
  >;
};

function bid(): string {
  return `tpl_${Math.random().toString(36).slice(2, 9)}`;
}

function blocks(def: Omit<HomeBlock, "id">[]): HomeBlock[] {
  return reidBlocks(def.map((b) => ({ ...b, id: bid() })));
}

const dawnBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Modern essentials",
    subtitle: "Quality products, thoughtfully curated.",
    ctaLabel: "Shop all",
    ctaPath: "/collections",
  },
  { type: "featured_collection", title: "Featured", collectionSlug: "", paddingY: "lg" },
  { type: "products", paddingY: "lg" },
  {
    type: "image_text",
    title: "Our story",
    subtitle: "Built for everyday life.",
    imagePosition: "right",
    paddingY: "md",
  },
  { type: "newsletter", title: "Newsletter", subtitle: "New drops & offers.", paddingY: "lg", bgColor: "#fafafa" },
]);

const craftBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Handmade with care",
    subtitle: "Small-batch goods from local makers.",
    ctaLabel: "Explore shop",
    ctaPath: "/collections",
  },
  { type: "gallery", title: "From the studio", paddingY: "md" },
  { type: "products", paddingY: "lg" },
  { type: "reviews", title: "Customer love", paddingY: "md" },
  { type: "faq", title: "FAQ", paddingY: "md", faqItems: [{ question: "Shipping?", answer: "3–5 days." }] },
]);

const senseBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "The new collection",
    subtitle: "Refined silhouettes for the season.",
    ctaLabel: "Discover",
    ctaPath: "/collections",
  },
  { type: "new_arrivals", title: "New arrivals", paddingY: "lg" },
  { type: "gallery", title: "Editorial", paddingY: "md" },
  { type: "products", paddingY: "lg" },
  { type: "logos", title: "As featured in", paddingY: "sm" },
]);

const bistroBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Fresh & local",
    subtitle: "Order pickup or delivery today.",
    ctaLabel: "Order now",
    ctaPath: "/collections",
  },
  {
    type: "features",
    title: "Why us",
    features: [
      { title: "Farm fresh", text: "Sourced daily." },
      { title: "Fast delivery", text: "Same-day in city." },
      { title: "Easy ordering", text: "Checkout in minutes." },
    ],
  },
  { type: "products", paddingY: "lg" },
  { type: "map", title: "Find us", mapEmbedUrl: "https://maps.google.com/maps?q=cafe&output=embed" },
]);

const studioBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Create. Sell. Ship.",
    subtitle: "Digital products & tools for creators.",
    ctaLabel: "Browse",
    ctaPath: "/collections",
  },
  {
    type: "pricing",
    title: "Plans",
    pricingItems: [
      { name: "Starter", price: "$19", features: ["1 product", "Email support"], ctaLabel: "Start" },
      {
        name: "Pro",
        price: "$49",
        features: ["Unlimited", "Priority support"],
        ctaLabel: "Go Pro",
        highlighted: true,
      },
    ],
  },
  { type: "products", paddingY: "lg" },
  { type: "faq", title: "FAQ", paddingY: "md", faqItems: [{ question: "Downloads?", answer: "Instant email link." }] },
]);

const impactBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "POWER YOUR ROUTINE",
    subtitle: "Performance gear. No compromise.",
    ctaLabel: "Shop now",
    ctaPath: "/collections",
  },
  {
    type: "countdown",
    title: "Flash sale",
    subtitle: "Ends midnight",
    countdownEndsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    bgColor: "#dc2626",
    textColor: "#fff",
    align: "center",
  },
  { type: "sale", title: "On sale", paddingY: "lg" },
  { type: "cta", title: "Free shipping over $50", ctaLabel: "Shop sale", ctaPath: "/collections", bgColor: "#18181b", textColor: "#fff", align: "center" },
]);

const marketBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Market day",
    subtitle: "Artisan goods & vintage finds.",
    ctaLabel: "Shop market",
    ctaPath: "/collections",
  },
  { type: "columns", title: "Categories", columnCount: 3, columns: [
    { title: "Home", text: "Decor & living" },
    { title: "Wear", text: "Clothing & accessories" },
    { title: "Gifts", text: "For every occasion" },
  ]},
  { type: "products", paddingY: "lg" },
  { type: "reviews", title: "Community reviews", paddingY: "md" },
]);

export const STORE_THEME_PRESETS: StoreThemePreset[] = [
  {
    id: "dawn",
    label: "Dawn",
    description: "Clean minimal layout — Shopify-style default. Great for most catalogs.",
    category: "minimal",
    preview: { primary: "#18181b", secondary: "#52525b", background: "#ffffff" },
    primaryColor: "#18181b",
    homeBlocks: dawnBlocks,
    theme: {
      secondaryColor: "#52525b",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      buttonStyle: "rounded",
      containerMaxPx: 1280,
      pageBgColor: "#ffffff",
      blockGap: "md",
      scrollAnimation: "fade",
      announcementEnabled: true,
      announcementText: "Free shipping on orders over $50",
      announcementColor: "#18181b",
      trustBadgesEnabled: true,
    },
  },
  {
    id: "craft",
    label: "Craft",
    description: "Warm handmade feel — artisan & lifestyle brands.",
    category: "minimal",
    preview: { primary: "#78350f", secondary: "#a16207", background: "#fffbeb" },
    primaryColor: "#78350f",
    homeBlocks: craftBlocks,
    theme: {
      secondaryColor: "#a16207",
      fontFamily: "Georgia, serif",
      buttonStyle: "pill",
      containerMaxPx: 1200,
      pageBgColor: "#fffbeb",
      blockGap: "lg",
      scrollAnimation: "fade",
      socialLinks: { instagram: "https://instagram.com" },
    },
  },
  {
    id: "sense",
    label: "Sense",
    description: "Editorial fashion — lookbook, new arrivals, elegant spacing.",
    category: "fashion",
    preview: { primary: "#0f172a", secondary: "#64748b", background: "#f8fafc" },
    primaryColor: "#0f172a",
    homeBlocks: senseBlocks,
    theme: {
      secondaryColor: "#64748b",
      fontFamily: '"DM Sans", system-ui, sans-serif',
      buttonStyle: "square",
      containerMaxPx: 1440,
      pageBgColor: "#f8fafc",
      blockGap: "lg",
      scrollAnimation: "slide",
      announcementEnabled: true,
      announcementText: "New season — shop the collection",
      announcementColor: "#0f172a",
    },
  },
  {
    id: "bistro",
    label: "Bistro",
    description: "Food & beverage — menu-style sections and location map.",
    category: "food",
    preview: { primary: "#166534", secondary: "#15803d", background: "#f0fdf4" },
    primaryColor: "#166534",
    homeBlocks: bistroBlocks,
    theme: {
      secondaryColor: "#15803d",
      fontFamily: "system-ui, sans-serif",
      buttonStyle: "rounded",
      pageBgColor: "#f0fdf4",
      blockGap: "md",
      scrollAnimation: "fade",
    },
  },
  {
    id: "studio",
    label: "Studio",
    description: "Digital downloads — pricing, FAQ, creator-focused.",
    category: "digital",
    preview: { primary: "#7c3aed", secondary: "#6d28d9", background: "#faf5ff" },
    primaryColor: "#7c3aed",
    homeBlocks: studioBlocks,
    theme: {
      secondaryColor: "#6d28d9",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      buttonStyle: "pill",
      pageBgColor: "#faf5ff",
      blockGap: "lg",
      scrollAnimation: "slide",
      trustBadgesEnabled: true,
    },
  },
  {
    id: "impact",
    label: "Impact",
    description: "Bold sales — countdown, promos, high-energy layout.",
    category: "bold",
    preview: { primary: "#dc2626", secondary: "#18181b", background: "#ffffff" },
    primaryColor: "#dc2626",
    homeBlocks: impactBlocks,
    theme: {
      secondaryColor: "#18181b",
      fontFamily: "system-ui, sans-serif",
      buttonStyle: "square",
      blockGap: "md",
      scrollAnimation: "slide",
      announcementEnabled: true,
      announcementText: "Limited time — up to 40% off",
      announcementColor: "#dc2626",
    },
  },
  {
    id: "market",
    label: "Market",
    description: "Multi-category shop — columns, reviews, community vibe.",
    category: "fashion",
    preview: { primary: "#0369a1", secondary: "#0ea5e9", background: "#f0f9ff" },
    primaryColor: "#0369a1",
    homeBlocks: marketBlocks,
    theme: {
      secondaryColor: "#0ea5e9",
      buttonStyle: "rounded",
      pageBgColor: "#f0f9ff",
      blockGap: "md",
      scrollAnimation: "fade",
      navLinks: [
        { label: "Shop", path: "/collections", header: true },
        { label: "About", path: "/pages/about", header: true, footer: true },
      ],
    },
  },
];

export function getStoreTheme(id: string): StoreThemePreset | undefined {
  return listAllThemePresets().find((t) => t.id === id);
}

export function customToPreset(c: import("@ugclab/tenant/store-theme").CustomThemePreset): StoreThemePreset {
  return {
    id: c.id,
    label: c.label,
    description: `Your saved theme`,
    category: "minimal",
    preview: {
      primary: c.primaryColor,
      secondary: c.theme.secondaryColor ?? "#71717a",
      background: c.theme.pageBgColor ?? "#ffffff",
    },
    primaryColor: c.primaryColor,
    homeBlocks: c.homeBlocks,
    theme: c.theme,
  };
}

export function listAllThemePresets(
  custom?: import("@ugclab/tenant/store-theme").CustomThemePreset[]
): StoreThemePreset[] {
  const saved = (custom ?? []).map(customToPreset);
  return [...STORE_THEME_PRESETS, ...saved];
}

export function filterStoreThemes(
  category: StoreThemeCategory,
  custom?: import("@ugclab/tenant/store-theme").CustomThemePreset[]
): StoreThemePreset[] {
  const all = listAllThemePresets(custom);
  if (category === "all") return all;
  return all.filter((t) => t.category === category);
}

/** @deprecated use filterStoreThemes */
export const PAGE_TEMPLATES = STORE_THEME_PRESETS.map((t) => ({
  id: t.id,
  label: t.label,
  description: t.description,
  blocks: cloneBlocks(t.homeBlocks),
  pageStyle: {
    pageBgColor: t.theme.pageBgColor,
    blockGap: t.theme.blockGap,
    scrollAnimation: t.theme.scrollAnimation,
  },
}));

export function getTemplate(id: string) {
  return PAGE_TEMPLATES.find((t) => t.id === id);
}
