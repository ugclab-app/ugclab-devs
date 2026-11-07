import { OrderStatus, prisma, TenantStatus } from "@ugclab/database";
import { isMorPaymentModel } from "./payment-model.js";

const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED];

/** Per-store contribution: fees + plan MRR − partner fee-share − paid payouts (MoR cash out). */
export async function getMerchantProfitabilityReport(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptionPlan: { select: { priceMonthly: true, name: true } },
      owner: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const feeByTenant = await prisma.order.groupBy({
    by: ["tenantId"],
    where: { status: { in: PAID }, createdAt: { gte: since } },
    _sum: { platformFeeAmount: true, totalAmount: true },
    _count: true,
  });
  const feeMap = new Map(
    feeByTenant.map((r) => [
      r.tenantId,
      {
        fees: r._sum.platformFeeAmount ?? 0,
        gmv: r._sum.totalAmount ?? 0,
        orders: r._count,
      },
    ])
  );

  const payouts = await prisma.merchantPayout.groupBy({
    by: ["tenantId"],
    where: { status: { in: ["PAID", "COMPLETED", "paid"] }, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  const payoutMap = new Map(payouts.map((p) => [p.tenantId, p._sum.amount ?? 0]));

  const partnerRows = await prisma.platformPartnerReferral.groupBy({
    by: ["tenantId"],
    where: { createdAt: { gte: since } },
    _sum: { amountCents: true },
  });

  const partnerMap = new Map(
    partnerRows.map((r) => [r.tenantId, r._sum.amountCents ?? 0])
  );

  const rows = tenants.map((t) => {
    const sales = feeMap.get(t.id) ?? { fees: 0, gmv: 0, orders: 0 };
    const payoutsPaid = payoutMap.get(t.id) ?? 0;
    const partnerCost = partnerMap.get(t.id) ?? 0;
    const planMrr = t.subscriptionPlan?.priceMonthly ?? 0;
    const contribution = sales.fees + planMrr - partnerCost;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      ownerEmail: t.owner.email,
      plan: t.subscriptionPlan?.name ?? null,
      planMrrCents: planMrr,
      gmvCents: sales.gmv,
      feeCents: sales.fees,
      payoutCents: payoutsPaid,
      partnerCommissionCents: partnerCost,
      contributionCents: contribution,
      orders: sales.orders,
      losingMoney: contribution < 0,
    };
  });

  rows.sort((a, b) => a.contributionCents - b.contributionCents);
  return {
    days,
    losingCount: rows.filter((r) => r.losingMoney).length,
    rows,
  };
}

export async function getPlatformRevenueReport() {
  const now = new Date();
  const months: { key: string; gmv: number; platformFees: number; orders: number }[] =
    [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const agg = await prisma.order.aggregate({
      where: {
        status: { in: PAID },
        createdAt: { gte: start, lt: end },
      },
      _sum: { totalAmount: true, platformFeeAmount: true },
      _count: true,
    });
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      gmv: agg._sum.totalAmount ?? 0,
      platformFees: agg._sum.platformFeeAmount ?? 0,
      orders: agg._count,
    });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    include: { _count: { select: { tenants: true } } },
  });

  const planBreakdown = plans.map((p) => ({
    slug: p.slug,
    name: p.name,
    tenants: p._count.tenants,
    mrrCents: p._count.tenants * p.priceMonthly,
    platformFeeBps: p.platformFeeBps,
  }));

  const totalMrr = planBreakdown.reduce((s, p) => s + p.mrrCents, 0);

  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newTenants = await prisma.tenant.count({
    where: { createdAt: { gte: d30 } },
  });
  const activeWithOrders = await prisma.tenant.count({
    where: {
      orders: {
        some: {
          status: { in: PAID },
          createdAt: { gte: d30 },
        },
      },
    },
  });
  const totalActive = await prisma.tenant.count({
    where: { status: TenantStatus.ACTIVE },
  });

  return {
    paymentModel: isMorPaymentModel() ? "mor" : "connect",
    months,
    planBreakdown,
    totalMrrCents: totalMrr,
    churnSignal: {
      activeStores: totalActive,
      withOrders30d: activeWithOrders,
      newStores30d: newTenants,
    },
  };
}

export async function getBillingHealthReport() {
  const now = new Date();
  const tenants = await prisma.tenant.findMany({
    include: {
      owner: { select: { email: true } },
      subscriptionPlan: { select: { slug: true, name: true, priceMonthly: true } },
      _count: { select: { products: true } },
    },
  });

  const noStripeConnect = tenants.filter(
    (t) =>
      t.status === TenantStatus.ACTIVE &&
      !isMorPaymentModel() &&
      (!t.stripeAccountId || !t.stripeChargesEnabled)
  );

  const trialExpired = tenants.filter(
    (t) =>
      t.trialEndsAt &&
      t.trialEndsAt < now &&
      (!t.subscriptionStatus || t.subscriptionStatus === "trialing")
  );

  const failedBilling = tenants.filter(
    (t) =>
      t.subscriptionStatus &&
      ["past_due", "unpaid", "canceled", "incomplete"].includes(
        t.subscriptionStatus
      )
  );

  const withLimits = await Promise.all(
    tenants.map(async (t) => {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: t.subscriptionPlanId ?? "" },
      });
      if (!plan?.productLimit) return null;
      if (t._count.products <= plan.productLimit) return null;
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        ownerEmail: t.owner.email,
        products: t._count.products,
        limit: plan.productLimit,
        plan: plan.name,
      };
    })
  );

  return {
    noStripeConnect: noStripeConnect.map(mapTenantRow),
    trialExpired: trialExpired.map(mapTenantRow),
    failedBilling: failedBilling.map(mapTenantRow),
    overProductLimit: withLimits.filter(Boolean),
  };
}

function mapTenantRow(t: {
  id: string;
  name: string;
  slug: string;
  owner: { email: string };
  subscriptionPlan: { name: string } | null;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
}) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    ownerEmail: t.owner.email,
    plan: t.subscriptionPlan?.name ?? "—",
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    subscriptionStatus: t.subscriptionStatus,
  };
}
