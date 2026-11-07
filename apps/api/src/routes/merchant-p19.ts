import { randomBytes } from "crypto";
import { Hono } from "hono";
import { OrderStatus, Prisma, prisma, ProductStatus } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { logActivity } from "../lib/activity-log.js";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const p19 = new Hono<AuthEnv>();
p19.use("*", requireAuth);

function snapshotProduct(p: {
  title: string;
  slug: string;
  description: string | null;
  status: string;
  type: string;
  priceAmount: number;
  compareAt: number | null;
  inventory: number | null;
  sku: string | null;
  tags: string[];
  translations: unknown;
  minQuantity?: number;
  maxQuantity?: number | null;
  scheduledPriceAmount?: number | null;
  scheduledCompareAt?: number | null;
  scheduledPriceAt?: Date | null;
}) {
  return {
    title: p.title,
    slug: p.slug,
    description: p.description,
    status: p.status,
    type: p.type,
    priceAmount: p.priceAmount,
    compareAt: p.compareAt,
    inventory: p.inventory,
    sku: p.sku,
    tags: p.tags,
    translations: p.translations,
    minQuantity: p.minQuantity ?? 1,
    maxQuantity: p.maxQuantity ?? null,
    scheduledPriceAmount: p.scheduledPriceAmount ?? null,
    scheduledCompareAt: p.scheduledCompareAt ?? null,
    scheduledPriceAt: p.scheduledPriceAt?.toISOString() ?? null,
  };
}

/** Spreadsheet-style bulk patch: price, inventory, sku, SEO title/description, tags. */
p19.post("/products/bulk-patch", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    rows?: Array<{
      id: string;
      title?: string;
      priceAmount?: number;
      compareAt?: number | null;
      inventory?: number | null;
      sku?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      tags?: string[];
      minQuantity?: number;
      maxQuantity?: number | null;
    }>;
  }>();
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
  if (!rows.length) return c.json({ error: "rows required" }, 400);

  let updated = 0;
  for (const row of rows) {
    const product = await prisma.product.findFirst({
      where: { id: row.id, tenantId: tenant.id, deletedAt: null },
    });
    if (!product) continue;
    await prisma.productRevision.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        snapshot: asJson(snapshotProduct(product)),
        summary: "Before bulk edit",
        authorEmail: session.email,
      },
    });
    const translations =
      product.translations &&
      typeof product.translations === "object" &&
      !Array.isArray(product.translations)
        ? { ...(product.translations as Record<string, unknown>) }
        : {};
    const seo =
      translations._seo && typeof translations._seo === "object"
        ? { ...(translations._seo as Record<string, unknown>) }
        : {};
    if (row.seoTitle !== undefined) seo.seoTitle = row.seoTitle;
    if (row.seoDescription !== undefined) seo.seoDescription = row.seoDescription;
    if (row.seoTitle !== undefined || row.seoDescription !== undefined) {
      translations._seo = seo;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: {
        ...(row.title !== undefined ? { title: String(row.title).trim() || product.title } : {}),
        ...(row.priceAmount !== undefined
          ? { priceAmount: Math.max(0, Math.trunc(row.priceAmount)) }
          : {}),
        ...(row.compareAt !== undefined
          ? {
              compareAt:
                row.compareAt == null ? null : Math.max(0, Math.trunc(row.compareAt)),
            }
          : {}),
        ...(row.inventory !== undefined
          ? {
              inventory:
                row.inventory == null ? null : Math.max(0, Math.trunc(row.inventory)),
            }
          : {}),
        ...(row.sku !== undefined ? { sku: row.sku?.trim() || null } : {}),
        ...(row.tags !== undefined ? { tags: row.tags } : {}),
        ...(row.minQuantity !== undefined
          ? { minQuantity: Math.max(1, Math.trunc(row.minQuantity)) }
          : {}),
        ...(row.maxQuantity !== undefined
          ? {
              maxQuantity:
                row.maxQuantity == null
                  ? null
                  : Math.max(1, Math.trunc(row.maxQuantity)),
            }
          : {}),
        ...(row.seoTitle !== undefined || row.seoDescription !== undefined
          ? { translations: asJson(translations) }
          : {}),
      },
    });
    updated += 1;
  }
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "products.bulk_patch",
    summary: `Bulk-edited ${updated} products`,
  });
  return c.json({ ok: true, updated });
});

