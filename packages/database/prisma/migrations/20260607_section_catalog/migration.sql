CREATE TABLE IF NOT EXISTS "StoreSectionCatalog" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "blocksJson" JSONB,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StoreSectionCatalog_pkey" PRIMARY KEY ("id")
);
