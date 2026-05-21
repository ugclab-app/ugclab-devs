/** Storefront link for merchant admin (local dev uses ?tenant=slug). */
export function getStorefrontUrl(tenantSlug: string): string {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) return "http://localhost:3002/?tenant=demo";

  const configuredBase = (
    import.meta.env.VITE_STOREFRONT_URL ??
    import.meta.env.STOREFRONT_URL ??
    "http://localhost:3002"
  )
    .toString()
    .trim();

  const baseDomain = (
    import.meta.env.VITE_STOREFRONT_BASE_DOMAIN ??
    import.meta.env.STOREFRONT_BASE_DOMAIN ??
    ""
  )
    .toString()
    .trim();

  const adminIsLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (adminIsLocal) {
    const localBase = configuredBase.includes("localhost")
      ? configuredBase
      : "http://localhost:3002";
    const url = new URL(localBase);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("tenant", slug);
    return url.toString();
  }

  const isLocalBase =
    configuredBase.includes("localhost") ||
    configuredBase.includes("127.0.0.1") ||
    baseDomain.includes("localhost");

  if (
    !isLocalBase &&
    baseDomain &&
    !baseDomain.includes("localhost")
  ) {
    const host = baseDomain.split(":")[0];
    const port = baseDomain.includes(":")
      ? `:${baseDomain.split(":")[1]}`
      : "";
    const protocol = configuredBase.startsWith("https") ? "https:" : "http:";
    return `${protocol}//${slug}.${host}${port}/`;
  }

  const url = new URL(configuredBase);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("tenant", slug);
  return url.toString();
}

export function getStorefrontDisplayHost(tenantSlug: string): string {
  const baseDomain = (
    import.meta.env.VITE_STOREFRONT_BASE_DOMAIN ??
    import.meta.env.STOREFRONT_BASE_DOMAIN
  )?.toString();
  if (baseDomain && !baseDomain.includes("localhost")) {
    return `${tenantSlug}.${baseDomain.split(":")[0]}`;
  }
  const base =
    import.meta.env.VITE_STOREFRONT_URL ??
    import.meta.env.STOREFRONT_URL ??
    "localhost:3002";
  return `${tenantSlug} · ${base}`;
}