p19.get("/products/trash", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      deletedAt: { not: null },
    },
    orderBy: { deletedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      deletedAt: true,
      priceAmount: true,
    },
  });
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    products,
  });
});

p19.post("/products/:id/restore", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!product?.deletedAt) return c.json({ error: "Not in trash" }, 404);
  await prisma.product.update({
    where: { id: product.id },
    data: { deletedAt: null, status: ProductStatus.DRAFT },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "products.restore",
    entityType: "product",
    entityId: product.id,
    summary: `Restored ${product.title}`,
  });
  return c.json({ ok: true });
});

p19.get("/products/:id/revisions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    select: { id: true },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  const revisions = await prisma.productRevision.findMany({
    where: { tenantId: tenant.id, productId: product.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return c.json({ revisions });
});

p19.post("/products/:id/revisions/:revisionId/restore", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id, deletedAt: null },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  const revision = await prisma.productRevision.findFirst({
    where: {
      id: c.req.param("revisionId"),
      productId: product.id,
      tenantId: tenant.id,
    },
  });
  if (!revision) return c.json({ error: "Revision not found" }, 404);
  const snap = revision.snapshot as Record<string, unknown>;
  await prisma.productRevision.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      snapshot: asJson(snapshotProduct(product)),
      summary: "Before rollback",
      authorEmail: session.email,
    },
  });
  await prisma.product.update({
    where: { id: product.id },
    data: {
      title: String(snap.title ?? product.title),
      slug: String(snap.slug ?? product.slug),
      description:
        snap.description === null || typeof snap.description === "string"
          ? (snap.description as string | null)
          : product.description,
      status: (["DRAFT", "ACTIVE", "ARCHIVED"].includes(String(snap.status))
        ? snap.status
        : product.status) as ProductStatus,
      priceAmount:
        typeof snap.priceAmount === "number"
          ? snap.priceAmount
          : product.priceAmount,
      compareAt:
        snap.compareAt === null || typeof snap.compareAt === "number"
          ? (snap.compareAt as number | null)
          : product.compareAt,
      inventory:
        snap.inventory === null || typeof snap.inventory === "number"
          ? (snap.inventory as number | null)
          : product.inventory,
      sku:
        snap.sku === null || typeof snap.sku === "string"
          ? (snap.sku as string | null)
          : product.sku,
      tags: Array.isArray(snap.tags)
        ? snap.tags.filter((t): t is string => typeof t === "string")
        : product.tags,
      ...(snap.translations && typeof snap.translations === "object"
        ? { translations: asJson(snap.translations) }
        : {}),
      minQuantity:
        typeof snap.minQuantity === "number" ? snap.minQuantity : undefined,
      maxQuantity:
        snap.maxQuantity === null || typeof snap.maxQuantity === "number"
          ? (snap.maxQuantity as number | null)
          : undefined,
    },
  });
  return c.json({ ok: true });
});

p19.get("/saved-filters", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const scope = c.req.query("scope") ?? undefined;
  const filters = await prisma.savedFilter.findMany({
    where: {
      tenantId: tenant.id,
      ...(scope ? { scope } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ filters });
});

p19.post("/saved-filters", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    scope?: string;
    name?: string;
    query?: Record<string, unknown>;
  }>();
  const scope = String(body.scope ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  if (!["ORDERS", "PRODUCTS", "CUSTOMERS"].includes(scope) || !name) {
    return c.json({ error: "scope and name required" }, 400);
  }
  const filter = await prisma.savedFilter.create({
    data: {
      tenantId: tenant.id,
      scope,
      name,
      query: asJson(body.query ?? {}),
      authorEmail: session.email,
    },
  });
  return c.json({ filter }, 201);
});

p19.delete("/saved-filters/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  await prisma.savedFilter.deleteMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  return c.json({ ok: true });
});

