-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreLiveVisitor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "country" CHAR(2),
    "path" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'browse',
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreLiveVisitor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreLiveVisitor_tenantId_sessionId_key" ON "StoreLiveVisitor"("tenantId", "sessionId");
CREATE INDEX IF NOT EXISTS "StoreLiveVisitor_tenantId_lastSeenAt_idx" ON "StoreLiveVisitor"("tenantId", "lastSeenAt");

DO $$ BEGIN
  ALTER TABLE "StoreLiveVisitor" ADD CONSTRAINT "StoreLiveVisitor_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
