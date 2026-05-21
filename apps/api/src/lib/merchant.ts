import { prisma } from "@ugclab/database";
import type { SessionPayload } from "./auth-token.js";

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getTenantForUser(userId: string) {
  const owned = await prisma.tenant.findFirst({
    where: { ownerId: userId },
    include: { settings: true, subscriptionPlan: true },
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned;

  const membership = await prisma.tenantMember.findFirst({
    where: { userId, acceptedAt: { not: null } },
    include: {
      tenant: { include: { settings: true, subscriptionPlan: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return membership?.tenant ?? null;
}

export async function requireTenant(session: SessionPayload) {
  const tenant = await getTenantForUser(session.sub);
  if (!tenant) throw new Error("No store found");
  return { session, tenant };
}
