ALTER TABLE "PlatformAnnouncement" ADD COLUMN IF NOT EXISTS "tenantIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "platformFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "PlatformEmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "PlatformEmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformEmailTemplate_key_key" ON "PlatformEmailTemplate"("key");

CREATE TABLE IF NOT EXISTS "StoreBlockCatalog" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minPlan" TEXT,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StoreBlockCatalog_pkey" PRIMARY KEY ("id")
);
