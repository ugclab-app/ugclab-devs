import { Hono } from "hono";
import {
  OrderStatus,
  prisma,
  ProductStatus,
  TenantStatus,
  UserAccountStatus,
  UserRole,
} from "@ugclab/database";
import { uploadPublicUrl } from "../lib/uploads.js";
import type { AuthEnv } from "../middleware/session.js";
import { requireSuperAdmin } from "../middleware/super-admin.js";
import { getStorefrontUrl } from "../lib/storefront.js";
import { getPlatformPaymentMetrics } from "../lib/payment-metrics.js";
import { isMorPaymentModel } from "../lib/payment-model.js";
import { getMerchantBalance } from "../lib/merchant-balance.js";
import { getMorPlatformMetrics } from "../lib/mor-platform-metrics.js";
import { payoutsToCsv } from "../lib/payout-csv.js";
import { assertMorPayoutAmount } from "../lib/mor-payout-config.js";
import { getPlatformActionItems } from "../lib/platform-action-items.js";
import { notifyMerchantPayoutStatus } from "../lib/payout-emails.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import {
  createImpersonationUrl,
  getUserDetail,
  mapUserListRow,
  resetUserPassword,
  revokeUserSessions,
} from "../lib/platform-users.js";
import { registerPlatformV2Routes } from "./platform-v2.js";
import { registerPlatformV3Routes } from "./platform-v3.js";
import { registerPlatformDomainsRoutes } from "./platform-domains.js";
import { registerPlatformThemesRoutes } from "./platform-themes.js";
import { registerPlatformBlocksRoutes } from "./platform-blocks.js";
import { registerPlatformSectionsRoutes } from "./platform-sections.js";
import { registerPlatformEmailTemplateRoutes } from "./platform-email-templates.js";
import { registerPlatformOpsRoutes } from "./platform-ops.js";
import { registerPlatformOutreachRoutes } from "./platform-outreach.js";
import { registerPlatformAffiliatesRoutes } from "./platform-affiliates.js";
import { registerPlatformMarketingRoutes } from "./platform-marketing.js";
import { registerPlatformMerchantMessageRoutes } from "./platform-merchant-messages.js";
import { registerPlatformPartnerAdminRoutes } from "./platform-partners.js";

const platform = new Hono<AuthEnv>();
platform.use("*", requireSuperAdmin);
registerPlatformV2Routes(platform);
registerPlatformV3Routes(platform);
registerPlatformDomainsRoutes(platform);
registerPlatformThemesRoutes(platform);
registerPlatformBlocksRoutes(platform);
registerPlatformSectionsRoutes(platform);
registerPlatformEmailTemplateRoutes(platform);
registerPlatformOpsRoutes(platform);
registerPlatformOutreachRoutes(platform);
registerPlatformAffiliatesRoutes(platform);
registerPlatformPartnerAdminRoutes(platform);
registerPlatformMarketingRoutes(platform);
registerPlatformMerchantMessageRoutes(platform);

