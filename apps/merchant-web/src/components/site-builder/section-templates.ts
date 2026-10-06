import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { reidBlocks } from "@ugclab/tenant/store-theme";
import { createBlockWithVariant } from "./block-variants";

export type SectionTemplateCategory =
  | "all"
  | "product"
  | "promo"
  | "trust"
  | "content"
  | "store";

export type SectionTemplate = {
  id: string;
  label: string;
  description: string;
  category: Exclude<SectionTemplateCategory, "all">;
  icon: string;
  /** Block count shown in picker */
  blockCount: number;
  build: () => HomeBlock[];
};

const CATEGORY_LABELS: Record<Exclude<SectionTemplateCategory, "all">, string> = {
  product: "Product",
  promo: "Promo & sale",
  trust: "Trust & social",
  content: "Content",
  store: "Store",
};

function section(blocks: HomeBlock[]): HomeBlock[] {
  return reidBlocks(blocks);
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "about-brand",
    label: "About the brand",
    description: "Story image + three benefits with icons",
    category: "content",
    icon: "◫",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("image_text", "image-left"),
        {
          ...createBlockWithVariant("features", "features-icons"),
          title: "Why shoppers choose us",
          features: [
            { title: "Fast shipping", text: "Most orders ship within 24 hours." },
            { title: "Secure payments", text: "Encrypted checkout with Stripe." },
            { title: "Easy returns", text: "30-day hassle-free returns." },
          ],
        },
      ]),
  },
  {
    id: "benefits-row",
    label: "Benefits",
    description: "Three-column feature cards",
    category: "trust",
    icon: "☰",
    blockCount: 1,
    build: () =>
      section([
        {
          ...createBlockWithVariant("features", "features-3"),
          title: "Why choose us",
          features: [
            { title: "Fast delivery", text: "Ships within 24 hours." },
            { title: "Secure pay", text: "Stripe checkout." },
            { title: "Support", text: "We're here to help." },
          ],
        },
      ]),
  },
  {
    id: "sale-strip",
    label: "Sale promo",
    description: "Colored banner + on-sale products",
    category: "promo",
    icon: "%",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("text_banner", "banner-cta"),
        createBlockWithVariant("sale", "sale-grid"),
      ]),
  },
  {
    id: "hero-shop",
    label: "Hero + collection",
    description: "Cover banner and featured products",
    category: "store",
    icon: "▣",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("hero", "hero-centered"),
        {
          ...createBlockWithVariant("featured_collection", "collection-grid"),
          title: "Featured collection",
        },
      ]),
  },
  {
    id: "trust-reviews",
    label: "Trust + reviews",
    description: "Benefits and customer quotes",
    category: "trust",
    icon: "★",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("features", "features-3"),
        {
          ...createBlockWithVariant("reviews", "reviews-centered"),
          title: "What customers say",
        },
      ]),
  },
  {
    id: "newsletter-cta",
    label: "Newsletter + CTA",
    description: "Email signup and shop button",
    category: "promo",
    icon: "✉",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("newsletter", "newsletter-card"),
        createBlockWithVariant("cta", "cta-centered"),
      ]),
  },
  {
    id: "faq-block",
    label: "FAQ",
    description: "Common questions accordion-style",
    category: "content",
    icon: "?",
    blockCount: 1,
    build: () => section([createBlockWithVariant("faq", "faq-boxed")]),
  },
  {
    id: "story-cta",
    label: "Story + CTA",
    description: "Image & text then call to action",
    category: "content",
    icon: "◎",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("image_text", "image-right"),
          title: "Crafted with care",
          subtitle: "Tell your brand story in a few sentences.",
        },
        createBlockWithVariant("cta", "cta-dark"),
      ]),
  },
  {
    id: "social-logos",
    label: "Press & partners",
    description: "Reviews strip and logo row",
    category: "trust",
    icon: "◎",
    blockCount: 2,
    build: () =>
      section([
        createBlockWithVariant("reviews", "reviews-grid"),
        createBlockWithVariant("logos", "logos-row"),
      ]),
  },
  {
    id: "mini-landing",
    label: "Mini landing",
    description: "Hero, benefits, catalog, newsletter",
    category: "store",
    icon: "▦",
    blockCount: 4,
    build: () =>
      section([
        createBlockWithVariant("hero", "hero-left"),
        createBlockWithVariant("features", "features-icons"),
        createBlockWithVariant("products", "products-4col"),
        createBlockWithVariant("newsletter", "newsletter-inline"),
      ]),
  },

  // —— Product page sections ——
  {
    id: "pdp-size-care",
    label: "Size & care",
    description: "Tabs for description, shipping, and returns",
    category: "product",
    icon: "▤",
    blockCount: 1,
    build: () =>
      section([
        {
          ...createBlockWithVariant("tabs", "tabs-boxed"),
          title: "Size & care",
          tabItems: [
            {
              label: "Description",
              body: "Materials, fit, and how this product is made.",
            },
            {
              label: "Shipping",
              body: "Ships in 1–3 business days. Free shipping over $50.",
            },
            {
              label: "Returns",
              body: "30-day returns on unused items in original packaging.",
            },
          ],
        },
      ]),
  },
  {
    id: "pdp-product-story",
    label: "Product story",
    description: "Image & text plus benefit icons",
    category: "product",
    icon: "◫",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("image_text", "image-left"),
          title: "Designed for everyday use",
          subtitle: "Tell the story behind this product in a short paragraph.",
        },
        {
          ...createBlockWithVariant("features", "features-icons"),
          title: "What you get",
          features: [
            { title: "Quality materials", text: "Built to last through daily wear." },
            { title: "Thoughtful details", text: "Finishes that feel premium in hand." },
            { title: "Easy care", text: "Simple cleaning — ready for next use." },
          ],
        },
      ]),
  },
  {
    id: "pdp-how-it-works",
    label: "How it works",
    description: "Three clear steps",
    category: "product",
    icon: "☰",
    blockCount: 1,
    build: () =>
      section([
        {
          ...createBlockWithVariant("features", "features-3"),
          title: "How it works",
          subtitle: "Three simple steps",
          features: [
            { title: "1. Choose", text: "Pick your size, color, or bundle." },
            { title: "2. Order", text: "Checkout securely in under a minute." },
            { title: "3. Enjoy", text: "We ship fast — use it the same week." },
          ],
        },
      ]),
  },
  {
    id: "pdp-lifestyle-gallery",
    label: "Lifestyle gallery",
    description: "Image gallery with a carousel strip",
    category: "product",
    icon: "▦",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("gallery", "gallery-grid"),
          title: "See it in real life",
          subtitle: "Add lifestyle photos of this product.",
        },
        {
          ...createBlockWithVariant("carousel", "carousel-default"),
          title: "More angles",
        },
      ]),
  },
  {
    id: "pdp-video-demo",
    label: "Video demo",
    description: "Product video and shop CTA",
    category: "product",
    icon: "▶",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("video", "video-boxed"),
          title: "Watch the demo",
          subtitle: "Paste a YouTube URL to show how it works.",
        },
        {
          ...createBlockWithVariant("cta", "cta-centered"),
          title: "Ready to try it?",
          ctaLabel: "Add to cart",
          ctaPath: "#",
        },
      ]),
  },
  {
    id: "pdp-pair-with",
    label: "Pair with",
    description: "Cross-sell catalog and new arrivals",
    category: "product",
    icon: "▥",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("products", "products-4col"),
          title: "Pair with",
          subtitle: "Complete the look",
          productLimit: 4,
        },
        {
          ...createBlockWithVariant("new_arrivals", "new-4col"),
          title: "New arrivals",
          productLimit: 4,
        },
      ]),
  },
  {
    id: "pdp-compare",
    label: "Compare",
    description: "Side-by-side product comparison",
    category: "product",
    icon: "⚖",
    blockCount: 1,
    build: () =>
      section([
        {
          ...createBlockWithVariant("product_compare", "compare-2"),
          title: "Compare options",
          subtitle: "Help shoppers pick the right one.",
        },
      ]),
  },
  {
    id: "pdp-urgency",
    label: "Urgency",
    description: "Countdown timer and sale banner",
    category: "product",
    icon: "⏱",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("countdown", "countdown-bold"),
          title: "Offer ends soon",
          subtitle: "Don’t miss this deal",
        },
        {
          ...createBlockWithVariant("text_banner", "banner-cta"),
          title: "Limited-time sale",
          subtitle: "Save while stock lasts.",
          ctaLabel: "Shop the deal",
        },
      ]),
  },
  {
    id: "pdp-social-proof",
    label: "Social proof",
    description: "Customer reviews and brand logos",
    category: "product",
    icon: "★",
    blockCount: 2,
    build: () =>
      section([
        {
          ...createBlockWithVariant("reviews", "reviews-centered"),
          title: "Loved by customers",
        },
        {
          ...createBlockWithVariant("logos", "logos-row"),
          title: "As featured in",
        },
      ]),
  },
  {
    id: "pdp-sticky-buy",
    label: "Sticky buy bar",
    description: "Mobile sticky CTA under the fold",
    category: "product",
    icon: "↓",
    blockCount: 1,
    build: () =>
      section([
        {
          ...createBlockWithVariant("sticky_cta", "sticky-shop"),
          title: "Add this to your cart",
          ctaLabel: "Buy now",
          ctaPath: "#",
        },
      ]),
  },
];

export function getSectionTemplate(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((t) => t.id === id);
}

export function sectionTemplatesByCategory(
  category: SectionTemplateCategory,
): SectionTemplate[] {
  if (category === "all") return SECTION_TEMPLATES;
  return SECTION_TEMPLATES.filter((t) => t.category === category);
}

export function sectionCategoryLabel(
  category: Exclude<SectionTemplateCategory, "all">,
): string {
  return CATEGORY_LABELS[category];
}