p19.get("/customers/:id/notes", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const customer = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    select: { id: true },
  });
  if (!customer) return c.json({ error: "Not found" }, 404);
  const notes = await prisma.customerNote.findMany({
    where: { tenantId: tenant.id, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return c.json({ notes });
});

p19.post("/customers/:id/notes", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const customer = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    select: { id: true },
  });
  if (!customer) return c.json({ error: "Not found" }, 404);
  const { body } = await c.req.json<{ body?: string }>();
  const text = String(body ?? "").trim();
  if (!text) return c.json({ error: "body required" }, 400);
  const note = await prisma.customerNote.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      body: text.slice(0, 8000),
      authorEmail: session.email,
    },
  });
  return c.json({ note }, 201);
});

p19.get("/customers/:id/timeline", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const customer = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!customer) return c.json({ error: "Not found" }, 404);

  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      customFields: true,
      utmSource: true,
    },
  });
  const orderIds = orders.map((o) => o.id);
  const [events, reviews, notes] = await Promise.all([
    orderIds.length
      ? prisma.orderEvent.findMany({
          where: { tenantId: tenant.id, orderId: { in: orderIds } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.productReview.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { orderId: { in: orderIds.length ? orderIds : ["__none__"] } },
          { authorEmail: customer.email },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        productId: true,
        orderId: true,
      },
    }),
    prisma.customerNote.findMany({
      where: { tenantId: tenant.id, customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  type Item = {
    at: string;
    kind: string;
    title: string;
    meta?: Record<string, unknown>;
  };
  const items: Item[] = [];
  for (const o of orders) {
    items.push({
      at: o.createdAt.toISOString(),
      kind: "ORDER",
      title: `Order #${o.orderNumber} · ${o.status}`,
      meta: {
        orderId: o.id,
        totalAmount: o.totalAmount,
        currency: o.currency,
        howHeard:
          o.customFields &&
          typeof o.customFields === "object" &&
          !Array.isArray(o.customFields)
            ? (o.customFields as Record<string, unknown>).howDidYouHear
            : undefined,
        utmSource: o.utmSource,
      },
    });
  }
  for (const e of events) {
    items.push({
      at: e.createdAt.toISOString(),
      kind: e.type,
      title: e.body?.slice(0, 120) || e.type,
      meta: { orderId: e.orderId, authorEmail: e.authorEmail },
    });
  }
  for (const r of reviews) {
    items.push({
      at: r.createdAt.toISOString(),
      kind: "REVIEW",
      title: `Review ★${r.rating}`,
      meta: { reviewId: r.id, productId: r.productId, body: r.body },
    });
  }
  for (const n of notes) {
    items.push({
      at: n.createdAt.toISOString(),
      kind: "NOTE",
      title: n.body.slice(0, 120),
      meta: { noteId: n.id, authorEmail: n.authorEmail },
    });
  }
  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return c.json({ items: items.slice(0, 150) });
});

p19.post("/customers/merge", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ keepId?: string; mergeId?: string }>();
  const keepId = String(body.keepId ?? "");
  const mergeId = String(body.mergeId ?? "");
  if (!keepId || !mergeId || keepId === mergeId) {
    return c.json({ error: "keepId and mergeId required" }, 400);
  }
  const [keep, merge] = await Promise.all([
    prisma.customer.findFirst({ where: { id: keepId, tenantId: tenant.id } }),
    prisma.customer.findFirst({ where: { id: mergeId, tenantId: tenant.id } }),
  ]);
  if (!keep || !merge) return c.json({ error: "Customer not found" }, 404);
  if (keep.mergedIntoId || merge.mergedIntoId) {
    return c.json({ error: "Already merged" }, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { tenantId: tenant.id, customerId: merge.id },
      data: { customerId: keep.id },
    });
    await tx.customerAddress.updateMany({
      where: { tenantId: tenant.id, customerId: merge.id },
      data: { customerId: keep.id },
    });
    await tx.wishlistItem.updateMany({
      where: { tenantId: tenant.id, customerId: merge.id },
      data: { customerId: keep.id },
    });
    await tx.customerNote.updateMany({
      where: { tenantId: tenant.id, customerId: merge.id },
      data: { customerId: keep.id },
    });
    await tx.returnRequest.updateMany({
      where: { tenantId: tenant.id, customerId: merge.id },
      data: { customerId: keep.id },
    });
    await tx.customer.update({
      where: { id: keep.id },
      data: {
        loyaltyPoints: keep.loyaltyPoints + merge.loyaltyPoints,
        storeCreditCents: keep.storeCreditCents + merge.storeCreditCents,
        name: keep.name || merge.name,
      },
    });
    await tx.customer.update({
      where: { id: merge.id },
      data: {
        mergedIntoId: keep.id,
        email: `merged+${merge.id.slice(0, 8)}@deleted.local`,
        anonymizedAt: new Date(),
        loyaltyPoints: 0,
        storeCreditCents: 0,
        passwordHash: null,
      },
    });
  });

  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "customers.merge",
    summary: `Merged ${merge.email} → ${keep.email}`,
    meta: { keepId, mergeId },
  });
  return c.json({ ok: true, keepId });
});

