import { Hono } from "hono";
import {
  CollectionRuleType,
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { normalizeSlug, requireTenant } from "../lib/merchant.js";
import { sendShippingNotification } from "../lib/shipping-email.js";
import { serializeStorePage, pageStatus } from "../lib/store-page.js";
import {
  buildStorePageCreateData,
  buildStorePageUpdateData,
} from "../lib/store-page-mutate.js";

import { useOrderRouteGuards } from "../middleware/merchant-guards.js";

const p2 = new Hono<AuthEnv>();
p2.use("*", requireAuth);
useOrderRouteGuards(p2);

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// ——— Store pages (About, Contact, Blog) ———
p2.get("/pages", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const type = c.req.query("type");
  const status = c.req.query("status");
  const tag = c.req.query("tag")?.trim().toLowerCase();

  const pages = await prisma.storePage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
  });

  let filtered = pages;
  if (type === "PAGE" || type === "BLOG") {
    filtered = filtered.filter((p) => p.pageType === type);
  }
  if (status === "draft") {
    filtered = filtered.filter((p) => pageStatus(p) === "draft");
  } else if (status === "scheduled") {
    filtered = filtered.filter((p) => pageStatus(p) === "scheduled");
  } else if (status === "published") {
    filtered = filtered.filter((p) => pageStatus(p) === "published");
  }
  if (tag) {
    filtered = filtered.filter((p) => p.tags.includes(tag));
  }

  return c.json({ pages: filtered.map(serializeStorePage) });
});

p2.post("/pages", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = (await c.req.json()) as Record<string, unknown>;
  const built = buildStorePageCreateData(tenant.id, body);
  if (built.error) return c.json({ error: built.error }, 400);
  const slug =
    normalizeSlug(String(built.data.slug || body.title || "")) || "page";
  built.data.slug = slug;
  const dup = await prisma.storePage.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });
  if (dup) return c.json({ error: "Slug in use" }, 400);
  const page = await prisma.storePage.create({ data: built.data });
  return c.json({ page: serializeStorePage(page) }, 201);
});

p2.post("/pages/:id/duplicate", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const page = await prisma.storePage.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!page) return c.json({ error: "Not found" }, 404);
  let slug = `${page.slug}-copy`;
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.storePage.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (!exists) break;
    slug = `${page.slug}-copy-${i + 2}`;
  }
  const copy = await prisma.storePage.create({
    data: {
      tenantId: tenant.id,
      title: `${page.title} (copy)`,
      slug,
      body: page.body,
      excerpt: page.excerpt,
      featuredImageUrl: page.featuredImageUrl,
      pageType: page.pageType,
      published: false,
      publishAt: null,
      authorName: page.authorName,
      tags: page.tags,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogImageUrl: page.ogImageUrl,
      canonicalUrl: page.canonicalUrl,
      noindex: page.noindex,
    },
  });
  return c.json({ page: serializeStorePage(copy) }, 201);
});

p2.patch("/pages/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = (await c.req.json()) as Record<string, unknown>;
  const page = await prisma.storePage.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!page) return c.json({ error: "Not found" }, 404);
  const data = buildStorePageUpdateData(body);
  if (body.slug != null) {
    data.slug = normalizeSlug(String(body.slug));
  }
  const updated = await prisma.storePage.update({
    where: { id: page.id },
    data,
  });
  return c.json({ page: serializeStorePage(updated) });
});

p2.delete("/pages/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const page = await prisma.storePage.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!page) return c.json({ error: "Not found" }, 404);
  await prisma.storePage.delete({ where: { id: page.id } });
  return c.json({ ok: true });
});

// ——— Reviews moderation ———
p2.get("/reviews", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const reviews = await prisma.productReview.findMany({
    where: { tenantId: tenant.id },
    include: { product: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ reviews });
});

p2.patch("/reviews/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ approved?: boolean }>();
  const review = await prisma.productReview.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!review) return c.json({ error: "Not found" }, 404);
  const updated = await prisma.productReview.update({
    where: { id: review.id },
    data: { approved: body.approved === true },
  });
  return c.json({ review: updated });
});

