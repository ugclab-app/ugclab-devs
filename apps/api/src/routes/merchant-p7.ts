import { Hono } from "hono";
import { OrderStatus, PurchaseOrderStatus, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import {
  editOrderShipping,
  addOrderLine,
  removeOrderLine,
} from "../lib/order-edit.js";
import {
  getSkuAlerts,
  logInventoryMovement,
  releaseInventoryForOrder,
} from "../lib/inventory.js";
import { getShippoRates, isShippoConfigured } from "../lib/shippo.js";

const p7 = new Hono<AuthEnv>();
p7.use("*", requireAuth);

p7.patch("/orders/:id/edit", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<Record<string, unknown>>();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });

  if (body.shippingAddress1 != null || body.shippingName != null) {
    await editOrderShipping(
      c.req.param("id"),
      tenant.id,
      body,
      user?.email ?? session.email
    );
  }

  if (body.addLine && typeof body.addLine === "object") {
    const line = body.addLine as {
      productId: string;
      variantId?: string;
      quantity?: number;
    };
    await addOrderLine(
      c.req.param("id"),
      tenant.id,
      line,
      user?.email ?? session.email
    );
  }

  if (body.removeLineId) {
    await removeOrderLine(
      c.req.param("id"),
      tenant.id,
      String(body.removeLineId),
      user?.email ?? session.email
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      customer: true,
      items: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  return c.json({ order });
});

p7.patch("/orders/:id/tags", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { tags } = await c.req.json<{ tags: string[] }>();
  const normalized = (tags ?? [])
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const order = await prisma.order.updateMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    data: { tags: normalized },
  });
  if (!order.count) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true, tags: normalized });
});

p7.post("/orders/bulk-tags", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    ids: string[];
    add?: string[];
    remove?: string[];
  }>();
  if (!body.ids?.length) return c.json({ error: "No orders" }, 400);

  const orders = await prisma.order.findMany({
    where: { id: { in: body.ids }, tenantId: tenant.id },
    select: { id: true, tags: true },
  });

  const add = (body.add ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const remove = new Set(
    (body.remove ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );

  for (const o of orders) {
    let tags = [...o.tags];
    for (const t of add) {
      if (!tags.includes(t)) tags.push(t);
    }
    tags = tags.filter((t) => !remove.has(t));
    await prisma.order.update({
      where: { id: o.id },
      data: { tags: tags.slice(0, 20) },
    });
  }

  return c.json({ updated: orders.length });
});

p7.get("/orders/tags", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    select: { tags: true },
    take: 500,
  });
  const set = new Set<string>();
  for (const o of orders) for (const t of o.tags) set.add(t);
  return c.json({ tags: [...set].sort() });
});

p7.get("/inventory", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const [warehouses, movements, transfers, purchaseOrders, alerts] =
    await Promise.all([
      prisma.warehouse.findMany({
        where: { tenantId: tenant.id },
        include: {
          stock: {
            include: {
              product: {
                select: { id: true, title: true, sku: true, barcode: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.inventoryMovement.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          product: { select: { title: true, sku: true } },
          warehouse: { select: { name: true } },
        },
      }),
      prisma.inventoryTransfer.findMany({
        where: { tenantId: tenant.id },
        include: {
          lines: { include: { product: { select: { title: true } } } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.purchaseOrder.findMany({
        where: { tenantId: tenant.id },
        include: {
          lines: { include: { product: { select: { title: true } } } },
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      getSkuAlerts(tenant.id),
    ]);

  return c.json({
    warehouses,
    movements,
    transfers,
    purchaseOrders,
    alerts,
  });
});

p7.post("/inventory/transfers", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    fromWarehouseId: string;
    toWarehouseId: string;
    lines: { productId: string; variantId?: string; quantity: number }[];
    note?: string;
  }>();
  if (body.fromWarehouseId === body.toWarehouseId) {
    return c.json({ error: "Warehouses must differ" }, 400);
  }
  if (!body.lines?.length) return c.json({ error: "Lines required" }, 400);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });

  const transfer = await prisma.inventoryTransfer.create({
    data: {
      tenantId: tenant.id,
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      status: "IN_TRANSIT",
      note: body.note ?? null,
      lines: {
        create: body.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? null,
          quantity: Math.max(1, l.quantity),
        })),
      },
    },
    include: { lines: true },
  });

  for (const line of transfer.lines) {
    const stock = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: body.fromWarehouseId,
        productId: line.productId,
        variantId: line.variantId,
      },
    });
    if (!stock || stock.quantity - stock.reservedQty < line.quantity) {
      return c.json({ error: "Insufficient stock at source warehouse" }, 400);
    }
    await prisma.warehouseStock.update({
      where: { id: stock.id },
      data: { quantity: { decrement: line.quantity } },
    });
    await logInventoryMovement({
      tenantId: tenant.id,
      warehouseId: body.fromWarehouseId,
      productId: line.productId,
      variantId: line.variantId,
      type: "TRANSFER_OUT",
      quantityDelta: -line.quantity,
      referenceType: "transfer",
      referenceId: transfer.id,
      authorEmail: user?.email,
    });
  }

  return c.json({ transfer });
});

