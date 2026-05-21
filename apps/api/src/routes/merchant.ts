import { Hono } from "hono";
import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant, normalizeSlug } from "../lib/merchant.js";
import { getDashboardMetrics } from "../lib/dashboard-metrics.js";
import { resolvePlatformFeeBps } from "../lib/platform-fee.js";
import {
  orderOrderBy,
  parseOrderSort,
  parseProductSort,
  productOrderBy,
} from "../lib/list-query.js";
import { saveDigitalFile } from "../lib/uploads.js";
import { notifyMerchantNewOrder } from "../lib/notifications.js";
import {
  mapProductImages,
  parseVariantsJson,
  syncProductVariants,
} from "./merchant-p1.js";
import { sendShippingNotification } from "../lib/shipping-email.js";
import { parseStoreTheme } from "@ugclab/tenant/store-theme";
import { checkLowStockAfterInventoryChange } from "../lib/low-stock.js";
import { logActivity } from "../lib/activity-log.js";
import {
  extractSeoFromTranslations,
  mergeTranslationsWithSeo,
  parseCollectionIds,
  syncProductCollections,
} from "../lib/product-form-data.js";

function parseProductType(raw: unknown): ProductType {
  if (raw === "DIGITAL") return ProductType.DIGITAL;
  if (raw === "SERVICE") return ProductType.SERVICE;
  return ProductType.PHYSICAL;
}

function parseTagsField(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

const merchant = new Hono<AuthEnv>();
merchant.use("*", requireAuth);

merchant.get("/dashboard", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const range = c.req.query("range") === "30" ? 30 : 7;
  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: true },
  });
  const feeBps = fullTenant ? resolvePlatformFeeBps(fullTenant) : 500;
  const metrics = await getDashboardMetrics(tenant.id, range, feeBps);
  return c.json({
    tenant: { name: tenant.name, slug: tenant.slug },
    currency: tenant.settings?.currency ?? "USD",
    range,
    metrics,
  });
});

merchant.get("/notifications", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const threshold = tenant.settings?.lowStockThreshold ?? 5;
  const [pendingOrders, lowStockCount] = await Promise.all([
    prisma.order.count({
      where: { tenantId: tenant.id, status: OrderStatus.PENDING },
    }),
    prisma.product.count({
      where: {
        tenantId: tenant.id,
        type: ProductType.PHYSICAL,
        status: ProductStatus.ACTIVE,
        inventory: { not: null, lte: threshold },
      },
    }),
  ]);
  return c.json({ pendingOrders, lowStockCount });
});

merchant.get("/products/low-stock", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const threshold = tenant.settings?.lowStockThreshold ?? 5;
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      inventory: { not: null, lte: threshold },
    },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { inventory: "asc" },
    take: 20,
  });
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    threshold,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      inventory: p.inventory,
      images: mapProductImages(p.images),
    })),
  });
});

merchant.get("/products", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim() ?? "";
  const sort = parseProductSort(c.req.query("sort"));
  const statusParam = c.req.query("status");
  const statusFilter =
    statusParam &&
    Object.values(ProductStatus).includes(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : undefined;

  const lowStockOnly = c.req.query("lowStock") === "1";
  const typeParam = c.req.query("type");
  const typeFilter =
    typeParam &&
    Object.values(ProductType).includes(typeParam as ProductType)
      ? (typeParam as ProductType)
      : undefined;

  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(c.req.query("limit") ?? "25", 10) || 25)
  );
  const where = {
    tenantId: tenant.id,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter && !lowStockOnly ? { type: typeFilter } : {}),
    ...(lowStockOnly
      ? {
          type: ProductType.PHYSICAL,
          status: ProductStatus.ACTIVE,
          inventory: { not: null, lte: 5 },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: productOrderBy(sort),
      include: { digitalAsset: true, images: true, variants: true },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    products: products.map((p) => {
      const images = mapProductImages(p.images);
      return {
        ...p,
        images,
        thumbUrl: images[0]?.url ?? null,
      };
    }),
  });
});

