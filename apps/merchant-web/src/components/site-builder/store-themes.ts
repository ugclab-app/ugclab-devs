import type { HomeBlock, StoreTheme } from "@ugclab/tenant/store-theme";
import { cloneBlocks, reidBlocks } from "@ugclab/tenant/store-theme";

export type StoreThemeCategory =
  | "all"
  | "featured"
  | "minimal"
  | "fashion"
  | "beauty"
  | "sports"
  | "food"
  | "digital"
  | "bold";

/** Wireframe style on gallery cards (Shopify Theme Store–like) */
export type ThemeLayoutPreview = "editorial" | "jewelry" | "electronics" | "default";

export type StoreThemePreset = {
  id: string;
  label: string;
  description: string;
  category: Exclude<StoreThemeCategory, "all" | "featured">;
  /** Shopify Theme Store–style top pick */
  featured?: boolean;
  /** e.g. "Reformation" — layout inspiration, not a licensed copy */
  inspiredBy?: string;
  layoutPreview?: ThemeLayoutPreview;
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

const originBlocks = blocks([
  {
    type: "hero",
    contentWidth: "boxed",
    paddingY: "xl",
    title: "Designed for everyday",
    subtitle: "One hero product. A focused catalog.",
    ctaLabel: "Shop now",
    ctaPath: "/collections",
  },
  {
    type: "image_text",
    title: "Why it matters",
    subtitle: "Quality materials. Honest pricing.",
    imagePosition: "left",
    paddingY: "lg",
  },
  { type: "products", paddingY: "xl" },
  { type: "newsletter", title: "Stay in the loop", subtitle: "Launch updates & offers.", paddingY: "lg", bgColor: "#fafafa" },
]);

const spotlightBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "The collection",
    subtitle: "Everything you need in one place.",
    ctaLabel: "Shop collection",
    ctaPath: "/collections",
  },
  { type: "featured_collection", title: "Featured collection", collectionSlug: "", paddingY: "lg" },
  {
    type: "cta",
    title: "Ready to explore?",
    ctaLabel: "View all products",
    ctaPath: "/collections",
    align: "center",
    paddingY: "lg",
    bgColor: "#18181b",
    textColor: "#ffffff",
  },
]);

const publisherBlocks = blocks([
  {
    type: "text_banner",
    title: "Stories & shop",
    subtitle: "Read the journal, discover the catalog.",
    align: "center",
    paddingY: "md",
    bgColor: "#f4f4f5",
  },
  { type: "products", paddingY: "lg" },
  {
    type: "columns",
    title: "Explore",
    columnCount: 3,
    columns: [
      { title: "Journal", text: "Latest posts" },
      { title: "Shop", text: "All products" },
      { title: "About", text: "Our story" },
    ],
    paddingY: "md",
  },
  { type: "newsletter", title: "Subscribe", subtitle: "Weekly reads & drops.", paddingY: "lg" },
]);

const rideBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "MOVE FASTER",
    subtitle: "Performance streetwear for every session.",
    ctaLabel: "Shop gear",
    ctaPath: "/collections",
  },
  { type: "sale", title: "Outlet", paddingY: "md" },
  { type: "products", paddingY: "lg" },
  { type: "logos", title: "Trusted by teams", paddingY: "sm" },
]);

const colorblockBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "lg",
    title: "Color season",
    subtitle: "Bold blocks. Editorial layout.",
    ctaLabel: "Shop new",
    ctaPath: "/collections",
    bgColor: "#fef08a",
    textColor: "#18181b",
  },
  { type: "gallery", title: "Lookbook", paddingY: "md" },
  { type: "new_arrivals", title: "New arrivals", paddingY: "lg" },
  {
    type: "cta",
    title: "Build your fit",
    ctaLabel: "Shop all",
    ctaPath: "/collections",
    align: "center",
    bgColor: "#ec4899",
    textColor: "#fff",
    paddingY: "lg",
  },
]);

const luxeBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Radiant skin",
    subtitle: "Clinical formulas. Spa-level results.",
    ctaLabel: "Shop skincare",
    ctaPath: "/collections",
  },
  { type: "gallery", title: "The ritual", paddingY: "lg" },
  { type: "reviews", title: "Loved by thousands", paddingY: "md" },
  { type: "featured_collection", title: "Bestsellers", collectionSlug: "", paddingY: "lg" },
]);

const jewelryBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "lg",
    title: "Fine jewelry",
    subtitle: "Hand-finished pieces for every moment.",
    ctaLabel: "View collection",
    ctaPath: "/collections",
  },
  { type: "gallery", title: "Curated edits", paddingY: "lg" },
  { type: "products", paddingY: "lg" },
  { type: "spacer", spacerHeight: 24 },
]);

const tasteBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Table & delivery",
    subtitle: "Reserve a table or order to your door.",
    ctaLabel: "Order now",
    ctaPath: "/collections",
  },
  {
    type: "features",
    title: "Experience",
    features: [
      { title: "Chef-led menu", text: "Seasonal plates nightly." },
      { title: "Local ingredients", text: "Farm partnerships." },
      { title: "Fast delivery", text: "Hot food, on time." },
    ],
  },
  { type: "products", paddingY: "lg" },
  { type: "map", title: "Visit us", mapEmbedUrl: "https://maps.google.com/maps?q=restaurant&output=embed" },
]);

const craveBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Snack smarter",
    subtitle: "Subscribe & save on monthly boxes.",
    ctaLabel: "Build your box",
    ctaPath: "/collections",
  },
  { type: "products", paddingY: "lg" },
  { type: "newsletter", title: "Join the club", subtitle: "Members get early drops.", paddingY: "md" },
  {
    type: "faq",
    title: "Subscription FAQ",
    paddingY: "md",
    faqItems: [
      { question: "How often do you ship?", answer: "Monthly, skip anytime." },
      { question: "Can I customize?", answer: "Yes — pick your favorites." },
    ],
  },
]);

const roasteryBlocks = blocks([
  {
    type: "image_text",
    title: "Small-batch roast",
    subtitle: "Single origin beans, shipped fresh.",
    imagePosition: "right",
    paddingY: "lg",
  },
  { type: "products", paddingY: "lg" },
  {
    type: "features",
    title: "Roast profiles",
    features: [
      { title: "Light", text: "Fruit & florals." },
      { title: "Medium", text: "Chocolate & nut." },
      { title: "Dark", text: "Bold & smoky." },
    ],
  },
  { type: "reviews", title: "Coffee lovers say", paddingY: "md" },
]);

const courseBlocks = blocks([
  {
    type: "hero",
    contentWidth: "boxed",
    paddingY: "xl",
    title: "Master the skill",
    subtitle: "Self-paced lessons with lifetime access.",
    ctaLabel: "View curriculum",
    ctaPath: "/collections",
  },
  {
    type: "pricing",
    title: "Choose your path",
    pricingItems: [
      { name: "Core", price: "$99", features: ["8 modules", "Community"], ctaLabel: "Enroll" },
      {
        name: "Pro",
        price: "$199",
        features: ["Everything in Core", "Live Q&A", "Certificate"],
        ctaLabel: "Enroll",
        highlighted: true,
      },
    ],
  },
  {
    type: "faq",
    title: "Questions",
    paddingY: "md",
    faqItems: [{ question: "Refund policy?", answer: "14-day money-back guarantee." }],
  },
  {
    type: "cta",
    title: "Start learning today",
    ctaLabel: "Get started",
    ctaPath: "/collections",
    align: "center",
    paddingY: "lg",
  },
]);

const saasBlocks = blocks([
  {
    type: "hero",
    contentWidth: "boxed",
    paddingY: "lg",
    title: "Ship faster with one platform",
    subtitle: "Billing, analytics, and checkout in a single stack.",
    ctaLabel: "Start free trial",
    ctaPath: "/collections",
  },
  {
    type: "features",
    title: "Built for teams",
    features: [
      { title: "Automate", text: "Workflows that scale." },
      { title: "Integrate", text: "Connect your stack." },
      { title: "Analyze", text: "Real-time dashboards." },
    ],
  },
  {
    type: "pricing",
    title: "Plans",
    pricingItems: [
      { name: "Starter", price: "$29/mo", features: ["3 users", "Basic reports"], ctaLabel: "Try free" },
      {
        name: "Growth",
        price: "$79/mo",
        features: ["Unlimited users", "Advanced API"],
        ctaLabel: "Try free",
        highlighted: true,
      },
    ],
  },
  { type: "logos", title: "Teams we power", paddingY: "sm" },
]);

