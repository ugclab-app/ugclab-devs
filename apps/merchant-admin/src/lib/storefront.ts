export function getStorefrontUrl(tenantSlug: string): string {
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const url = new URL(base);
  url.searchParams.set("tenant", tenantSlug);
  return url.toString();
}

export function getStorefrontDisplayHost(tenantSlug: string): string {
  const baseDomain = process.env.STOREFRONT_BASE_DOMAIN;
  if (baseDomain && !baseDomain.includes("localhost")) {
    return `${tenantSlug}.${baseDomain.split(":")[0]}`;
  }
  return `${tenantSlug} · ${process.env.STOREFRONT_URL ?? "localhost:3002"}`;
}
