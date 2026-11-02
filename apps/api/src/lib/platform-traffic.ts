import { OrderStatus, prisma } from "@ugclab/database";

const LIVE_WINDOW_MS = 2 * 60 * 1000;
const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

function trafficSource(utmSource: string | null | undefined, referrer: string | null | undefined) {
  const utm = utmSource?.trim();
  if (utm) return utm;
  const raw = referrer?.trim();
  if (!raw) return "direct";
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw.slice(0, 80);
  }
}

export async function getPlatformTraffic() {
  const now = new Date();
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);
  const ordersSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [visitors, orders] = await Promise.all([
    prisma.storeLiveVisitor.findMany({
      where: { lastSeenAt: { gte: liveSince } },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
      select: {
        country: true,
        path: true,
        stage: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        referrer: true,
        lastSeenAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: [...PAID] },
        createdAt: { gte: ordersSince },
      },
      select: {
        totalAmount: true,
        currency: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        affiliatePartnerId: true,
        affiliatePartner: { select: { code: true, displayName: true } },
      },
    }),
  ]);

  const byStore = new Map<
    string,
    { tenantId: string; name: string; slug: string; visitors: number }
  >();
  const liveBySource = new Map<string, number>();
  for (const v of visitors) {
    const row = byStore.get(v.tenant.id) ?? {
      tenantId: v.tenant.id,
      name: v.tenant.name,
      slug: v.tenant.slug,
      visitors: 0,
    };
    row.visitors += 1;
    byStore.set(v.tenant.id, row);
    const source = trafficSource(v.utmSource, v.referrer);
    liveBySource.set(source, (liveBySource.get(source) ?? 0) + 1);
  }

  const bySource = new Map<string, { source: string; orders: number; revenue: number }>();
  const byCampaign = new Map<string, { campaign: string; orders: number; revenue: number }>();
  const byAffiliate = new Map<
    string,
    { partner: string; code: string; orders: number; revenue: number }
  >();
  for (const o of orders) {
    const source =
      o.utmSource?.trim() || (o.affiliatePartnerId ? "affiliate" : "direct");
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
    if (o.affiliatePartner && o.affiliatePartnerId) {
      const a = byAffiliate.get(o.affiliatePartnerId) ?? {
        partner: o.affiliatePartner.displayName || o.affiliatePartner.code,
        code: o.affiliatePartner.code,
        orders: 0,
        revenue: 0,
      };
      a.orders += 1;
      a.revenue += o.totalAmount;
      byAffiliate.set(o.affiliatePartnerId, a);
    }
  }

  const byRevenue = <T extends { revenue: number }>(rows: T[]) =>
    rows.sort((a, b) => b.revenue - a.revenue);

  return {
    generatedAt: now.toISOString(),
    liveWindowSeconds: LIVE_WINDOW_MS / 1000,
    visitorsRightNow: visitors.length,
    storesWithVisitors: byStore.size,
    stores: [...byStore.values()].sort((a, b) => b.visitors - a.visitors),
    liveSources: [...liveBySource.entries()]
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors),
    visitors: visitors.slice(0, 40).map((v) => ({
      store: v.tenant.name,
      slug: v.tenant.slug,
      tenantId: v.tenant.id,
      country: v.country,
      path: v.path,
      stage: v.stage,
      source: trafficSource(v.utmSource, v.referrer),
      medium: v.utmMedium,
      campaign: v.utmCampaign,
      lastSeenAt: v.lastSeenAt.toISOString(),
    })),
    orders30d: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      bySource: byRevenue([...bySource.values()]),
      byCampaign: byRevenue([...byCampaign.values()]).slice(0, 20),
      byAffiliate: byRevenue([...byAffiliate.values()]),
    },
  };
}
