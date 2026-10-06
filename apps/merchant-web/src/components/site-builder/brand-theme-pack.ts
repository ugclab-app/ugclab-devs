import { reidBlocks, type HomeBlock } from "@ugclab/tenant/store-theme";
import type { StoreThemePreset, ThemeLayoutPreview } from "./store-themes";

type PackSpec = {
  id: string;
  label: string;
  description: string;
  category: StoreThemePreset["category"];
  layout: Exclude<ThemeLayoutPreview, "default">;
  inspiredBy: string;
  primary: string;
  secondary: string;
  background: string;
  font: "serif" | "sans" | "display" | "helvetica";
  button: "square" | "pill" | "rounded";
  hero: string;
  subtitle: string;
  announcement?: string;
};

const FONT = {
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Plus Jakarta Sans", system-ui, sans-serif',
  display: '"Space Grotesk", system-ui, sans-serif',
  helvetica: '"Helvetica Neue", Arial, sans-serif',
} as const;

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
    imagePosition: "right",
    paddingY: "lg",
  };

  if (spec.layout === "editorial" || spec.layout === "luxury") {
    return blocks([
      hero,
      { type: "gallery", title: "Lookbook", paddingY: "md" },
      { type: "new_arrivals", title: "New arrivals", paddingY: "lg" },
      products,
      story,
      { type: "newsletter", title: "The list", subtitle: "First look at new drops.", paddingY: "lg", bgColor: spec.background },
    ]);
  }
  if (spec.layout === "jewelry") {
    return blocks([
      hero,
      {
        type: "columns",
        title: "Collections",
        columnCount: 3,
        columns: [
          { title: "Everyday", text: "Pieces you wear daily." },
          { title: "Occasion", text: "For the night out." },
          { title: "Gifts", text: "Ready to wrap." },
        ],
      },
      { type: "gallery", title: "On figure", paddingY: "md" },
      products,
      { type: "cta", title: "Complimentary gift wrap", ctaLabel: "Shop jewelry", ctaPath: "/collections", align: "center" },
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
          { title: "Tested", text: "Made for daily use." },
          { title: "Refill", text: "Come back for the set." },
        ],
      },
      { type: "featured_collection", title: "Bestsellers", collectionSlug: "", paddingY: "lg" },
      products,
      { type: "reviews", title: "Notes", paddingY: "md" },
    ]);
  }
  if (spec.layout === "food") {
    return blocks([
      hero,
      {
        type: "features",
        title: "From the counter",
        features: [
          { title: "Fresh", text: "Made in small batches." },
          { title: "Local", text: "Sourced nearby." },
          { title: "Subscribe", text: "A box on your schedule." },
        ],
      },
      products,
      { type: "reviews", title: "Regulars", paddingY: "md" },
      { type: "newsletter", title: "The menu", subtitle: "New roasts and drops.", paddingY: "lg" },
    ]);
  }
  if (spec.layout === "sports") {
    return blocks([
      hero,
      {
        type: "features",
        title: "Built to train",
        features: [
          { title: "Light", text: "Moves with you." },
          { title: "Tough", text: "Made for repeat wear." },
          { title: "Kit", text: "Layer from warm-up to finish." },
        ],
      },
      { type: "sale", title: "Training edit", paddingY: "md" },
      products,
      { type: "cta", title: "Free shipping over $75", ctaLabel: "Shop the kit", ctaPath: "/collections", bgColor: spec.primary, textColor: "#fff", align: "center" },
    ]);
  }
  if (spec.layout === "bold") {
    return blocks([
      hero,
      { type: "sale", title: "This week", paddingY: "md" },
      products,
      { type: "gallery", title: "Campaign", paddingY: "md" },
      { type: "cta", title: spec.announcement ?? "New drop", ctaLabel: "Shop the drop", ctaPath: "/collections", bgColor: spec.primary, textColor: "#fff", align: "center" },
    ]);
  }
  if (spec.layout === "electronics" || spec.layout === "digital") {
    return blocks([
      hero,
      {
        type: "features",
        title: "Why it",
        features: [
          { title: "Designed", text: "One job, done well." },
          { title: "Ships", text: "Tracked to your door." },
          { title: "Support", text: "People, not a bot wall." },
        ],
      },
      { type: "logos", title: "As seen in", paddingY: "sm" },
      products,
      { type: "faq", title: "Questions", paddingY: "md", faqItems: [{ question: "Warranty?", answer: "One year, no forms." }] },
    ]);
  }
  return blocks([
    hero,
    {
      type: "columns",
      title: "Shop by edit",
      columnCount: 3,
      columns: [
        { title: "New", text: "Just in." },
        { title: "Core", text: "The pieces that stay." },
        { title: "Sale", text: "Last sizes." },
      ],
    },
    { type: "featured_collection", title: "Featured", collectionSlug: "", paddingY: "lg" },
    products,
    story,
  ]);
}

