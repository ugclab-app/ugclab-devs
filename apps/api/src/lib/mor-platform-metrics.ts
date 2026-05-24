import { OrderStatus, prisma } from "@ugclab/database";
import { getMerchantBalance, merchantNetFromOrder } from "./merchant-balance.js";

const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

/** Platform-wide MoR liability and payout queue. */
export async function getMorPlatformMetrics() {
  const paidOrders = await prisma.order.findMany({
    where: { status: { in: [...PAID] } },
    select: { tenantId: true, totalAmount: true, platformFeeAmount: true },
  });

  let gmvAllTime = 0;
  let platformFeesAllTime = 0;
  let merchantEarnedAllTime = 0;
  for (const o of paidOrders) {
    gmvAllTime += o.totalAmount;
    platformFeesAllTime += o.platformFeeAmount;
    merchantEarnedAllTime += merchantNetFromOrder(o.totalAmount, o.platformFeeAmount);
  }

  const pendingPayouts = await prisma.merchantPayout.aggregate({
    where: { status: { in: ["PENDING", "PROCESSING"] } },
    _sum: { amount: true },
    _count: true,
  });

  const paidOutAll = await prisma.merchantPayout.aggregate({
    where: { status: "PAID" },
    _sum: { amount: true },
  });

  const merchantDebtCents = Math.max(
    0,
    merchantEarnedAllTime - (paidOutAll._sum.amount ?? 0) - (pendingPayouts._sum.amount ?? 0)
  );

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
  });

  const balances = await Promise.all(
    tenants.map(async (t) => {
      const b = await getMerchantBalance(t.id);
      return {
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        availableCents: b.availableCents,
        pendingPayoutCents: b.pendingPayoutCents,
        currency: b.currency,
      };
    })
  );

  const openDisputes = await prisma.orderEvent.count({
    where: {
      type: "STRIPE_DISPUTE",
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    gmvAllTime,
    platformFeesAllTime,
    merchantEarnedAllTime,
    merchantDebtCents,
    pendingPayoutCents: pendingPayouts._sum.amount ?? 0,
    pendingPayoutCount: pendingPayouts._count,
    paidOutAllTime: paidOutAll._sum.amount ?? 0,
    openDisputeEvents: openDisputes,
    tenantBalances: balances
      .filter((b) => b.availableCents > 0 || b.pendingPayoutCents > 0)
      .sort((a, b) => b.availableCents - a.availableCents)
      .slice(0, 20),
  };
}
