import type { HomeBlock, HomeSection } from "@ugclab/tenant/store-theme";

export type BlockCategory = "cover" | "content" | "store" | "social" | "layout" | "marketing";

export type BlockCatalogItem = {
  type: HomeSection;
  label: string;
  description: string;
  category: BlockCategory;
  icon: string;
};

export const BLOCK_CATALOG: BlockCatalogItem[] = [
  { type: "hero", label: "Cover", description: "Full-width hero with image", category: "cover", icon: "▣" },
  { type: "text_banner", label: "Text + image", description: "Promo strip with CTA", category: "content", icon: "▤" },
  { type: "image_text", label: "Image & text", description: "Two columns", category: "content", icon: "◫" },
  { type: "cta", label: "Call to action", description: "Headline + button", category: "content", icon: "◎" },
  { type: "html", label: "HTML", description: "Custom markup", category: "content", icon: "</>" },
  { type: "video", label: "Video", description: "YouTube embed", category: "content", icon: "▶" },
  { type: "gallery", label: "Gallery", description: "Image grid", category: "content", icon: "▦" },
  { type: "features", label: "Features", description: "3-column benefits", category: "content", icon: "☰" },
  { type: "products", label: "Catalog", description: "All products", category: "store", icon: "▥" },
  { type: "featured_collection", label: "Collection", description: "Products from collection", category: "store", icon: "▧" },
  { type: "new_arrivals", label: "New arrivals", description: "Latest products", category: "store", icon: "✦" },
  { type: "sale", label: "On sale", description: "Discounted items", category: "store", icon: "%" },
  { type: "reviews", label: "Reviews", description: "Customer quotes", category: "social", icon: "★" },
  { type: "faq", label: "FAQ", description: "Questions & answers", category: "social", icon: "?" },
  { type: "spacer", label: "Spacer", description: "Vertical gap", category: "layout", icon: "↕" },
  { type: "divider", label: "Divider", description: "Horizontal line", category: "layout", icon: "—" },
  { type: "columns", label: "Columns", description: "2–4 column grid", category: "layout", icon: "▦" },
  { type: "newsletter", label: "Newsletter", description: "Email signup (demo)", category: "marketing", icon: "✉" },
  { type: "countdown", label: "Countdown", description: "Sale timer", category: "marketing", icon: "⏱" },
  {
    type: "discount_popup",
    label: "Discount popup",
    description: "Promo modal site-wide",
    category: "marketing",
    icon: "🎁",
  },
  { type: "map", label: "Map", description: "Google Maps embed", category: "marketing", icon: "📍" },
  { type: "logos", label: "Brand logos", description: "Partner / press logos", category: "marketing", icon: "◎" },
  { type: "pricing", label: "Pricing", description: "Plans table", category: "marketing", icon: "$" },
];

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  cover: "Cover",
  content: "Content",
  store: "Store",
  social: "Social proof",
  layout: "Layout",
  marketing: "Marketing",
};

export function catalogByCategory(): { category: BlockCategory; label: string; items: BlockCatalogItem[] }[] {
  const order: BlockCategory[] = ["cover", "content", "store", "social", "marketing", "layout"];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: BLOCK_CATALOG.filter((b) => b.category === category),
  }));
}

export function createBlock(type: HomeSection): HomeBlock {
  const id = `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const base: HomeBlock = { id, type, paddingY: "md", contentWidth: "boxed" };

  switch (type) {
    case "hero":
      return {
        ...base,
        contentWidth: "full",
        paddingY: "none",
        title: "Welcome to your store",
        subtitle: "Add a subtitle and banner image",
        ctaLabel: "Shop now",
        ctaPath: "/collections",
      };
    case "text_banner":
      return {
        ...base,
        title: "Special offer",
        subtitle: "Describe your promotion",
        body: "Limited time only.",
        ctaLabel: "Learn more",
        ctaPath: "/collections",
      };
    case "image_text":
      return {
        ...base,
        title: "Our story",
        subtitle: "Tell customers why you're different.",
        imagePosition: "left",
      };
    case "cta":
      return {
        ...base,
        align: "center",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
        title: "Ready to shop?",
        subtitle: "Browse the catalog and order in minutes.",
        ctaLabel: "View products",
        ctaPath: "/collections",
      };
    case "gallery":
      return { ...base, title: "Gallery", galleryUrls: [] };
    case "features":
      return {
        ...base,
        title: "Why choose us",
        features: [
          { title: "Fast delivery", text: "Ships within 24 hours." },
          { title: "Secure pay", text: "Stripe checkout." },
          { title: "Support", text: "We're here to help." },
        ],
      };
    case "faq":
      return {
        ...base,
        title: "FAQ",
        faqItems: [
          { question: "How long is shipping?", answer: "3–5 business days." },
          { question: "Returns?", answer: "30-day return policy." },
        ],
      };
    case "spacer":
      return { ...base, paddingY: "none", spacerHeight: 48 };
    case "divider":
      return { ...base, paddingY: "sm" };
    case "columns":
      return {
        ...base,
        title: "Three steps",
        columnCount: 3,
        columns: [
          { title: "Step 1", text: "Browse the catalog." },
          { title: "Step 2", text: "Secure checkout." },
          { title: "Step 3", text: "Fast delivery." },
        ],
      };
    case "newsletter":
      return {
        ...base,
        align: "center",
        title: "Subscribe",
        subtitle: "Get updates and exclusive offers.",
        bgColor: "#f4f4f5",
      };
    case "countdown":
      return {
        ...base,
        align: "center",
        title: "Limited offer",
        subtitle: "Ends soon",
        countdownEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        bgColor: "#7c3aed",
        textColor: "#ffffff",
      };
    case "discount_popup":
      return {
        ...base,
        paddingY: "none",
        title: "10% off your first order",
        subtitle: "Use code at checkout",
        body: "Valid for new customers",
        discountCode: "WELCOME10",
        popupDelaySec: 3,
        countdownEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        ctaLabel: "Shop now",
        ctaPath: "/collections",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
      };
    case "map":
      return {
        ...base,
        title: "Visit us",
        mapEmbedUrl: "https://maps.google.com/maps?q=New+York&output=embed",
      };
    case "logos":
      return { ...base, title: "Trusted by", logoUrls: [] };
    case "pricing":
      return {
        ...base,
        title: "Pricing",
        pricingItems: [
          { name: "Basic", price: "$19", features: ["Feature A", "Feature B"], ctaLabel: "Choose" },
          {
            name: "Pro",
            price: "$49",
            features: ["Everything in Basic", "Priority support"],
            ctaLabel: "Choose",
            highlighted: true,
          },
        ],
      };
    default:
      return { ...base, title: BLOCK_CATALOG.find((b) => b.type === type)?.label };
  }
}

export function duplicateBlock(block: HomeBlock): HomeBlock {
  return {
    ...block,
    id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    faqItems: block.faqItems?.map((x) => ({ ...x })),
    features: block.features?.map((x) => ({ ...x })),
    galleryUrls: block.galleryUrls ? [...block.galleryUrls] : undefined,
    logoUrls: block.logoUrls ? [...block.logoUrls] : undefined,
    columns: block.columns?.map((x) => ({ ...x })),
    pricingItems: block.pricingItems?.map((x) => ({
      ...x,
      features: x.features ? [...x.features] : undefined,
    })),
  };
}