merchant.get("/products/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      digitalAsset: true,
      images: true,
      variants: true,
      collectionItems: { select: { collectionId: true } },
    },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  const seo = extractSeoFromTranslations(product.translations);
  return c.json({
    product: {
      ...product,
      images: mapProductImages(product.images),
      collectionIds: product.collectionItems.map((i) => i.collectionId),
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
    },
    currency: tenant.settings?.currency ?? "USD",
  });
});

function parseMoney(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function parseOptionalMoney(v: unknown): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const cents = parseMoney(v);
  return cents > 0 ? cents : null;
}

merchant.post("/products", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const contentType = c.req.header("content-type") ?? "";

  let body: Record<string, unknown>;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    body = form as Record<string, unknown>;
    const f = form.digitalFile;
    file = f instanceof File && f.size > 0 ? f : null;
  } else {
    body = await c.req.json();
  }

  const title = String(body.title ?? "").trim();
  const slug = normalizeSlug(String(body.slug ?? "")) || "product";
  const type = parseProductType(body.type);
  const priceAmount = parseMoney(body.price);
  const compareAt = parseOptionalMoney(body.compareAt);
  const currency = tenant.settings?.currency ?? "USD";
  const inventoryRaw = String(body.inventory ?? "").trim();
  const inventory =
    type === ProductType.PHYSICAL && inventoryRaw
      ? parseInt(inventoryRaw, 10)
      : type === ProductType.PHYSICAL
        ? 0
        : null;
  const weightRaw = String(body.weightGrams ?? body.weight ?? "").trim();
  const weightGrams = weightRaw ? parseInt(weightRaw, 10) : null;
  const tags = parseTagsField(body.tags);
  const barcode = String(body.barcode ?? "").trim() || null;
  const sku = String(body.sku ?? "").trim() || null;
  const costRaw = String(body.costAmount ?? body.cost ?? "").trim();
  const costAmountCents = costRaw ? parseMoney(costRaw) : null;
  const publishAtRaw = String(body.publishAt ?? "").trim();
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;
  let status =
    body.status === "DRAFT" ? ProductStatus.DRAFT : ProductStatus.ACTIVE;
  if (publishAt && publishAt > new Date()) {
    status = ProductStatus.DRAFT;
  }

  if (!title) return c.json({ error: "Title is required" }, 400);

  const dup = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });
  if (dup) return c.json({ error: "Slug already used" }, 400);

  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      title,
      slug,
      description: String(body.description ?? "").trim() || null,
      type,
      status,
      priceAmount,
      compareAt,
      currency,
      inventory,
      weightGrams: Number.isFinite(weightGrams!) ? weightGrams : null,
      tags,
      sku,
      barcode,
      publishAt: publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : null,
      costAmountCents:
        costAmountCents != null && costAmountCents > 0 ? costAmountCents : null,
    },
  });

  const collectionIds = parseCollectionIds(body);
  if (collectionIds) await syncProductCollections(product.id, collectionIds);

  const translationsCreate = mergeTranslationsWithSeo(body);
  if (translationsCreate !== undefined) {
    await prisma.product.update({
      where: { id: product.id },
      data: { translations: translationsCreate },
    });
  }

  if (type === ProductType.DIGITAL && file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await saveDigitalFile(tenant.id, product.id, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });
    const downloadLimitRaw = String(body.downloadLimit ?? "").trim();
    const downloadLimit = downloadLimitRaw
      ? parseInt(downloadLimitRaw, 10)
      : 5;
    await prisma.digitalAsset.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        ...meta,
        downloadLimit:
          Number.isFinite(downloadLimit) && downloadLimit > 0
            ? downloadLimit
            : 5,
      },
    });
  }

  const variants = parseVariantsJson(body.variants);
  if (variants.length) await syncProductVariants(tenant.id, product.id, variants);

  const created = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      digitalAsset: true,
      images: true,
      variants: true,
      collectionItems: { select: { collectionId: true } },
    },
  });

  return c.json(
    {
      product: created
        ? {
            ...created,
            images: mapProductImages(created.images),
            collectionIds: created.collectionItems.map((i) => i.collectionId),
          }
        : product,
    },
    201
  );
});