platform.get("/dashboard", async (c) => {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const payment30d = await getPlatformPaymentMetrics(d30);

  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    newTenants7d,
    paidOrders30d,
    gmvAgg,
    gmvPrevAgg,
    totalMerchants,
    recentTenants,
    stripeConnectedCount,
    inactiveStores30d,
    churnedStores30d,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
    prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
    prisma.tenant.count({ where: { createdAt: { gte: d7 } } }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d60, lt: d30 },
      },
      _sum: { totalAmount: true },
    }),
    prisma.user.count({ where: { role: UserRole.MERCHANT } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        owner: { select: { email: true, name: true } },
        subscriptionPlan: { select: { name: true, slug: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.tenant.count({
      where: { stripeAccountId: { not: null }, stripeChargesEnabled: true },
    }),
    prisma.tenant.count({
      where: {
        status: TenantStatus.ACTIVE,
        createdAt: { lt: d30 },
        orders: {
          none: {
            status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
            createdAt: { gte: d30 },
          },
        },
      },
    }),
    prisma.tenant.count({
      where: {
        status: TenantStatus.ACTIVE,
        createdAt: { lt: d30 },
        orders: {
          none: {
            status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
            createdAt: { gte: d60 },
          },
        },
      },
    }),
  ]);

  const gmv30d = gmvAgg._sum.totalAmount ?? 0;
  const gmvPrev30d = gmvPrevAgg._sum.totalAmount ?? 0;
  const gmvGrowthPct =
    gmvPrev30d > 0
      ? Math.round(((gmv30d - gmvPrev30d) / gmvPrev30d) * 100)
      : gmv30d > 0
        ? 100
        : 0;

  const morMetrics = isMorPaymentModel() ? await getMorPlatformMetrics() : null;
  const actionItems = await getPlatformActionItems();

  return c.json({
    paymentModel: isMorPaymentModel() ? "mor" : "connect",
    morMetrics,
    actionItems,
    metrics: {
      totalTenants,
      activeTenants,
      suspendedTenants,
      pendingTenants: totalTenants - activeTenants - suspendedTenants,
      newTenants7d,
      paidOrders30d,
      gmv30d,
      gmvPrev30d,
      gmvGrowthPct,
      inactiveStores30d,
      churnedStores30d,
      stripeConnectedCount,
      platformFees30d: payment30d.platformFees,
      mrrCents: payment30d.mrrCents,
      totalMerchants,
      ...(morMetrics
        ? {
            merchantDebtCents: morMetrics.merchantDebtCents,
            pendingPayoutCents: morMetrics.pendingPayoutCents,
            pendingPayoutCount: morMetrics.pendingPayoutCount,
            openDisputeEvents: morMetrics.openDisputeEvents,
          }
        : {}),
    },
    topStoresByGmv: payment30d.byTenant
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 8),
    recentTenants: recentTenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      createdAt: t.createdAt,
      ownerEmail: t.owner.email,
      plan: t.subscriptionPlan?.name ?? "—",
      productCount: t._count.products,
      orderCount: t._count.orders,
      storefrontUrl: getStorefrontUrl(t.slug),
    })),
  });
});

platform.get("/system", async (c) => {
  const mor = isMorPaymentModel();
  return c.json({
    paymentModel: mor ? "mor" : "connect",
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    emailConfigured: Boolean(
      process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
    ),
    merchantAdminUrl: process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001",
    storefrontUrl: process.env.STOREFRONT_URL ?? "http://localhost:3002",
    platformOpsEmail: process.env.PLATFORM_OPS_EMAIL?.trim() || null,
    database: "ok",
  });
});

