import { OrderStatus, prisma } from "@ugclab/database";

const LIVE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes = "right now"
const PAID = [OrderStatus.PAID, OrderStatus.FULFILLED] as const;

const STAGE_RANK: Record<string, number> = {
  browse: 0,
  cart: 1,
  checkout: 2,
  purchase: 3,
};

function normalizeStage(stage?: string | null) {
  if (stage === "cart" || stage === "checkout" || stage === "purchase") return stage;
  return "browse";
}

function maxStage(a: string, b: string) {
  return (STAGE_RANK[a] ?? 0) >= (STAGE_RANK[b] ?? 0) ? a : b;
}

export async function upsertLiveVisitor(opts: {
  tenantId: string;
  sessionId: string;
  country?: string | null;
  path?: string | null;
  stage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}) {
  const sessionId = opts.sessionId.trim().slice(0, 64);
  if (!sessionId) return;
  const stage = normalizeStage(opts.stage);
  const country = opts.country
    ? opts.country.trim().toUpperCase().slice(0, 2)
    : null;
  const path = opts.path ? String(opts.path).slice(0, 200) : null;
  const utmSource = opts.utmSource?.trim().slice(0, 80) || null;
  const utmMedium = opts.utmMedium?.trim().slice(0, 80) || null;
  const utmCampaign = opts.utmCampaign?.trim().slice(0, 120) || null;
  const referrer = opts.referrer?.trim().slice(0, 300) || null;
  const now = new Date();

  const existing = await prisma.storeLiveVisitor.findUnique({
    where: { tenantId_sessionId: { tenantId: opts.tenantId, sessionId } },
    select: { maxStage: true },
  });
  const nextMax = maxStage(existing?.maxStage ?? "browse", stage);

  await prisma.storeLiveVisitor.upsert({
    where: {
      tenantId_sessionId: { tenantId: opts.tenantId, sessionId },
    },
    create: {
      tenantId: opts.tenantId,
      sessionId,
      country,
      path,
      stage,
      maxStage: nextMax,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      lastSeenAt: now,
    },
    update: {
      lastSeenAt: now,
      stage,
      maxStage: nextMax,
      ...(country ? { country } : {}),
      ...(path ? { path } : {}),
      ...(utmSource ? { utmSource } : {}),
      ...(utmMedium ? { utmMedium } : {}),
      ...(utmCampaign ? { utmCampaign } : {}),
      ...(referrer ? { referrer } : {}),
    },
  });
}

export async function markLiveVisitorPurchased(
  tenantId: string,
  sessionId: string | null | undefined
) {
  if (!sessionId?.trim()) return;
  const sid = sessionId.trim().slice(0, 64);
  try {
    await prisma.storeLiveVisitor.update({
      where: { tenantId_sessionId: { tenantId, sessionId: sid } },
      data: { stage: "purchase", maxStage: "purchase" },
    });
  } catch {
    /* session may not exist */
  }
}

