import { OrderStatus, prisma } from "@ugclab/database";
import type { AnalyticsRangeInput } from "./analytics-range.js";

const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;
const STAGE_RANK: Record<string, number> = {
  browse: 0,
  cart: 1,
  checkout: 2,
  purchase: 3,
};

function weekKey(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** First-purchase weekly cohorts with return rates in following weeks. */
export async function getMerchantCohorts(
  tenantId: string,
  range: AnalyticsRangeInput
) {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: [...PAID] },
      createdAt: { gte: range.start, lte: range.end },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      customerId: true,
      guestEmail: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Expand lookback for first-order detection
  const lookback = new Date(range.start);
  lookback.setUTCDate(lookback.getUTCDate() - 180);
  const earlier = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: [...PAID] },
      createdAt: { gte: lookback, lt: range.start },
    },
    select: {
      createdAt: true,
      customerId: true,
      guestEmail: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const firstOrderAt = new Map<string, Date>();
  function buyerKey(o: { customerId: string | null; guestEmail: string | null }) {
    if (o.customerId) return `c:${o.customerId}`;
    if (o.guestEmail) return `e:${o.guestEmail.toLowerCase()}`;
    return null;
  }
  for (const o of [...earlier, ...orders]) {
    const k = buyerKey(o);
    if (!k) continue;
    const prev = firstOrderAt.get(k);
    if (!prev || o.createdAt < prev) firstOrderAt.set(k, o.createdAt);
  }

  type CohortRow = {
    cohort: string;
    customers: number;
    revenue: number;
    retainedW1: number;
    retainedW2: number;
    retainedW4: number;
  };
  const cohorts = new Map<string, CohortRow>();

  for (const o of orders) {
    const k = buyerKey(o);
    if (!k) continue;
    const first = firstOrderAt.get(k);
    if (!first) continue;
    // Only include buyers whose first order falls in the selected range
    if (first < range.start || first > range.end) continue;
    const ck = weekKey(first);
    const row = cohorts.get(ck) ?? {
      cohort: ck,
      customers: 0,
      revenue: 0,
      retainedW1: 0,
      retainedW2: 0,
      retainedW4: 0,
    };
    // count customer once when we see their first order in range
    if (first.getTime() === o.createdAt.getTime() || Math.abs(first.getTime() - o.createdAt.getTime()) < 1000) {
      if (!row.customers || !cohorts.has(ck)) {
        /* counted below via set */
      }
    }
    cohorts.set(ck, row);
  }

  // Recount properly
  cohorts.clear();
  const cohortBuyers = new Map<string, Set<string>>();
  for (const [k, first] of firstOrderAt) {
    if (first < range.start || first > range.end) continue;
    const ck = weekKey(first);
    const set = cohortBuyers.get(ck) ?? new Set();
    set.add(k);
    cohortBuyers.set(ck, set);
  }

  for (const [ck, buyers] of cohortBuyers) {
    let revenue = 0;
    let retainedW1 = 0;
    let retainedW2 = 0;
    let retainedW4 = 0;
    for (const buyer of buyers) {
      const first = firstOrderAt.get(buyer)!;
      const buyerOrders = orders.filter((o) => buyerKey(o) === buyer);
      revenue += buyerOrders.reduce((s, o) => s + o.totalAmount, 0);
      const later = buyerOrders.filter((o) => o.createdAt > first);
      const hasIn = (days: number) =>
        later.some(
          (o) =>
            o.createdAt.getTime() - first.getTime() <= days * 86400000 &&
            o.createdAt.getTime() > first.getTime()
        );
      if (hasIn(7)) retainedW1 += 1;
      if (hasIn(14)) retainedW2 += 1;
      if (hasIn(28)) retainedW4 += 1;
    }
    cohorts.set(ck, {
      cohort: ck,
      customers: buyers.size,
      revenue,
      retainedW1,
      retainedW2,
      retainedW4,
    });
  }

  return {
    cohorts: [...cohorts.values()]
      .sort((a, b) => a.cohort.localeCompare(b.cohort))
      .map((c) => ({
        ...c,
        retentionW1Pct:
          c.customers > 0 ? Math.round((c.retainedW1 / c.customers) * 100) : null,
        retentionW2Pct:
          c.customers > 0 ? Math.round((c.retainedW2 / c.customers) * 100) : null,
        retentionW4Pct:
          c.customers > 0 ? Math.round((c.retainedW4 / c.customers) * 100) : null,
      })),
  };
}

