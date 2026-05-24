import type { HomeBlock, HomeSection } from "@ugclab/tenant/store-theme";
import { createBlock } from "./block-catalog";

export type BlockThumbLayout =
  | "hero-centered"
  | "hero-left"
  | "hero-minimal"
  | "cta-centered"
  | "cta-split"
  | "cta-banner"
  | "text-image-left"
  | "text-image-right"
  | "text-image-stacked"
  | "features-3"
  | "features-4"
  | "features-icons"
  | "gallery-grid"
  | "gallery-masonry"
  | "columns-2"
  | "columns-3"
  | "products-grid"
  | "products-carousel"
  | "faq-accordion"
  | "faq-list"
  | "newsletter-inline"
  | "newsletter-card"
  | "countdown-bold"
  | "countdown-minimal"
  | "generic";

export type BlockDesignVariant = {
  id: string;
  label: string;
  description?: string;
  thumb: BlockThumbLayout;
  patch: Partial<HomeBlock>;
};

const VARIANTS: Partial<Record<HomeSection, BlockDesignVariant[]>> = {
  hero: [
    {
      id: "hero-centered",
      label: "Centered",
      description: "Title and button in the middle",
      thumb: "hero-centered",
      patch: {
        align: "center",
        contentWidth: "full",
        paddingY: "none",
        title: "Fresh & local",
        subtitle: "Order pickup or delivery today.",
        ctaLabel: "Order now",
        ctaPath: "/collections",
      },
    },
    {
      id: "hero-left",
      label: "Left aligned",
      description: "Text on the left, image on the right",
      thumb: "hero-left",
      patch: {
        align: "left",
        contentWidth: "full",
        paddingY: "lg",
        title: "Welcome",
        subtitle: "Discover what we make.",
        ctaLabel: "Shop collection",
        ctaPath: "/collections",
      },
    },
    {
      id: "hero-minimal",
      label: "Minimal",
      description: "Short strip, no button",
      thumb: "hero-minimal",
      patch: {
        align: "center",
        contentWidth: "boxed",
        paddingY: "md",
        title: "New season is here",
        subtitle: "",
        ctaLabel: undefined,
        ctaPath: undefined,
        bgColor: "#f4f4f5",
        textColor: "#18181b",
      },
    },
  ],
  text_banner: [
    {
      id: "banner-cta",
      label: "Promo + button",
      description: "Colored strip with CTA button",
      thumb: "cta-banner",
      patch: {
        align: "center",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
        title: "Free shipping over $50",
        ctaLabel: "Shop now",
      },
    },
    {
      id: "banner-text",
      label: "Text only",
      description: "Simple announcement, no button",
      thumb: "text-image-stacked",
      patch: {
        align: "left",
        bgColor: "#fafafa",
        textColor: "#18181b",
        title: "Summer sale — up to 30% off",
        ctaLabel: undefined,
      },
    },
  ],
  image_text: [
    {
      id: "image-left",
      label: "Image left",
      thumb: "text-image-left",
      patch: { imagePosition: "left", paddingY: "lg" },
    },
    {
      id: "image-right",
      label: "Image right",
      thumb: "text-image-right",
      patch: { imagePosition: "right", paddingY: "lg" },
    },
    {
      id: "image-stacked",
      label: "Image on top",
      thumb: "text-image-stacked",
      patch: {
        align: "center",
        paddingY: "md",
        title: "Our story",
        subtitle: "Crafted with care since day one.",
      },
    },
  ],
  cta: [
    {
      id: "cta-centered",
      label: "Centered",
      thumb: "cta-centered",
      patch: {
        align: "center",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
        title: "Ready to shop?",
        ctaLabel: "View products",
      },
    },
    {
      id: "cta-outline",
      label: "Light box",
      thumb: "cta-split",
      patch: {
        align: "center",
        bgColor: "#f4f4f5",
        textColor: "#18181b",
        title: "Join our community",
        subtitle: "Get tips and early access.",
        ctaLabel: "Learn more",
      },
    },
    {
      id: "cta-dark",
      label: "Dark strip",
      thumb: "cta-banner",
      patch: {
        align: "left",
        contentWidth: "full",
        bgColor: "#18181b",
        textColor: "#ffffff",
        paddingY: "lg",
        ctaLabel: "Shop sale",
      },
    },
  ],
  features: [
    {
      id: "features-3",
      label: "3 columns",
      thumb: "features-3",
      patch: {
        title: "Why choose us",
        features: [
          { title: "Fast delivery", text: "Ships within 24 hours." },
          { title: "Secure pay", text: "Stripe checkout." },
          { title: "Support", text: "We're here to help." },
        ],
      },
    },
    {
      id: "features-4",
      label: "4 columns",
      thumb: "features-4",
      patch: {
        title: "How it works",
        features: [
          { title: "Browse", text: "Find what you need." },
          { title: "Checkout", text: "Fast and secure." },
          { title: "Enjoy", text: "Delivered to you." },
          { title: "Repeat", text: "Come back anytime." },
        ],
      },
    },
  ],
  gallery: [
    {
      id: "gallery-grid",
      label: "Even grid",
      thumb: "gallery-grid",
      patch: { title: "Gallery", galleryUrls: [] },
    },
    {
      id: "gallery-wide",
      label: "Wide strip",
      thumb: "gallery-masonry",
      patch: {
        contentWidth: "full",
        paddingY: "none",
        title: "Lookbook",
      },
    },
  ],
  columns: [
    {
      id: "cols-2",
      label: "2 columns",
      thumb: "columns-2",
      patch: {
        columnCount: 2,
        columns: [
          { title: "Quality", text: "Premium materials." },
          { title: "Service", text: "Friendly support." },
        ],
      },
    },
    {
      id: "cols-3",
      label: "3 columns",
      thumb: "columns-3",
      patch: {
        columnCount: 3,
        title: "How it works",
      },
    },
  ],
  products: [
    {
      id: "products-4col",
      label: "4-column grid",
      thumb: "products-grid",
      patch: { title: "All products", productColumns: 4, productLimit: 8 },
    },
    {
      id: "products-3col",
      label: "3-column grid",
      thumb: "products-grid",
      patch: {
        title: "Shop all",
        productColumns: 3,
        productLimit: 6,
        paddingY: "lg",
      },
    },
  ],
  featured_collection: [
    {
      id: "collection-grid",
      label: "Product grid",
      thumb: "products-grid",
      patch: { title: "Featured", productColumns: 4 },
    },
    {
      id: "collection-compact",
      label: "Compact row",
      thumb: "products-carousel",
      patch: { title: "Bestsellers", productColumns: 3, productLimit: 3 },
    },
  ],
  faq: [
    {
      id: "faq-list",
      label: "Simple list",
      thumb: "faq-list",
      patch: { title: "FAQ" },
    },
    {
      id: "faq-boxed",
      label: "Boxed cards",
      thumb: "faq-accordion",
      patch: {
        align: "center",
        bgColor: "#fafafa",
        paddingY: "lg",
        title: "Questions",
      },
    },
  ],
  newsletter: [
    {
      id: "newsletter-card",
      label: "Card",
      thumb: "newsletter-card",
      patch: {
        align: "center",
        bgColor: "#f4f4f5",
        title: "Subscribe",
        subtitle: "Get updates and offers.",
      },
    },
    {
      id: "newsletter-inline",
      label: "Inline strip",
      thumb: "newsletter-inline",
      patch: {
        align: "left",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
        title: "Join the list",
      },
    },
  ],
  countdown: [
    {
      id: "countdown-bold",
      label: "Bold timer",
      thumb: "countdown-bold",
      patch: {
        align: "center",
        bgColor: "#7c3aed",
        textColor: "#ffffff",
        title: "Limited offer",
      },
    },
    {
      id: "countdown-light",
      label: "Light box",
      thumb: "countdown-minimal",
      patch: {
        align: "center",
        bgColor: "#fef3c7",
        textColor: "#78350f",
        title: "Ends soon",
      },
    },
  ],
  reviews: [
    {
      id: "reviews-grid",
      label: "Quote grid",
      thumb: "features-3",
      patch: { title: "Customer love" },
    },
    {
      id: "reviews-centered",
      label: "Centered title",
      thumb: "cta-centered",
      patch: { align: "center", title: "What people say" },
    },
  ],
  pricing: [
    {
      id: "pricing-3",
      label: "3 plans",
      description: "Three pricing tiers",
      thumb: "features-3",
      patch: { title: "Pricing" },
    },
    {
      id: "pricing-2",
      label: "2 plans",
      description: "Two-column pricing",
      thumb: "columns-2",
      patch: {
        pricingItems: [
          { name: "Starter", price: "$19", ctaLabel: "Choose" },
          { name: "Pro", price: "$49", highlighted: true, ctaLabel: "Choose" },
        ],
      },
    },
  ],
  carousel: [
    {
      id: "carousel-default",
      label: "Horizontal scroll",
      description: "Swipe through images",
      thumb: "gallery-masonry",
      patch: { title: "Highlights" },
    },
    {
      id: "carousel-full",
      label: "Edge to edge",
      description: "Full-width slider",
      thumb: "products-carousel",
      patch: { contentWidth: "full", paddingY: "none", title: "Featured" },
    },
  ],
  video: [
    {
      id: "video-boxed",
      label: "Boxed player",
      description: "Centered embed with padding",
      thumb: "text-image-stacked",
      patch: { align: "center", paddingY: "lg", title: "Watch our story" },
    },
    {
      id: "video-wide",
      label: "Wide player",
      description: "Full-width video",
      thumb: "hero-minimal",
      patch: { contentWidth: "full", paddingY: "md", title: "" },
    },
  ],
  html: [
    {
      id: "html-boxed",
      label: "Boxed",
      description: "Custom code in container",
      thumb: "generic",
      patch: { contentWidth: "boxed", paddingY: "md" },
    },
    {
      id: "html-full",
      label: "Full width",
      description: "Edge-to-edge markup",
      thumb: "cta-banner",
      patch: { contentWidth: "full", paddingY: "none" },
    },
  ],
  new_arrivals: [
    {
      id: "new-4col",
      label: "4 products",
      description: "Grid of latest items",
      thumb: "products-grid",
      patch: { title: "New arrivals", productColumns: 4, productLimit: 4 },
    },
    {
      id: "new-row",
      label: "Compact row",
      description: "3 items in a row",
      thumb: "products-carousel",
      patch: { title: "Just in", productColumns: 3, productLimit: 3 },
    },
  ],
  sale: [
    {
      id: "sale-grid",
      label: "Sale grid",
      description: "Discounted products grid",
      thumb: "products-grid",
      patch: { title: "On sale", productColumns: 4, productLimit: 8 },
    },
    {
      id: "sale-banner",
      label: "With promo banner",
      description: "Title + product row",
      thumb: "cta-banner",
      patch: {
        title: "Sale — up to 40% off",
        productColumns: 3,
        productLimit: 6,
        bgColor: "#fef2f2",
        paddingY: "lg",
      },
    },
  ],
  spacer: [
    {
      id: "spacer-sm",
      label: "Small gap",
      description: "32px space",
      thumb: "generic",
      patch: { spacerHeight: 32, paddingY: "none" },
    },
    {
      id: "spacer-lg",
      label: "Large gap",
      description: "80px space",
      thumb: "generic",
      patch: { spacerHeight: 80, paddingY: "none" },
    },
  ],
  divider: [
    {
      id: "divider-line",
      label: "Simple line",
      description: "Thin horizontal rule",
      thumb: "generic",
      patch: { paddingY: "sm" },
    },
    {
      id: "divider-spaced",
      label: "Spaced section",
      description: "More vertical padding",
      thumb: "generic",
      patch: { paddingY: "lg", bgColor: "#fafafa" },
    },
  ],
  map: [
    {
      id: "map-boxed",
      label: "Boxed map",
      description: "Map in content width",
      thumb: "text-image-stacked",
      patch: { align: "center", paddingY: "lg", title: "Find us" },
    },
    {
      id: "map-full",
      label: "Full width",
      description: "Edge-to-edge map",
      thumb: "hero-minimal",
      patch: { contentWidth: "full", paddingY: "none", title: "" },
    },
  ],
  logos: [
    {
      id: "logos-row",
      label: "Logo row",
      description: "Partners in one line",
      thumb: "features-3",
      patch: { align: "center", title: "As seen in" },
    },
    {
      id: "logos-grid",
      label: "Logo grid",
      description: "Multiple rows",
      thumb: "features-4",
      patch: { title: "Trusted by", paddingY: "lg" },
    },
  ],
  sticky_cta: [
    {
      id: "sticky-shop",
      label: "Shop now",
      description: "Primary button bar",
      thumb: "cta-banner",
      patch: { title: "Shop the collection", ctaLabel: "Shop", ctaPath: "/collections" },
    },
    {
      id: "sticky-offer",
      label: "Limited offer",
      description: "Urgency message",
      thumb: "newsletter-inline",
      patch: {
        title: "Free shipping today",
        ctaLabel: "Order",
        ctaPath: "/collections",
      },
    },
  ],
  instagram_embed: [
    {
      id: "ig-boxed",
      label: "Boxed feed",
      description: "Centered embed",
      thumb: "gallery-grid",
      patch: { align: "center", title: "@yourstore", paddingY: "lg" },
    },
    {
      id: "ig-full",
      label: "Full width",
      description: "Wide Instagram strip",
      thumb: "gallery-masonry",
      patch: { contentWidth: "full", paddingY: "md", title: "Follow us" },
    },
  ],
  product_compare: [
    {
      id: "compare-2",
      label: "Compare 2",
      description: "Side by side",
      thumb: "columns-2",
      patch: { title: "Compare products" },
    },
    {
      id: "compare-3",
      label: "Compare 3",
      description: "Three columns",
      thumb: "columns-3",
      patch: { title: "Which is right for you?", columnCount: 3 },
    },
  ],
  discount_popup: [
    {
      id: "popup-welcome",
      label: "Welcome offer",
      description: "10% off first order",
      thumb: "newsletter-card",
      patch: { title: "10% off your first order", subtitle: "Subscribe to unlock" },
    },
    {
      id: "popup-shipping",
      label: "Free shipping",
      description: "Shipping promo modal",
      thumb: "newsletter-inline",
      patch: { title: "Free shipping unlocked", ctaLabel: "Shop now" },
    },
  ],
  contact_form: [
    {
      id: "contact-boxed",
      label: "Boxed form",
      description: "Centered contact card",
      thumb: "newsletter-card",
      patch: { title: "Contact us" },
    },
    {
      id: "contact-split",
      label: "With intro text",
      description: "Intro text beside form",
      thumb: "text-image-left",
      patch: {
        subtitle: "We reply within one business day.",
        body: "Questions about orders or products.",
      },
    },
  ],
  tabs: [
    {
      id: "tabs-default",
      label: "Standard tabs",
      description: "Horizontal tab bar",
      thumb: "faq-list",
      patch: { title: "Details" },
    },
    {
      id: "tabs-boxed",
      label: "Boxed section",
      description: "Tabs on gray background",
      thumb: "faq-accordion",
      patch: { title: "Product info", bgColor: "#fafafa", paddingY: "lg" },
    },
  ],
  blog_feed: [
    {
      id: "blog-3",
      label: "3 posts",
      description: "Three article cards",
      thumb: "products-grid",
      patch: { title: "From the blog", blogLimit: 3 },
    },
    {
      id: "blog-6",
      label: "6 posts",
      description: "Larger blog grid",
      thumb: "gallery-grid",
      patch: { title: "Latest news", blogLimit: 6, productColumns: 3 },
    },
  ],
};