/** Shopify Theme Store–style: fashion editorial (Reformation-like) */
const reformationBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: "Loved for style",
    subtitle: "Modern essentials for every season.",
    ctaLabel: "Shop collection",
    ctaPath: "/collections",
  },
  {
    type: "html",
    htmlContent:
      '<p style="text-align:center;font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin:0;padding:0.75rem 0">Feel authentic · Loved for style · New arrivals daily</p>',
    paddingY: "none",
    bgColor: "#fafafa",
  },
  { type: "new_arrivals", title: "New arrivals", paddingY: "lg" },
  { type: "products", paddingY: "lg" },
  { type: "gallery", title: "Editorial", paddingY: "md" },
  {
    type: "image_text",
    title: "Crafted to last",
    subtitle: "Quality fabrics. Responsible production.",
    imagePosition: "left",
    paddingY: "lg",
  },
  { type: "reviews", title: "What customers say", paddingY: "md" },
  { type: "logos", title: "As seen in", paddingY: "sm" },
  { type: "newsletter", title: "Join the list", subtitle: "Early access to drops.", paddingY: "lg" },
]);

/** Jewelry / luxury lifestyle (Broadcast-like) */
const broadcastBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "lg",
    title: "Everyday luxury",
    subtitle: "Heirloom pieces for modern life.",
    ctaLabel: "Shop jewelry",
    ctaPath: "/collections",
  },
  {
    type: "columns",
    title: "Collections",
    columnCount: 3,
    columns: [
      { title: "Modern", text: "Clean lines & silver" },
      { title: "Heirlooms", text: "Vintage-inspired" },
      { title: "Elegant treasures", text: "Made to order" },
    ],
    paddingY: "md",
  },
  { type: "gallery", title: "Made-to-order jewelry", paddingY: "lg" },
  { type: "featured_collection", title: "Signature edit", collectionSlug: "", paddingY: "md" },
  { type: "products", paddingY: "lg" },
  { type: "reviews", title: "Stories from our community", paddingY: "md" },
  {
    type: "cta",
    title: "Book a virtual appointment",
    ctaLabel: "Contact us",
    ctaPath: "/pages/contact",
    align: "center",
    bgColor: "#f5f5f4",
    paddingY: "lg",
  },
]);

/** Electronics / multi-category megastore (Enterprise-like) */
const enterpriseBlocks = blocks([
  {
    type: "text_banner",
    title: "Free delivery on orders over $50 · Price match guarantee",
    align: "center",
    paddingY: "none",
    bgColor: "#1e3a8a",
    textColor: "#ffffff",
  },
  {
    type: "hero",
    contentWidth: "boxed",
    paddingY: "lg",
    title: "Top specs. Low prices.",
    subtitle: "Laptops, phones, audio & smart tech.",
    ctaLabel: "Shop laptops",
    ctaPath: "/collections",
  },
  {
    type: "features",
    title: "Shop deals",
    features: [
      { title: "Audio", text: "Speakers & headphones" },
      { title: "Computing", text: "Laptops & tablets" },
      { title: "Smart tech", text: "Wearables & home" },
      { title: "Cameras", text: "Digital & film" },
    ],
    paddingY: "md",
  },
  { type: "sale", title: "Hot deals", paddingY: "md" },
  { type: "new_arrivals", title: "New in", paddingY: "md" },
  { type: "products", paddingY: "lg" },
  {
    type: "columns",
    title: "Shop by department",
    columnCount: 3,
    columns: [
      { title: "TV & audio", text: "Home entertainment" },
      { title: "Phones", text: "Latest devices" },
      { title: "Gaming", text: "Consoles & accessories" },
    ],
  },
  {
    type: "features",
    title: "Why shop with us",
    features: [
      { title: "Fast shipping", text: "2-day delivery" },
      { title: "Easy returns", text: "30-day policy" },
      { title: "Expert support", text: "Live chat 24/7" },
    ],
    paddingY: "sm",
  },
  { type: "reviews", title: "Customer ratings", paddingY: "md" },
]);