p7.post("/inventory/transfers/:id/receive", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const transfer = await prisma.inventoryTransfer.findFirst({
    where: {
      id: c.req.param("id"),
      tenantId: tenant.id,
      status: "IN_TRANSIT",
    },
    include: { lines: true },
  });
  if (!transfer) return c.json({ error: "Not found" }, 404);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });

  for (const line of transfer.lines) {
    const existing = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: transfer.toWarehouseId,
        productId: line.productId,
        variantId: line.variantId,
      },
    });
    if (existing) {
      await prisma.warehouseStock.update({
        where: { id: existing.id },
        data: { quantity: { increment: line.quantity } },
      });
    } else {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: transfer.toWarehouseId,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
        },
      });
    }
    await logInventoryMovement({
      tenantId: tenant.id,
      warehouseId: transfer.toWarehouseId,
      productId: line.productId,
      variantId: line.variantId,
      type: "TRANSFER_IN",
      quantityDelta: line.quantity,
      referenceType: "transfer",
      referenceId: transfer.id,
      authorEmail: user?.email,
    });
  }

  await prisma.inventoryTransfer.update({
    where: { id: transfer.id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });

  return c.json({ ok: true });
});

p7.post("/inventory/purchase-orders", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    warehouseId: string;
    supplierName: string;
    lines: { productId: string; variantId?: string; quantity: number }[];
    expectedAt?: string;
    note?: string;
  }>();

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      warehouseId: body.warehouseId,
      supplierName: String(body.supplierName).trim() || "Supplier",
      status: PurchaseOrderStatus.ORDERED,
      note: body.note ?? null,
      expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
      lines: {
        create: (body.lines ?? []).map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? null,
          quantityOrdered: Math.max(1, l.quantity),
        })),
      },
    },
    include: { lines: true },
  });
  return c.json({ purchaseOrder: po });
});

p7.post("/inventory/purchase-orders/:id/receive", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: c.req.param("id"),
      tenantId: tenant.id,
      status: { in: ["ORDERED", "DRAFT"] },
    },
    include: { lines: true },
  });
  if (!po) return c.json({ error: "Not found" }, 404);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });

  for (const line of po.lines) {
    const qty = line.quantityOrdered - line.quantityReceived;
    if (qty <= 0) continue;
    const existing = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: po.warehouseId,
        productId: line.productId,
        variantId: line.variantId,
      },
    });
    if (existing) {
      await prisma.warehouseStock.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    } else {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: po.warehouseId,
          productId: line.productId,
          variantId: line.variantId,
          quantity: qty,
        },
      });
    }
    await prisma.purchaseOrderLine.update({
      where: { id: line.id },
      data: { quantityReceived: line.quantityOrdered },
    });
    await logInventoryMovement({
      tenantId: tenant.id,
      warehouseId: po.warehouseId,
      productId: line.productId,
      variantId: line.variantId,
      type: "PURCHASE_RECEIPT",
      quantityDelta: qty,
      referenceType: "purchase_order",
      referenceId: po.id,
      authorEmail: user?.email,
    });
    await prisma.product.updateMany({
      where: { id: line.productId, inventory: { not: null } },
      data: { inventory: { increment: qty } },
    });
  }

  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });

  return c.json({ ok: true });
});

p7.get("/inventory/lookup", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const code = c.req.query("code")?.trim();
  if (!code) return c.json({ error: "code required" }, 400);

  const product = await prisma.product.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { sku: { equals: code, mode: "insensitive" } },
        { barcode: { equals: code, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      sku: true,
      barcode: true,
      inventory: true,
      variants: { select: { id: true, title: true, sku: true } },
    },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  return c.json({ product });
});

p7.post("/shipping/rates-preview", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    country: string;
    city?: string;
    postal?: string;
    weightGrams?: number;
  }>();

  if (!isShippoConfigured()) {
    return c.json({
      configured: false,
      rates: [],
      message: "Set SHIPPO_API_KEY for live carrier rates",
    });
  }

  const rates = await getShippoRates({
    from: {
      name: tenant.name,
      street1: "1 Warehouse St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
    },
    to: {
      name: "Customer",
      street1: "100 Main St",
      city: body.city?.trim() || "New York",
      zip: body.postal?.trim() || "10001",
      country: (body.country ?? "US").slice(0, 2).toUpperCase(),
    },
    weightGrams: body.weightGrams ?? 500,
  });

  return c.json({ configured: true, rates });
});

export { p7 };
