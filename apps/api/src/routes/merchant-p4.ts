import { Hono } from "hono";
import { OrderStatus, prisma, ProductStatus } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { saveStoreMedia } from "../lib/uploads.js";
import { getMerchantPaymentMetrics } from "../lib/payment-metrics.js";
import { resolvePlatformFeeBps } from "../lib/platform-fee.js";

import { useOrderRouteGuards } from "../middleware/merchant-guards.js";

const p4 = new Hono<AuthEnv>();
p4.use("*", requireAuth);
useOrderRouteGuards(p4);

p4.get("/search", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return c.json({ products: [], orders: [], customers: [] });

  const [products, orders, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, title: true, slug: true, status: true },
    }),
    prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { guestEmail: { contains: q, mode: "insensitive" } },
          { customer: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        guestEmail: true,
        customer: { select: { email: true } },
      },
    }),
    prisma.customer.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, email: true, name: true },
    }),
  ]);

  return c.json({ products, orders, customers });
});

p4.post("/media/upload", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "Image file required" }, 400);
  const buf = Buffer.from(await file.arrayBuffer());
  const saved = await saveStoreMedia(tenant.id, {
    name: file.name,
    type: file.type,
    size: file.size,
    buffer: buf,
  });
  return c.json({ media: saved }, 201);
});

p4.get("/reports/summary", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const range = c.req.query("range") === "90" ? 90 : c.req.query("range") === "30" ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - range);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      createdAt: { gte: since },
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED, OrderStatus.REFUNDED] },
    },
    select: {
      status: true,
      totalAmount: true,
      taxAmount: true,
      discountAmount: true,
      currency: true,
    },
  });

  let revenue = 0;
  let tax = 0;
  let discounts = 0;
  let refunds = 0;
  for (const o of orders) {
    if (o.status === OrderStatus.REFUNDED) {
      refunds += o.totalAmount;
    } else {
      revenue += o.totalAmount;
      tax += o.taxAmount;
      discounts += o.discountAmount;
    }
  }

  const downloads = await prisma.digitalDownload.count({
    where: { tenantId: tenant.id, createdAt: { gte: since } },
  });

  const payment = await getMerchantPaymentMetrics(tenant.id, since);
  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: true },
  });
  const platformFeeBps = fullTenant ? resolvePlatformFeeBps(fullTenant) : 500;

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    range,
    revenue,
    tax,
    discounts,
    refunds,
    orderCount: orders.length,
    digitalDownloads: downloads,
    gmv: payment.gmv,
    platformFees: payment.platformFees,
    netPayout: payment.netPayout,
    platformFeeBps,
  });
});

p4.post("/orders/bulk-fulfill", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!ids?.length) return c.json({ error: "No orders selected" }, 400);

  const paid = await prisma.order.findMany({
    where: {
      id: { in: ids },
      tenantId: tenant.id,
      status: OrderStatus.PAID,
    },
    select: { id: true },
  });

  const result = await prisma.order.updateMany({
    where: { id: { in: paid.map((o) => o.id) } },
    data: { status: OrderStatus.FULFILLED, shippedAt: new Date() },
  });

  const { fulfillInventoryForOrder } = await import("../lib/inventory.js");
  for (const o of paid) {
    await fulfillInventoryForOrder(o.id).catch(() => {});
  }

  return c.json({ updated: result.count });
});

p4.post("/orders/bulk-cancel", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!ids?.length) return c.json({ error: "No orders selected" }, 400);

  const toCancel = await prisma.order.findMany({
    where: {
      id: { in: ids },
      tenantId: tenant.id,
      status: { in: [OrderStatus.PENDING, OrderStatus.DRAFT] },
    },
    select: { id: true },
  });

  const result = await prisma.order.updateMany({
    where: {
      id: { in: toCancel.map((o) => o.id) },
      tenantId: tenant.id,
    },
    data: { status: OrderStatus.CANCELLED },
  });

  const { releaseInventoryForOrder } = await import("../lib/inventory.js");
  for (const o of toCancel) {
    await releaseInventoryForOrder(o.id).catch(() => {});
  }

  return c.json({ updated: result.count });
});

p4.post("/orders/bulk-labels", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!ids?.length) return c.json({ error: "No orders selected" }, 400);

  const { isShippoConfigured } = await import("../lib/shippo.js");
  if (!isShippoConfigured()) {
    return c.json({ error: "Shippo is not configured (SHIPPO_API_KEY)" }, 503);
  }

  const orders = await prisma.order.findMany({
    where: {
      id: { in: ids },
      tenantId: tenant.id,
      shippingAddress1: { not: null },
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
  });

  const results: { orderId: string; ok: boolean; labelUrl?: string; error?: string }[] =
    [];
  const { createShippingLabelForOrder } = await import("../lib/shipping-label-order.js");
  for (const order of orders) {
    try {
      const label = await createShippingLabelForOrder(order.id, tenant.id);
      results.push({ orderId: order.id, ok: true, labelUrl: label.labelUrl });
    } catch (e) {
      results.push({
        orderId: order.id,
        ok: false,
        error: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  return c.json({
    attempted: orders.length,
    results,
    note: "DHL/FedEx direct APIs are not integrated — labels use Shippo rates.",
  });
});

export { p4 };
