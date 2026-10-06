/** Snapshot of StoreSettings fields required by PATCH /merchant/settings. */
export function settingsPatchFromTenant(
  tenant: {
    name: string;
    slug: string;
    settings?: Record<string, unknown> | null;
  },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const s = (tenant.settings ?? {}) as Record<string, unknown>;
  return {
    name: tenant.name,
    slug: tenant.slug,
    currency: s.currency ?? "USD",
    defaultLocale: s.defaultLocale ?? "en",
    enabledLocales: Array.isArray(s.enabledLocales) ? s.enabledLocales : ["en"],
    timezone: s.timezone ?? "UTC",
    primaryColor: s.primaryColor ?? "#7c3aed",
    logoUrl: s.logoUrl ?? "",
    faviconUrl: s.faviconUrl ?? "",
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    businessAddress: s.businessAddress ?? "",
    emailFromName: s.emailFromName ?? "",
    emailReplyTo: s.emailReplyTo ?? "",
    emailDoubleOptIn: s.emailDoubleOptIn === true,
    privacyUrl: s.privacyUrl ?? "",
    refundUrl: s.refundUrl ?? "",
    privacyPolicy: s.privacyPolicy ?? "",
    refundPolicy: s.refundPolicy ?? "",
    termsOfService: s.termsOfService ?? "",
    termsUrl: s.termsUrl ?? "",
    shippingPolicy: s.shippingPolicy ?? "",
    shippingUrl: s.shippingUrl ?? "",
    legalNotice: s.legalNotice ?? "",
    legalNoticeUrl: s.legalNoticeUrl ?? "",
    contactPolicy: s.contactPolicy ?? "",
    returnRules: s.returnRules ?? "",
    digitalLinkDays: s.digitalLinkDays ?? 30,
    notifyNewOrders: s.notifyNewOrders !== false,
    notifyLowStock: s.notifyLowStock !== false,
    abandonedCartEnabled: s.abandonedCartEnabled !== false,
    taxRateBps: s.taxRateBps ?? 0,
    taxIncluded: s.taxIncluded === true,
    stripeTaxEnabled: s.stripeTaxEnabled === true,
    seoTitle: s.seoTitle ?? "",
    seoDescription: s.seoDescription ?? "",
    seoOgImageUrl: s.seoOgImageUrl ?? "",
    lowStockThreshold: s.lowStockThreshold ?? 5,
    ...overrides,
  };
}