merchant.patch("/products/:id", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const productId = c.req.param("id");
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id },
    include: { digitalAsset: true },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  const contentType = c.req.header("content-type") ?? "";
  let body: Record<string, unknown>;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    body = form as Record<string, unknown>;
    const f = form.digitalFile;
    file = f instanceof File && f.size > 0 ? f : null;
  } else {
    body = await c.req.json();
  }

  const title = String(body.title ?? product.title).trim();
  const slug = normalizeSlug(String(body.slug ?? "")) || product.slug;
  let status = String(body.status ?? product.status) as ProductStatus;
  const type = body.type != null ? parseProductType(body.type) : product.type;
  const publishAtRaw = String(body.publishAt ?? "").trim();
  const publishAt = publishAtRaw
    ? new Date(publishAtRaw)
    : body.publishAt === ""
      ? null
      : product.publishAt;
  if (publishAt && publishAt > new Date()) {
    status = ProductStatus.DRAFT;
  }
  const costRaw = String(body.costAmount ?? body.cost ?? "").trim();
  const costAmountCents =
    body.costAmount !== undefined || body.cost !== undefined
      ? costRaw
        ? parseMoney(costRaw)
        : null
      : product.costAmountCents;
  const weightRaw = String(body.weightGrams ?? body.weight ?? "").trim();
  const weightGrams = weightRaw
    ? parseInt(weightRaw, 10)
    : product.weightGrams;
  const tags =
    body.tags !== undefined ? parseTagsField(body.tags) : product.tags;

  if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      title,
      slug,
      description: String(body.description ?? "").trim() || null,
      type,
      status,
      priceAmount: parseMoney(body.price ?? product.priceAmount / 100),
      compareAt: parseOptionalMoney(body.compareAt),
      inventory:
        type === ProductType.PHYSICAL
          ? parseInt(String(body.inventory ?? product.inventory ?? 0), 10)
          : null,
      weightGrams: Number.isFinite(weightGrams!) ? weightGrams : null,
      tags,
      barcode:
        body.barcode !== undefined
          ? String(body.barcode).trim() || null
          : product.barcode,
      sku:
        body.sku !== undefined ? String(body.sku).trim() || null : product.sku,
      publishAt:
        publishAt && !Number.isNaN(publishAt.getTime()) ? publishAt : null,
      costAmountCents:
        costAmountCents != null && costAmountCents > 0
          ? costAmountCents
          : costAmountCents === null
            ? null
            : product.costAmountCents,
    },
  });

  const collectionIds = parseCollectionIds(body);
  if (collectionIds) await syncProductCollections(product.id, collectionIds);

  if (type === ProductType.DIGITAL && file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await saveDigitalFile(tenant.id, product.id, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });
    const downloadLimitRaw = String(body.downloadLimit ?? "").trim();
    const downloadLimit = downloadLimitRaw
      ? parseInt(downloadLimitRaw, 10)
      : undefined;

    if (product.digitalAsset) {
      await prisma.digitalAsset.update({
        where: { id: product.digitalAsset.id },
        data: {
          ...meta,
          ...(downloadLimit != null && Number.isFinite(downloadLimit)
            ? { downloadLimit }
            : {}),
        },
      });
    } else {
      await prisma.digitalAsset.create({
        data: {
          tenantId: tenant.id,
          productId: product.id,
          ...meta,
          downloadLimit:
            downloadLimit != null && Number.isFinite(downloadLimit)
              ? downloadLimit
              : 5,
        },
      });
    }
  } else if (
    type === ProductType.DIGITAL &&
    product.digitalAsset &&
    body.downloadLimit != null
  ) {
    const downloadLimit = parseInt(String(body.downloadLimit), 10);
    if (Number.isFinite(downloadLimit) && downloadLimit > 0) {
      await prisma.digitalAsset.update({
        where: { id: product.digitalAsset.id },
        data: { downloadLimit },
      });
    }
  }

  const variants = parseVariantsJson(body.variants);
  await syncProductVariants(tenant.id, product.id, variants);

  const translationsPatch = mergeTranslationsWithSeo(body, product.translations);
  if (translationsPatch !== undefined) {
    await prisma.product.update({
      where: { id: product.id },
      data: { translations: translationsPatch },
    });
  }

  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      digitalAsset: true,
      images: true,
      variants: true,
      collectionItems: { select: { collectionId: true } },
    },
  });

  if (type === ProductType.PHYSICAL) {
    checkLowStockAfterInventoryChange(tenant.id, product.id).catch(() => {});
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail: user?.email ?? session.email,
    action: "product.update",
    entityType: "product",
    entityId: product.id,
    summary: `Updated product “${title}”`,
  }).catch(() => {});

  const seo = extractSeoFromTranslations(updated?.translations);
  return c.json({
    product: updated
      ? {
          ...updated,
          images: mapProductImages(updated.images),
          collectionIds: updated.collectionItems.map((i) => i.collectionId),
          seoTitle: seo.seoTitle,
          seoDescription: seo.seoDescription,
        }
      : updated,
  });
});