export async function getLiveViewMetrics(tenantId: string) {
  const now = new Date();
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    liveVisitors,
    todayPaid,
    todaySessions,
    activeCarts,
    hourOrders,
    customersToday,
  ] = await Promise.all([
    prisma.storeLiveVisitor.findMany({
      where: { tenantId, lastSeenAt: { gte: liveSince } },
      select: {
        sessionId: true,
        country: true,
        stage: true,
        lastSeenAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [...PAID] },
        createdAt: { gte: dayStart },
      },
      select: {
        totalAmount: true,
        createdAt: true,
        shippingCountry: true,
        customerId: true,
        guestEmail: true,
      },
    }),
    prisma.storeLiveVisitor.count({
      where: { tenantId, createdAt: { gte: dayStart } },
    }),
    prisma.abandonedCart.count({
      where: {
        tenantId,
        convertedAt: null,
        updatedAt: { gte: liveSince },
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [...PAID] },
        createdAt: { gte: hourAgo },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, createdAt: true },
    }),
  ]);

  const totalSales = todayPaid.reduce((s, o) => s + o.totalAmount, 0);
  const ordersToday = todayPaid.length;

  const checkingOut = liveVisitors.filter((v) => v.stage === "checkout").length;
  const cartStage = liveVisitors.filter((v) => v.stage === "cart").length;
  const activeCartsTotal = Math.max(activeCarts, cartStage);

  const byCountry = new Map<string, number>();
  for (const v of liveVisitors) {
    const c = v.country || "??";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  }
  for (const o of todayPaid) {
    const c = o.shippingCountry || null;
    if (c) byCountry.set(c, (byCountry.get(c) ?? 0) + 0);
  }

  const locations = [...byCountry.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const buyerCustomerIds = todayPaid
    .map((o) => o.customerId)
    .filter((id): id is string => Boolean(id));
  const customerMap = new Map(customersToday.map((c) => [c.id, c.createdAt]));
  let newCustomers = 0;
  let returningCustomers = 0;
  const seen = new Set<string>();
  for (const id of buyerCustomerIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const created = customerMap.get(id);
    if (created && created >= dayStart) newCustomers += 1;
    else returningCustomers += 1;
  }
  const guestOrders = todayPaid.filter((o) => !o.customerId).length;
  newCustomers += guestOrders;

  const sparkBuckets = 12;
  const sessionsSpark = Array.from({ length: sparkBuckets }, () => 0);
  const ordersSpark = Array.from({ length: sparkBuckets }, () => 0);
  const bucketMs = (60 * 60 * 1000) / sparkBuckets;

  for (const v of liveVisitors) {
    const age = now.getTime() - v.lastSeenAt.getTime();
    if (age < 60 * 60 * 1000) {
      const idx = Math.min(
        sparkBuckets - 1,
        Math.floor((60 * 60 * 1000 - age) / bucketMs)
      );
      sessionsSpark[idx] = (sessionsSpark[idx] ?? 0) + 1;
    }
  }
  for (const o of hourOrders) {
    const age = now.getTime() - o.createdAt.getTime();
    const idx = Math.min(
      sparkBuckets - 1,
      Math.floor((60 * 60 * 1000 - age) / bucketMs)
    );
    ordersSpark[idx] = (ordersSpark[idx] ?? 0) + 1;
  }

  const markers: {
    country: string;
    kind: "visitor" | "order";
    lat: number;
    lng: number;
  }[] = [];
  for (const v of liveVisitors) {
    const coords = countryCoords(v.country);
    if (coords)
      markers.push({
        country: v.country ?? "??",
        kind: "visitor",
        ...coords,
      });
  }
  for (const o of todayPaid) {
    const coords = countryCoords(o.shippingCountry);
    if (coords)
      markers.push({
        country: o.shippingCountry!,
        kind: "order",
        ...coords,
      });
  }

  return {
    generatedAt: now.toISOString(),
    visitorsRightNow: liveVisitors.length,
    totalSales,
    sessionsToday: todaySessions,
    ordersToday,
    funnel: {
      activeCarts: activeCartsTotal,
      checkingOut,
      purchased: ordersToday,
    },
    locations,
    customers: { new: newCustomers, returning: returningCustomers },
    sparklines: { sessions: sessionsSpark, orders: ordersSpark },
    markers,
  };
}

function countryCoords(code: string | null | undefined): { lat: number; lng: number } | null {
  if (!code) return null;
  const map: Record<string, { lat: number; lng: number }> = {
    KG: { lat: 41.2, lng: 74.8 },
    KZ: { lat: 48.0, lng: 67.0 },
    UZ: { lat: 41.4, lng: 64.6 },
    RU: { lat: 61.5, lng: 105.3 },
    TR: { lat: 39.0, lng: 35.0 },
    CN: { lat: 35.9, lng: 104.2 },
    US: { lat: 37.1, lng: -95.7 },
    CA: { lat: 56.1, lng: -106.3 },
    GB: { lat: 55.4, lng: -3.4 },
    DE: { lat: 51.2, lng: 10.4 },
    FR: { lat: 46.2, lng: 2.2 },
    AE: { lat: 23.4, lng: 53.8 },
    IN: { lat: 20.6, lng: 78.9 },
    JP: { lat: 36.2, lng: 138.3 },
    KR: { lat: 35.9, lng: 127.8 },
    BR: { lat: -14.2, lng: -51.9 },
    AU: { lat: -25.3, lng: 133.8 },
    UA: { lat: 48.4, lng: 31.2 },
    BY: { lat: 53.7, lng: 27.9 },
    PL: { lat: 51.9, lng: 19.1 },
    NL: { lat: 52.1, lng: 5.3 },
    IT: { lat: 41.9, lng: 12.6 },
    ES: { lat: 40.5, lng: -3.7 },
    SA: { lat: 23.9, lng: 45.1 },
    PK: { lat: 30.4, lng: 69.3 },
    BD: { lat: 23.7, lng: 90.4 },
    VN: { lat: 14.1, lng: 108.3 },
  };
  return map[code.toUpperCase()] ?? null;
}