const SPECS: PackSpec[] = [
  { id: "gazette", label: "Gazette", description: "Magazine fashion — full-bleed hero, lookbook, serif headlines. The quiet-luxury edit.", category: "fashion", layout: "editorial", inspiredBy: "Editorial fashion houses", primary: "#111111", secondary: "#c4b5a5", background: "#f7f4ef", font: "serif", button: "square", hero: "The issue", subtitle: "Clothes with a point of view.", announcement: "Free shipping over $150" },
  { id: "runway", label: "Runway", description: "Showroom grid — black and white, oversized type, new arrivals first.", category: "fashion", layout: "editorial", inspiredBy: "Fashion week lookbooks", primary: "#0a0a0a", secondary: "#e7e5e4", background: "#ffffff", font: "helvetica", button: "square", hero: "Spring / summer", subtitle: "The collection, as shown.", announcement: "New season is live" },
  { id: "mono", label: "Mono", description: "Monochrome wardrobe — tight product grid, almost no color, lots of air.", category: "fashion", layout: "catalog", inspiredBy: "Minimal clothing labels", primary: "#18181b", secondary: "#a1a1aa", background: "#fafafa", font: "helvetica", button: "square", hero: "Less, better", subtitle: "A short list of pieces you repeat." },
  { id: "archive", label: "Archive", description: "Vintage fashion house — warm paper, serif, story beside the clothes.", category: "fashion", layout: "editorial", inspiredBy: "Archive fashion stores", primary: "#3f2e22", secondary: "#d6c4b0", background: "#f6f1ea", font: "serif", button: "rounded", hero: "From the archive", subtitle: "Found, remade, ready to wear." },
  { id: "line", label: "Line", description: "Scandinavian clothing — pale ground, square buttons, quiet navigation.", category: "fashion", layout: "luxury", inspiredBy: "Scandi fashion retailers", primary: "#2a2a2a", secondary: "#bdbdbd", background: "#f3f3f1", font: "helvetica", button: "square", hero: "Cut clean", subtitle: "Tailoring without the noise." },
  { id: "form", label: "Form", description: "Neutral bodywear — sand, stone, and a tight essentials grid.", category: "fashion", layout: "luxury", inspiredBy: "Bodywear basics brands", primary: "#1c1917", secondary: "#e7e5e4", background: "#faf7f2", font: "sans", button: "pill", hero: "Second skin", subtitle: "Basics you stop thinking about." },
  { id: "pulse", label: "Pulse", description: "Streetwear drops — black field, one red accent, campaign first.", category: "bold", layout: "bold", inspiredBy: "Streetwear drop shops", primary: "#0f0f0f", secondary: "#ef4444", background: "#fafafa", font: "display", button: "square", hero: "DROP 04", subtitle: "Online Friday. In store Saturday.", announcement: "Drop 04 — Friday 10:00" },
  { id: "velvet", label: "Velvet", description: "Evening wear — deep plum, serif, gallery before the grid.", category: "fashion", layout: "luxury", inspiredBy: "Evening fashion houses", primary: "#3b0764", secondary: "#e9d5ff", background: "#faf5ff", font: "serif", button: "pill", hero: "After dark", subtitle: "Dressing for the room." },
  { id: "dew", label: "Dew", description: "Soft skin ritual — blush, rounded buttons, bestsellers up front.", category: "beauty", layout: "beauty", inspiredBy: "Clean skincare brands", primary: "#9d174d", secondary: "#fecdd3", background: "#fff1f2", font: "sans", button: "pill", hero: "Skin, simply", subtitle: "A short routine. A clear shelf." },
  { id: "serum", label: "Serum", description: "Clinical skincare — cool gray, facts over fluff, tight product rows.", category: "beauty", layout: "beauty", inspiredBy: "Clinical skincare counters", primary: "#0f172a", secondary: "#94a3b8", background: "#f8fafc", font: "helvetica", button: "square", hero: "The formula", subtitle: "Ingredients first. Packaging second." },
  { id: "petal", label: "Petal", description: "Floral clean beauty — rose ground, reviews, a soft hero.", category: "beauty", layout: "beauty", inspiredBy: "Floral beauty brands", primary: "#be123c", secondary: "#fda4af", background: "#fff7f7", font: "serif", button: "pill", hero: "In bloom", subtitle: "Color that looks like skin." },
  { id: "aura", label: "Aura", description: "Warm makeup studio — terracotta, cream, a counter of shades.", category: "beauty", layout: "beauty", inspiredBy: "Makeup studio brands", primary: "#9a3412", secondary: "#fdba74", background: "#fff7ed", font: "sans", button: "rounded", hero: "The face edit", subtitle: "Five shades. Every day." },
  { id: "vessel", label: "Vessel", description: "Apothecary — olive, paper, a ritual of three steps.", category: "beauty", layout: "beauty", inspiredBy: "Apothecary retailers", primary: "#3f6212", secondary: "#d9f99d", background: "#f7fee7", font: "serif", button: "square", hero: "The still room", subtitle: "Botanicals, bottled." },
  { id: "gloss", label: "Gloss", description: "Makeup counter — pink light, product grid, social proof.", category: "beauty", layout: "beauty", inspiredBy: "Glossy makeup shops", primary: "#db2777", secondary: "#fbcfe8", background: "#fdf2f8", font: "sans", button: "pill", hero: "High shine", subtitle: "Color you can see from the door." },
  { id: "linen", label: "Linen", description: "Bedding house — stone, wide margins, story next to the set.", category: "minimal", layout: "catalog", inspiredBy: "Bedding direct brands", primary: "#44403c", secondary: "#e7e5e4", background: "#fafaf9", font: "serif", button: "square", hero: "Sleep in it", subtitle: "Percale, washed, ready." },
  { id: "hearth", label: "Hearth", description: "Cozy home — clay and cream, edits for the room.", category: "minimal", layout: "catalog", inspiredBy: "Home goods shops", primary: "#7c2d12", secondary: "#fed7aa", background: "#fff7ed", font: "serif", button: "rounded", hero: "Come in", subtitle: "Objects for a lived-in room." },
  { id: "loom", label: "Loom", description: "Textile shop — deep green, columns of cloth, calm type.", category: "minimal", layout: "catalog", inspiredBy: "Textile ateliers", primary: "#1e3a34", secondary: "#a7f3d0", background: "#f0fdfa", font: "serif", button: "square", hero: "Woven", subtitle: "Throws, towels, table." },
  { id: "nest", label: "Nest", description: "Soft home — warm sand, rounded cards, gifts up front.", category: "minimal", layout: "luxury", inspiredBy: "Soft home brands", primary: "#a16207", secondary: "#fde68a", background: "#fffbeb", font: "sans", button: "pill", hero: "Small comforts", subtitle: "For the room you actually use." },
  { id: "apex", label: "Apex", description: "Training floor — near-black, one green hit, kit sections.", category: "sports", layout: "sports", inspiredBy: "Training apparel brands", primary: "#111827", secondary: "#22c55e", background: "#f9fafb", font: "display", button: "square", hero: "TRAIN", subtitle: "Gear that survives the week." },
  { id: "pace", label: "Pace", description: "Running club — clear blue, light type, a race-day edit.", category: "sports", layout: "sports", inspiredBy: "Running brands", primary: "#0e7490", secondary: "#67e8f9", background: "#ecfeff", font: "sans", button: "pill", hero: "Miles, then more", subtitle: "Shoes and layers for the long run." },
  { id: "summit", label: "Summit", description: "Technical outdoor — slate, tight grids, performance copy.", category: "sports", layout: "sports", inspiredBy: "Technical outdoor brands", primary: "#0f172a", secondary: "#94a3b8", background: "#f8fafc", font: "helvetica", button: "square", hero: "Above the line", subtitle: "Shells, insulation, the layer system." },
  { id: "court", label: "Court", description: "Studio athletic — sand and black, lifestyle next to the kit.", category: "sports", layout: "sports", inspiredBy: "Studio athletic brands", primary: "#1c1917", secondary: "#f5f5f4", background: "#fafaf9", font: "sans", button: "pill", hero: "Off the mat", subtitle: "What you wear to practice, and after." },
  { id: "brew", label: "Brew", description: "Coffee bar — brown paper, subscriptions, a short menu.", category: "food", layout: "food", inspiredBy: "Coffee roasters", primary: "#44403c", secondary: "#d6d3d1", background: "#fafaf9", font: "serif", button: "square", hero: "This week’s roast", subtitle: "Whole bean. Ground to order." },
  { id: "grove", label: "Grove", description: "Juice and greens — bright leaf, fresh features, a box plan.", category: "food", layout: "food", inspiredBy: "Juice and greens brands", primary: "#166534", secondary: "#86efac", background: "#f0fdf4", font: "sans", button: "pill", hero: "Cold pressed", subtitle: "A week of bottles, delivered." },
  { id: "pantry", label: "Pantry", description: "Better snacks — amber, bold packs, a shelf you can scan.", category: "food", layout: "food", inspiredBy: "Better-for-you snack brands", primary: "#b45309", secondary: "#fde68a", background: "#fffbeb", font: "display", button: "rounded", hero: "Open the jar", subtitle: "Snacks with a short label." },
  { id: "oven", label: "Oven", description: "Bakery — warm crust colors, the day’s bread up top.", category: "food", layout: "food", inspiredBy: "Bakery storefronts", primary: "#9a3412", secondary: "#fdba74", background: "#fff7ed", font: "serif", button: "rounded", hero: "Out of the oven", subtitle: "Bread, pastry, and the weekend box." },
  { id: "signal", label: "Signal", description: "Audio and devices — ink blue, spec-first, a calm hero.", category: "digital", layout: "electronics", inspiredBy: "Consumer electronics shops", primary: "#0f172a", secondary: "#38bdf8", background: "#f8fafc", font: "helvetica", button: "square", hero: "Hear it", subtitle: "One product. A clear reason." },
  { id: "orbit", label: "Orbit", description: "Travel goods — navy, luggage edits, trust near the buy button.", category: "minimal", layout: "catalog", inspiredBy: "Travel goods brands", primary: "#1e3a8a", secondary: "#93c5fd", background: "#eff6ff", font: "sans", button: "rounded", hero: "Pack once", subtitle: "Bags that survive the trip." },
  { id: "lens", label: "Lens", description: "Eyewear — white gallery, frames in a clean row.", category: "minimal", layout: "catalog", inspiredBy: "Eyewear retailers", primary: "#18181b", secondary: "#d4d4d8", background: "#ffffff", font: "helvetica", button: "pill", hero: "Find your frame", subtitle: "Try the shapes. Keep the pair." },
  { id: "drift", label: "Drift", description: "Sleep brand — indigo night, a single hero product, quiet type.", category: "minimal", layout: "luxury", inspiredBy: "Sleep direct brands", primary: "#1e1b4b", secondary: "#c7d2fe", background: "#eef2ff", font: "serif", button: "pill", hero: "Lights out", subtitle: "A mattress, bedding, and nothing else shouting." },
  { id: "flash", label: "Flash", description: "Fast fashion — dense grid, rose sale bar, new in every visit.", category: "bold", layout: "bold", inspiredBy: "Fast fashion storefronts", primary: "#e11d48", secondary: "#fb7185", background: "#fff1f2", font: "sans", button: "square", hero: "New in today", subtitle: "Hundreds of styles. Updated daily.", announcement: "Extra 20% — this weekend" },
  { id: "riot", label: "Riot", description: "Night market — black, a yellow flash, campaign imagery.", category: "bold", layout: "bold", inspiredBy: "Night-market fashion", primary: "#18181b", secondary: "#facc15", background: "#fafafa", font: "display", button: "square", hero: "AFTER HOURS", subtitle: "The loud edit.", announcement: "Tonight only" },
  { id: "candy", label: "Candy", description: "Youth color-block — violet and pink, playful, sale-forward.", category: "bold", layout: "bold", inspiredBy: "Youth fashion shops", primary: "#7c3aed", secondary: "#f472b6", background: "#faf5ff", font: "display", button: "pill", hero: "Pick a color", subtitle: "Loud on purpose." },
  { id: "gilt", label: "Gilt", description: "Fine gold — champagne ground, serif, pieces shown large.", category: "fashion", layout: "jewelry", inspiredBy: "Fine jewelry houses", primary: "#854d0e", secondary: "#fde68a", background: "#fffbeb", font: "serif", button: "square", hero: "Gold, quietly", subtitle: "Few pieces. High finish." },
  { id: "locket", label: "Locket", description: "Everyday gold — light, giftable, three collections.", category: "fashion", layout: "jewelry", inspiredBy: "Everyday jewelry brands", primary: "#a16207", secondary: "#fef3c7", background: "#fffbeb", font: "sans", button: "pill", hero: "Wear it daily", subtitle: "Necklaces, hoops, and the gift edit." },
  { id: "quarto", label: "Quarto", description: "Magazine shop — stories beside the products, ink and paper.", category: "digital", layout: "editorial", inspiredBy: "Media brands that sell", primary: "#0f172a", secondary: "#cbd5e1", background: "#ffffff", font: "serif", button: "square", hero: "Read, then shop", subtitle: "The story, and the thing it is about." },
  { id: "harbor", label: "Harbor", description: "Outdoor lifestyle retail — teal, edits for the weekend, wide grids.", category: "sports", layout: "catalog", inspiredBy: "Outdoor lifestyle retailers", primary: "#134e4a", secondary: "#5eead4", background: "#f0fdfa", font: "sans", button: "rounded", hero: "Out for the day", subtitle: "Packs, layers, and the long lunch." },
];

export const BRAND_THEME_PACK: StoreThemePreset[] = SPECS.map((spec) => ({
  id: spec.id,
  label: spec.label,
  description: spec.description,
  category: spec.category,
  inspiredBy: spec.inspiredBy,
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
    containerMaxPx: spec.layout === "editorial" || spec.layout === "bold" ? 1440 : 1280,
    blockGap: spec.layout === "luxury" || spec.layout === "editorial" ? "lg" : "md",
    scrollAnimation: spec.layout === "bold" || spec.layout === "sports" ? "slide" : "fade",
    announcementEnabled: Boolean(spec.announcement),
    announcementText: spec.announcement,
    announcementColor: spec.primary,
    trustBadgesEnabled: true,
  },
}));