merchant.delete("/products/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Not found" }, 404);
  await prisma.product.delete({ where: { id: product.id } });
  return c.json({ ok: true });
});

merchant.post("/products/bulk-status", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids, status } = await c.req.json<{
    ids: string[];
    status: ProductStatus;
  }>();
  if (!["ACTIVE", "ARCHIVED", "DRAFT"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }
  await prisma.product.updateMany({
    where: { tenantId: tenant.id, id: { in: ids } },
    data: { status },
  });
  return c.json({ ok: true });
});

merchant.post("/products/bulk-delete", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!ids?.length) return c.json({ error: "No ids" }, 400);
  await prisma.product.deleteMany({
    where: { tenantId: tenant.id, id: { in: ids } },
  });
  return c.json({ ok: true, deleted: ids.length });
});

merchant.post("/products/bulk-collections", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { ids, collectionIds, mode } = await c.req.json<{
    ids: string[];
    collectionIds: string[];
    mode?: "add" | "set";
  }>();
  if (!ids?.length || !collectionIds?.length) {
    return c.json({ error: "ids and collectionIds required" }, 400);
  }
  const validCollections = await prisma.collection.findMany({
    where: { tenantId: tenant.id, id: { in: collectionIds } },
    select: { id: true },
  });
  const colIds = validCollections.map((c) => c.id);
  if (mode === "set") {
    await prisma.collectionProduct.deleteMany({
      where: { productId: { in: ids } },
    });
  }
  const rows = ids.flatMap((productId) =>
    colIds.map((collectionId) => ({ productId, collectionId }))
  );
  if (rows.length) {
    await prisma.collectionProduct.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }
  return c.json({ ok: true });
});

merchant.post("/products/:id/duplicate", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const product = await prisma.product.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { digitalAsset: true },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  let slug = `${product.slug}-copy`;
  let n = 2;
  while (
    await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    })
  ) {
    slug = `${product.slug}-copy-${n++}`;
  }

  const copy = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      title: `${product.title} (copy)`,
      slug,
      description: product.description,
      type: product.type,
      status: ProductStatus.DRAFT,
      priceAmount: product.priceAmount,
      compareAt: product.compareAt,
      currency: product.currency,
      inventory: product.inventory,
    },
  });

  if (product.digitalAsset) {
    await prisma.digitalAsset.create({
      data: {
        tenantId: tenant.id,
        productId: copy.id,
        storageKey: product.digitalAsset.storageKey,
        fileName: product.digitalAsset.fileName,
        mimeType: product.digitalAsset.mimeType,
        sizeBytes: product.digitalAsset.sizeBytes,
        downloadLimit: product.digitalAsset.downloadLimit,
      },
    });
  }

  return c.json({ product: copy });
});

merchant.get("/orders", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim() ?? "";
  const sort = parseOrderSort(c.req.query("sort"));
  const statusParam = c.req.query("status");
  const statusFilter =
    statusParam &&
    Object.values(OrderStatus).includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  const from = c.req.query("from");
  const to = c.req.query("to");
  const createdAtFilter =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to
            ? {
                lte: new Date(
                  to.length === 10 ? `${to}T23:59:59.999Z` : to
                ),
              }
            : {}),
        }
      : undefined;

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              {
                customer: {
                  email: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: orderOrderBy(sort),
    take: 100,
  });

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    orders,
  });
});

