import { getStorefrontUrl } from "@/lib/storefront";

export type PagePreviewInput = {
  pageType: string;
  slug: string;
  published: boolean;
  status?: string;
};

export function getPageStorefrontPath(page: PagePreviewInput): string {
  return page.pageType === "BLOG" ? `/blog/${page.slug}` : `/pages/${page.slug}`;
}

export function getPagePreviewUrl(
  tenantSlug: string,
  page: PagePreviewInput
): string {
  const base = getStorefrontUrl(tenantSlug);
  const url = new URL(getPageStorefrontPath(page), base.endsWith("/") ? base : `${base}/`);
  if (!page.published || page.status === "draft" || page.status === "scheduled") {
    url.searchParams.set("preview", "1");
  }
  return url.toString();
}
