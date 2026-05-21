import { prisma } from "@ugclab/database";
import { requireMerchant } from "@/lib/session";

export async function requireTenant() {
  const session = await requireMerchant();
  const tenant = await prisma.tenant.findFirst({
    where: { ownerId: session.user.id },
    include: { settings: true },
    orderBy: { createdAt: "asc" },
  });
  if (!tenant) {
    throw new Error("No store found for this account");
  }
  return { session, tenant };
}

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}
