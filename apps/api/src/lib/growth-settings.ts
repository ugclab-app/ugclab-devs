export type StoreIntegrations = {
  metaPixelId?: string;
  metaCapiAccessToken?: string;
  gaMeasurementId?: string;
  tiktokPixelId?: string;
  tiktokAccessToken?: string;
  gtmId?: string;
  /** When true, public AI catalog feed is enabled for this store. */
  aiCatalogEnabled?: boolean;
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
    metaCapiAccessToken: o.metaCapiAccessToken
      ? String(o.metaCapiAccessToken).trim()
      : undefined,
    gaMeasurementId: o.gaMeasurementId
      ? String(o.gaMeasurementId).trim()
      : undefined,
    tiktokPixelId: o.tiktokPixelId
      ? String(o.tiktokPixelId).trim()
      : undefined,
    tiktokAccessToken: o.tiktokAccessToken
      ? String(o.tiktokAccessToken).trim()
      : undefined,
    gtmId: o.gtmId ? String(o.gtmId).trim() : undefined,
    aiCatalogEnabled:
      o.aiCatalogEnabled === true || o.aiCatalogEnabled === "true",
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

/** Public-safe integrations (never expose CAPI / TikTok access tokens). */
export function publicIntegrations(raw: unknown): StoreIntegrations {
  const full = parseIntegrations(raw);
  return {
    metaPixelId: full.metaPixelId,
    gaMeasurementId: full.gaMeasurementId,
    tiktokPixelId: full.tiktokPixelId,
    gtmId: full.gtmId,
    aiCatalogEnabled: full.aiCatalogEnabled,
  };
}
