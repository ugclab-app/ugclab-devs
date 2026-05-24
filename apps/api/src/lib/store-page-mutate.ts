import type { Prisma } from "@ugclab/database";
import { parsePageTags, parsePublishAt } from "./store-page.js";

export function buildStorePageCreateData(
  tenantId: string,
  body: Record<string, unknown>
): { data: Prisma.StorePageCreateInput; error?: string } {
  const title = String(body.title ?? "").trim();
  if (!title) return { data: {} as Prisma.StorePageCreateInput, error: "Title required" };
  const publishAt = parsePublishAt(body.publishAt);
  const published =
    body.published === false || body.published === "false" ? false : true;

  return {
    data: {
      tenant: { connect: { id: tenantId } },
      title,
      slug: String(body.slug ?? "").trim(),
      body: String(body.body ?? ""),
      excerpt: body.excerpt != null ? String(body.excerpt).trim() || null : null,
      featuredImageUrl:
        body.featuredImageUrl != null
          ? String(body.featuredImageUrl).trim() || null
          : null,
      pageType: body.pageType === "BLOG" ? "BLOG" : "PAGE",
      published,
      publishAt: publishAt ?? null,
      authorName:
        body.authorName != null ? String(body.authorName).trim() || null : null,
      tags: parsePageTags(body.tags),
      metaTitle:
        body.metaTitle != null ? String(body.metaTitle).trim() || null : null,
      metaDescription:
        body.metaDescription != null
          ? String(body.metaDescription).trim() || null
          : null,
      ogImageUrl:
        body.ogImageUrl != null ? String(body.ogImageUrl).trim() || null : null,
      canonicalUrl:
        body.canonicalUrl != null
          ? String(body.canonicalUrl).trim() || null
          : null,
      noindex: body.noindex === true || body.noindex === "true",
    },
  };
}

export function buildStorePageUpdateData(
  body: Record<string, unknown>
): Prisma.StorePageUpdateInput {
  const publishAt = parsePublishAt(body.publishAt);
  return {
    ...(body.title != null ? { title: String(body.title).trim() } : {}),
    ...(body.slug != null ? { slug: String(body.slug).trim() } : {}),
    ...(body.body != null ? { body: String(body.body) } : {}),
    ...(body.excerpt != null
      ? { excerpt: String(body.excerpt).trim() || null }
      : {}),
    ...(body.featuredImageUrl != null
      ? { featuredImageUrl: String(body.featuredImageUrl).trim() || null }
      : {}),
    ...(body.pageType != null
      ? { pageType: body.pageType === "BLOG" ? "BLOG" : "PAGE" }
      : {}),
    ...(body.published != null
      ? {
          published:
            body.published === true ||
            body.published === "true" ||
            body.published === "on",
        }
      : {}),
    ...(body.publishAt !== undefined ? { publishAt: publishAt ?? null } : {}),
    ...(body.authorName != null
      ? { authorName: String(body.authorName).trim() || null }
      : {}),
    ...(body.tags != null ? { tags: parsePageTags(body.tags) } : {}),
    ...(body.metaTitle != null
      ? { metaTitle: String(body.metaTitle).trim() || null }
      : {}),
    ...(body.metaDescription != null
      ? { metaDescription: String(body.metaDescription).trim() || null }
      : {}),
    ...(body.ogImageUrl != null
      ? { ogImageUrl: String(body.ogImageUrl).trim() || null }
      : {}),
    ...(body.canonicalUrl != null
      ? { canonicalUrl: String(body.canonicalUrl).trim() || null }
      : {}),
    ...(body.noindex != null
      ? { noindex: body.noindex === true || body.noindex === "true" }
      : {}),
  };
}
