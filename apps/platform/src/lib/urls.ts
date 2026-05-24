const DEMO_SLUG = "tescommerce";

export const merchantAdminUrl =
  import.meta.env.VITE_MERCHANT_ADMIN_URL ??
  (import.meta.env.PROD ? "https://admin.tescommerce.com" : "http://localhost:3001");

/** Live demo storefront (seed tenant). */
export function demoStoreUrl(): string {
  const explicit = import.meta.env.VITE_DEMO_STORE_URL?.trim();
  if (explicit) return explicit;

  if (import.meta.env.DEV) {
    return `http://localhost:3002/?tenant=${DEMO_SLUG}`;
  }

  const baseDomain = (
    import.meta.env.VITE_STOREFRONT_BASE_DOMAIN ??
    import.meta.env.STOREFRONT_BASE_DOMAIN ??
    ""
  )
    .toString()
    .trim()
    .replace(/^https?:\/\//, "")
    .split(":")[0];

  if (baseDomain && !baseDomain.includes("localhost")) {
    return `https://${DEMO_SLUG}.${baseDomain}`;
  }

  const storefrontBase = (
    import.meta.env.VITE_STOREFRONT_URL ?? "https://tescommerce.com"
  ).toString();
  const url = new URL(storefrontBase);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("tenant", DEMO_SLUG);
  return url.toString();
}
