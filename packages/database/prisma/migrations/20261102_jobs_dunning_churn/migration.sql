-- Durable background jobs (email outbox + retries on Vercel)
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'DEAD');

CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "runAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(6) WITH TIME ZONE,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6) WITH TIME ZONE,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");
CREATE INDEX "BackgroundJob_type_createdAt_idx" ON "BackgroundJob"("type", "createdAt");

-- Platform plan cancel survey / save-offer
CREATE TABLE "PlanCancelFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "planSlug" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "acceptedOffer" BOOLEAN NOT NULL DEFAULT false,
    "offerCode" TEXT,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanCancelFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanCancelFeedback_tenantId_createdAt_idx" ON "PlanCancelFeedback"("tenantId", "createdAt");

ALTER TABLE "PlanCancelFeedback" ADD CONSTRAINT "PlanCancelFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dunning counters
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "dunningStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "lastDunningAt" TIMESTAMP(6) WITH TIME ZONE;

ALTER TABLE "ProductSubscription" ADD COLUMN IF NOT EXISTS "dunningStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductSubscription" ADD COLUMN IF NOT EXISTS "lastDunningAt" TIMESTAMP(6) WITH TIME ZONE;
