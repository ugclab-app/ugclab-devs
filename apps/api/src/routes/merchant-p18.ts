import { Hono } from "hono";
import { OrderStatus, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  getMerchantAccess,
  hasPermission,
  type MerchantPermission,
} from "../lib/permissions.js";
import { captureOrderPayment, voidAuthorizedPayment } from "../lib/payment-capture.js";
import {
  createSplitFulfillments,
  routeOrderLinesToWarehouses,
} from "../lib/fulfillment-routing.js";
import { generateGiftCardCode } from "../lib/gift-card.js";
import { getStripe, isStripeConfigured } from "../lib/stripe.js";
import { logActivity } from "../lib/activity-log.js";

const p18 = new Hono<AuthEnv>();
p18.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  return { tenant, session, access };
}

function allow(
  access: { permissions: MerchantPermission[] },
  perm: MerchantPermission
) {
  return hasPermission(access.permissions, perm);
}

p18.post("/orders/:id/capture", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  try {
    const updated = await captureOrderPayment(order.id, session.email);
    return c.json({ order: updated });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Capture failed" }, 400);
  }
});

p18.post("/orders/:id/void-authorization", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  try {
    await voidAuthorizedPayment(order.id, session.email);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Void failed" }, 400);
  }
});

p18.post("/orders/:id/release-hold", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentHold: false },
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "NOTE",
      body: `Fraud hold released by ${session.email}`,
    },
  });
  if (order.paymentCaptureStatus === "AUTHORIZED") {
    await captureOrderPayment(order.id, session.email);
  }
  return c.json({ ok: true });
});

p18.post("/orders/:id/split-fulfillments", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  await routeOrderLinesToWarehouses(order.id);
  const shipments = await createSplitFulfillments(order.id);
  return c.json({ shipments });
});

p18.get("/orders/:id/fulfillment-preview", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    select: { id: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  const { previewFulfillmentRouting } = await import("../lib/fulfillment-routing.js");
  const preview = await previewFulfillmentRouting(order.id);
  return c.json(preview);
});

p18.get("/orders/:id/fulfillments", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const shipments = await prisma.fulfillmentShipment.findMany({
    where: { orderId: c.req.param("id"), tenantId: tenant.id },
    include: {
      lines: {
        include: {
          orderLineItem: { select: { id: true, title: true, quantity: true } },
        },
      },
      warehouse: { select: { id: true, name: true } },
    },
  });
  return c.json({ shipments });
});

p18.patch("/fulfillments/:id", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  const shipment = await prisma.fulfillmentShipment.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { lines: true },
  });
  if (!shipment) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    status?: string;
    trackingNumber?: string;
    labelUrl?: string;
  }>();
  if (body.status === "SHIPPED") {
    const parent = await prisma.order.findUnique({ where: { id: shipment.orderId } });
    if (parent) {
      const { shipmentBlockReason, captureAuthorizedPayment } = await import(
        "../lib/buyer-protection.js"
      );
      const track = body.trackingNumber?.trim() || shipment.trackingNumber || parent.trackingNumber;
      const block = shipmentBlockReason(parent, track, true);
      if (block) return c.json({ error: block }, 400);
      await captureAuthorizedPayment(parent.id, session.email);
      await prisma.order.update({
        where: { id: parent.id },
        data: {
          ...(track ? { trackingNumber: track } : {}),
          shippedAt: parent.shippedAt ?? new Date(),
          status: OrderStatus.FULFILLED,
        },
      });
    }
  }
  const updated = await prisma.fulfillmentShipment.update({
    where: { id: shipment.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.trackingNumber !== undefined
        ? { trackingNumber: body.trackingNumber }
        : {}),
      ...(body.labelUrl !== undefined ? { labelUrl: body.labelUrl } : {}),
      ...(body.status === "SHIPPED" ? { shippedAt: new Date() } : {}),
    },
  });
  if (body.status === "SHIPPED") {
    for (const line of shipment.lines) {
      await prisma.orderLineItem.update({
        where: { id: line.orderLineItemId },
        data: { fulfilledQuantity: { increment: line.quantity } },
      });
    }
    await prisma.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: shipment.orderId,
        type: "STATUS_CHANGE",
        body: `Shipment ${shipment.id.slice(0, 8)} shipped${
          body.trackingNumber ? ` · ${body.trackingNumber}` : ""
        } (${session.email})`,
      },
    });
  }
  return c.json({ shipment: updated });
});

p18.post("/b2b/quotes", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    companyId?: string;
    title?: string;
    currency?: string;
    note?: string;
    validUntil?: string;
    lines?: { productId: string; title: string; quantity: number; unitAmount: number }[];
  }>();
  const company = await prisma.b2bCompany.findFirst({
    where: { id: String(body.companyId ?? ""), tenantId: tenant.id },
  });
  if (!company) return c.json({ error: "Company not found" }, 404);
  const lines = body.lines ?? [];
  const subtotal = lines.reduce((s, l) => s + l.unitAmount * l.quantity, 0);
  const quote = await prisma.b2bQuote.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      title: String(body.title ?? "Quote").trim() || "Quote",
      currency: (body.currency ?? "USD").toUpperCase().slice(0, 3),
      note: body.note ?? null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      subtotalCents: subtotal,
      lines: lines as object[],
      status: "SENT",
    },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "b2b.quote.create",
    summary: `Quote ${quote.title} for ${company.name}`,
  });
  return c.json({ quote }, 201);
});

