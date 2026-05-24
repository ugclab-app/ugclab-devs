import { OrderStatus, prisma } from "@ugclab/database";

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

export function merchantNetFromOrder(totalAmount: number, platformFeeAmount: number) {
  return Math.max(0, totalAmount - platformFeeAmount);
}

export async function getMerchantBalance(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });
  if (!tenant) throw new Error("Tenant not found");

  const storefrontCurrency = tenant.settings?.currency ?? "USD";
  const payoutCurrency =
    tenant.settings?.payoutCurrency?.trim().toUpperCase() || storefrontCurrency;

  const orders = await prisma.order.findMany({
    where: { tenantId, status: { in: [...PAID_STATUSES] } },
    select: { totalAmount: true, platformFeeAmount: true },
  });

  let earnedCents = 0;
  let platformFeesCents = 0;
  for (const o of orders) {
    earnedCents += merchantNetFromOrder(o.totalAmount, o.platformFeeAmount);
    platformFeesCents += o.platformFeeAmount;
  }

  const payouts = await prisma.merchantPayout.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const paidOutCents = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amount, 0);

  const pendingPayoutCents = payouts
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.amount, 0);

  const availableCents = Math.max(0, earnedCents - paidOutCents - pendingPayoutCents);

  return {
    currency: payoutCurrency,
    storefrontCurrency,
    payoutCurrency,
    earnedCents,
    platformFeesCents,
    paidOutCents,
    pendingPayoutCents,
    availableCents,
    payouts,
  };
}
