import { prisma, ProductStatus, ProductType } from "@ugclab/database";
import { themesDiffer } from "./storefront-theme-resolve.js";
import { readThemeDraftMeta } from "./theme-meta.js";

export type PulseCard = {
  id: string;
  kind: "low_stock" | "unpublished_theme" | "abandoned_carts";
  title: string;
  description: string;
  href: string;
  count?: number;
};

export async function getMerchantPulse(tenantId: string): Promise<PulseCard[]> {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: {
      theme: true,
      themeDraft: true,
      lowStockThreshold: true,
      currency: true,
    },
  });
  const threshold = settings?.lowStockThreshold ?? 5;

  const [lowStock, abandonedOpen] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        status: ProductStatus.ACTIVE,
        type: ProductType.PHYSICAL,
        inventory: { lte: threshold },
      },
      select: { id: true, title: true, inventory: true },
      orderBy: { inventory: "asc" },
      take: 5,
    }),
    prisma.abandonedCart.count({
      where: { tenantId, convertedAt: null },
    }),
  ]);

  const cards: PulseCard[] = [];

  if (lowStock.length > 0) {
    const names = lowStock.map((p) => p.title).join(", ");
    cards.push({
      id: "low_stock",
      kind: "low_stock",
      title: "Low stock",
      description:
        lowStock.length === 1
          ? `${lowStock[0]!.title} has ${lowStock[0]!.inventory ?? 0} left`
          : `${lowStock.length} products at or below ${threshold} units (${names})`,
      href: "/products?lowStock=1",
      count: lowStock.length,
    });
  }

  if (settings && themesDiffer(settings.theme, settings.themeDraft)) {
    const { publishAt } = readThemeDraftMeta(settings.themeDraft);
    cards.push({
      id: "unpublished_theme",
      kind: "unpublished_theme",
      title: "Unpublished theme changes",
      description: publishAt
        ? `Draft differs from live · scheduled ${new Date(publishAt).toLocaleString()}`
        : "Your theme draft has changes not yet published to the live store.",
      href: "/storefront",
    });
  }

  if (abandonedOpen > 0) {
    cards.push({
      id: "abandoned_carts",
      kind: "abandoned_carts",
      title: "Abandoned checkouts",
      description: `${abandonedOpen} open cart${abandonedOpen === 1 ? "" : "s"} waiting for recovery.`,
      href: "/abandoned-carts",
      count: abandonedOpen,
    });
  }

  return cards;
}