platform.get("/payouts", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ payouts: [], paymentModel: "connect" });
  }
  const status = c.req.query("status")?.trim()?.toLowerCase();
  const where =
    status === "open"
      ? { status: { in: ["PENDING", "PROCESSING"] } }
      : status && status !== "all"
        ? { status: status.toUpperCase() }
        : {};
  const payouts = await prisma.merchantPayout.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
  const pendingAgg = await prisma.merchantPayout.aggregate({
    where: { status: { in: ["PENDING", "PROCESSING"] } },
    _sum: { amount: true },
    _count: true,
  });
  return c.json({
    paymentModel: "mor",
    summary: {
      pendingCount: pendingAgg._count,
      pendingCents: pendingAgg._sum.amount ?? 0,
    },
    payouts: payouts.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      tenantName: p.tenant.name,
      tenantSlug: p.tenant.slug,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      note: p.note,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

platform.get("/orders", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const status = c.req.query("status")?.trim();
  const orders = await prisma.order.findMany({
    where: {
      ...(status && Object.values(OrderStatus).includes(status as OrderStatus)
        ? { status: status as OrderStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { guestEmail: { contains: q, mode: "insensitive" } },
              { customer: { email: { contains: q, mode: "insensitive" } } },
              { tenant: { name: { contains: q, mode: "insensitive" } } },
              { tenant: { slug: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      customer: { select: { email: true } },
    },
  });
  return c.json({
    orders: orders.map((o) => ({
      id: o.id,
      tenantId: o.tenantId,
      tenantName: o.tenant.name,
      tenantSlug: o.tenant.slug,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      customerEmail: o.customer?.email ?? o.guestEmail,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

platform.get("/orders/:id", async (c) => {
  const order = await prisma.order.findUnique({
    where: { id: c.req.param("id") },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          owner: { select: { id: true, email: true, name: true } },
        },
      },
      customer: { select: { id: true, email: true, name: true } },
      items: true,
      events: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  const siblingOrders =
    order.customerId || order.guestEmail
      ? await prisma.order.findMany({
          where: {
            tenantId: order.tenantId,
            id: { not: order.id },
            OR: [
              ...(order.customerId ? [{ customerId: order.customerId }] : []),
              ...(order.guestEmail
                ? [{ guestEmail: { equals: order.guestEmail, mode: "insensitive" as const } }]
                : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        })
      : [];

  const events = [
    {
      id: `created-${order.id}`,
      type: "CREATED",
      body: "Order created",
      createdAt: order.createdAt.toISOString(),
      authorEmail: null as string | null,
    },
    ...order.events.map((e) => ({
      id: e.id,
      type: e.type,
      body: e.body,
      createdAt: e.createdAt.toISOString(),
      authorEmail: e.authorEmail,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return c.json({
    order: {
      id: order.id,
      tenantId: order.tenantId,
      tenantName: order.tenant.name,
      tenantSlug: order.tenant.slug,
      ownerId: order.tenant.ownerId,
      ownerEmail: order.tenant.owner.email,
      orderNumber: order.orderNumber,
      status: order.status,
      currency: order.currency,
      subtotalAmount: order.subtotalAmount,
      shippingAmount: order.shippingAmount,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      platformFeeAmount: order.platformFeeAmount,
      paymentProvider: order.paymentProvider,
      stripePaymentId: order.stripePaymentId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      gopayPaymentId: order.gopayPaymentId,
      finikPaymentId: order.finikPaymentId,
      guestEmail: order.guestEmail,
      customerId: order.customerId,
      customerEmail: order.customer?.email ?? order.guestEmail,
      customerName: order.customer?.name ?? order.shippingName,
      shippingCountry: order.shippingCountry,
      shippingName: order.shippingName,
      shippingAddress1: order.shippingAddress1,
      shippingAddress2: order.shippingAddress2,
      shippingCity: order.shippingCity,
      shippingPostal: order.shippingPostal,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        unitAmount: i.unitAmount,
        totalAmount: i.totalAmount,
        fulfilledQuantity: i.fulfilledQuantity,
      })),
      events,
      siblingOrders: siblingOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      })),
    },
  });
});

platform.post("/orders/:id/mark-paid", async (c) => {
  const session = c.get("session");
  const order = await prisma.order.findUnique({ where: { id: c.req.param("id") } });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.PENDING) {
    return c.json({ error: "Order cannot be marked paid" }, 400);
  }
  if (order.status === OrderStatus.DRAFT) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PENDING },
    });
  }
  const { fulfillPaidOrder } = await import("../lib/fulfill-order.js");
  const updated = await fulfillPaidOrder(order.id, {
    platformFeeAmount: order.platformFeeAmount,
  });
  if (!updated) return c.json({ error: "Fulfillment failed" }, 500);
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "NOTE",
      body: "Marked as paid by platform admin",
      authorEmail: session.email,
    },
  });
  await logPlatformAudit({
    actorUserId: session.sub,
    actorEmail: session.email,
    action: "order.mark_paid",
    summary: `Order ${order.orderNumber} marked paid`,
  });
  return c.json({ order: { id: updated.id, status: updated.status } });
});

platform.post("/orders/:id/refund", async (c) => {
  const session = c.get("session");
  const body = (await c.req
    .json<{ amountCents?: number; reason?: string }>()
    .catch(() => ({}))) as { amountCents?: number; reason?: string };
  const order = await prisma.order.findUnique({ where: { id: c.req.param("id") } });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (
    order.status !== OrderStatus.PAID &&
    order.status !== OrderStatus.FULFILLED
  ) {
    return c.json({ error: "Only paid or fulfilled orders can be refunded" }, 400);
  }
  const { refundOrderInStripe, markOrderRefunded } = await import(
    "../lib/stripe-refund.js"
  );
  let stripeRefund = false;
  let refundAmountCents = body.amountCents;
  try {
    const r = await refundOrderInStripe(order.id, {
      amountCents: body.amountCents,
    });
    refundAmountCents = r.amountCents || body.amountCents || order.totalAmount;
    stripeRefund = Boolean(r.refundId);
  } catch {
    refundAmountCents = refundAmountCents ?? order.totalAmount;
  }
  const updated = await markOrderRefunded(order.id, {
    refundAmountCents: refundAmountCents ?? order.totalAmount,
    reason: body.reason ?? "Platform admin refund",
    authorEmail: session.email,
  });
  if (!updated) return c.json({ error: "Refund failed" }, 500);
  await logPlatformAudit({
    actorUserId: session.sub,
    actorEmail: session.email,
    action: "order.refund",
    summary: `Refunded order ${order.orderNumber} (${refundAmountCents ?? order.totalAmount})`,
  });
  return c.json({
    order: { id: updated.id, status: updated.status },
    stripeRefund,
    refundAmountCents,
  });
});

platform.post("/orders/:id/cancel", async (c) => {
  const session = c.get("session");
  const order = await prisma.order.findUnique({ where: { id: c.req.param("id") } });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.DRAFT) {
    return c.json({ error: "Only pending/draft orders can be cancelled" }, 400);
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.CANCELLED },
  });
  const { releaseInventoryForOrder } = await import("../lib/inventory.js");
  await releaseInventoryForOrder(order.id).catch(() => {});
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: "Cancelled by platform admin",
      authorEmail: session.email,
    },
  });
  const { emailCustomerAboutOrder } = await import("../lib/transactional-email.js");
  emailCustomerAboutOrder(order.id, "orderCancelled", {
    reason: "Cancelled by platform",
  }).catch(() => {});
  await logPlatformAudit({
    actorUserId: session.sub,
    actorEmail: session.email,
    action: "order.cancel",
    summary: `Cancelled order ${order.orderNumber}`,
  });
  return c.json({ order: { id: updated.id, status: updated.status } });
});