/** Guarantee at least two layout choices for the design picker */
function ensureMinVariants(list: BlockDesignVariant[]): BlockDesignVariant[] {
  if (list.length >= 2) return list;
  const first = list[0]!;
  return [
    first,
    {
      id: `${first.id}-compact`,
      label: "Compact",
      description: "Less padding, boxed width",
      thumb: first.thumb,
      patch: { ...first.patch, paddingY: "sm", contentWidth: "boxed" },
    },
  ];
}

/** Default single variant for types without custom layouts */
function defaultVariant(type: HomeSection): BlockDesignVariant {
  const item = createBlock(type);
  return {
    id: "default",
    label: "Standard",
    description: "Default layout",
    thumb: "generic",
    patch: { ...item, id: undefined },
  };
}

export function getBlockVariants(type: HomeSection): BlockDesignVariant[] {
  const list = VARIANTS[type];
  const base = list && list.length > 0 ? list : [defaultVariant(type)];
  return ensureMinVariants(base);
}

export function createBlockWithVariant(type: HomeSection, variantId?: string): HomeBlock {
  const base = createBlock(type);
  const variants = getBlockVariants(type);
  const variant = variantId
    ? variants.find((v) => v.id === variantId) ?? variants[0]!
    : variants[0]!;
  return {
    ...base,
    ...variant.patch,
    id: base.id,
    type: base.type,
  };
}
