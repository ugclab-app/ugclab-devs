import { prisma } from "@ugclab/database";
import { isEntriSellConfigured, getDomainShopConfig } from "./domain-shop.js";
import { parseFeatureFlags } from "./tenant-feature-flags.js";

const MAX_DOMAINS_KEY = "maxCustomDomainsDefault";

export function isVercelDomainsConfigured() {
  return Boolean(
    process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_STOREFRONT_PROJECT_ID?.trim()
  );
}

export async function getMaxCustomDomainsDefault(): Promise<number> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: MAX_DOMAINS_KEY },
  });
  const v = row?.value;
  if (typeof v === "number" && v >= 0 && v <= 50) return v;
  return 3;
}

export async function setMaxCustomDomainsDefault(limit: number) {
  const n = Math.max(0, Math.min(50, Math.floor(limit)));
  await prisma.platformSetting.upsert({
    where: { key: MAX_DOMAINS_KEY },
    create: { key: MAX_DOMAINS_KEY, value: n },
    update: { value: n },
  });
  return n;
}

export async function getTenantCustomDomainLimit(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscriptionPlan: { select: { features: true } } },
  });
  if (!tenant) return getMaxCustomDomainsDefault();
  const features = tenant.subscriptionPlan?.features as Record<string, unknown> | null;
  if (typeof features?.maxCustomDomains === "number") {
    return Math.max(0, Math.min(50, Math.floor(features.maxCustomDomains)));
  }
  return getMaxCustomDomainsDefault();
}

export async function assertTenantCanAddDomain(tenantId: string) {
  const [count, limit] = await Promise.all([
    prisma.customDomain.count({ where: { tenantId } }),
    getTenantCustomDomainLimit(tenantId),
  ]);
  if (count >= limit) {
    throw new Error(
      `Domain limit reached (${count}/${limit}). Remove a domain or upgrade your plan.`
    );
  }
}

export async function getPlatformDomainConfig() {
  const shop = getDomainShopConfig();
  const maxCustomDomainsDefault = await getMaxCustomDomainsDefault();
  const [totalDomains, verifiedDomains, tenantsWithDomain] = await Promise.all([
    prisma.customDomain.count(),
    prisma.customDomain.count({ where: { verified: true } }),
    prisma.customDomain.groupBy({ by: ["tenantId"] }),
  ]);

  const overLimit = await prisma.$queryRaw<
    { tenantId: string; name: string; slug: string; domainCount: bigint }[]
  >`
    SELECT t.id AS "tenantId", t.name, t.slug, COUNT(d.id)::bigint AS "domainCount"
    FROM "Tenant" t
    JOIN "CustomDomain" d ON d."tenantId" = t.id
    GROUP BY t.id, t.name, t.slug
    HAVING COUNT(d.id) > ${maxCustomDomainsDefault}
    ORDER BY COUNT(d.id) DESC
    LIMIT 20
  `;

  return {
    entriConfigured: isEntriSellConfigured(),
    vercelConfigured: isVercelDomainsConfigured(),
    purchaseMode: shop.purchaseMode,
    cnameTarget: shop.cnameTarget,
    storefrontBaseDomain: shop.storefrontBaseDomain,
    maxCustomDomainsDefault,
    stats: {
      totalDomains,
      verifiedDomains,
      tenantsWithCustomDomain: tenantsWithDomain.length,
    },
    tenantsOverDefaultLimit: overLimit.map((r) => ({
      tenantId: r.tenantId,
      name: r.name,
      slug: r.slug,
      domainCount: Number(r.domainCount),
    })),
  };
}

export async function listTenantsDomainUsage() {
  const rows = await prisma.customDomain.groupBy({
    by: ["tenantId"],
    _count: { id: true },
  });
  const tenantIds = rows.map((r) => r.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      featureFlags: true,
      owner: { select: { email: true } },
      subscriptionPlan: { select: { name: true, slug: true, features: true } },
    },
  });
  const map = new Map(tenants.map((t) => [t.id, t]));
  const defaultLimit = await getMaxCustomDomainsDefault();

  return rows.map((r) => {
    const t = map.get(r.tenantId);
    const flags = parseFeatureFlags(t?.featureFlags);
    const planFeatures = t?.subscriptionPlan?.features as Record<string, unknown> | null;
    const limit =
      typeof planFeatures?.maxCustomDomains === "number"
        ? Math.floor(planFeatures.maxCustomDomains)
        : defaultLimit;
    return {
      tenantId: r.tenantId,
      tenantName: t?.name ?? "—",
      tenantSlug: t?.slug ?? "—",
      ownerEmail: t?.owner.email ?? "—",
      planName: t?.subscriptionPlan?.name ?? "—",
      domainCount: r._count.id,
      customDomainEnabled: flags.customDomain,
      limit,
      overLimit: r._count.id > limit,
    };
  });
}
