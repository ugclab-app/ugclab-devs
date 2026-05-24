import type { StorePage } from "@ugclab/database";

export type StorePageDto = {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  pageType: string;
  published: boolean;
  publishAt: string | null;
  authorName: string | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  createdAt: string;
  updatedAt: string;
  scheduled: boolean;
  status: "draft" | "scheduled" | "published";
};

export function parsePageTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function parsePublishAt(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPageScheduled(page: {
  publishAt: Date | null;
}): boolean {
  return !!page.publishAt && page.publishAt > new Date();
}

export function isPageLive(page: {
  published: boolean;
  publishAt: Date | null;
}): boolean {
  if (!page.published) return false;
  if (page.publishAt && page.publishAt > new Date()) return false;
  return true;
}

export function pageStatus(page: {
  published: boolean;
  publishAt: Date | null;
}): StorePageDto["status"] {
  if (!page.published) return "draft";
  if (isPageScheduled(page)) return "scheduled";
  return "published";
}

export function serializeStorePage(page: StorePage): StorePageDto {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    body: page.body,
    excerpt: page.excerpt,
    featuredImageUrl: page.featuredImageUrl,
    pageType: page.pageType,
    published: page.published,
    publishAt: page.publishAt?.toISOString() ?? null,
    authorName: page.authorName,
    tags: page.tags ?? [],
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    ogImageUrl: page.ogImageUrl,
    canonicalUrl: page.canonicalUrl,
    noindex: page.noindex,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    scheduled: isPageScheduled(page),
    status: pageStatus(page),
  };
}

export function storePagePublicWhere(
  tenantId: string,
  extra: Record<string, unknown> = {},
  preview = false
) {
  const now = new Date();
  if (preview) {
    return { tenantId, ...extra };
  }
  return {
    tenantId,
    published: true,
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    ...extra,
  };
}

export function buildPageSeo(page: {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string | null;
  ogImageUrl: string | null;
  featuredImageUrl: string | null;
  noindex: boolean;
  canonicalUrl: string | null;
}) {
  const title = page.metaTitle?.trim() || page.title;
  const description =
    page.metaDescription?.trim() ||
    page.excerpt?.trim() ||
    undefined;
  const image = page.ogImageUrl || page.featuredImageUrl || undefined;
  return {
    seoTitle: title,
    seoDescription: description,
    ogImageUrl: image,
    noindex: page.noindex,
    canonicalUrl: page.canonicalUrl?.trim() || undefined,
  };
}