merchant.get("/orders/export", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim() ?? "";
  const from = c.req.query("from");
  const to = c.req.query("to");
  const createdAtFilter =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to
            ? {
                lte: new Date(
                  to.length === 10 ? `${to}T23:59:59.999Z` : to
                ),
              }
            : {}),
        }
      : undefined;
  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status: status as OrderStatus } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              {
                customer: {
                  email: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header =
    "orderNumber,status,email,total,currency,country,trackingNumber,shippedAt,createdAt";
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.status,
      o.customer?.email ?? "",
      (o.totalAmount / 100).toFixed(2),
      o.currency,
      o.shippingCountry ?? "",
      o.trackingNumber ?? "",
      o.shippedAt?.toISOString() ?? "",
      o.createdAt.toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${tenant.slug}.csv"`,
    },
  });
});

merchant.get("/orders/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      customer: true,
      items: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  return c.json({ order, currency: order.currency });
});

merchant.patch("/orders/:id/status", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { status } = await c.req.json<{ status: OrderStatus }>();
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  const wasPending = order.status === OrderStatus.PENDING;
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status },
    include: { customer: true, items: true, events: { orderBy: { createdAt: "desc" } } },
  });

  const user = await prisma.user.findUnique({ where: { id: c.get("session").sub } });
  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: `Status changed from ${order.status} to ${status}`,
      authorEmail: user?.email,
      meta: { from: order.status, to: status },
    },
  });

  if (wasPending && status === OrderStatus.PAID) {
    notifyMerchantNewOrder(order.id).catch(console.error);
  }

  return c.json({ order: updated });
});

merchant.patch("/orders/:id/fulfillment", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    trackingNumber?: string;
    markFulfilled?: boolean;
    notifyCustomer?: boolean;
  }>();
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);

  const tracking = body.trackingNumber?.trim() || null;
  const markFulfilled = body.markFulfilled === true;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: tracking,
      ...(markFulfilled
        ? {
            status: OrderStatus.FULFILLED,
            shippedAt: order.shippedAt ?? new Date(),
          }
        : tracking
          ? { shippedAt: order.shippedAt ?? new Date() }
          : {}),
    },
    include: { customer: true, items: true, events: { orderBy: { createdAt: "desc" } } },
  });

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (tracking) {
    await prisma.orderEvent.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        type: "NOTE",
        body: `Tracking: ${tracking}`,
        authorEmail: user?.email,
      },
    });
  }
  if (markFulfilled && order.status !== OrderStatus.FULFILLED) {
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

  const shouldNotify =
    body.notifyCustomer === true ||
    (body.notifyCustomer !== false &&
      tracking &&
      tracking !== order.trackingNumber);
  if (shouldNotify && tracking) {
    try {
      await sendShippingNotification(order.id);
    } catch {
      /* optional email */
    }
  }

  return c.json({ order: updated });
});

merchant.post("/orders/:id/shipping-label", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { items: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (!order.shippingAddress1 || !order.shippingCity || !order.shippingCountry) {
    return c.json({ error: "Order has no shipping address" }, 400);
  }

  const body = await c.req.json<{
    fromName?: string;
    fromStreet1?: string;
    fromCity?: string;
    fromState?: string;
    fromZip?: string;
    fromCountry?: string;
  }>().catch(() => ({}));

  const weightGrams = order.items.reduce((s, i) => s + i.quantity * 200, 200);
  const { createShippoLabel, isShippoConfigured } = await import("../lib/shippo.js");
  if (!isShippoConfigured()) {
    return c.json(
      {
        error: "Shippo is not configured. Set SHIPPO_API_KEY or enter tracking manually.",
      },
      503
    );
  }

  try {
    const label = await createShippoLabel({
      from: {
        name: body.fromName?.trim() || tenant.name,
        street1: body.fromStreet1?.trim() || "1 Warehouse St",
        city: body.fromCity?.trim() || "New York",
        state: body.fromState?.trim() || "NY",
        zip: body.fromZip?.trim() || "10001",
        country: (body.fromCountry?.trim() || "US").slice(0, 2).toUpperCase(),
      },
      to: {
        name: order.shippingName?.trim() || "Customer",
        street1: order.shippingAddress1,
        street2: order.shippingAddress2 ?? undefined,
        city: order.shippingCity,
        zip: order.shippingPostal ?? "00000",
        country: (order.shippingCountry ?? "US").slice(0, 2).toUpperCase(),
      },
      weightGrams,
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        trackingNumber: label.trackingNumber || order.trackingNumber,
        shippedAt: order.shippedAt ?? new Date(),
      },
    });

    return c.json({ order: updated, label });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Label creation failed" },
      500
    );
  }
});