p19.post("/orders/:id/convert-to-customer", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.customerId) {
    return c.json({ ok: true, customerId: order.customerId, already: true });
  }
  const email = (order.guestEmail ?? "").trim().toLowerCase();
  if (!email) return c.json({ error: "No guest email on order" }, 400);

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email,
        name: order.shippingName,
        country: order.shippingCountry,
      },
    });
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { customerId: customer.id },
  });
  const token = randomBytes(24).toString("hex");
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "orders.convert_customer",
    entityType: "order",
    entityId: order.id,
    summary: `Linked order #${order.orderNumber} to ${email}`,
  });
  return c.json({
    ok: true,
    customerId: customer.id,
    resetToken: token,
  });
});

p19.post("/discounts/batch", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    count?: number;
    prefix?: string;
    type?: "PERCENT" | "FIXED";
    value?: number;
    maxUses?: number | null;
    minOrderAmount?: number | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    collectionId?: string | null;
  }>();
  const count = Math.min(1000, Math.max(1, Math.trunc(body.count ?? 0)));
  if (!count) return c.json({ error: "count required (1–1000)" }, 400);
  const type = body.type === "FIXED" ? "FIXED" : "PERCENT";
  const value = Math.max(0, Math.trunc(Number(body.value) || 0));
  if (!value) return c.json({ error: "value required" }, 400);
  const prefix = String(body.prefix ?? "CODE")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12) || "CODE";
  const batchId = `batch_${Date.now().toString(36)}`;
  const codes: string[] = [];
  const used = new Set<string>();
  while (codes.length < count) {
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    const code = `${prefix}-${suffix}`;
    if (used.has(code)) continue;
    used.add(code);
    codes.push(code);
  }
  const data = codes.map((code) => ({
    tenantId: tenant.id,
    code,
    type: type as "PERCENT" | "FIXED",
    value,
    maxUses: body.maxUses === null ? null : Math.max(1, Math.trunc(body.maxUses ?? 1)),
    minOrderAmount:
      body.minOrderAmount != null ? Math.trunc(body.minOrderAmount) : null,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    collectionId: body.collectionId || null,
    batchId,
    active: true,
  }));
  // create in chunks to avoid huge payloads
  for (let i = 0; i < data.length; i += 100) {
    await prisma.discountCode.createMany({ data: data.slice(i, i + 100) });
  }
  await logActivity({
    tenantId: tenant.id,
    userEmail: session.email,
    action: "discounts.batch",
    summary: `Generated ${codes.length} codes (${batchId})`,
  });
  return c.json({ ok: true, batchId, count: codes.length, codes });
});

p19.get("/analytics/how-heard", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      createdAt: { gte: since },
    },
    select: { customFields: true, utmSource: true },
    take: 2000,
  });
  const counts: Record<string, number> = {};
  for (const o of orders) {
    let answer: string | null = null;
    if (o.customFields && typeof o.customFields === "object" && !Array.isArray(o.customFields)) {
      const v = (o.customFields as Record<string, unknown>).howDidYouHear;
      if (typeof v === "string" && v.trim()) answer = v.trim();
    }
    if (!answer && o.utmSource) answer = `utm:${o.utmSource}`;
    if (!answer) answer = "(unknown)";
    counts[answer] = (counts[answer] ?? 0) + 1;
  }
  const rows = Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
  return c.json({ rows, total: orders.length });
});

export { p19 };