platform.patch("/orders/:id/fulfillment", async (c) => {
  const session = c.get("session");
  const body = await c.req.json<{
    trackingNumber?: string;
    markFulfilled?: boolean;
  }>();
  const order = await prisma.order.findUnique({ where: { id: c.req.param("id") } });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (
    order.status !== OrderStatus.PAID &&
    order.status !== OrderStatus.FULFILLED
  ) {
    return c.json({ error: "Order must be paid before fulfillment" }, 400);
  }
  const tracking = body.trackingNumber?.trim() || null;
  const markFulfilled = body.markFulfilled === true;
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      ...(tracking !== null ? { trackingNumber: tracking } : {}),
      ...(markFulfilled
        ? {
            status: OrderStatus.FULFILLED,
            shippedAt: order.shippedAt ?? new Date(),
          }
        : tracking
          ? { shippedAt: order.shippedAt ?? new Date() }
          : {}),
    },
  });
  if (tracking) {
    await prisma.orderEvent.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "NOTE",
        body: `Tracking: ${tracking}`,
        authorEmail: session.email,
      },
    });
  }
  if (markFulfilled && order.status !== OrderStatus.FULFILLED) {
    await prisma.orderEvent.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "STATUS_CHANGE",
        body: "Marked as fulfilled (platform admin)",
        authorEmail: session.email,
      },
    });
  }
  return c.json({
    order: {
      id: updated.id,
      status: updated.status,
      trackingNumber: updated.trackingNumber,
    },
  });
});

platform.patch("/orders/:id/line-fulfillment", async (c) => {
  const session = c.get("session");
  const body = await c.req.json<{
    items: { lineId: string; fulfilledQuantity: number }[];
    markFulfilled?: boolean;
  }>();
  const order = await prisma.order.findUnique({
    where: { id: c.req.param("id") },
    include: { items: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  for (const row of body.items ?? []) {
    const line = order.items.find((i) => i.id === row.lineId);
    if (!line) continue;
    const qty = Math.min(line.quantity, Math.max(0, row.fulfilledQuantity));
    await prisma.orderLineItem.update({
      where: { id: line.id },
      data: { fulfilledQuantity: qty },
    });
  }
  if (body.markFulfilled) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FULFILLED,
        shippedAt: order.shippedAt ?? new Date(),
      },
    });
    await prisma.orderEvent.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "STATUS_CHANGE",
        body: "Marked as fulfilled (line items)",
        authorEmail: session.email,
      },
    });
  }
  return c.json({ ok: true });
});

platform.post("/orders/:id/notes", async (c) => {
  const session = c.get("session");
  const body = await c.req.json<{ body?: string }>();
  const text = String(body.body ?? "").trim();
  if (!text) return c.json({ error: "Note cannot be empty" }, 400);
  const order = await prisma.order.findUnique({ where: { id: c.req.param("id") } });
  if (!order) return c.json({ error: "Not found" }, 404);
  const event = await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "NOTE",
      body: text,
      authorEmail: session.email,
    },
  });
  return c.json({
    event: {
      id: event.id,
      type: event.type,
      body: event.body,
      createdAt: event.createdAt.toISOString(),
      authorEmail: event.authorEmail,
    },
  });
});

