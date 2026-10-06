import { OrderStatus, prisma } from "@ugclab/database";
import { sumOwedToCreatorsCents } from "./affiliate.js";
import { RESERVE_BPS } from "./buyer-protection.js";

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
    select: {
      totalAmount: true,
      platformFeeAmount: true,
      buyerProtection: true,
      fundsReleasedAt: true,
      payoutBlocked: true,
    },
  });

  let earnedCents = 0;
  let platformFeesCents = 0;
  let heldCents = 0;
  let releasedProtectedCents = 0;
  let releasedOpenCents = 0;
  for (const o of orders) {
    const net = merchantNetFromOrder(o.totalAmount, o.platformFeeAmount);
    platformFeesCents += o.platformFeeAmount;
    if (o.payoutBlocked) continue;
    earnedCents += net;
    if (o.buyerProtection && !o.fundsReleasedAt) heldCents += net;
    else if (o.buyerProtection) releasedProtectedCents += net;
    else releasedOpenCents += net;
  }
  const reserveCents = Math.floor((releasedProtectedCents * RESERVE_BPS) / 10000);

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

  const owedToCreatorsCents = await sumOwedToCreatorsCents(tenantId);

  const availableCents = Math.max(
    0,
    releasedOpenCents +
      releasedProtectedCents -
      reserveCents -
      paidOutCents -
      pendingPayoutCents -
      owedToCreatorsCents
  );

  return {
    currency: payoutCurrency,
    storefrontCurrency,
    payoutCurrency,
    earnedCents,
    heldCents,
    reserveCents,
    platformFeesCents,
    paidOutCents,
    pendingPayoutCents,
    owedToCreatorsCents,
    availableCents,
    payouts,
  };
}
