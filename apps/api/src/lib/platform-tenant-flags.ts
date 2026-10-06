import { prisma } from "@ugclab/database";

export const PLATFORM_FLAG_MARKETING_PAUSED = "marketing_paused";
export const PLATFORM_FLAG_AFFILIATES_DISABLED = "affiliates_disabled";

export async function getPlatformFlags(tenantId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ platformFlags: string[] }[]>`
    SELECT "platformFlags" FROM "Tenant" WHERE id = ${tenantId} LIMIT 1
  `;
  return rows[0]?.platformFlags ?? [];
}

export function hasPlatformFlag(flags: string[], flag: string): boolean {
  return flags.includes(flag);
}

export async function setPlatformFlag(
  tenantId: string,
  flag: string,
  enabled: boolean
): Promise<string[]> {
  const current = await getPlatformFlags(tenantId);
  const next = enabled
    ? current.includes(flag)
      ? current
      : [...current, flag]
    : current.filter((f) => f !== flag);
  await prisma.$executeRaw`
    UPDATE "Tenant" SET "platformFlags" = ${next}::text[] WHERE id = ${tenantId}
  `;
  return next;
}

export async function tenantHasPlatformFlag(
  tenantId: string,
  flag: string
): Promise<boolean> {
  const flags = await getPlatformFlags(tenantId);
  return hasPlatformFlag(flags, flag);
}
