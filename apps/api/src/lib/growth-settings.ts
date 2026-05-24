export type StoreIntegrations = {
  metaPixelId?: string;
  gaMeasurementId?: string;
  tiktokPixelId?: string;
  gtmId?: string;
};

export type PostCheckoutUpsell = {
  enabled?: boolean;
  headline?: string;
  productIds?: string[];
};

export function parseIntegrations(raw: unknown): StoreIntegrations {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    metaPixelId: o.metaPixelId ? String(o.metaPixelId).trim() : undefined,
    gaMeasurementId: o.gaMeasurementId
      ? String(o.gaMeasurementId).trim()
      : undefined,
    tiktokPixelId: o.tiktokPixelId
      ? String(o.tiktokPixelId).trim()
      : undefined,
    gtmId: o.gtmId ? String(o.gtmId).trim() : undefined,
  };
}

export function parsePostCheckoutUpsell(raw: unknown): PostCheckoutUpsell {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const productIds = Array.isArray(o.productIds)
    ? o.productIds.map((id) => String(id)).filter(Boolean)
    : [];
  return {
    enabled: o.enabled === true || o.enabled === "true",
    headline: o.headline ? String(o.headline) : undefined,
    productIds,
  };
}
