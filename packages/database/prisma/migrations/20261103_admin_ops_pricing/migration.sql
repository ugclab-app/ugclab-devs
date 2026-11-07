-- Admin ops + pricing batch (96–121 subset)

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "fxRounding" JSONB;

ALTER TABLE "DiscountCode" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
CREATE INDEX IF NOT EXISTS "DiscountCode_tenantId_batchId_idx" ON "DiscountCode"("tenantId", "batchId");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(6);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "maxQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "scheduledPriceAmount" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "scheduledCompareAt" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "scheduledPriceAt" TIMESTAMPTZ(6);
CREATE INDEX IF NOT EXISTS "Product_tenantId_deletedAt_idx" ON "Product"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_scheduledPriceAt_idx" ON "Product"("scheduledPriceAt");

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mergedIntoId" TEXT;
CREATE INDEX IF NOT EXISTS "Customer_mergedIntoId_idx" ON "Customer"("mergedIntoId");

CREATE TABLE IF NOT EXISTS "CustomerNote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "authorEmail" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerNote_tenantId_customerId_idx" ON "CustomerNote"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerNote_customerId_createdAt_idx" ON "CustomerNote"("customerId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ProductRevision" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "summary" TEXT,
  "authorEmail" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductRevision_tenantId_productId_createdAt_idx"
  ON "ProductRevision"("tenantId", "productId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "ProductRevision" ADD CONSTRAINT "ProductRevision_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SavedFilter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "authorEmail" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedFilter_tenantId_scope_idx" ON "SavedFilter"("tenantId", "scope");
DO $$ BEGIN
  ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
