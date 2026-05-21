import { OrderStatus, prisma } from "@ugclab/database";

const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

export async function getMerchantPaymentMetrics(
  tenantId: string,
  since: Date
) {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: [...PAID] },
      createdAt: { gte: since },
    },
    select: {
      totalAmount: true,
      platformFeeAmount: true,
    },
  });

  let gmv = 0;
  let platformFees = 0;
  for (const o of orders) {
    gmv += o.totalAmount;
    platformFees += o.platformFeeAmount;
  }

  return {
    gmv,
    platformFees,
    netPayout: gmv - platformFees,
    orderCount: orders.length,
  };
}

export async function getPlatformPaymentMetrics(since: Date) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...PAID] },
      createdAt: { gte: since },
    },
    select: {
      tenantId: true,
      totalAmount: true,
      platformFeeAmount: true,
    },
  });

  let gmv = 0;
  let platformFees = 0;
  const byTenant = new Map<
    string,
    { gmv: number; platformFees: number; orderCount: number }
  >();

  for (const o of orders) {
    gmv += o.totalAmount;
    platformFees += o.platformFeeAmount;
    const cur = byTenant.get(o.tenantId) ?? {
      gmv: 0,
      platformFees: 0,
      orderCount: 0,
    };
    cur.gmv += o.totalAmount;
    cur.platformFees += o.platformFeeAmount;
    cur.orderCount += 1;
    byTenant.set(o.tenantId, cur);
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionPlan: { select: { priceMonthly: true, currency: true } },
    },
  });

  let mrrCents = 0;
  for (const t of tenants) {
    mrrCents += t.subscriptionPlan?.priceMonthly ?? 0;
  }

  return {
    gmv,
    platformFees,
    orderCount: orders.length,
    mrrCents,
    byTenant: [...byTenant.entries()].map(([tenantId, stats]) => {
      const t = tenants.find((x) => x.id === tenantId);
      return {
        tenantId,
        name: t?.name ?? "—",
        slug: t?.slug ?? "—",
        ...stats,
        netPayout: stats.gmv - stats.platformFees,
      };
    }),
  };
}