platform.get("/orders/:id/invoice", async (c) => {
  const order = await prisma.order.findUnique({
    where: { id: c.req.param("id") },
    include: {
      customer: true,
      items: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  const { renderOrderHtml, orderToDoc } = await import("../lib/order-document.js");
  const html = renderOrderHtml(orderToDoc(order), "invoice", {
    includePlatformFee: true,
  });
  return c.html(html);
});

platform.get("/orders/:id/packing-slip", async (c) => {
  const order = await prisma.order.findUnique({
    where: { id: c.req.param("id") },
    include: {
      customer: true,
      items: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  const { renderOrderHtml, orderToDoc } = await import("../lib/order-document.js");
  const html = renderOrderHtml(orderToDoc(order), "packing");
  return c.html(html);
});

platform.get("/payments/local", async (c) => {
  const { isFinikConfigured } = await import("../lib/finik/config.js");
  const { isGoPayConfigured } = await import("../lib/gopay/config.js");
  const recent = await prisma.order.findMany({
    where: {
      OR: [
        { paymentProvider: { in: ["finik", "FINIK", "gopay", "GOPAY"] } },
        { finikPaymentId: { not: null } },
        { gopayPaymentId: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      customer: { select: { email: true } },
    },
  });
  return c.json({
    finikConfigured: isFinikConfigured(),
    gopayConfigured: isGoPayConfigured(),
    orders: recent.map((o) => ({
      id: o.id,
      tenantId: o.tenantId,
      tenantName: o.tenant.name,
      tenantSlug: o.tenant.slug,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      paymentProvider: o.paymentProvider,
      finikPaymentId: o.finikPaymentId,
      gopayPaymentId: o.gopayPaymentId,
      customerEmail: o.customer?.email ?? o.guestEmail,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

platform.get("/activity", async (c) => {
  const tenantId = c.req.query("tenantId")?.trim();
  const logs = await prisma.activityLog.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
  return c.json({
    logs: logs.map((l) => ({
      id: l.id,
      tenantId: l.tenantId,
      tenantName: l.tenant.name,
      tenantSlug: l.tenant.slug,
      userEmail: l.userEmail,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      summary: l.summary,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

platform.get("/tenants/export.csv", async (c) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true } },
      subscriptionPlan: { select: { slug: true, name: true } },
      settings: { select: { currency: true } },
      _count: { select: { products: true, orders: true } },
    },
  });
  const header =
    "slug,name,status,owner_email,plan,products,orders,currency,created_at";
  const rows = tenants.map((t) =>
    [
      t.slug,
      csvCell(t.name),
      t.status,
      t.owner.email,
      t.subscriptionPlan?.slug ?? "",
      t._count.products,
      t._count.orders,
      t.settings?.currency ?? "USD",
      t.createdAt.toISOString().slice(0, 10),
    ].join(",")
  );
  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stores.csv"',
    },
  });
});

function csvCell(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

platform.get("/tenants", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const status = c.req.query("status");

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const paidStatuses = [OrderStatus.PAID, OrderStatus.FULFILLED];

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(status && Object.values(TenantStatus).includes(status as TenantStatus)
        ? { status: status as TenantStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { owner: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      subscriptionPlan: { select: { id: true, name: true, slug: true } },
      settings: { select: { currency: true } },
      _count: { select: { products: true, orders: true, customers: true } },
    },
  });

  const gmvRows = await prisma.order.groupBy({
    by: ["tenantId"],
    where: {
      tenantId: { in: tenants.map((t) => t.id) },
      status: { in: paidStatuses },
      createdAt: { gte: d30 },
    },
    _sum: { totalAmount: true },
    _count: true,
  });
  const gmvMap = new Map(
    gmvRows.map((r) => [
      r.tenantId,
      { gmv30d: r._sum.totalAmount ?? 0, orders30d: r._count },
    ])
  );

  return c.json({
    tenants: tenants.map((t) => {
      const stats = gmvMap.get(t.id);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        owner: t.owner,
        plan: t.subscriptionPlan,
        currency: t.settings?.currency ?? "USD",
        productCount: t._count.products,
        orderCount: t._count.orders,
        customerCount: t._count.customers,
        gmv30d: stats?.gmv30d ?? 0,
        orders30d: stats?.orders30d ?? 0,
        storefrontUrl: getStorefrontUrl(t.slug),
        merchantAdminUrl: `${process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001"}`,
      };
    }),
  });
});

platform.get("/tenants/:id", async (c) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param("id") },
    include: {
      owner: { select: { id: true, email: true, name: true, createdAt: true } },
      subscriptionPlan: true,
      settings: true,
      customDomains: true,
      _count: { select: { products: true, orders: true, customers: true } },
    },
  });
  if (!tenant) return c.json({ error: "Not found" }, 404);

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [orders30d, gmv] = await Promise.all([
    prisma.order.count({
      where: {
        tenantId: tenant.id,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const recentOrders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      customer: { select: { email: true } },
      affiliatePartner: { select: { code: true, displayName: true } },
    },
  });

  const pendingPayouts = isMorPaymentModel()
    ? await prisma.merchantPayout.count({
        where: {
          tenantId: tenant.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      })
    : 0;

  return c.json({
    paymentModel: isMorPaymentModel() ? "mor" : "connect",
    tenant: {
      ...tenant,
      storefrontUrl: getStorefrontUrl(tenant.slug),
      platformFeeBpsOverride: tenant.platformFeeBpsOverride,
      stats: {
        orders30d,
        gmv30d: gmv._sum.totalAmount ?? 0,
        pendingPayouts,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: o.currency,
        affiliateCommissionCents: o.affiliateCommissionCents,
        referral: o.affiliatePartner
          ? {
              code: o.affiliatePartner.code,
              displayName: o.affiliatePartner.displayName,
            }
          : null,
        customer: o.customer,
        createdAt: o.createdAt.toISOString(),
      })),
    },
  });
});

platform.patch("/tenants/:id", async (c) => {
  const body = await c.req.json<{
    status?: TenantStatus;
    subscriptionPlanId?: string | null;
    platformFeeBpsOverride?: number | null;
  }>();
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!tenant) return c.json({ error: "Not found" }, 404);

  if (body.status && !Object.values(TenantStatus).includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  let feeOverride: number | null | undefined;
  if (body.platformFeeBpsOverride !== undefined) {
    if (body.platformFeeBpsOverride === null) {
      feeOverride = null;
    } else {
      const bps = Math.floor(Number(body.platformFeeBpsOverride));
      if (bps < 0 || bps > 5000) {
        return c.json({ error: "platformFeeBpsOverride must be 0–5000" }, 400);
      }
      feeOverride = bps;
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.subscriptionPlanId !== undefined
        ? { subscriptionPlanId: body.subscriptionPlanId }
        : {}),
      ...(feeOverride !== undefined ? { platformFeeBpsOverride: feeOverride } : {}),
    },
    include: {
      owner: { select: { email: true, name: true } },
      subscriptionPlan: true,
    },
  });

  return c.json({ tenant: updated });
});

platform.get("/plans", async (c) => {
  const includeArchived = c.req.query("archived") === "1";
  const plans = await prisma.subscriptionPlan.findMany({
    where: includeArchived ? undefined : { archived: false },
    orderBy: { priceMonthly: "asc" },
    include: { _count: { select: { tenants: true } } },
  });
  return c.json({ plans });
});

platform.get("/payouts/export.csv", async (c) => {
  if (!isMorPaymentModel()) return c.json({ error: "MoR only" }, 404);
  const csv = await payoutsToCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="platform-payouts.csv"',
    },
  });
});

platform.get("/tenants/:id/products", async (c) => {
  const tenantId = c.req.param("id");
  const q = (c.req.query("q") ?? "").trim();
  const statusFilter = (c.req.query("status") ?? "all").trim().toUpperCase();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true, name: true },
  });
  if (!tenant) return c.json({ error: "Not found" }, 404);

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(statusFilter !== "ALL" &&
      Object.values(ProductStatus).includes(statusFilter as ProductStatus)
        ? { status: statusFilter as ProductStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { orderItems: true } },
    },
  });

  const storefrontUrl = getStorefrontUrl(tenant.slug);

  return c.json({
    tenantSlug: tenant.slug,
    storefrontUrl,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      type: p.type,
      priceAmount: p.priceAmount,
      currency: p.currency,
      inventory: p.inventory,
      sku: p.sku,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      imageUrl: p.images[0] ? uploadPublicUrl(p.images[0].storageKey) : null,
      ordersCount: p._count.orderItems,
    })),
  });
});

