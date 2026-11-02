import { OrderStatus, prisma, UserRole } from "@ugclab/database";
import { getStripe, isStripeConfigured } from "./stripe.js";

const DAY = 24 * 60 * 60 * 1000;
const FAIL_TYPES = [
  "payment_intent.payment_failed",
  "charge.failed",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];
const PAST_DUE = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

function bucketAdd(map: Map<string, number>, currency: string, cents: number) {
  const key = currency.toUpperCase();
  map.set(key, (map.get(key) ?? 0) + cents);
}

function buckets(map: Map<string, number>) {
  return [...map.entries()].map(([currency, cents]) => ({ currency, cents }));
}

export async function getPlatformReconciliation() {
  const since = new Date(Date.now() - 30 * DAY);
  const [orders, payouts, settings] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
      select: {
        tenantId: true,
        totalAmount: true,
        platformFeeAmount: true,
        buyerProtection: true,
        fundsReleasedAt: true,
        payoutBlocked: true,
      },
    }),
    prisma.merchantPayout.findMany({
      select: { tenantId: true, amount: true, status: true, currency: true, paidAt: true, createdAt: true },
    }),
    prisma.storeSettings.findMany({
      select: { tenantId: true, payoutCurrency: true, currency: true },
    }),
  ]);

  const currencyOf = new Map(
    settings.map((row) => [
      row.tenantId,
      (row.payoutCurrency?.trim() || row.currency || "USD").toUpperCase(),
    ])
  );

  const owed = new Map<string, number>();
  const held = new Map<string, number>();
  const byTenant = new Map<string, { released: number }>();
  for (const order of orders) {
    if (order.payoutBlocked) continue;
    const net = Math.max(0, order.totalAmount - order.platformFeeAmount);
    const currency = currencyOf.get(order.tenantId) ?? "USD";
    if (order.buyerProtection && !order.fundsReleasedAt) {
      bucketAdd(held, currency, net);
      continue;
    }
    const row = byTenant.get(order.tenantId) ?? { released: 0 };
    row.released += net;
    byTenant.set(order.tenantId, row);
  }

  const pending = new Map<string, number>();
  const paid30 = new Map<string, number>();
  const paidAll = new Map<string, number>();
  const pendingByTenant = new Map<string, number>();
  const paidByTenant = new Map<string, number>();
  for (const payout of payouts) {
    const currency = (payout.currency || "USD").toUpperCase();
    if (payout.status === "PENDING" || payout.status === "PROCESSING") {
      bucketAdd(pending, currency, payout.amount);
      pendingByTenant.set(payout.tenantId, (pendingByTenant.get(payout.tenantId) ?? 0) + payout.amount);
    }
    if (payout.status === "PAID") {
      bucketAdd(paidAll, currency, payout.amount);
      paidByTenant.set(payout.tenantId, (paidByTenant.get(payout.tenantId) ?? 0) + payout.amount);
      const when = payout.paidAt ?? payout.createdAt;
      if (when >= since) bucketAdd(paid30, currency, payout.amount);
    }
  }

  for (const [tenantId, row] of byTenant) {
    const available = Math.max(0, row.released - (paidByTenant.get(tenantId) ?? 0) - (pendingByTenant.get(tenantId) ?? 0));
    bucketAdd(owed, currencyOf.get(tenantId) ?? "USD", available);
  }

  let stripe: { available: { currency: string; cents: number }[]; pending: { currency: string; cents: number }[] } | null =
    null;
  let stripeError: string | null = null;
  if (isStripeConfigured()) {
    try {
      const balance = await getStripe().balance.retrieve();
      stripe = {
        available: balance.available.map((row) => ({ currency: row.currency.toUpperCase(), cents: row.amount })),
        pending: balance.pending.map((row) => ({ currency: row.currency.toUpperCase(), cents: row.amount })),
      };
    } catch (err) {
      stripeError = err instanceof Error ? err.message : "Stripe balance failed";
    }
  }

  return {
    stripe,
    stripeError,
    owedToMerchants: buckets(owed),
    payoutsInFlight: buckets(pending),
    paidLast30Days: buckets(paid30),
    paidAllTime: buckets(paidAll),
    heldForProtection: buckets(held),
  };
}

