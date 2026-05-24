import {
  EmailCampaignStatus,
  OrderStatus,
  prisma,
} from "@ugclab/database";
import { getMerchantPaymentMetrics } from "./payment-metrics.js";
import { isMorPaymentModel } from "./payment-model.js";
import type { AnalyticsRangeInput } from "./analytics-range.js";

const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function dayBuckets(start: Date, end: Date) {
  const buckets: Record<string, { revenue: number; orders: number }> = {};
  const cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    buckets[cur.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 };
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildRevenueByDay(
  orders: { createdAt: Date; totalAmount: number }[],
  start: Date,
  end: Date
) {
  const buckets = dayBuckets(start, end);
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].revenue += o.totalAmount;
      buckets[key].orders += 1;
    }
  }
  return Object.entries(buckets).map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: v.revenue,
    orders: v.orders,
  }));
}

export async function getMerchantAnalytics(
  tenantId: string,
  range: AnalyticsRangeInput
) {
  const { start, end, prevStart, prevEnd } = range;

  const [
    paidOrders,
    prevPaidOrders,
    allStatusInRange,
    refundedInRange,
    abandonedOpen,
    abandonedConverted,
    abandonedReminded,
    abandonedOpenAgg,
    campaignsSent,
    tenantRow,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [...PAID] },
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                collectionItems: {
                  select: {
                    collection: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [...PAID] },
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      select: { totalAmount: true, customerId: true, createdAt: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        status: OrderStatus.REFUNDED,
        updatedAt: { gte: start, lte: end },
      },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.abandonedCart.count({
      where: { tenantId, convertedAt: null },
    }),
    prisma.abandonedCart.count({
      where: { tenantId, convertedAt: { not: null } },
    }),
    prisma.abandonedCart.count({
      where: {
        tenantId,
        convertedAt: { not: null },
        OR: [{ remindedAt1h: { not: null } }, { remindedAt24h: { not: null } }],
      },
    }),
    prisma.abandonedCart.aggregate({
      where: { tenantId, convertedAt: null },
      _sum: { subtotalAmount: true },
    }),
    prisma.emailCampaign.findMany({
      where: {
        tenantId,
        status: EmailCampaignStatus.SENT,
        sentAt: { gte: start, lte: end },
      },
      select: { sentCount: true, openCount: true, clickCount: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, subscriptionPlan: { select: { platformFeeBps: true } } },
    }),
  ]);

  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = paidOrders.length;
  const prevRevenue = prevPaidOrders.reduce((s, o) => s + o.totalAmount, 0);
  const prevOrders = prevPaidOrders.length;

  const payment = await getMerchantPaymentMetrics(tenantId, start);
  const stripeFeePct =
    Number(process.env.STRIPE_PROCESSING_FEE_PCT ?? "3") / 100;
  const stripeFeeEstimate = Math.round(payment.gmv * stripeFeePct);

  const customerIdsInRange = new Set(
    paidOrders.map((o) => o.customerId).filter(Boolean) as string[]
  );
  let newCustomers = 0;
  let returningCustomers = 0;
  if (customerIdsInRange.size > 0) {
    const prior = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [...PAID] },
        customerId: { in: [...customerIdsInRange] },
        createdAt: { lt: start },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });
    const priorSet = new Set(prior.map((o) => o.customerId).filter(Boolean));
    for (const cid of customerIdsInRange) {
      if (priorSet.has(cid)) returningCustomers++;
      else newCustomers++;
    }
  }

  const productMap = new Map<
    string,
    { title: string; quantity: number; revenue: number }
  >();
  const collectionMap = new Map<string, { title: string; revenue: number; quantity: number }>();

  for (const o of paidOrders) {
    for (const item of o.items) {
      if (item.productId) {
        const cur = productMap.get(item.productId) ?? {
          title: item.title,
          quantity: 0,
          revenue: 0,
        };
        cur.quantity += item.quantity;
        cur.revenue += item.totalAmount;
        productMap.set(item.productId, cur);
      }
      const cols = item.product?.collectionItems ?? [];
      for (const pc of cols) {
        const id = pc.collection.id;
        const title = pc.collection.title;
        const c = collectionMap.get(id) ?? { title, revenue: 0, quantity: 0 };
        c.quantity += item.quantity;
        c.revenue += item.totalAmount;
        collectionMap.set(id, c);
      }
    }
  }

  const countryMap = new Map<string, number>();
  let cardPayments = 0;
  let otherPayments = 0;
  const fulfillmentDays: number[] = [];

  for (const o of paidOrders) {
    const cc = o.shippingCountry ?? "—";
    countryMap.set(cc, (countryMap.get(cc) ?? 0) + 1);
    if (o.stripePaymentId || o.stripeCheckoutSessionId) cardPayments++;
    else otherPayments++;
    if (o.shippedAt) {
      const days =
        (o.shippedAt.getTime() - o.createdAt.getTime()) / 86400000;
      if (days >= 0) fulfillmentDays.push(days);
    }
  }

  const avgFulfillmentDays =
    fulfillmentDays.length > 0
      ? Math.round(
          (fulfillmentDays.reduce((a, b) => a + b, 0) / fulfillmentDays.length) *
            10
        ) / 10
      : null;

  const ordersWithDiscount = paidOrders.filter((o) => o.discountAmount > 0).length;
  const discountTotal = paidOrders.reduce((s, o) => s + o.discountAmount, 0);

  let marketingSent = 0;
  let marketingOpens = 0;
  let marketingClicks = 0;
  for (const c of campaignsSent) {
    marketingSent += c.sentCount;
    marketingOpens += c.openCount;
    marketingClicks += c.clickCount;
  }

  const recoveryRate =
    abandonedReminded > 0
      ? Math.round((abandonedConverted / Math.max(abandonedReminded, 1)) * 100)
      : null;

  return {
    rangeDays: range.rangeDays,
    period: {
      from: start.toISOString(),
      to: end.toISOString(),
    },
    totalRevenue,
    totalOrders,
    aov: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    previous: {
      totalRevenue: prevRevenue,
      totalOrders: prevOrders,
      revenueChangePct: pctChange(totalRevenue, prevRevenue),
      ordersChangePct: pctChange(totalOrders, prevOrders),
    },
    refunds: {
      count: refundedInRange._count,
      amount: refundedInRange._sum.totalAmount ?? 0,
    },
    paymentModel: isMorPaymentModel() ? "mor" : "connect",
    netRevenue: payment.netPayout,
    platformFees: payment.platformFees,
    stripeFeeEstimate,
    netAfterStripeEstimate: payment.netPayout - stripeFeeEstimate,
    revenueByDay: buildRevenueByDay(paidOrders, start, end),
    topProducts: [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    topCollections: [...collectionMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    ordersByCountry: [...countryMap.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
    ordersByStatus: allStatusInRange.map((g) => ({
      status: g.status,
      count: g._count,
    })),
    customers: { new: newCustomers, returning: returningCustomers },
    paymentMix: [
      { method: "Card (Stripe)", count: cardPayments },
      { method: "Other", count: otherPayments },
    ].filter((x) => x.count > 0),
    fulfillment: {
      shippedCount: fulfillmentDays.length,
      avgDaysToShip: avgFulfillmentDays,
    },
    discounts: {
      ordersWithDiscount,
      discountTotal,
    },
    abandoned: {
      openCarts: abandonedOpen,
      openValueCents: abandonedOpenAgg._sum.subtotalAmount ?? 0,
      recoveryRatePct: recoveryRate,
      currency: tenantRow?.settings?.currency ?? "USD",
    },
    marketing: {
      emailsSent: marketingSent,
      openRatePct:
        marketingSent > 0
          ? Math.round((marketingOpens / marketingSent) * 1000) / 10
          : null,
      clickRatePct:
        marketingSent > 0
          ? Math.round((marketingClicks / marketingSent) * 1000) / 10
          : null,
      campaignsSent: campaignsSent.length,
    },
  };
}

export function analyticsToCsv(
  a: Awaited<ReturnType<typeof getMerchantAnalytics>>,
  currency: string
) {
  const lines = [
    "Tescommerce analytics export",
    `Period,${a.period.from},${a.period.to}`,
    "",
    "Metric,Value",
    `GMV (${currency}),${(a.totalRevenue / 100).toFixed(2)}`,
    `Orders,${a.totalOrders}`,
    `AOV (${currency}),${(a.aov / 100).toFixed(2)}`,
    `Refunds (${currency}),${(a.refunds.amount / 100).toFixed(2)}`,
    `Refunds count,${a.refunds.count}`,
    `Net payout (${currency}),${(a.netRevenue / 100).toFixed(2)}`,
    "",
    "Date,Revenue,Orders",
    ...a.revenueByDay.map(
      (d) =>
        `${d.date},${(d.revenue / 100).toFixed(2)},${d.orders}`
    ),
    "",
    "Product,Qty,Revenue",
    ...a.topProducts.map(
      (p) =>
        `"${p.title.replace(/"/g, '""')}",${p.quantity},${(p.revenue / 100).toFixed(2)}`
    ),
    "",
    "Country,Orders",
    ...a.ordersByCountry.map((r) => `${r.country},${r.count}`),
  ];
  return lines.join("\n");
}