platform.get("/tenants/:id/payouts", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "MoR payouts only" }, 404);
  }
  const balance = await getMerchantBalance(c.req.param("id"));
  return c.json({ balance });
});

platform.post("/tenants/:id/payouts/:payoutId/mark-processing", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "MoR payouts only" }, 404);
  }
  const payout = await prisma.merchantPayout.findFirst({
    where: { id: c.req.param("payoutId"), tenantId: c.req.param("id") },
  });
  if (!payout) return c.json({ error: "Not found" }, 404);
  if (payout.status === "PAID") {
    return c.json({ error: "Payout already paid" }, 400);
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: payout.tenantId } });
  const updated = await prisma.merchantPayout.update({
    where: { id: payout.id },
    data: { status: "PROCESSING" },
  });
  if (tenant) {
    await notifyMerchantPayoutStatus({
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount: payout.amount,
      currency: payout.currency,
      status: "PROCESSING",
      note: payout.note,
    });
  }
  return c.json({ payout: updated });
});

platform.post("/tenants/:id/payouts/:payoutId/mark-failed", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "MoR payouts only" }, 404);
  }
  let body: { note?: string } = {};
  try {
    body = await c.req.json<{ note?: string }>();
  } catch {
    /* optional body */
  }
  const payout = await prisma.merchantPayout.findFirst({
    where: { id: c.req.param("payoutId"), tenantId: c.req.param("id") },
  });
  if (!payout) return c.json({ error: "Not found" }, 404);
  if (payout.status === "PAID") {
    return c.json({ error: "Cannot fail a paid payout" }, 400);
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: payout.tenantId } });
  const note =
    body.note?.trim() ||
    payout.note ||
    "Payout could not be completed — balance returned to available earnings.";
  const updated = await prisma.merchantPayout.update({
    where: { id: payout.id },
    data: { status: "FAILED", note },
  });
  if (tenant) {
    await notifyMerchantPayoutStatus({
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount: payout.amount,
      currency: payout.currency,
      status: "FAILED",
      note,
    });
  }
  return c.json({ payout: updated });
});

