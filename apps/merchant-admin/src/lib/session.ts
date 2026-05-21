import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@ugclab/database";
import { redirect } from "next/navigation";

export const requireMerchant = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
});

/** One DB round-trip per request (deduped via React cache). */
export const getMerchantTenant = cache(async (userId: string) => {
  return prisma.tenant.findFirst({
    where: { ownerId: userId },
    include: { settings: true },
    orderBy: { createdAt: "asc" },
  });
});

export const getAuthenticatedTenant = cache(async () => {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  return { session, tenant };
});