merchant.post("/orders/:id/shipping-email", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (!order.trackingNumber?.trim()) {
    return c.json({ error: "Add tracking number first" }, 400);
  }
  try {
    await sendShippingNotification(order.id);
    return c.json({ ok: true });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Email failed" },
      500
    );
  }
});

merchant.get("/customers", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim() ?? "";
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { totalAmount: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    customers,
  });
});

merchant.get("/customers/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const customer = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: { orders: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) return c.json({ error: "Not found" }, 404);
  return c.json({
    customer,
    currency: tenant.settings?.currency ?? "USD",
  });
});

merchant.get("/settings", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  return c.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      settings: tenant.settings,
    },
    emailConfigured: Boolean(
      process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
    ),
  });
});

merchant.patch("/settings", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<Record<string, unknown>>();
  const enabledLocalesRaw = Array.isArray(body.enabledLocales)
    ? (body.enabledLocales as string[]).map((l) => String(l).slice(0, 5))
    : ["en"];
  const enabledLocales =
    enabledLocalesRaw.length > 0 ? enabledLocalesRaw : ["en"];

  const name = String(body.name ?? "").trim();
  const slug = normalizeSlug(String(body.slug ?? ""));
  const slugConfirm = Boolean(body.slugConfirm);

  if (!name) return c.json({ error: "Store name is required" }, 400);
  if (!slug) return c.json({ error: "Store slug is required" }, 400);

  if (slug !== tenant.slug && !slugConfirm) {
    return c.json({
      error: "Confirm slug change — existing store links will stop working.",
    }, 400);
  }

  if (slug !== tenant.slug) {
    const taken = await prisma.tenant.findFirst({
      where: { slug, NOT: { id: tenant.id } },
    });
    if (taken) return c.json({ error: "This slug is already taken" }, 400);
  }

  const themeRaw =
    body.theme != null && typeof body.theme === "object" ? body.theme : undefined;
  const themeDraftRaw =
    body.themeDraft != null && typeof body.themeDraft === "object"
      ? body.themeDraft
      : undefined;
  const theme = themeRaw !== undefined ? parseStoreTheme(themeRaw) : undefined;
  const themeDraft =
    themeDraftRaw !== undefined ? parseStoreTheme(themeDraftRaw) : undefined;

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenant.id },
      data: { name, slug },
    }),
    prisma.storeSettings.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        currency: String(body.currency ?? "USD").slice(0, 3),
        defaultLocale: String(body.defaultLocale ?? "en"),
        enabledLocales,
        timezone: String(body.timezone ?? "UTC"),
        primaryColor: String(body.primaryColor ?? "#7c3aed"),
        logoUrl: body.logoUrl ? String(body.logoUrl) : null,
        privacyUrl: body.privacyUrl ? String(body.privacyUrl) : null,
        refundUrl: body.refundUrl ? String(body.refundUrl) : null,
        privacyPolicy: body.privacyPolicy ? String(body.privacyPolicy) : null,
        refundPolicy: body.refundPolicy ? String(body.refundPolicy) : null,
        digitalLinkDays:
          parseInt(String(body.digitalLinkDays ?? "30"), 10) || 30,
        notifyNewOrders:
          body.notifyNewOrders !== false && body.notifyNewOrders !== "false",
        notifyLowStock:
          body.notifyLowStock !== false && body.notifyLowStock !== "false",
        abandonedCartEnabled:
          body.abandonedCartEnabled !== false &&
          body.abandonedCartEnabled !== "false",
        taxRateBps: parseInt(String(body.taxRateBps ?? "0"), 10) || 0,
        taxIncluded: body.taxIncluded === true || body.taxIncluded === "true",
        seoTitle: body.seoTitle ? String(body.seoTitle) : null,
        seoDescription: body.seoDescription ? String(body.seoDescription) : null,
        seoOgImageUrl: body.seoOgImageUrl ? String(body.seoOgImageUrl) : null,
        lowStockThreshold:
          parseInt(String(body.lowStockThreshold ?? "5"), 10) || 5,
        checkoutGuestLookup:
          body.checkoutGuestLookup !== false && body.checkoutGuestLookup !== "false",
        checkoutFooterText: body.checkoutFooterText
          ? String(body.checkoutFooterText)
          : null,
        emailOrderSubject: body.emailOrderSubject
          ? String(body.emailOrderSubject)
          : null,
        emailOrderBody: body.emailOrderBody ? String(body.emailOrderBody) : null,
        ...(theme !== undefined ? { theme } : {}),
        ...(themeDraft !== undefined ? { themeDraft } : {}),
      },
      update: {
        currency: String(body.currency ?? "USD").slice(0, 3),
        defaultLocale: String(body.defaultLocale ?? "en"),
        enabledLocales,
        timezone: String(body.timezone ?? "UTC"),
        primaryColor: String(body.primaryColor ?? "#7c3aed"),
        logoUrl: body.logoUrl ? String(body.logoUrl) : null,
        privacyUrl: body.privacyUrl ? String(body.privacyUrl) : null,
        refundUrl: body.refundUrl ? String(body.refundUrl) : null,
        privacyPolicy: body.privacyPolicy ? String(body.privacyPolicy) : null,
        refundPolicy: body.refundPolicy ? String(body.refundPolicy) : null,
        digitalLinkDays:
          parseInt(String(body.digitalLinkDays ?? "30"), 10) || 30,
        notifyNewOrders:
          body.notifyNewOrders !== false && body.notifyNewOrders !== "false",
        notifyLowStock:
          body.notifyLowStock !== false && body.notifyLowStock !== "false",
        abandonedCartEnabled:
          body.abandonedCartEnabled !== false &&
          body.abandonedCartEnabled !== "false",
        taxRateBps: parseInt(String(body.taxRateBps ?? "0"), 10) || 0,
        taxIncluded: body.taxIncluded === true || body.taxIncluded === "true",
        seoTitle: body.seoTitle ? String(body.seoTitle) : null,
        seoDescription: body.seoDescription ? String(body.seoDescription) : null,
        seoOgImageUrl: body.seoOgImageUrl ? String(body.seoOgImageUrl) : null,
        lowStockThreshold:
          parseInt(String(body.lowStockThreshold ?? "5"), 10) || 5,
        checkoutGuestLookup:
          body.checkoutGuestLookup !== false && body.checkoutGuestLookup !== "false",
        checkoutFooterText: body.checkoutFooterText
          ? String(body.checkoutFooterText)
          : null,
        emailOrderSubject: body.emailOrderSubject
          ? String(body.emailOrderSubject)
          : null,
        emailOrderBody: body.emailOrderBody ? String(body.emailOrderBody) : null,
        ...(theme !== undefined ? { theme } : {}),
        ...(themeDraft !== undefined ? { themeDraft } : {}),
      },
    }),
  ]);

  const updated = await requireTenant(c.get("session"));
  return c.json({ ok: true, tenant: updated.tenant });
});

merchant.post("/settings/publish-theme", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const settings = tenant.settings;
  const draft = settings?.themeDraft ?? settings?.theme;
  if (!draft) return c.json({ error: "Nothing to publish" }, 400);
  await prisma.storeSettings.update({
    where: { tenantId: tenant.id },
    data: { theme: draft },
  });
  const updated = await requireTenant(c.get("session"));
  return c.json({ ok: true, tenant: updated.tenant });
});

export { merchant };
