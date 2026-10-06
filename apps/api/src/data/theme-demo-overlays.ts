import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { THEME_SEED_BY_ID } from "./theme-catalog-seed.js";

function bid(prefix: string, i: number) {
  return `demo_${prefix}_${i}`;
}

function blocksForCategory(
  category: string,
  label: string,
  primary: string,
  secondary: string
): HomeBlock[] {
  const hero: HomeBlock = {
    id: bid("hero", 0),
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    title: label,
    subtitle: `Demo preview — ${category} layout`,
    ctaLabel: "Shop now",
    ctaPath: "/collections",
  };

  const products: HomeBlock = {
    id: bid("products", 1),
    type: "products",
    paddingY: "lg",
    title: "Featured",
  };

  const newsletter: HomeBlock = {
    id: bid("news", 2),
    type: "newsletter",
    title: "Stay in the loop",
    subtitle: "Demo newsletter block",
    paddingY: "lg",
    bgColor: secondary + "22",
  };

  if (category === "food") {
    return [
      hero,
      {
        id: bid("feat", 1),
        type: "features",
        title: "Why us",
        features: [
          { title: "Fresh", text: "Made daily." },
          { title: "Local", text: "Nearby makers." },
          { title: "Fast", text: "Same-day pickup." },
        ],
      },
      products,
      newsletter,
    ];
  }

  if (category === "beauty") {
    return [
      hero,
      {
        id: bid("fc", 1),
        type: "featured_collection",
        title: "Bestsellers",
        collectionSlug: "",
        paddingY: "lg",
      },
      products,
      {
        id: bid("rev", 2),
        type: "reviews",
        title: "Glow notes",
        paddingY: "md",
      },
      newsletter,
    ];
  }

  if (category === "sports" || category === "bold") {
    return [
      hero,
      {
        id: bid("cd", 1),
        type: "countdown",
        title: "Limited drop",
        subtitle: "Demo countdown",
        paddingY: "md",
      },
      products,
      {
        id: bid("cta", 2),
        type: "cta",
        title: "Shop the collection",
        ctaLabel: "Browse",
        ctaPath: "/collections",
        bgColor: primary,
        textColor: "#fff",
        align: "center",
        paddingY: "lg",
      },
    ];
  }

  if (category === "digital") {
    return [
      hero,
      {
        id: bid("price", 1),
        type: "pricing",
        title: "Plans",
        pricingItems: [
          { name: "Starter", price: "$19", features: ["1 seat"], ctaLabel: "Start" },
          {
            name: "Pro",
            price: "$49",
            features: ["Unlimited"],
            ctaLabel: "Go Pro",
            highlighted: true,
          },
        ],
      },
      products,
      newsletter,
    ];
  }

  if (category === "fashion") {
    return [
      hero,
      {
        id: bid("na", 1),
        type: "new_arrivals",
        title: "New arrivals",
        paddingY: "lg",
      },
      {
        id: bid("gal", 2),
        type: "gallery",
        title: "Lookbook",
        paddingY: "md",
      },
      products,
      newsletter,
    ];
  }

  return [
    hero,
    {
      id: bid("fc", 1),
      type: "featured_collection",
      title: "Featured",
      collectionSlug: "",
      paddingY: "lg",
    },
    products,
    {
      id: bid("story", 2),
      type: "image_text",
      title: "Our story",
      subtitle: "Theme demo story section.",
      imagePosition: "right",
      paddingY: "md",
    },
    newsletter,
  ];
}

/** Overlay applied when storefront opens with ?themePreview=catalogId */
export function getThemeDemoOverlay(themeId: string): {
  primaryColor: string;
  themePatch: Record<string, unknown>;
  label: string;
} | null {
  const seed = THEME_SEED_BY_ID.get(themeId);
  if (!seed) return null;

  const homeBlocks = blocksForCategory(
    seed.category,
    seed.label,
    seed.preview.primary,
    seed.preview.secondary
  );

  return {
    primaryColor: seed.preview.primary,
    label: seed.label,
    themePatch: {
      catalogThemeId: seed.id,
      secondaryColor: seed.preview.secondary,
      pageBgColor: seed.preview.background,
      announcementEnabled: true,
      announcementText: `Theme demo: ${seed.label}`,
      announcementColor: seed.preview.primary,
      homeBlocks,
      homeSections: homeBlocks.map((b) => b.type),
    },
  };
}
