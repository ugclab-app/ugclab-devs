import { getMessages } from "@ugclab/i18n";
import type { ProductCardProduct } from "@/lib/product-card-types";

export function productTypeLabel(type: string): string {
  const sf = getMessages().storefront;
  if (type === "DIGITAL") return sf.digital;
  if (type === "SERVICE") return "Service";
  return sf.physical;
}

type ListProduct = {
  id: string;
  slug: string;
  title: string;
  priceAmount: number;
  compareAt: number | null;
  type: string;
  imageKey: string | null;
  variantCount?: number;
  defaultVariantId?: string | null;
  inventory?: number | null;
  quickAdd?: boolean;
};

export function productCardProps(
  p: ListProduct,
  opts: {
    currency: string;
    typeLabel: string;
    locale: string;
    tenantSlug: string;
  }
): ProductCardProduct {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    priceAmount: p.priceAmount,
    compareAt: p.compareAt,
    currency: opts.currency,
    type: p.type,
    typeLabel: opts.typeLabel,
    imageKey: p.imageKey,
    locale: opts.locale,
    tenantSlug: opts.tenantSlug,
    variantCount: p.variantCount,
    defaultVariantId: p.defaultVariantId,
    inventory: p.inventory,
    quickAdd: p.quickAdd,
  };
}
