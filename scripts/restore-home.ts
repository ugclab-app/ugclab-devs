/**
 * Restore a clean, ordered Tescommerce homepage (draft + published).
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
const prisma = new PrismaClient();

function id(suffix: string) {
  return `blk_home_${suffix}`;
}

const homeBlocks = [
  {
    id: id("hero"),
    type: "hero",
    contentWidth: "full",
    paddingY: "none",
    align: "center",
    title: "Tescommerce",
    subtitle: "Curated products — fast delivery and checkout you can trust.",
    ctaLabel: "Shop all",
    ctaPath: "/collections",
    visibilityScope: "all",
  },
  {
    id: id("features"),
    type: "features",
    title: "Why shop with us",
    paddingY: "lg",
    contentWidth: "boxed",
    align: "center",
    designVariantId: "features-icons",
    visibilityScope: "all",
    features: [
      {
        title: "Fast shipping",
        text: "Most orders leave the warehouse within 24 hours.",
      },
      {
        title: "Secure checkout",
        text: "Encrypted payments with Stripe and local methods.",
      },
      {
        title: "Easy returns",
        text: "30-day returns on unused items in original packaging.",
      },
    ],
  },
  {
    id: id("products"),
    type: "products",
    title: "Bestsellers",
    subtitle: "Popular picks from the catalog",
    paddingY: "lg",
    contentWidth: "boxed",
    productColumns: 4,
    productLimit: 8,
    visibilityScope: "all",
  },
  {
    id: id("banner"),
    type: "text_banner",
    title: "New season picks",
    subtitle: "Browse collections and find something you’ll love.",
    ctaLabel: "Browse collections",
    ctaPath: "/collections",
    paddingY: "md",
    contentWidth: "boxed",
    align: "center",
    bgColor: "#f5f3ff",
    textColor: "#4c1d95",
    visibilityScope: "all",
  },
  {
    id: id("reviews"),
    type: "reviews",
    title: "What customers say",
    paddingY: "lg",
    contentWidth: "boxed",
    align: "center",
    designVariantId: "reviews-centered",
    reviewLimit: 6,
    reviewShowWhenEmpty: true,
    visibilityScope: "all",
  },
  {
    id: id("newsletter"),
    type: "newsletter",
    title: "Stay in the loop",
    subtitle: "New drops and offers — no spam.",
    paddingY: "lg",
    contentWidth: "boxed",
    bgColor: "#fafafa",
    visibilityScope: "all",
  },
  {
    id: id("contact"),
    type: "contact_form",
    title: "Contact us",
    subtitle: "We typically reply within one business day.",
    ctaLabel: "Send message",
    paddingY: "lg",
    contentWidth: "boxed",
    visibilityScope: "all",
  },
];

const themeExtras = {
  blockGap: "md",
  scrollAnimation: "none",
  pageBgColor: "#ffffff",
  announcementEnabled: true,
  announcementText: "Free shipping on orders over $50 · Easy 30-day returns",
  announcementColor: "#7c3aed",
  hideDefaultNav: false,
  headerShowSearch: true,
  headerSticky: true,
  trustBadgesEnabled: true,
  navLinks: [
    { label: "Shop", path: "/collections", header: true, footer: true },
    { label: "Blog", path: "/blog", header: true, footer: true },
    { label: "Contact", path: "/#contact", header: true, footer: true },
  ],
};

async function main() {
  const t = await prisma.tenant.findUnique({
    where: { slug: "tescommerce" },
    include: { settings: true },
  });
  if (!t?.settings) {
    console.error("tescommerce not found");
    process.exit(1);
  }

  const draft = {
    ...((t.settings.themeDraft as object) ?? {}),
    ...themeExtras,
    homeBlocks,
  };
  const published = {
    ...((t.settings.theme as object) ?? {}),
    ...themeExtras,
    homeBlocks,
  };

  await prisma.storeSettings.update({
    where: { tenantId: t.id },
    data: {
      themeDraft: draft,
      theme: published,
      primaryColor: t.settings.primaryColor || "#7c3aed",
    },
  });

  console.log(
    "Restored homepage:",
    homeBlocks.map((b) => b.type).join(" → ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
