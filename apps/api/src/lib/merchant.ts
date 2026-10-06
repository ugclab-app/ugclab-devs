import { prisma } from "@ugclab/database";
import type { SessionPayload } from "./auth-token.js";

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

const tenantInclude = {
  settings: true,
  subscriptionPlan: true,
} as const;

export async function userCanAccessTenant(userId: string, tenantId: string) {
  const owned = await prisma.tenant.findFirst({
    where: { id: tenantId, ownerId: userId },
    select: { id: true },
  });
  if (owned) return true;
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId, userId, acceptedAt: { not: null } },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function listStoresForUser(userId: string) {
  const owned = await prisma.tenant.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const memberships = await prisma.tenantMember.findMany({
    where: { userId, acceptedAt: { not: null } },
    select: {
      role: true,
      tenant: { select: { id: true, name: true, slug: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byId = new Map<
    string,
    { id: string; name: string; slug: string; role: "OWNER" | "MEMBER"; createdAt: Date }
  >();
  for (const t of owned) {
    byId.set(t.id, {
      id: t.id,
      name: t.name,
      slug: t.slug,
      role: "OWNER",
      createdAt: t.createdAt,
    });
  }
  for (const m of memberships) {
    if (byId.has(m.tenant.id)) continue;
    byId.set(m.tenant.id, {
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
      role: "MEMBER",
      createdAt: m.tenant.createdAt,
    });
  }
  return [...byId.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

export async function getTenantForUser(userId: string, preferredTenantId?: string | null) {
  if (preferredTenantId) {
    const allowed = await userCanAccessTenant(userId, preferredTenantId);
    if (allowed) {
      const preferred = await prisma.tenant.findFirst({
        where: { id: preferredTenantId },
        include: tenantInclude,
      });
      if (preferred) return preferred;
    }
  }

  const owned = await prisma.tenant.findFirst({
    where: { ownerId: userId },
    include: tenantInclude,
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned;

  const membership = await prisma.tenantMember.findFirst({
    where: { userId, acceptedAt: { not: null } },
    include: {
      tenant: { include: tenantInclude },
    },
    orderBy: { createdAt: "asc" },
  });
  return membership?.tenant ?? null;
}

export async function requireTenant(session: SessionPayload) {
  const tenant = await getTenantForUser(session.sub, session.tid);
  if (!tenant) throw new Error("No store found");
  return { session, tenant };
}