platform.post("/tenants/:id/payouts/:payoutId/mark-paid", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "MoR payouts only" }, 404);
  }
  const payout = await prisma.merchantPayout.findFirst({
    where: { id: c.req.param("payoutId"), tenantId: c.req.param("id") },
  });
  if (!payout) return c.json({ error: "Not found" }, 404);
  const tenant = await prisma.tenant.findUnique({ where: { id: payout.tenantId } });
  const updated = await prisma.merchantPayout.update({
    where: { id: payout.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (tenant) {
    await notifyMerchantPayoutStatus({
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount: payout.amount,
      currency: payout.currency,
      status: "PAID",
      note: payout.note,
    });
  }
  return c.json({ payout: updated });
});

platform.post("/tenants/:id/payouts", async (c) => {
  if (!isMorPaymentModel()) {
    return c.json({ error: "MoR payouts only" }, 404);
  }
  const body = await c.req.json<{ amountCents: number; note?: string; status?: string }>();
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param("id") },
    include: { settings: true },
  });
  if (!tenant) return c.json({ error: "Tenant not found" }, 404);
  const amount = Math.max(0, Math.floor(body.amountCents ?? 0));
  if (amount <= 0) return c.json({ error: "amountCents required" }, 400);
  const balance = await getMerchantBalance(tenant.id);
  if (amount > balance.availableCents) {
    return c.json({ error: "Amount is above the available balance" }, 400);
  }
  const minErr = assertMorPayoutAmount(amount);
  if (minErr && body.status !== "PAID") return c.json({ error: minErr }, 400);
  const status = body.status === "PAID" ? "PAID" : "PENDING";
  const payout = await prisma.merchantPayout.create({
    data: {
      tenantId: tenant.id,
      amount,
      currency: tenant.settings?.currency ?? "USD",
      status,
      note: body.note?.trim() || "Recorded by platform admin",
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
    },
  });
  if (status === "PAID") {
    await notifyMerchantPayoutStatus({
      tenantId: tenant.id,
      tenantName: tenant.name,
      amount,
      currency: payout.currency,
      status: "PAID",
      note: payout.note,
    });
  }
  return c.json({ payout }, 201);
});

platform.get("/users/export.csv", async (c) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      tenants: { select: { slug: true } },
      _count: { select: { tenants: true } },
    },
  });
  const header =
    "email,name,role,account_status,stores,totp,last_login,joined";
  const rows = users.map((u) =>
    [
      u.email,
      csvCell(u.name ?? ""),
      u.role,
      u.accountStatus,
      u._count.tenants,
      u.totpEnabled ? "yes" : "no",
      u.lastLoginAt?.toISOString().slice(0, 10) ?? "",
      u.createdAt.toISOString().slice(0, 10),
    ].join(",")
  );
  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users.csv"',
    },
  });
});