p2.delete("/reviews/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const review = await prisma.productReview.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!review) return c.json({ error: "Not found" }, 404);
  await prisma.productReview.delete({ where: { id: review.id } });
  return c.json({ ok: true });
});

function parsePhotoUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((u) => String(u).trim()).filter((u) => u.startsWith("http")).slice(0, 6);
  }
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/[|,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"))
    .slice(0, 6);
}

p2.post("/reviews", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    productId: string;
    authorName: string;
    rating: number;
    body?: string;
    photoUrls?: string[] | string;
    approved?: boolean;
  }>();
  const authorName = String(body.authorName ?? "").trim();
  const rating = Number(body.rating);
  if (!authorName || rating < 1 || rating > 5) {
    return c.json({ error: "Invalid review" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);
  const review = await prisma.productReview.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      authorName,
      rating,
      body: body.body?.trim() || null,
      photoUrls: parsePhotoUrls(body.photoUrls),
      approved: body.approved === true,
    },
    include: { product: { select: { title: true, slug: true } } },
  });
  return c.json({ review });
});

p2.post("/reviews/import", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ csv?: string }>();
  const text = String(body.csv ?? "").trim();
  if (!text) return c.json({ error: "Empty CSV" }, 400);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return c.json({ error: "Need header + at least one row" }, 400);

  const headerCols = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const col = (name: string, alt?: string) => {
    const i = headerCols.findIndex(
      (h) => h === name || h === alt || h.includes(name)
    );
    return i >= 0 ? i : -1;
  };
  const iName = col("author", "authorname") >= 0 ? col("author", "authorname") : 0;
  const iRating = col("rating") >= 0 ? col("rating") : 1;
  const iBody = col("body", "review") >= 0 ? col("body", "review") : 2;
  const iProduct =
    col("productslug", "slug") >= 0
      ? col("productslug", "slug")
      : col("product") >= 0
        ? col("product")
        : 3;
  const iPhotos = col("photourls", "photos") >= 0 ? col("photourls", "photos") : 4;

  const rows = lines.slice(1);
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, slug: true, title: true },
  });
  const bySlug = new Map(products.map((p) => [p.slug.toLowerCase(), p.id]));
  const byTitle = new Map(products.map((p) => [p.title.toLowerCase(), p.id]));

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = parseCsvLine(rows[i]!);
    if (cols.length < 3) {
      errors.push(`Row ${i + 2}: too few columns`);
      continue;
    }
    const authorName = cols[iName]?.trim();
    const rating = parseInt(cols[iRating] ?? "", 10);
    const reviewBody = cols[iBody]?.trim() || null;
    const productKey = cols[iProduct]?.trim().toLowerCase() ?? "";
    const photos = parsePhotoUrls(cols[iPhotos]);

    if (!authorName || rating < 1 || rating > 5) {
      errors.push(`Row ${i + 2}: invalid name/rating`);
      continue;
    }
    const productId =
      bySlug.get(productKey) ?? byTitle.get(productKey) ?? null;
    if (!productId) {
      errors.push(`Row ${i + 2}: product not found (${productKey})`);
      continue;
    }
    await prisma.productReview.create({
      data: {
        tenantId: tenant.id,
        productId,
        authorName,
        rating,
        body: reviewBody,
        photoUrls: photos,
        approved: true,
      },
    });
    imported++;
  }

  return c.json({ imported, errors: errors.slice(0, 20) });
});

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

p2.get("/questions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const questions = await prisma.productQuestion.findMany({
    where: { tenantId: tenant.id },
    include: { product: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ questions });
});

p2.patch("/questions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ answer?: string; approved?: boolean }>();
  const row = await prisma.productQuestion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  const answer = body.answer !== undefined ? String(body.answer).trim() : row.answer;
  const updated = await prisma.productQuestion.update({
    where: { id: row.id },
    data: {
      ...(body.answer !== undefined
        ? { answer: answer || null, answeredAt: answer ? new Date() : null }
        : {}),
      ...(body.approved !== undefined ? { approved: body.approved === true } : {}),
    },
  });
  return c.json({ question: updated });
});