export async function listPaymentErrors() {
  const since = new Date(Date.now() - 14 * DAY);
  const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const [stripeEvents, gopay, finik, stuck] = await Promise.all([
    prisma.stripeWebhookEvent.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ error: { not: null } }, { type: { in: FAIL_TYPES } }, { processed: false }],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.gopayWebhookEvent.findMany({
      where: { createdAt: { gte: since }, OR: [{ error: { not: null } }, { processed: false }] },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.finikWebhookEvent.findMany({
      where: { createdAt: { gte: since }, OR: [{ error: { not: null } }, { processed: false }] },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lt: staleBefore, gte: since },
        OR: [
          { stripeCheckoutSessionId: { not: null } },
          { gopayPaymentId: { not: null } },
          { finikPaymentId: { not: null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        paymentProvider: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    stripe: stripeEvents.map((row) => ({
      id: row.id,
      type: row.type,
      processed: row.processed,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
      replayable: row.id.startsWith("evt_"),
    })),
    gopay: gopay.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    finik: finik.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    stuckOrders: stuck.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      provider: row.paymentProvider,
      store: row.tenant.name,
      tenantId: row.tenant.id,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function listPastDueSubscriptions() {
  const rows = await prisma.tenant.findMany({
    where: { subscriptionStatus: { in: PAST_DUE } },
    orderBy: { updatedAt: "asc" },
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      updatedAt: true,
      owner: { select: { email: true } },
      subscriptionPlan: { select: { name: true } },
    },
  });
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.subscriptionStatus,
    plan: row.subscriptionPlan?.name ?? "—",
    ownerEmail: row.owner.email,
    days: Math.max(0, Math.floor((now - row.updatedAt.getTime()) / DAY)),
    canRetry: Boolean(row.stripeSubscriptionId),
  }));
}

export async function retryPastDueInvoice(tenantId: string) {
  if (!isStripeConfigured()) throw new Error("Stripe not configured");
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeSubscriptionId: true, slug: true },
  });
  if (!tenant?.stripeSubscriptionId) throw new Error("No Stripe subscription on this store");
  const invoices = await getStripe().invoices.list({
    subscription: tenant.stripeSubscriptionId,
    status: "open",
    limit: 1,
  });
  const invoice = invoices.data[0];
  if (!invoice) throw new Error("No open invoice to charge");
  const paid = await getStripe().invoices.pay(invoice.id);
  return { invoiceId: paid.id, status: paid.status, slug: tenant.slug };
}

export async function searchBuyers(email: string) {
  const term = email.trim().toLowerCase();
  if (term.length < 3) return [];
  const customers = await prisma.customer.findMany({
    where: { email: { contains: term, mode: "insensitive" } },
    take: 40,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      country: true,
      createdAt: true,
      tenant: { select: { id: true, name: true, slug: true } },
      _count: { select: { orders: true } },
    },
  });
  return customers.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    country: row.country,
    orders: row._count.orders,
    store: row.tenant.name,
    tenantId: row.tenant.id,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function exportBuyer(email: string) {
  const term = email.trim().toLowerCase();
  const customers = await prisma.customer.findMany({
    where: { email: { equals: term, mode: "insensitive" } },
    include: {
      addresses: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          guestEmail: true,
        },
      },
      tenant: { select: { slug: true, name: true } },
    },
  });
  return {
    email: term,
    exportedAt: new Date().toISOString(),
    customers: customers.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      country: row.country,
      store: row.tenant.slug,
      addresses: row.addresses.map((address) => ({
        name: address.name,
        phone: address.phone,
        address1: address.address1,
        city: address.city,
        country: address.country,
      })),
      orders: row.orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
      })),
    })),
  };
}

export async function eraseBuyer(email: string) {
  const term = email.trim().toLowerCase();
  const customers = await prisma.customer.findMany({
    where: { email: { equals: term, mode: "insensitive" } },
    select: { id: true, tenantId: true },
  });
  let orders = 0;
  for (const customer of customers) {
    const tombstone = `deleted-${customer.id}@removed.invalid`;
    await prisma.customerAddress.deleteMany({ where: { customerId: customer.id } });
    await prisma.wishlistItem.deleteMany({ where: { customerId: customer.id } });
    const updated = await prisma.order.updateMany({
      where: { customerId: customer.id },
      data: { guestEmail: null },
    });
    orders += updated.count;
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        email: tombstone,
        name: "Deleted buyer",
        passwordHash: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        stripeCustomerId: null,
        country: null,
      },
    });
  }
  const guests = await prisma.order.updateMany({
    where: { guestEmail: { equals: term, mode: "insensitive" } },
    data: { guestEmail: null },
  });
  return { customers: customers.length, orders: orders + guests.count };
}

export async function listStaff() {
  return prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.SUPER_ADMIN, UserRole.PLATFORM_OPS, UserRole.PLATFORM_SUPPORT, UserRole.PLATFORM_FINANCE],
      },
    },
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  });
}
