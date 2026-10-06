export function getStorefrontUrl(tenantSlug: string): string {
  const configured = process.env.STOREFRONT_URL?.trim();
  const base =
    configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")
      ? configured
      : process.env.VERCEL
        ? "https://tescommerce.com"
        : (configured || "http://localhost:3002");
  const url = new URL(base);
  url.pathname = "/";
  url.search = "";
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