/** Channel / UTM / affiliate attribution on paid orders. */
export async function getMerchantAttribution(
  tenantId: string,
  range: AnalyticsRangeInput
) {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: [...PAID] },
      createdAt: { gte: range.start, lte: range.end },
    },
    select: {
      totalAmount: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      affiliatePartnerId: true,
      affiliatePartner: { select: { code: true, displayName: true } },
    },
  });

  const bySource = new Map<
    string,
    { source: string; orders: number; revenue: number }
  >();
  const byCampaign = new Map<
    string,
    { campaign: string; orders: number; revenue: number }
  >();
  const byAffiliate = new Map<
    string,
    { partner: string; code: string; orders: number; revenue: number }
  >();

  for (const o of orders) {
    const source =
      o.utmSource?.trim() ||
      (o.affiliatePartnerId ? "affiliate" : "direct");
    const s = bySource.get(source) ?? { source, orders: 0, revenue: 0 };
    s.orders += 1;
    s.revenue += o.totalAmount;
    bySource.set(source, s);

    if (o.utmCampaign?.trim()) {
      const key = o.utmCampaign.trim();
      const c = byCampaign.get(key) ?? { campaign: key, orders: 0, revenue: 0 };
      c.orders += 1;
      c.revenue += o.totalAmount;
      byCampaign.set(key, c);
    }

    if (o.affiliatePartner) {
      const key = o.affiliatePartnerId!;
      const a = byAffiliate.get(key) ?? {
        partner: o.affiliatePartner.displayName || o.affiliatePartner.code,
        code: o.affiliatePartner.code,
        orders: 0,
        revenue: 0,
      };
      a.orders += 1;
      a.revenue += o.totalAmount;
      byAffiliate.set(key, a);
    }
  }

  const sortRev = <T extends { revenue: number }>(arr: T[]) =>
    arr.sort((a, b) => b.revenue - a.revenue);

  return {
    bySource: sortRev([...bySource.values()]),
    byCampaign: sortRev([...byCampaign.values()]).slice(0, 20),
    byAffiliate: sortRev([...byAffiliate.values()]),
    totalOrders: orders.length,
    totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
  };
}

/** Session funnel from live visitors (maxStage) + abandoned carts + purchases. */
export async function getMerchantSessionFunnel(
  tenantId: string,
  range: AnalyticsRangeInput
) {
  const [sessions, abandoned, purchased] = await Promise.all([
    prisma.storeLiveVisitor.findMany({
      where: {
        tenantId,
        createdAt: { gte: range.start, lte: range.end },
      },
      select: {
        maxStage: true,
        stage: true,
        utmSource: true,
        path: true,
      },
    }),
    prisma.abandonedCart.count({
      where: {
        tenantId,
        createdAt: { gte: range.start, lte: range.end },
      },
    }),
    prisma.order.count({
      where: {
        tenantId,
        status: { in: [...PAID] },
        createdAt: { gte: range.start, lte: range.end },
      },
    }),
  ]);

  const reached = (min: string) =>
    sessions.filter((s) => {
      const stage = s.maxStage || s.stage || "browse";
      return (STAGE_RANK[stage] ?? 0) >= (STAGE_RANK[min] ?? 0);
    }).length;

  const browse = Math.max(sessions.length, 1);
  const cart = Math.max(reached("cart"), abandoned);
  const checkout = reached("checkout");
  const purchase = Math.max(reached("purchase"), purchased);

  const steps = [
    { stage: "browse", sessions: browse, label: "Sessions" },
    { stage: "cart", sessions: cart, label: "Reached cart" },
    { stage: "checkout", sessions: checkout, label: "Reached checkout" },
    { stage: "purchase", sessions: purchase, label: "Purchased" },
  ].map((s, i, arr) => ({
    ...s,
    conversionFromPrevPct:
      i === 0 || arr[i - 1]!.sessions === 0
        ? null
        : Math.round((s.sessions / arr[i - 1]!.sessions) * 100),
    conversionFromBrowsePct:
      browse === 0 ? null : Math.round((s.sessions / browse) * 100),
  }));

  const byUtm = new Map<string, number>();
  for (const s of sessions) {
    const src = s.utmSource?.trim() || "direct";
    byUtm.set(src, (byUtm.get(src) ?? 0) + 1);
  }

  return {
    steps,
    sessionCount: sessions.length,
    abandonedCarts: abandoned,
    topEntrySources: [...byUtm.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
