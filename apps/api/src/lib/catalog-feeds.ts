import { uploadPublicUrl } from "./uploads.js";

export type FeedProduct = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  /** ProductType string — avoid importing Prisma client in unit tests. */
  type: string;
  priceAmount: number;
  inventory: number | null;
  images: { storageKey: string }[];
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function absoluteApiUrl(apiBase: string, path: string): string {
  const base = apiBase.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function productLink(storefrontBaseUrl: string, slug: string): string {
  try {
    const u = new URL(storefrontBaseUrl);
    u.searchParams.set("path", `/products/${slug}`);
    return u.toString();
  } catch {
    return `${storefrontBaseUrl}${storefrontBaseUrl.includes("?") ? "&" : "?"}path=${encodeURIComponent(`/products/${slug}`)}`;
  }
}

function availability(p: FeedProduct): "in stock" | "out of stock" {
  if (p.type !== "PHYSICAL") return "in stock";
  if (p.inventory == null) return "in stock";
  return p.inventory > 0 ? "in stock" : "out of stock";
}

function priceLabel(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function buildGoogleMerchantRss(opts: {
  storeName: string;
  storefrontUrl: string;
  apiPublicUrl: string;
  currency: string;
  products: FeedProduct[];
}): string {
  const items = opts.products
    .map((p) => {
      const title = escapeXml(p.title.slice(0, 150));
      const desc = escapeXml(
        stripHtml(p.description ?? p.title).slice(0, 5000) || p.title
      );
      const link = escapeXml(productLink(opts.storefrontUrl, p.slug));
      const imageKey = p.images[0]?.storageKey;
      const image = imageKey
        ? escapeXml(absoluteApiUrl(opts.apiPublicUrl, uploadPublicUrl(imageKey)))
        : "";
      const price = escapeXml(priceLabel(p.priceAmount, opts.currency));
      const avail = availability(p);
      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>
      ${image ? `<g:image_link>${image}</g:image_link>` : ""}
      <g:availability>${avail}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${price}</g:price>
      <g:brand>${escapeXml(opts.storeName.slice(0, 70))}</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(opts.storeName)}</title>
    <link>${escapeXml(opts.storefrontUrl)}</link>
    <description>Product feed for ${escapeXml(opts.storeName)}</description>
${items}
  </channel>
</rss>
`;
}

/** Meta Commerce / TikTok catalog CSV (same column set). */
export function buildMetaCatalogCsv(opts: {
  storeName: string;
  storefrontUrl: string;
  apiPublicUrl: string;
  currency: string;
  products: FeedProduct[];
}): string {
  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
  ].join(",");

  const rows = opts.products.map((p) => {
    const imageKey = p.images[0]?.storageKey;
    const image = imageKey
      ? absoluteApiUrl(opts.apiPublicUrl, uploadPublicUrl(imageKey))
      : "";
    return [
      csvEscape(p.id),
      csvEscape(p.title.slice(0, 200)),
      csvEscape(stripHtml(p.description ?? p.title).slice(0, 9999)),
      csvEscape(availability(p)),
      "new",
      csvEscape(priceLabel(p.priceAmount, opts.currency)),
      csvEscape(productLink(opts.storefrontUrl, p.slug)),
      csvEscape(image),
      csvEscape(opts.storeName.slice(0, 100)),
    ].join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}