p2.delete("/questions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const row = await prisma.productQuestion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  await prisma.productQuestion.delete({ where: { id: row.id } });
  return c.json({ ok: true });
});

// ——— Draft orders ———
p2.post("/orders/draft", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    customerEmail?: string;
    customerName?: string;
    lines?: { productId: string; variantId?: string; quantity: number }[];
  }>();
  const lines = body.lines ?? [];
  if (lines.length === 0) return c.json({ error: "No line items" }, 400);

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      id: { in: lines.map((l) => l.productId) },
    },
    include: { variants: true },
  });

  let subtotal = 0;
  const itemCreates: {
    productId: string;
    variantId: string | null;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[] = [];

  for (const line of lines) {
    const p = products.find((x) => x.id === line.productId);
    if (!p) continue;
    const variant = line.variantId
      ? p.variants.find((v) => v.id === line.variantId)
      : null;
    const unit = variant?.priceAmount ?? p.priceAmount;
    const title = variant ? `${p.title} — ${variant.title}` : p.title;
    const qty = Math.max(1, line.quantity);
    const total = unit * qty;
    subtotal += total;
    itemCreates.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      title,
      quantity: qty,
      unitAmount: unit,
      totalAmount: total,
    });
  }

  if (itemCreates.length === 0) return c.json({ error: "Invalid products" }, 400);

  const currency = tenant.settings?.currency ?? "USD";
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = String(
    (lastOrder ? parseInt(lastOrder.orderNumber, 10) : 1000) + 1
  );

  const user = await prisma.user.findUnique({ where: { id: session.sub } });

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      orderNumber,
      status: OrderStatus.DRAFT,
      currency,
      subtotalAmount: subtotal,
      totalAmount: subtotal,
      guestEmail: body.customerEmail?.trim().toLowerCase() || null,
      items: {
        create: itemCreates.map((i) => ({
          tenantId: tenant.id,
          productId: i.productId,
          variantId: i.variantId,
          title: i.title,
          quantity: i.quantity,
          unitAmount: i.unitAmount,
          totalAmount: i.totalAmount,
        })),
      },
      events: {
        create: {
          tenantId: tenant.id,
          type: "NOTE",
          body: "Draft order created",
          authorEmail: user?.email,
        },
      },
    },
    include: { items: true, customer: true },
  });

  return c.json({ order }, 201);
});

p2.post("/orders/:id/mark-paid", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
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
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  const { fulfillPaidOrder } = await import("../lib/fulfill-order.js");
  const updated = await fulfillPaidOrder(order.id, {
    platformFeeAmount: order.platformFeeAmount,
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "NOTE",
      body: "Marked as paid manually (webhook fallback)",
      authorEmail: user?.email,
    },
  });
  return c.json({ order: updated });
});

p2.patch("/orders/:id/line-fulfillment", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    items: { lineId: string; fulfilledQuantity: number }[];
    markFulfilled?: boolean;
  }>();
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
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

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
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
        tenantId: tenant.id,
        orderId: order.id,
        type: "STATUS_CHANGE",
        body: "Marked as fulfilled",
        authorEmail: user?.email,
      },
    });
  }

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: true,
      customer: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  return c.json({ order: updated });
});

p2.post("/orders/:id/refund", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    reason?: string;
    amountCents?: number;
    lineItems?: { lineId: string; quantity: number }[];
  }>();
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLED) {
    return c.json({ error: "Only paid or fulfilled orders can be refunded" }, 400);
  }
  const user = await prisma.user.findUnique({ where: { id: session.sub } });

  try {
    const { refundOrderInStripe, markOrderRefunded } = await import("../lib/stripe-refund.js");
    let refundAmountCents = body.amountCents;
    let stripeRefund = false;
    if (order.stripePaymentId) {
      const r = await refundOrderInStripe(order.id, {
        amountCents: body.amountCents,
        lineItems: body.lineItems,
      });
      refundAmountCents = r.amountCents;
      stripeRefund = Boolean(r.refundId);
    } else if (body.lineItems?.length) {
      const full = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      refundAmountCents = 0;
      for (const req of body.lineItems) {
        const line = full?.items.find((i) => i.id === req.lineId);
        if (line) refundAmountCents += line.unitAmount * Math.min(req.quantity, line.quantity);
      }
    } else {
      refundAmountCents = refundAmountCents ?? order.totalAmount;
    }

    const partial =
      (refundAmountCents ?? 0) > 0 && (refundAmountCents ?? 0) < order.totalAmount;
    const updated = await markOrderRefunded(order.id, {
      reason: body.reason,
      authorEmail: user?.email,
      partial,
      refundAmountCents,
    });
    return c.json({ order: updated, stripeRefund, partial, refundAmountCents });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Refund failed" },
      400
    );
  }
});

