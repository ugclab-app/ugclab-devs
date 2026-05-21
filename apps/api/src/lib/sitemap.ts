import { ProductStatus, prisma } from "@ugclab/database";
import { getStorefrontUrl } from "./storefront.js";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageUrl(base: string, path: string, locale?: string): string {
  const u = new URL(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  u.pathname = p === "/" ? u.pathname : p;
  if (locale && locale !== "en") u.searchParams.set("locale", locale);
  return u.toString();
}

export async function buildStoreSitemapXml(tenantId: string, slug: string): Promise<string> {
  const base = getStorefrontUrl(slug);
  const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
  const locales = settings?.enabledLocales?.length
    ? settings.enabledLocales
    : ["en"];

  const [products, collections, pages] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, status: ProductStatus.ACTIVE },
      select: { slug: true, updatedAt: true },
    }),
    prisma.collection.findMany({
      where: { tenantId },
      select: { slug: true, createdAt: true },
    }),
    prisma.storePage.findMany({
      where: { tenantId, published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const urls: { loc: string; lastmod?: string }[] = [];

  for (const loc of locales) {
    urls.push({ loc: pageUrl(base, "/", loc) });
    urls.push({ loc: pageUrl(base, "/cart", loc) });
  }

  for (const p of products) {
    const lastmod = p.updatedAt.toISOString().slice(0, 10);
    for (const loc of locales) {
      urls.push({
        loc: pageUrl(base, `/product/${p.slug}`, loc),
        lastmod,
      });
    }
  }

  for (const col of collections) {
    const lastmod = col.createdAt.toISOString().slice(0, 10);
    for (const loc of locales) {
      urls.push({
        loc: pageUrl(base, `/collection/${col.slug}`, loc),
        lastmod,
      });
    }
  }

  for (const pg of pages) {
    const lastmod = pg.updatedAt.toISOString().slice(0, 10);
    for (const loc of locales) {
      urls.push({
        loc: pageUrl(base, `/pages/${pg.slug}`, loc),
        lastmod,
      });
    }
  }

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export function buildRobotsTxt(sitemapUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
}
