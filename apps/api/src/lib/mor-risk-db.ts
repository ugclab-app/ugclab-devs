import { OrderStatus, TenantStatus, prisma } from "@ugclab/database";
import {
  assertNewShopGmvAllowed,
  disputeCountsTowardFreeze,
  getMorDisputeFreezeThreshold,
  getMorFirstPayoutHoldDays,
  getMorNewShopDays,
  getMorNewShopWeeklyGmvCents,
  isFirstPayoutHeld,
  isNewShop,
  shouldFreezeOnDisputeCount,
} from "./mor-risk.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function tenantHasPaidPayout(tenantId: string): Promise<boolean> {
  const paid = await prisma.merchantPayout.findFirst({
    where: { tenantId, status: "PAID" },
    select: { id: true },
  });
  return Boolean(paid);
}

export async function getMorPayoutHoldInfo(tenant: {
  id: string;
  createdAt: Date;
}) {
  const hasPaidPayout = await tenantHasPaidPayout(tenant.id);
  const hold = isFirstPayoutHeld({
    createdAt: tenant.createdAt,
    hasPaidPayout,
    holdDays: getMorFirstPayoutHoldDays(),
  });
  return {
    hasPaidPayout,
    firstPayoutHeld: hold.held,
    firstPayoutHoldUntil: hold.until?.toISOString() ?? null,
    firstPayoutHoldDays: getMorFirstPayoutHoldDays(),
  };
}

/** Sum of PAID/FULFILLED/PENDING order totals for a new shop window. */
export async function getNewShopWeekGmvCents(
  tenantId: string,
  createdAt: Date,
  now = new Date()
): Promise<{ isNew: boolean; weekGmvCents: number; capCents: number }> {
  const newShopDays = getMorNewShopDays();
  const capCents = getMorNewShopWeeklyGmvCents();
  const isNew = isNewShop(createdAt, now, newShopDays);
  if (!isNew || capCents <= 0) {
    return { isNew: false, weekGmvCents: 0, capCents };
  }
  const windowStart = createdAt;
  const windowEnd = new Date(
    Math.min(now.getTime(), createdAt.getTime() + newShopDays * DAY_MS)
  );
  const agg = await prisma.order.aggregate({
    where: {
      tenantId,
      createdAt: { gte: windowStart, lte: windowEnd },
      status: {
        in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.FULFILLED],
      },
    },
    _sum: { totalAmount: true },
  });
  return {
    isNew: true,
    weekGmvCents: agg._sum.totalAmount ?? 0,
    capCents,
  };
}

export async function assertCheckoutNewShopGmv(
  tenant: { id: string; createdAt: Date },
  orderCents: number
): Promise<void> {
  const gmv = await getNewShopWeekGmvCents(tenant.id, tenant.createdAt);
  const err = assertNewShopGmvAllowed({
    isNew: gmv.isNew,
    weekGmvCents: gmv.weekGmvCents,
    orderCents,
    capCents: gmv.capCents,
  });
  if (err) throw new Error(err);
}

/**
 * Count distinct orders whose latest STRIPE_DISPUTE event is open or lost.
 */
export async function countOpenOrLostDisputes(tenantId: string): Promise<number> {
  const events = await prisma.orderEvent.findMany({
    where: { tenantId, type: "STRIPE_DISPUTE" },
    orderBy: { createdAt: "desc" },
    select: { orderId: true, meta: true },
    take: 500,
  });
  const latestByOrder = new Map<string, string | null>();
  for (const e of events) {
    if (latestByOrder.has(e.orderId)) continue;
    const meta =
      e.meta && typeof e.meta === "object"
        ? (e.meta as { status?: string })
        : null;
    latestByOrder.set(e.orderId, meta?.status ?? null);
  }
  let n = 0;
  for (const status of latestByOrder.values()) {
    if (disputeCountsTowardFreeze(status)) n += 1;
  }
  return n;
}

/** Auto-suspend store when open/lost disputes hit the MoR threshold. */
export async function maybeAutoFreezeTenantOnDisputes(
  tenantId: string
): Promise<{ frozen: boolean; openOrLost: number; threshold: number }> {
  const threshold = getMorDisputeFreezeThreshold();
  const openOrLost = await countOpenOrLostDisputes(tenantId);
  if (!shouldFreezeOnDisputeCount(openOrLost, threshold)) {
    return { frozen: false, openOrLost, threshold };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, name: true },
  });
  if (!tenant || tenant.status === TenantStatus.SUSPENDED) {
    return { frozen: tenant?.status === TenantStatus.SUSPENDED, openOrLost, threshold };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: TenantStatus.SUSPENDED },
  });

  try {
    const { notifyStoreSuspended } = await import("./owner-alerts.js");
    await notifyStoreSuspended(tenantId);
  } catch {
    /* optional */
  }

  try {
    const { notifyDispute } = await import("./platform-ops-notify.js");
    await notifyDispute(
      tenant.name,
      `AUTO-FREEZE: ${openOrLost} open/lost disputes (threshold ${threshold})`
    );
  } catch {
    /* optional */
  }

  return { frozen: true, openOrLost, threshold };
}