platform.get("/users", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const role = c.req.query("role")?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(role && Object.values(UserRole).includes(role as UserRole)
        ? { role: role as UserRole }
        : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenants: { select: { id: true, name: true, slug: true } },
      _count: { select: { tenants: true } },
    },
  });
  return c.json({ users: users.map(mapUserListRow) });
});

platform.get("/users/:id", async (c) => {
  const user = await getUserDetail(c.req.param("id"));
  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json({ user });
});

platform.patch("/users/:id", async (c) => {
  const session = c.get("session");
  const targetId = c.req.param("id");
  const body = await c.req.json<{
    role?: UserRole;
    accountStatus?: UserAccountStatus;
    requireAdmin2fa?: boolean;
    name?: string | null;
  }>();

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return c.json({ error: "Not found" }, 404);

  if (targetId === session.sub && body.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Cannot ban your own account" }, 400);
  }
  if (targetId === session.sub && body.role && body.role !== target.role) {
    return c.json({ error: "Cannot change your own role" }, 400);
  }

  if (body.role === UserRole.SUPER_ADMIN && target.role !== UserRole.SUPER_ADMIN) {
    const admins = await prisma.user.count({
      where: { role: UserRole.SUPER_ADMIN },
    });
    if (admins >= 10) {
      return c.json({ error: "Too many super admins" }, 400);
    }
  }

  if (
    target.role === UserRole.SUPER_ADMIN &&
    body.role === UserRole.MERCHANT
  ) {
    const admins = await prisma.user.count({
      where: { role: UserRole.SUPER_ADMIN },
    });
    if (admins <= 1) {
      return c.json({ error: "Cannot remove the last super admin" }, 400);
    }
  }

  const data: {
    role?: UserRole;
    accountStatus?: UserAccountStatus;
    bannedAt?: Date | null;
    requireAdmin2fa?: boolean;
    name?: string | null;
    sessionVersion?: { increment: number };
  } = {};

  if (body.name !== undefined) data.name = body.name?.trim() || null;
  if (body.role) data.role = body.role;
  if (body.requireAdmin2fa !== undefined) {
    data.requireAdmin2fa = body.requireAdmin2fa;
  }
  if (body.accountStatus) {
    data.accountStatus = body.accountStatus;
    data.bannedAt =
      body.accountStatus === UserAccountStatus.BANNED ? new Date() : null;
    if (body.accountStatus === UserAccountStatus.BANNED) {
      data.sessionVersion = { increment: 1 };
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
  });

  await logPlatformAudit({
    actorUserId: session.sub,
    actorEmail: session.email,
    action: "user.update",
    targetUserId: targetId,
    summary: `Updated user ${updated.email}`,
    meta: body as Record<string, unknown>,
  });

  const user = await getUserDetail(targetId);
  return c.json({ user });
});

platform.post("/users/:id/revoke-sessions", async (c) => {
  const session = c.get("session");
  const target = await prisma.user.findUnique({ where: { id: c.req.param("id") } });
  if (!target) return c.json({ error: "Not found" }, 404);
  await revokeUserSessions(target, { id: session.sub, email: session.email });
  const user = await getUserDetail(target.id);
  return c.json({ user });
});

platform.post("/users/:id/reset-password", async (c) => {
  const session = c.get("session");
  const target = await prisma.user.findUnique({ where: { id: c.req.param("id") } });
  if (!target) return c.json({ error: "Not found" }, 404);
  const result = await resetUserPassword(target, {
    id: session.sub,
    email: session.email,
  });
  return c.json(result);
});

platform.post("/users/:id/impersonate", async (c) => {
  const session = c.get("session");
  const target = await prisma.user.findUnique({ where: { id: c.req.param("id") } });
  if (!target) return c.json({ error: "Not found" }, 404);
  if (target.id === session.sub) {
    return c.json({ error: "Cannot impersonate yourself" }, 400);
  }
  if (target.role === UserRole.SUPER_ADMIN) {
    return c.json({ error: "Cannot impersonate platform admin" }, 400);
  }
  if (target.accountStatus === UserAccountStatus.BANNED) {
    return c.json({ error: "Account is banned" }, 400);
  }
  const url = await createImpersonationUrl(target, {
    id: session.sub,
    email: session.email,
  });
  return c.json({ url, expiresInSeconds: 300 });
});

export { platform };
