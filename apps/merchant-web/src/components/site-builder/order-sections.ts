import type { HomeBlock, HomeSection } from "@ugclab/tenant/store-theme";

/**
 * Canonical page flow (Shopify-style landing):
 * cover → benefits → catalog → story → social proof → capture → contact → overlays
 */
const SECTION_ORDER: HomeSection[] = [
  "hero",
  "features",
  "products",
  "featured_collection",
  "new_arrivals",
  "sale",
  "product_compare",
  "image_text",
  "text_banner",
  "gallery",
  "carousel",
  "video",
  "tabs",
  "columns",
  "reviews",
  "logos",
  "faq",
  "pricing",
  "countdown",
  "cta",
  "newsletter",
  "contact_form",
  "map",
  "blog_feed",
  "instagram_embed",
  "html",
  "spacer",
  "divider",
  "sticky_cta",
  "discount_popup",
];

const ORDER_INDEX = new Map(SECTION_ORDER.map((t, i) => [t, i]));

function rank(type: string): number {
  return ORDER_INDEX.get(type as HomeSection) ?? 500;
}

/** Stable sort: by type rank, keep relative order for same type. */
export function orderSectionsByType(blocks: HomeBlock[]): HomeBlock[] {
  return blocks
    .map((b, i) => ({ b, i }))
    .sort((a, b) => {
      const d = rank(a.b.type) - rank(b.b.type);
      return d !== 0 ? d : a.i - b.i;
    })
    .map(({ b }) => b);
}

export function sectionsAlreadyOrdered(blocks: HomeBlock[]): boolean {
  if (blocks.length < 2) return true;
  const ordered = orderSectionsByType(blocks);
  return ordered.every((b, i) => b.id === blocks[i]?.id);
}