const creatorBlocks = blocks([
  {
    type: "hero",
    contentWidth: "full",
    paddingY: "lg",
    title: "Templates & assets",
    subtitle: "Downloadables for creators — pay once, use forever.",
    ctaLabel: "Browse store",
    ctaPath: "/collections",
  },
  { type: "products", paddingY: "lg" },
  {
    type: "video",
    title: "See it in action",
    subtitle: "Watch a 2-minute walkthrough.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    paddingY: "md",
  },
  { type: "newsletter", title: "Creator list", subtitle: "New drops every Friday.", paddingY: "lg" },
]);

export const STORE_THEME_PRESETS: StoreThemePreset[] = [
  {
    id: "reformation",
    label: "Reformation",
    description:
      "Fashion editorial — full-bleed hero, scrolling tagline, new arrivals grid. Inspired by Shopify’s Reformation.",
    category: "fashion",
    featured: true,
    inspiredBy: "Reformation",
    layoutPreview: "editorial",
    preview: { primary: "#1c1917", secondary: "#a8a29e", background: "#fafaf9" },
    primaryColor: "#1c1917",
    homeBlocks: reformationBlocks,
    theme: {
      secondaryColor: "#a8a29e",
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      buttonStyle: "square",
      containerMaxPx: 1440,
      pageBgColor: "#fafaf9",
      blockGap: "md",
      scrollAnimation: "fade",
      announcementEnabled: true,
      announcementText: "Free shipping on orders over $75",
      announcementColor: "#1c1917",
      navLinks: [
        { label: "Shop", path: "/collections", header: true },
        { label: "New", path: "/collections", header: true },
        { label: "About", path: "/pages/about", header: true, footer: true },
      ],
      trustBadgesEnabled: true,
    },
  },
  {
    id: "broadcast",
    label: "Broadcast",
    description:
      "Jewelry & luxury — soft hero, collection columns, lifestyle gallery. Inspired by Shopify’s Broadcast.",
    category: "beauty",
    featured: true,
    inspiredBy: "Broadcast",
    layoutPreview: "jewelry",
    preview: { primary: "#78716c", secondary: "#d6d3d1", background: "#fafaf9" },
    primaryColor: "#78716c",
    homeBlocks: broadcastBlocks,
    theme: {
      secondaryColor: "#d6d3d1",
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      buttonStyle: "pill",
      containerMaxPx: 1320,
      pageBgColor: "#fafaf9",
      blockGap: "lg",
      scrollAnimation: "fade",
      announcementEnabled: true,
      announcementText: "Complimentary gift wrapping",
      announcementColor: "#78716c",
      socialLinks: { instagram: "https://instagram.com" },
    },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description:
      "Electronics megastore — promo strip, category icons, deals & departments. Inspired by Shopify’s Enterprise.",
    category: "digital",
    featured: true,
    inspiredBy: "Enterprise",
    layoutPreview: "electronics",
    preview: { primary: "#1e40af", secondary: "#f59e0b", background: "#ffffff" },
    primaryColor: "#1e40af",
    homeBlocks: enterpriseBlocks,
    theme: {
      secondaryColor: "#f59e0b",
      fontFamily: '"Inter", system-ui, sans-serif',
      buttonStyle: "rounded",
      containerMaxPx: 1280,
      pageBgColor: "#ffffff",
      blockGap: "sm",
      scrollAnimation: "none",
      announcementEnabled: true,
      announcementText: "Spring sale — up to 25% off selected tech",
      announcementColor: "#1e40af",
      hideDefaultNav: false,
      navLinks: [
        { label: "Deals", path: "/collections", header: true },
        { label: "Audio", path: "/collections", header: true },
        { label: "Computing", path: "/collections", header: true },
        { label: "Phones", path: "/collections", header: true },
        { label: "TV", path: "/collections", header: true },
        { label: "Support", path: "/pages/contact", header: true, footer: true },
      ],
      trustBadgesEnabled: true,
    },
  },
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
  {
    id: "origin",
    label: "Origin",
    description: "Single product / D2C — lots of white space, focused catalog.",
    category: "minimal",
    preview: { primary: "#27272a", secondary: "#a1a1aa", background: "#ffffff" },
    primaryColor: "#27272a",
    homeBlocks: originBlocks,
    theme: {
      secondaryColor: "#a1a1aa",
      fontFamily: '"Inter", system-ui, sans-serif',
      buttonStyle: "rounded",
      containerMaxPx: 1100,
      pageBgColor: "#ffffff",
      blockGap: "xl",
      scrollAnimation: "fade",
    },
  },
  {
    id: "spotlight",
    label: "Spotlight",
    description: "One hero + one featured collection — simple launch page.",
    category: "minimal",
    preview: { primary: "#0f172a", secondary: "#475569", background: "#f8fafc" },
    primaryColor: "#0f172a",
    homeBlocks: spotlightBlocks,
    theme: {
      secondaryColor: "#475569",
      buttonStyle: "pill",
      containerMaxPx: 1280,
      pageBgColor: "#f8fafc",
      blockGap: "lg",
      scrollAnimation: "fade",
    },
  },
  {
    id: "publisher",
    label: "Publisher",
    description: "Content + shop — blog-style banner and editorial columns.",
    category: "minimal",
    preview: { primary: "#44403c", secondary: "#78716c", background: "#fafaf9" },
    primaryColor: "#44403c",
    homeBlocks: publisherBlocks,
    theme: {
      secondaryColor: "#78716c",
      fontFamily: "Georgia, serif",
      buttonStyle: "square",
      pageBgColor: "#fafaf9",
      blockGap: "md",
      scrollAnimation: "fade",
    },
  },
  {
    id: "ride",
    label: "Ride",
    description: "Sport & streetwear — sale section and partner logos.",
    category: "sports",
    preview: { primary: "#171717", secondary: "#ef4444", background: "#fafafa" },
    primaryColor: "#171717",
    homeBlocks: rideBlocks,
    theme: {
      secondaryColor: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      buttonStyle: "square",
      blockGap: "md",
      scrollAnimation: "slide",
      announcementEnabled: true,
      announcementText: "Free returns on all orders",
      announcementColor: "#171717",
    },
  },
  {
    id: "colorblock",
    label: "Colorblock",
    description: "Bright editorial blocks — lookbook, new arrivals, bold CTA.",
    category: "fashion",
    preview: { primary: "#ec4899", secondary: "#facc15", background: "#fff1f2" },
    primaryColor: "#ec4899",
    homeBlocks: colorblockBlocks,
    theme: {
      secondaryColor: "#facc15",
      fontFamily: '"DM Sans", system-ui, sans-serif',
      buttonStyle: "pill",
      pageBgColor: "#fff1f2",
      blockGap: "lg",
      scrollAnimation: "slide",
    },
  },
  {
    id: "luxe",
    label: "Luxe",
    description: "Premium beauty — gallery, reviews, featured collection.",
    category: "beauty",
    preview: { primary: "#831843", secondary: "#fda4af", background: "#fff1f2" },
    primaryColor: "#831843",
    homeBlocks: luxeBlocks,
    theme: {
      secondaryColor: "#fda4af",
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      buttonStyle: "pill",
      containerMaxPx: 1320,
      pageBgColor: "#fff1f2",
      blockGap: "lg",
      scrollAnimation: "slide",
      trustBadgesEnabled: true,
    },
  },
  {
    id: "jewelry",
    label: "Jewelry",
    description: "Minimal copy, large visuals — gallery-led catalog.",
    category: "beauty",
    preview: { primary: "#1c1917", secondary: "#d6d3d1", background: "#fafaf9" },
    primaryColor: "#1c1917",
    homeBlocks: jewelryBlocks,
    theme: {
      secondaryColor: "#d6d3d1",
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      buttonStyle: "square",
      containerMaxPx: 1400,
      pageBgColor: "#fafaf9",
      blockGap: "xl",
      scrollAnimation: "fade",
      trustBadgesEnabled: true,
    },
  },
  {
    id: "taste",
    label: "Taste",
    description: "Restaurant & delivery — features, menu products, map.",
    category: "food",
    preview: { primary: "#b45309", secondary: "#f59e0b", background: "#fffbeb" },
    primaryColor: "#b45309",
    homeBlocks: tasteBlocks,
    theme: {
      secondaryColor: "#f59e0b",
      fontFamily: "system-ui, sans-serif",
      buttonStyle: "rounded",
      pageBgColor: "#fffbeb",
      blockGap: "md",
      scrollAnimation: "fade",
    },
  },
  {
    id: "crave",
    label: "Crave",
    description: "Snacks & subscription boxes — FAQ and newsletter.",
    category: "food",
    preview: { primary: "#c2410c", secondary: "#fb923c", background: "#fff7ed" },
    primaryColor: "#c2410c",
    homeBlocks: craveBlocks,
    theme: {
      secondaryColor: "#fb923c",
      buttonStyle: "pill",
      pageBgColor: "#fff7ed",
      blockGap: "md",
      scrollAnimation: "fade",
      announcementEnabled: true,
      announcementText: "Subscribe & save 15%",
      announcementColor: "#c2410c",
    },
  },
  {
    id: "roastery",
    label: "Roastery",
    description: "Coffee & tea — story block, profiles, customer reviews.",
    category: "food",
    preview: { primary: "#422006", secondary: "#92400e", background: "#fef3c7" },
    primaryColor: "#422006",
    homeBlocks: roasteryBlocks,
    theme: {
      secondaryColor: "#92400e",
      fontFamily: "Georgia, serif",
      buttonStyle: "rounded",
      pageBgColor: "#fef3c7",
      blockGap: "lg",
      scrollAnimation: "fade",
    },
  },
  {
    id: "course",
    label: "Course",
    description: "Online course — pricing tiers, FAQ, enrollment CTA.",
    category: "digital",
    preview: { primary: "#1d4ed8", secondary: "#60a5fa", background: "#eff6ff" },
    primaryColor: "#1d4ed8",
    homeBlocks: courseBlocks,
    theme: {
      secondaryColor: "#60a5fa",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      buttonStyle: "rounded",
      pageBgColor: "#eff6ff",
      blockGap: "lg",
      scrollAnimation: "fade",
      trustBadgesEnabled: true,
    },
  },
  {
    id: "saas",
    label: "SaaS",
    description: "Software subscription — features, pricing, social proof logos.",
    category: "digital",
    preview: { primary: "#0f766e", secondary: "#14b8a6", background: "#f0fdfa" },
    primaryColor: "#0f766e",
    homeBlocks: saasBlocks,
    theme: {
      secondaryColor: "#14b8a6",
      fontFamily: '"Inter", system-ui, sans-serif',
      buttonStyle: "rounded",
      containerMaxPx: 1200,
      pageBgColor: "#f0fdfa",
      blockGap: "md",
      scrollAnimation: "fade",
    },
  },
  {
    id: "creator",
    label: "Creator",
    description: "Gumroad-style — digital products, video, creator newsletter.",
    category: "digital",
    preview: { primary: "#7c3aed", secondary: "#a78bfa", background: "#f5f3ff" },
    primaryColor: "#7c3aed",
    homeBlocks: creatorBlocks,
    theme: {
      secondaryColor: "#a78bfa",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      buttonStyle: "pill",
      pageBgColor: "#f5f3ff",
      blockGap: "lg",
      scrollAnimation: "slide",
      socialLinks: { instagram: "https://instagram.com" },
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
  if (category === "all") {
    return [...all].sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  if (category === "featured") return all.filter((t) => t.featured);
  return all.filter((t) => t.category === category);
}

export function listFeaturedThemes(
  custom?: import("@ugclab/tenant/store-theme").CustomThemePreset[]
): StoreThemePreset[] {
  return listAllThemePresets(custom).filter((t) => t.featured);
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
