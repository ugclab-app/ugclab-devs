import { randomBytes } from "node:crypto";
import { prisma } from "@ugclab/database";
import { getStorefrontDisplayHost, getStorefrontUrl } from "./storefront.js";
import { parseFeatureFlags } from "./tenant-feature-flags.js";

export function normalizeDomainInput(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/\.$/, "") ?? "";
}

export async function isDomainBlacklisted(domain: string): Promise<boolean> {
  const host = normalizeDomainInput(domain);
  const entries = await prisma.platformBlacklistEntry.findMany({
    where: { type: "domain" },
    select: { value: true },
  });
  for (const e of entries) {
    const pattern = e.value.toLowerCase();
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      if (host === pattern.slice(2) || host.endsWith(suffix)) return true;
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}

export type PlatformDomainSslStatus = "active" | "pending" | "error";

export function customDomainStorefrontUrl(domain: string, verified: boolean): string {
  if (verified) return `https://${domain}`;
  return "";
}

export function mapPlatformDomainRow(
  d: {
    id: string;
    domain: string;
    verified: boolean;
    verificationToken: string;
    isPrimary: boolean;
    verifiedAt: Date | null;
    verifiedByEmail: string | null;
    lastDnsCheckAt: Date | null;
    lastDnsOk: boolean | null;
    createdAt: Date;
    tenant: {
      id: string;
      name: string;
      slug: string;
      featureFlags: unknown;
      owner: { email: string };
    };
  }
) {
  const flags = parseFeatureFlags(d.tenant.featureFlags);
  return {
    id: d.id,
    domain: d.domain,
    verified: d.verified,
    verificationToken: d.verificationToken,
    isPrimary: d.isPrimary,
    verifiedAt: d.verifiedAt?.toISOString() ?? null,
    verifiedByEmail: d.verifiedByEmail ?? null,
    lastDnsCheckAt: d.lastDnsCheckAt?.toISOString() ?? null,
    lastDnsOk: d.lastDnsOk,
    createdAt: d.createdAt.toISOString(),
    tenantId: d.tenant.id,
    tenantName: d.tenant.name,
    tenantSlug: d.tenant.slug,
    ownerEmail: d.tenant.owner.email,
    defaultSubdomain: getStorefrontDisplayHost(d.tenant.slug),
    defaultStoreUrl: getStorefrontUrl(d.tenant.slug),
    storefrontUrl: d.verified ? customDomainStorefrontUrl(d.domain, true) : null,
    customDomainEnabled: flags.customDomain,
    sslStatus: (d.verified ? "active" : "pending") satisfies PlatformDomainSslStatus,
  };
}

export function newVerificationToken(): string {
  return `ugclab-verify-${randomBytes(8).toString("hex")}`;
}

export async function clearPrimaryForTenant(tenantId: string, exceptId?: string) {
  await prisma.customDomain.updateMany({
    where: {
      tenantId,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isPrimary: false },
  });
}