p18.get("/b2b/quotes", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const quotes = await prisma.b2bQuote.findMany({
    where: {
      tenantId: tenant.id,
      ...(c.req.query("companyId")
        ? { companyId: c.req.query("companyId")! }
        : {}),
    },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json({ quotes });
});

p18.patch("/b2b/companies/:id/catalog", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "customers")) return c.json({ error: "Forbidden" }, 403);
  const company = await prisma.b2bCompany.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!company) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{ productIds?: string[] }>();
  const updated = await prisma.b2bCompany.update({
    where: { id: company.id },
    data: { catalogProductIds: body.productIds ?? [] },
  });
  return c.json({ company: updated });
});

p18.post("/gift-cards/:id/reload", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "growth")) return c.json({ error: "Forbidden" }, 403);
  const card = await prisma.giftCard.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!card) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{ amountCents?: number }>();
  const amount = Math.max(0, Math.round(Number(body.amountCents) || 0));
  if (amount <= 0) return c.json({ error: "amountCents required" }, 400);
  const updated = await prisma.giftCard.update({
    where: { id: card.id },
    data: {
      balanceCents: { increment: amount },
      initialBalance: { increment: amount },
      active: true,
    },
  });
  return c.json({ giftCard: updated });
});

p18.post("/products/:id/sell-as-gift-card", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "products")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ enabled?: boolean }>();
  const updated = await prisma.product.updateMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    data: { sellAsGiftCard: body.enabled !== false },
  });
  if (!updated.count) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

p18.post("/product-subscriptions/:id/portal", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "orders")) return c.json({ error: "Forbidden" }, 403);
  if (!isStripeConfigured()) return c.json({ error: "Stripe not configured" }, 400);
  const sub = await prisma.productSubscription.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!sub?.stripeCustomerId) {
    return c.json({ error: "No Stripe customer on subscription" }, 400);
  }
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.MERCHANT_WEB_URL ?? "http://localhost:3001"}/growth?tab=subscriptions`,
  });
  return c.json({ url: session.url });
});

p18.post("/gift-cards/issue", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "growth")) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    amountCents?: number;
    currency?: string;
    recipientEmail?: string;
    note?: string;
  }>();
  const amount = Math.max(0, Math.round(Number(body.amountCents) || 0));
  if (amount <= 0) return c.json({ error: "amountCents required" }, 400);
  const card = await prisma.giftCard.create({
    data: {
      tenantId: tenant.id,
      code: generateGiftCardCode(),
      initialBalance: amount,
      balanceCents: amount,
      currency: (body.currency ?? "USD").toUpperCase().slice(0, 3),
      recipientEmail: body.recipientEmail ?? null,
      note: body.note ?? null,
    },
  });
  return c.json({ giftCard: card }, 201);
});

p18.get("/telegram", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "growth") && !allow(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const {
    readTelegramConfig,
    maskTelegramConfig,
  } = await import("../lib/telegram-bot.js");
  const cfg = await readTelegramConfig(tenant.id);
  return c.json({ telegram: maskTelegramConfig(cfg) });
});

p18.post("/telegram/connect", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "growth") && !allow(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = await c.req.json<{ botToken?: string }>();
  const token = String(body.botToken ?? "").trim();
  if (!token) return c.json({ error: "botToken required" }, 400);
  try {
    const { connectTelegramBot } = await import("../lib/telegram-bot.js");
    const result = await connectTelegramBot(tenant.id, token);
    await logActivity({
      tenantId: tenant.id,
      userEmail: session.email,
      action: "telegram.connect",
      summary: `Connected Telegram bot @${result.botUsername ?? "unknown"}`,
    });
    return c.json(result);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Connect failed" },
      400
    );
  }
});

p18.post("/telegram/disconnect", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!allow(access, "growth") && !allow(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { disconnectTelegramBot } = await import("../lib/telegram-bot.js");
  await disconnectTelegramBot(tenant.id);
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "telegram.disconnect",
    summary: "Disconnected Telegram bot",
  });
  return c.json({ ok: true });
});

p18.patch("/telegram", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "growth") && !allow(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = await c.req.json<{
    notifyOrders?: boolean;
    enabled?: boolean;
  }>();
  const {
    readTelegramConfig,
    writeTelegramConfig,
    maskTelegramConfig,
  } = await import("../lib/telegram-bot.js");
  const cfg = await readTelegramConfig(tenant.id);
  if (!cfg.botToken) return c.json({ error: "Connect a bot first" }, 400);
  await writeTelegramConfig(tenant.id, {
    ...cfg,
    ...(body.notifyOrders !== undefined
      ? { notifyOrders: !!body.notifyOrders }
      : {}),
    ...(body.enabled !== undefined ? { enabled: !!body.enabled } : {}),
  });
  const next = await readTelegramConfig(tenant.id);
  return c.json({ telegram: maskTelegramConfig(next) });
});

p18.post("/telegram/rotate-link", async (c) => {
  const { tenant, access } = await actor(c);
  if (!allow(access, "growth") && !allow(access, "settings")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { randomBytes } = await import("crypto");
  const {
    readTelegramConfig,
    writeTelegramConfig,
  } = await import("../lib/telegram-bot.js");
  const cfg = await readTelegramConfig(tenant.id);
  if (!cfg.botToken) return c.json({ error: "Connect a bot first" }, 400);
  const linkCode = randomBytes(4).toString("hex");
  await writeTelegramConfig(tenant.id, { ...cfg, linkCode });
  return c.json({
    linkCode,
    deepLink: cfg.botUsername
      ? `https://t.me/${cfg.botUsername}?start=${linkCode}`
      : null,
  });
});

export { p18 };
