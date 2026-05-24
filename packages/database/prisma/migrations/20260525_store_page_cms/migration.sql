-- StorePage CMS: SEO, blog metadata, scheduled publish
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "excerpt" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "featuredImageUrl" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMPTZ(6);
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;
ALTER TABLE "StorePage" ADD COLUMN IF NOT EXISTS "noindex" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "StorePage_tenantId_published_publishAt_idx"
  ON "StorePage"("tenantId", "published", "publishAt");
