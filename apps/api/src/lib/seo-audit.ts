/** Pure SEO checklist for a merchant store — no I/O so it is unit-testable. */

export type SeoAuditInput = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoOgImageUrl?: string | null;
  activeProducts: number;
  productsMissingSeoTitle: number;
  productsMissingSeoDescription: number;
  collectionsWithSeo: number;
  collectionsTotal: number;
  hasCustomDomain: boolean;
  blogPosts: number;
};

export type SeoCheck = {
  id: string;
  ok: boolean;
  weight: number;
  message: string;
};

export type SeoAuditResult = {
  score: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
};

function grade(score: number, max: number): SeoAuditResult["grade"] {
  const pct = max <= 0 ? 0 : (score / max) * 100;
  if (pct >= 90) return "A";
  if (pct >= 75) return "B";
  if (pct >= 60) return "C";
  if (pct >= 40) return "D";
  return "F";
}

export function auditStoreSeo(input: SeoAuditInput): SeoAuditResult {
  const titleLen = (input.seoTitle ?? "").trim().length;
  const descLen = (input.seoDescription ?? "").trim().length;
  const checks: SeoCheck[] = [
    {
      id: "store_title",
      ok: titleLen >= 15 && titleLen <= 60,
      weight: 15,
      message:
        titleLen === 0
          ? "Add a default store meta title (15–60 characters)."
          : titleLen < 15 || titleLen > 60
            ? `Store title is ${titleLen} chars — aim for 15–60.`
            : "Store meta title looks good.",
    },
    {
      id: "store_description",
      ok: descLen >= 50 && descLen <= 160,
      weight: 15,
      message:
        descLen === 0
          ? "Add a meta description (50–160 characters)."
          : descLen < 50 || descLen > 160
            ? `Description is ${descLen} chars — aim for 50–160.`
            : "Store meta description looks good.",
    },
    {
      id: "og_image",
      ok: Boolean(input.seoOgImageUrl?.trim()),
      weight: 10,
      message: input.seoOgImageUrl?.trim()
        ? "Open Graph image is set."
        : "Add an OG image for social sharing.",
    },
    {
      id: "product_seo_titles",
      ok: input.activeProducts === 0 || input.productsMissingSeoTitle === 0,
      weight: 20,
      message:
        input.activeProducts === 0
          ? "No active products yet."
          : input.productsMissingSeoTitle === 0
            ? "All active products have SEO titles."
            : `${input.productsMissingSeoTitle} of ${input.activeProducts} products missing SEO title.`,
    },
    {
      id: "product_seo_descriptions",
      ok: input.activeProducts === 0 || input.productsMissingSeoDescription === 0,
      weight: 15,
      message:
        input.activeProducts === 0
          ? "No active products yet."
          : input.productsMissingSeoDescription === 0
            ? "All active products have SEO descriptions."
            : `${input.productsMissingSeoDescription} products missing SEO description.`,
    },
    {
      id: "collection_seo",
      ok: input.collectionsTotal === 0 || input.collectionsWithSeo >= Math.ceil(input.collectionsTotal / 2),
      weight: 10,
      message:
        input.collectionsTotal === 0
          ? "No collections yet."
          : `${input.collectionsWithSeo}/${input.collectionsTotal} collections have SEO copy.`,
    },
    {
      id: "custom_domain",
      ok: input.hasCustomDomain,
      weight: 10,
      message: input.hasCustomDomain
        ? "Custom domain connected."
        : "Connect a custom domain (stronger branding in search).",
    },
    {
      id: "blog_content",
      ok: input.blogPosts >= 1,
      weight: 5,
      message: input.blogPosts >= 1
        ? `${input.blogPosts} blog post(s) — good for long-tail search.`
        : "Publish at least one blog/guide page for organic traffic.",
    },
  ];

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  return { score, maxScore, grade: grade(score, maxScore), checks };
}