p2.post("/orders/:id/sync-stripe", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  try {
    const { syncOrderFromStripe } = await import("../lib/stripe-order-sync.js");
    const result = await syncOrderFromStripe(order.id);
    const fresh = await prisma.order.findFirst({
      where: { id: order.id },
      include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } } },
    });
    return c.json({ ...result, order: fresh });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Sync failed" }, 400);
  }
});

// ——— Product CSV ———
p2.get("/products/export.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  const header =
    "id,title,slug,type,status,price_cents,inventory,tags,weight_grams,barcode\n";
  const rows = products
    .map((p) =>
      [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        p.slug,
        p.type,
        p.status,
        p.priceAmount,
        p.inventory ?? "",
        `"${p.tags.join(";")}"`,
        p.weightGrams ?? "",
        p.barcode ?? "",
      ].join(",")
    )
    .join("\n");
  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="products.csv"',
    },
  });
});

p2.post("/products/import.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV file required" }, 400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return c.json({ error: "Empty CSV" }, 400);
  const currency = tenant.settings?.currency ?? "USD";
  let created = 0;
  for (const line of lines.slice(1)) {
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map((c) =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c.trim()
    );
    if (!cols || cols.length < 4) continue;
    const title = cols[1] ?? "Product";
    const slug = normalizeSlug(cols[2] ?? title) || `import-${Date.now()}`;
    const type =
      cols[3] === "DIGITAL"
        ? ProductType.DIGITAL
        : cols[3] === "SERVICE"
          ? ProductType.SERVICE
          : ProductType.PHYSICAL;
    const status =
      cols[4] === "DRAFT" ? ProductStatus.DRAFT : ProductStatus.ACTIVE;
    const priceAmount = parseInt(cols[5] ?? "0", 10) || 0;
    const inventory = cols[6] ? parseInt(cols[6], 10) : type === ProductType.PHYSICAL ? 0 : null;
    const tags = (cols[7] ?? "")
      .split(";")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const weightGrams = cols[8] ? parseInt(cols[8], 10) : null;
    const barcode = cols[9] || null;
    const exists = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (exists) continue;
    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        title,
        slug,
        type,
        status,
        priceAmount,
        currency,
        inventory,
        tags,
        weightGrams: Number.isFinite(weightGrams!) ? weightGrams : null,
        barcode,
      },
    });
    created += 1;
  }
  return c.json({ created });
});

// ——— Collection auto rules ———
p2.patch("/collections/:id/rules", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    ruleType?: string;
    ruleTag?: string;
    ruleProductType?: string;
    description?: string;
  }>();
  const collection = await prisma.collection.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);
  const ruleType =
    body.ruleType === "AUTO_TAG"
      ? CollectionRuleType.AUTO_TAG
      : body.ruleType === "AUTO_TYPE"
        ? CollectionRuleType.AUTO_TYPE
        : CollectionRuleType.MANUAL;
  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: {
      ruleType,
      ruleTag: ruleType === CollectionRuleType.AUTO_TAG ? body.ruleTag?.trim() : null,
      ruleProductType:
        ruleType === CollectionRuleType.AUTO_TYPE && body.ruleProductType
          ? (body.ruleProductType as ProductType)
          : null,
      ...(body.description != null ? { description: body.description } : {}),
    },
    include: { products: { include: { product: true } } },
  });
  return c.json({ collection: updated });
});

export { p2 };
