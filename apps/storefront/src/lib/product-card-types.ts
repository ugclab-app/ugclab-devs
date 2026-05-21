export type ProductCardProduct = {
  id: string;
  slug: string;
  title: string;
  priceAmount: number;
  compareAt: number | null;
  currency: string;
  type: string;
  typeLabel: string;
  imageKey?: string | null;
  locale: string;
  tenantSlug: string;
  variantCount?: number;
  defaultVariantId?: string | null;
  inventory?: number | null;
  quickAdd?: boolean;
};
