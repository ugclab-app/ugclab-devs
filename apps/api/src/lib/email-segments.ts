import { EmailCampaignSegment, OrderStatus, prisma } from "@ugclab/database";

export type CampaignSegment = keyof typeof EmailCampaignSegment;

const VIP_THRESHOLD = 50000;
const INACTIVE_DAYS = 90;

export type SegmentOptions = {
  collectionSlug?: string | null;
  productId?: string | null;
};

export async function getSegmentRecipients(
  tenantId: string,
  segment: CampaignSegment,
  opts: SegmentOptions = {}
): Promise<{ email: string; name: string | null }[]> {
  if (segment === EmailCampaignSegment.ABANDONED_CART) {
    return getAbandonedCartRecipients(tenantId);
  }
  if (segment === EmailCampaignSegment.INACTIVE_90) {
    return getInactiveRecipients(tenantId);
  }
  if (segment === EmailCampaignSegment.COLLECTION && opts.collectionSlug) {
    return getCollectionBuyers(tenantId, opts.collectionSlug);
  }
  if (segment === EmailCampaignSegment.PRODUCT && opts.productId) {
    return getProductBuyers(tenantId, opts.productId);
  }

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      marketingOptOut: false,
      emailBounced: false,
    },
    include: {
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        select: { totalAmount: true, createdAt: true },
      },
    },
  });

  const seen = new Set<string>();
  const out: { email: string; name: string | null }[] = [];

  for (const cust of customers) {
    const email = cust.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;

    const orderCount = cust.orders.length;
    const totalSpent = cust.orders.reduce((s, o) => s + o.totalAmount, 0);
    const isVip = totalSpent >= VIP_THRESHOLD;
    const isRepeat = orderCount >= 2;
    const isNew = orderCount === 0;
    const isActive = orderCount === 1 && !isVip;

    let match = false;
    if (segment === EmailCampaignSegment.ALL) match = true;
    else if (segment === EmailCampaignSegment.VIP && isVip) match = true;
    else if (segment === EmailCampaignSegment.REPEAT && isRepeat) match = true;
    else if (segment === EmailCampaignSegment.NEW && isNew) match = true;
    else if (segment === EmailCampaignSegment.ACTIVE && isActive) match = true;

    if (match) {
      seen.add(email);
      out.push({ email, name: cust.name });
    }
  }

  if (segment === EmailCampaignSegment.ALL) {
    const subs = await prisma.emailSubscriber.findMany({
      where: { tenantId, marketingOptOut: false },
    });
    for (const s of subs) {
      const email = s.email.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, name: s.name });
    }
  }

  return out;
}

async function getAbandonedCartRecipients(tenantId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const carts = await prisma.abandonedCart.findMany({
    where: {
      tenantId,
      email: { not: null },
      convertedAt: null,
      updatedAt: { gte: since },
    },
  });
  const seen = new Set<string>();
  const out: { email: string; name: string | null }[] = [];
  for (const c of carts) {
    const email = c.email!.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    const cust = await prisma.customer.findFirst({
      where: { tenantId, email, marketingOptOut: false, emailBounced: false },
    });
    if (cust) {
      seen.add(email);
      out.push({ email, name: cust.name });
    } else {
      const sub = await prisma.emailSubscriber.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (!sub?.marketingOptOut) {
        seen.add(email);
        out.push({ email, name: sub?.name ?? null });
      }
    }
  }
  return out;
}

async function getInactiveRecipients(tenantId: string) {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      marketingOptOut: false,
      emailBounced: false,
    },
    include: {
      orders: {
        where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return customers
    .filter((c) => {
      const last = c.orders[0];
      return last && last.createdAt < cutoff;
    })
    .map((c) => ({ email: c.email.toLowerCase(), name: c.name }));
}

async function getCollectionBuyers(tenantId: string, collectionSlug: string) {
  const collection = await prisma.collection.findFirst({
    where: { tenantId, slug: collectionSlug },
    include: { products: { select: { productId: true } } },
  });
  if (!collection) return [];
  const productIds = collection.products.map((p) => p.productId);
  if (productIds.length === 0) return [];

  const lines = await prisma.orderLineItem.findMany({
    where: {
      tenantId,
      productId: { in: productIds },
      order: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
    },
    include: { order: { include: { customer: true } } },
  });
  const seen = new Set<string>();
  const out: { email: string; name: string | null }[] = [];
  for (const line of lines) {
    const email = line.order.customer?.email?.toLowerCase();
    if (!email || seen.has(email)) continue;
    if (line.order.customer?.marketingOptOut || line.order.customer?.emailBounced) continue;
    seen.add(email);
    out.push({ email, name: line.order.customer?.name ?? null });
  }
  return out;
}

async function getProductBuyers(tenantId: string, productId: string) {
  const lines = await prisma.orderLineItem.findMany({
    where: {
      tenantId,
      productId,
      order: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
    },
    include: { order: { include: { customer: true } } },
  });
  const seen = new Set<string>();
  const out: { email: string; name: string | null }[] = [];
  for (const line of lines) {
    const email = line.order.customer?.email?.toLowerCase();
    if (!email || seen.has(email)) continue;
    if (line.order.customer?.marketingOptOut || line.order.customer?.emailBounced) continue;
    seen.add(email);
    out.push({ email, name: line.order.customer?.name ?? null });
  }
  return out;
}

export function segmentLabel(segment: CampaignSegment): string {
  const labels: Record<CampaignSegment, string> = {
    ALL: "All customers & subscribers",
    VIP: "VIP ($500+ spent)",
    REPEAT: "Repeat buyers (2+ orders)",
    NEW: "No orders yet",
    ACTIVE: "Active (1 order, not VIP)",
    ABANDONED_CART: "Abandoned cart (7 days)",
    INACTIVE_90: "Inactive 90+ days (win-back)",
    COLLECTION: "Bought from collection",
    PRODUCT: "Bought this product",
  };
  return labels[segment] ?? segment;
}
