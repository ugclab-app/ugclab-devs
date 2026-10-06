import { Hono } from "hono";
import {
  OrderStatus,
  Prisma,
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
import { parseStoreTheme, resolveHomeBlocks } from "@ugclab/tenant/store-theme";
import { jsonForPrisma } from "../lib/theme-json.js";
import {
  publishStoreTheme,
  readThemeDraftMeta,
  themeDraftWithMeta,
  parseThemeExperiment,
} from "../lib/theme-meta.js";
import { getMerchantPulse } from "../lib/merchant-pulse.js";
import { applyAiBlockEdit } from "../lib/ai-block-edit.js";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { checkLowStockAfterInventoryChange } from "../lib/low-stock.js";
import { logActivity } from "../lib/activity-log.js";
import {
  extractSeoFromTranslations,
  mergeTranslationsWithSeo,
  parseCollectionIds,
  syncProductCollections,
} from "../lib/product-form-data.js";
import {
  computeCustomerMetrics,
  customerMetricsToCsv,
  matchesCustomerFilter,
  sortCustomerRows,
  type CustomerListFilter,
  type CustomerListSort,
} from "../lib/customer-metrics.js";
import {
  ensureThemeCatalog,
  getCatalogThemeId,
  loadThemeCatalogRows,
  mapThemeCatalogRow,
} from "../lib/theme-catalog.js";
import { ensureBlockCatalog, getPublishedBlockIds } from "../lib/block-catalog.js";
import { ensureSectionCatalog, getPublishedSectionIds } from "../lib/section-catalog.js";

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

function parseRequiresShipping(raw: unknown, defaultValue: boolean): boolean {
  if (raw === undefined || raw === null || raw === "") return defaultValue;
  if (raw === true || raw === "true" || raw === "on" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "0" || raw === "off") return false;
  return defaultValue;
}

import { useOrderRouteGuards } from "../middleware/merchant-guards.js";

const merchant = new Hono<AuthEnv>();
merchant.use("*", requireAuth);
useOrderRouteGuards(merchant);

merchant.get("/pulse", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const cards = await getMerchantPulse(tenant.id);
  return c.json({ cards });
});

merchant.get("/dashboard", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const range = c.req.query("range") === "30" ? 30 : 7;
  const fullTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: {
      subscriptionPlan: true,
      _count: { select: { products: true, members: true } },
    },
  });
  const feeBps = fullTenant ? resolvePlatformFeeBps(fullTenant) : 500;
  const metrics = await getDashboardMetrics(tenant.id, range, feeBps);
  return c.json({
    tenant: { name: tenant.name, slug: tenant.slug },
    currency: tenant.settings?.currency ?? "USD",
    range,
    metrics,
    planLimits: fullTenant
      ? {
          planName: fullTenant.subscriptionPlan?.name ?? "Starter",
          productLimit: fullTenant.subscriptionPlan?.productLimit ?? null,
          productCount: fullTenant._count.products,
          staffCount: fullTenant._count.members,
        }
      : null,
  });
});

merchant.get("/plan-limits", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const full = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: {
      subscriptionPlan: true,
      _count: { select: { products: true, members: true } },
    },
  });
  if (!full) return c.json({ error: "Not found" }, 404);
  const limit = full.subscriptionPlan?.productLimit;
  return c.json({
    planName: full.subscriptionPlan?.name ?? "Starter",
    productLimit: limit,
    productCount: full._count.products,
    staffCount: full._count.members,
    atProductLimit: limit != null && full._count.products >= limit,
  });
});

/** Published theme catalog for site builder gallery (platform-controlled). */
merchant.get("/theme-catalog", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  await ensureThemeCatalog();
  const { ensureMarketplace, activeAddonIds } = await import("../lib/marketplace.js");
  await ensureMarketplace();
  const [themes, owned] = await Promise.all([
    loadThemeCatalogRows(),
    activeAddonIds(tenant.id, "THEME"),
  ]);
  return c.json({
    themes: themes
      .map(mapThemeCatalogRow)
      .filter((t) => t.published && !t.deprecated)
      .map((t) => ({ ...t, owned: t.priceCents <= 0 || owned.has(t.id) })),
  });
});

merchant.get("/block-catalog", async (c) => {
  await requireTenant(c.get("session"));
  await ensureBlockCatalog();
  const ids = await getPublishedBlockIds();
  return c.json({ blockIds: [...ids] });
});

merchant.get("/section-catalog", async (c) => {
  await requireTenant(c.get("session"));
  await ensureSectionCatalog();
  const ids = await getPublishedSectionIds();
  return c.json({ sectionIds: [...ids] });
});

merchant.post("/support", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ subject: string; message: string }>();
  const subject = body.subject?.trim();
  const message = body.message?.trim();
  if (!subject || !message) {
    return c.json({ error: "Subject and message required" }, 400);
  }
  const owner = await prisma.user.findUnique({ where: { id: session.sub } });
  const { sendEmail } = await import("../lib/email.js");
  const { tenantHasApp } = await import("../lib/marketplace.js");
  const priority = await tenantHasApp(tenant.id, "priority-support");
  const ops = process.env.PLATFORM_OPS_EMAIL?.trim();
  if (ops) {
    await sendEmail({
      to: ops,
      subject: `${priority ? "[Priority] " : ""}[Support] ${tenant.slug}: ${subject}`,
      html: `<p><strong>${owner?.email ?? "merchant"}</strong> (${tenant.name})</p><p>${message}</p>`,
    }).catch(() => {});
  }
  await logActivity({
    tenantId: tenant.id,
    userEmail: owner?.email ?? session.email,
    action: "support.ticket",
    summary: subject,
    meta: { message: message.slice(0, 500) },
  });
  return c.json({
    ok: true,
    message: ops
      ? "Message sent to support. We will reply by email."
      : "Ticket logged. Configure PLATFORM_OPS_EMAIL for email delivery.",
  });
});

merchant.get("/notifications", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const threshold = tenant.settings?.lowStockThreshold ?? 5;
  const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [pendingOrders, lowStockCount, openDisputes] = await Promise.all([
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
    prisma.orderEvent.count({
      where: {
        tenantId: tenant.id,
        type: "STRIPE_DISPUTE",
        createdAt: { gte: d90 },
      },
    }),
  ]);
  return c.json({ pendingOrders, lowStockCount, openDisputes });
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
      sizeChart:
        product.translations &&
        typeof product.translations === "object" &&
        !Array.isArray(product.translations)
          ? String(
              (product.translations as Record<string, unknown>)._sizeChart ?? ""
            )
          : "",
      countryPrices: formatCountryPrices(product.translations),
    },
    currency: tenant.settings?.currency ?? "USD",
  });
});

function formatCountryPrices(translations: unknown): string {
  if (!translations || typeof translations !== "object" || Array.isArray(translations)) {
    return "";
  }
  const raw = (translations as Record<string, unknown>)._countryPrices;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  return Object.entries(raw as Record<string, unknown>)
    .map(([code, cents]) => `${code.toUpperCase()}=${(Number(cents) / 100).toFixed(2)}`)
    .join("\n");
}

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
  const hsCode = String(body.hsCode ?? "").trim() || null;
  const countryRaw = String(body.countryOfOrigin ?? "").trim().toUpperCase();
  const countryOfOrigin =
    countryRaw.length === 2 ? countryRaw : null;
  const requiresShipping =
    type === ProductType.PHYSICAL
      ? parseRequiresShipping(body.requiresShipping, true)
      : false;
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
      requiresShipping: requiresShipping,
      hsCode,
      countryOfOrigin,
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
      data: {
        translations:
          translationsCreate === null
            ? Prisma.JsonNull
            : (translationsCreate as Prisma.InputJsonValue),
      },
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
  const hsCode =
    body.hsCode !== undefined
      ? String(body.hsCode).trim() || null
      : product.hsCode;
  const countryRaw =
    body.countryOfOrigin !== undefined
      ? String(body.countryOfOrigin).trim().toUpperCase()
      : null;
  const countryOfOrigin =
    body.countryOfOrigin !== undefined
      ? countryRaw && countryRaw.length === 2
        ? countryRaw
        : null
      : product.countryOfOrigin;
  const requiresShipping =
    type === ProductType.PHYSICAL
      ? body.requiresShipping !== undefined
        ? parseRequiresShipping(body.requiresShipping, product.requiresShipping)
        : product.requiresShipping
      : false;

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
      requiresShipping,
      hsCode,
      countryOfOrigin,
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
      data: {
        translations:
          translationsPatch === null
            ? Prisma.JsonNull
            : (translationsPatch as Prisma.InputJsonValue),
      },
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
  const sort = parseOrderSort(c.req.query("sort"));
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(c.req.query("pageSize") ?? "50", 10) || 50));
  const { buildOrderListWhere, summarizeOrders } = await import(
    "../lib/order-list-query.js"
  );
  const where = buildOrderListWhere(tenant.id, {
    q: c.req.query("q"),
    status: c.req.query("status"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    country: c.req.query("country"),
    view: c.req.query("view"),
    tag: c.req.query("tag"),
    hold: c.req.query("hold"),
    risk: c.req.query("risk"),
  });

  const [orders, total, summary] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: { select: { type: true } } } },
      },
      orderBy: orderOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
    summarizeOrders(where),
  ]);

  const { mapOrderListRow } = await import("../lib/order-list.js");
  const { getPaymentModel } = await import("../lib/payment-model.js");

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    paymentModel: getPaymentModel(),
    page,
    pageSize,
    total,
    summary: {
      count: summary.count,
      totalCents: summary.totalCents,
      platformFeesCents: summary.platformFeesCents,
    },
    orders: orders.map(mapOrderListRow),
  });
});

merchant.post("/orders/draft", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    email: string;
    name?: string;
    lines: { productId: string; quantity?: number }[];
    note?: string;
  }>();
  const { createMerchantDraftOrder } = await import("../lib/merchant-draft-order.js");
  try {
    const order = await createMerchantDraftOrder(tenant.id, body);
    return c.json({ order }, 201);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Failed to create draft" },
      400
    );
  }
});

merchant.post("/orders/:id/payment-link", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { createDraftOrderPaymentLink } = await import(
    "../lib/merchant-draft-order.js"
  );
  try {
    const result = await createDraftOrderPaymentLink(
      tenant.id,
      c.req.param("id")
    );
    return c.json(result);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Failed to create payment link" },
      400
    );
  }
});

merchant.get("/orders/export", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { buildOrderListWhere } = await import("../lib/order-list-query.js");
  const where = buildOrderListWhere(tenant.id, {
    q: c.req.query("q"),
    status: c.req.query("status"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    country: c.req.query("country"),
    view: c.req.query("view"),
    tag: c.req.query("tag"),
    hold: c.req.query("hold"),
    risk: c.req.query("risk"),
  });
  const accounting = c.req.query("format") === "accounting";
  const orders = await prisma.order.findMany({
    where,
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const csv = accounting
    ? (await import("../lib/order-export.js")).ordersToAccountingCsv(orders)
    : [
        "orderNumber,status,email,total,currency,country,trackingNumber,shippedAt,createdAt",
        ...orders.map((o) =>
          [
            o.orderNumber,
            o.status,
            o.customer?.email ?? o.guestEmail ?? "",
            (o.totalAmount / 100).toFixed(2),
            o.currency,
            o.shippingCountry ?? "",
            o.trackingNumber ?? "",
            o.shippedAt?.toISOString() ?? "",
            o.createdAt.toISOString(),
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${tenant.slug}${accounting ? "-accounting" : ""}.csv"`,
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
      affiliatePartner: {
        select: { id: true, code: true, displayName: true, email: true },
      },
      affiliateCommission: {
        select: {
          id: true,
          commissionCents: true,
          commissionBps: true,
          status: true,
          paidAt: true,
          payoutNote: true,
        },
      },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  const { getPaymentModel } = await import("../lib/payment-model.js");
  return c.json({
    order,
    currency: order.currency,
    paymentModel: getPaymentModel(),
  });
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
  if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
    const { emailCustomerAboutOrder } = await import("../lib/transactional-email.js");
    emailCustomerAboutOrder(order.id, "orderCancelled").catch(console.error);
  }
  if (status === OrderStatus.FULFILLED && order.status !== OrderStatus.FULFILLED) {
    const { sendReviewRequestOnce } = await import("../lib/transactional-email.js");
    sendReviewRequestOnce(order.id).catch(console.error);
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
  const { shipmentBlockReason, captureAuthorizedPayment } = await import(
    "../lib/buyer-protection.js"
  );
  const block = shipmentBlockReason(order, tracking, markFulfilled || Boolean(tracking));
  if (block) return c.json({ error: block }, 400);
  if (markFulfilled || tracking) {
    await captureAuthorizedPayment(order.id, session.email);
  }

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
  if (markFulfilled && order.status !== OrderStatus.FULFILLED) {
    const { sendReviewRequestOnce } = await import("../lib/transactional-email.js");
    sendReviewRequestOnce(order.id).catch(console.error);
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

  let body: {
    fromName?: string;
    fromStreet1?: string;
    fromCity?: string;
    fromState?: string;
    fromZip?: string;
    fromCountry?: string;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    /* empty body */
  }

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

    const { captureAuthorizedPayment } = await import("../lib/buyer-protection.js");
    await captureAuthorizedPayment(order.id);
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

async function loadMerchantCustomerRows(tenantId: string, q: string) {
  const rows = await prisma.customer.findMany({
    where: {
      tenantId,
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
        select: { totalAmount: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((c) => {
    const metrics = computeCustomerMetrics(c.orders, c._count.orders);
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      country: c.country,
      createdAt: c.createdAt,
      marketingOptOut: c.marketingOptOut,
      emailBounced: c.emailBounced,
      orderCount: metrics.orderCount,
      paidOrderCount: metrics.paidOrderCount,
      totalSpent: metrics.totalSpent,
      aov: metrics.aov,
      segment: metrics.segment,
      lastOrderAt: metrics.lastOrderAt?.toISOString() ?? null,
      firstOrderAt: metrics.firstOrderAt?.toISOString() ?? null,
    };
  });
}

merchant.get("/customers", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim() ?? "";
  const filter = (c.req.query("filter") ?? "all") as CustomerListFilter;
  const sort = (c.req.query("sort") ?? "newest") as CustomerListSort;

  let rows = await loadMerchantCustomerRows(tenant.id, q);
  if (filter !== "all") {
    rows = rows.filter((row) =>
      matchesCustomerFilter(row.segment, row.orderCount, filter)
    );
  }
  const customers = sortCustomerRows(
    rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt) : null,
      firstOrderAt: row.firstOrderAt ? new Date(row.firstOrderAt) : null,
    })),
    sort
  ).map(({ createdAt, lastOrderAt, firstOrderAt, ...row }) => ({
    ...row,
    createdAt: createdAt.toISOString(),
    lastOrderAt: lastOrderAt?.toISOString() ?? null,
    firstOrderAt: firstOrderAt?.toISOString() ?? null,
  }));

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    customers,
  });
});

merchant.post("/customers", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    email?: string;
    name?: string;
    country?: string;
  }>();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@") || email.length < 3) {
    return c.json({ error: "Valid email is required" }, 400);
  }
  const name = String(body.name ?? "").trim() || null;
  const countryRaw = String(body.country ?? "")
    .trim()
    .toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null;

  const existing = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (existing) {
    return c.json({ error: "A customer with this email already exists" }, 409);
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      email,
      name,
      country,
    },
  });

  return c.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      country: customer.country,
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: null,
      segment: [],
      createdAt: customer.createdAt.toISOString(),
    },
  });
});

merchant.get("/customers/export.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const q = c.req.query("q")?.trim() ?? "";
  const filter = (c.req.query("filter") ?? "all") as CustomerListFilter;
  let rows = await loadMerchantCustomerRows(tenant.id, q);
  if (filter !== "all") {
    rows = rows.filter((row) =>
      matchesCustomerFilter(row.segment, row.orderCount, filter)
    );
  }
  const csv = customerMetricsToCsv(
    rows.map((r) => ({
      email: r.email,
      name: r.name,
      country: r.country,
      orderCount: r.orderCount,
      totalSpent: r.totalSpent,
      lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt) : null,
      segment: r.segment,
    }))
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${tenant.slug}.csv"`,
    },
  });
});

merchant.get("/customers/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const customer = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          shippingName: true,
          shippingCity: true,
          shippingCountry: true,
        },
      },
    },
  });
  if (!customer) return c.json({ error: "Not found" }, 404);

  const metrics = computeCustomerMetrics(
    customer.orders,
    customer.orders.length
  );

  const openCart = await prisma.abandonedCart.findFirst({
    where: {
      tenantId: tenant.id,
      email: customer.email,
      convertedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subtotalAmount: true,
      currency: true,
      updatedAt: true,
    },
  });

  const emailSubscriber = await prisma.emailSubscriber.findUnique({
    where: {
      tenantId_email: { tenantId: tenant.id, email: customer.email },
    },
    select: { marketingOptOut: true },
  });

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      country: customer.country,
      createdAt: customer.createdAt.toISOString(),
      marketingOptOut: customer.marketingOptOut,
      emailBounced: customer.emailBounced,
      orders: customer.orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      })),
    },
    summary: {
      orderCount: metrics.orderCount,
      paidOrderCount: metrics.paidOrderCount,
      totalSpent: metrics.totalSpent,
      aov: metrics.aov,
      segment: metrics.segment,
      lastOrderAt: metrics.lastOrderAt?.toISOString() ?? null,
      firstOrderAt: metrics.firstOrderAt?.toISOString() ?? null,
    },
    openAbandonedCart: openCart
      ? {
          id: openCart.id,
          subtotalAmount: openCart.subtotalAmount,
          currency: openCart.currency,
          updatedAt: openCart.updatedAt.toISOString(),
        }
      : null,
    emailSubscriber: emailSubscriber
      ? { marketingOptOut: emailSubscriber.marketingOptOut }
      : null,
  });
});

merchant.patch("/customers/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ marketingOptOut?: boolean }>();
  const existing = await prisma.customer.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...(typeof body.marketingOptOut === "boolean"
        ? { marketingOptOut: body.marketingOptOut }
        : {}),
    },
    select: {
      id: true,
      email: true,
      marketingOptOut: true,
      emailBounced: true,
    },
  });

  if (typeof body.marketingOptOut === "boolean") {
    await prisma.emailSubscriber.updateMany({
      where: { tenantId: tenant.id, email: customer.email },
      data: { marketingOptOut: body.marketingOptOut },
    });
  }

  return c.json({ customer });
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

  const nameProvided = body.name != null;
  const slugProvided = body.slug != null;
  const name = nameProvided ? String(body.name).trim() : tenant.name;
  const slug = slugProvided ? normalizeSlug(String(body.slug)) : tenant.slug;
  const slugConfirm = Boolean(body.slugConfirm);

  if (nameProvided && !name) return c.json({ error: "Store name is required" }, 400);
  if (slugProvided && !slug) return c.json({ error: "Store slug is required" }, 400);

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
    const aliasTaken = await prisma.storeSettings.findFirst({
      where: { storeAliases: { has: slug }, NOT: { tenantId: tenant.id } },
      select: { tenantId: true },
    });
    if (aliasTaken) return c.json({ error: "This slug is already taken" }, 400);
  }

  const themeRaw =
    body.theme != null && typeof body.theme === "object" ? body.theme : undefined;
  const themeDraftRaw =
    body.themeDraft != null && typeof body.themeDraft === "object"
      ? body.themeDraft
      : undefined;

  const existingSettings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
  });

  const stripeTaxFromBody =
    body.stripeTaxEnabled !== undefined
      ? body.stripeTaxEnabled === true || body.stripeTaxEnabled === "true"
      : undefined;

  const emailTemplates =
    body.emailTemplates !== undefined
      ? (await import("../lib/transactional-email.js")).sanitizeEmailTemplates(
          body.emailTemplates
        )
      : undefined;

  const { assertThemePurchased } = await import("../lib/marketplace.js");
  for (const candidate of [themeRaw, themeDraftRaw]) {
    const themeId = getCatalogThemeId(candidate);
    if (!themeId) continue;
    try {
      await assertThemePurchased(tenant.id, themeId);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Theme locked" }, 402);
    }
  }

  let theme =
    themeRaw !== undefined ? jsonForPrisma(parseStoreTheme(themeRaw)) : undefined;
  let themeDraft =
    themeDraftRaw !== undefined
      ? jsonForPrisma(parseStoreTheme(themeDraftRaw))
      : undefined;

  if (stripeTaxFromBody !== undefined) {
    const { withStripeTaxOnTheme } = await import("../lib/sync-stripe-tax-theme.js");
    const baseTheme = themeRaw ?? existingSettings?.theme;
    const baseDraft = themeDraftRaw ?? existingSettings?.themeDraft ?? baseTheme;
    theme = jsonForPrisma(withStripeTaxOnTheme(baseTheme, stripeTaxFromBody));
    themeDraft = jsonForPrisma(withStripeTaxOnTheme(baseDraft, stripeTaxFromBody));
  }

  const { parseLocaleCurrencies, normalizeMarketsInput } = await import(
    "../lib/store-markets.js"
  );
  const localeCurrencies =
    body.localeCurrencies !== undefined
      ? parseLocaleCurrencies(body.localeCurrencies)
      : undefined;
  const markets =
    body.markets !== undefined ? normalizeMarketsInput(body.markets) : undefined;

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
        faviconUrl: body.faviconUrl ? String(body.faviconUrl) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        businessAddress: body.businessAddress
          ? String(body.businessAddress)
          : null,
        emailFromName: body.emailFromName ? String(body.emailFromName) : null,
        emailReplyTo: body.emailReplyTo ? String(body.emailReplyTo) : null,
        emailDoubleOptIn:
          body.emailDoubleOptIn === true || body.emailDoubleOptIn === "on",
        privacyUrl: body.privacyUrl ? String(body.privacyUrl) : null,
        refundUrl: body.refundUrl ? String(body.refundUrl) : null,
        privacyPolicy: body.privacyPolicy ? String(body.privacyPolicy) : null,
        refundPolicy: body.refundPolicy ? String(body.refundPolicy) : null,
        termsOfService: body.termsOfService ? String(body.termsOfService) : null,
        termsUrl: body.termsUrl ? String(body.termsUrl) : null,
        shippingPolicy: body.shippingPolicy ? String(body.shippingPolicy) : null,
        shippingUrl: body.shippingUrl ? String(body.shippingUrl) : null,
        legalNotice: body.legalNotice ? String(body.legalNotice) : null,
        legalNoticeUrl: body.legalNoticeUrl ? String(body.legalNoticeUrl) : null,
        contactPolicy: body.contactPolicy ? String(body.contactPolicy) : null,
        returnRules: body.returnRules ? String(body.returnRules) : null,
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
        stripeTaxEnabled: stripeTaxFromBody ?? false,
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
        ...(emailTemplates !== undefined
          ? { emailTemplates: emailTemplates ?? Prisma.JsonNull }
          : {}),
        ...(localeCurrencies !== undefined
          ? {
              localeCurrencies:
                localeCurrencies === null
                  ? Prisma.JsonNull
                  : jsonForPrisma(localeCurrencies),
            }
          : {}),
        ...(markets !== undefined
          ? { markets: jsonForPrisma(markets) }
          : {}),
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
        faviconUrl: body.faviconUrl ? String(body.faviconUrl) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        businessAddress: body.businessAddress
          ? String(body.businessAddress)
          : null,
        emailFromName: body.emailFromName ? String(body.emailFromName) : null,
        emailReplyTo: body.emailReplyTo ? String(body.emailReplyTo) : null,
        emailDoubleOptIn:
          body.emailDoubleOptIn === true || body.emailDoubleOptIn === "on",
        privacyUrl: body.privacyUrl ? String(body.privacyUrl) : null,
        refundUrl: body.refundUrl ? String(body.refundUrl) : null,
        privacyPolicy: body.privacyPolicy ? String(body.privacyPolicy) : null,
        refundPolicy: body.refundPolicy ? String(body.refundPolicy) : null,
        termsOfService: body.termsOfService ? String(body.termsOfService) : null,
        termsUrl: body.termsUrl ? String(body.termsUrl) : null,
        shippingPolicy: body.shippingPolicy ? String(body.shippingPolicy) : null,
        shippingUrl: body.shippingUrl ? String(body.shippingUrl) : null,
        legalNotice: body.legalNotice ? String(body.legalNotice) : null,
        legalNoticeUrl: body.legalNoticeUrl ? String(body.legalNoticeUrl) : null,
        contactPolicy: body.contactPolicy ? String(body.contactPolicy) : null,
        returnRules: body.returnRules ? String(body.returnRules) : null,
        digitalLinkDays:
          parseInt(String(body.digitalLinkDays ?? "30"), 10) || 30,
        notifyNewOrders:
          body.notifyNewOrders !== false && body.notifyNewOrders !== "false",
        notifyLowStock:
          body.notifyLowStock !== false && body.notifyLowStock !== "false",
        abandonedCartEnabled:
          body.abandonedCartEnabled !== false &&
          body.abandonedCartEnabled !== "false",
        ...(body.taxRateBps != null
          ? { taxRateBps: parseInt(String(body.taxRateBps), 10) || 0 }
          : {}),
        ...(body.taxIncluded != null
          ? {
              taxIncluded:
                body.taxIncluded === true || body.taxIncluded === "true",
            }
          : {}),
        ...(stripeTaxFromBody !== undefined
          ? { stripeTaxEnabled: stripeTaxFromBody }
          : {}),
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
        ...(emailTemplates !== undefined
          ? { emailTemplates: emailTemplates ?? Prisma.JsonNull }
          : {}),
        ...(localeCurrencies !== undefined
          ? {
              localeCurrencies:
                localeCurrencies === null
                  ? Prisma.JsonNull
                  : jsonForPrisma(localeCurrencies),
            }
          : {}),
        ...(markets !== undefined
          ? { markets: jsonForPrisma(markets) }
          : {}),
        ...(theme !== undefined ? { theme } : {}),
        ...(themeDraft !== undefined ? { themeDraft } : {}),
      },
    }),
  ]);

  const updated = await requireTenant(c.get("session"));
  return c.json({ ok: true, tenant: updated.tenant });
});

/** Storefront / page builder: update theme draft without touching other settings columns. */
merchant.patch("/settings/theme-draft", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    themeDraft?: unknown;
    primaryColor?: string;
  }>();
  if (body.themeDraft == null || typeof body.themeDraft !== "object") {
    return c.json({ error: "themeDraft is required" }, 400);
  }
  const draftThemeId = getCatalogThemeId(body.themeDraft);
  if (draftThemeId) {
    try {
      const { assertThemePurchased } = await import("../lib/marketplace.js");
      await assertThemePurchased(tenant.id, draftThemeId);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Theme locked" }, 402);
    }
  }
  const themeDraft = jsonForPrisma(parseStoreTheme(body.themeDraft));
  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      themeDraft,
      primaryColor: body.primaryColor
        ? String(body.primaryColor).slice(0, 32)
        : "#7c3aed",
    },
    update: {
      themeDraft,
      ...(body.primaryColor
        ? { primaryColor: String(body.primaryColor).slice(0, 32) }
        : {}),
    },
  });
  const updated = await requireTenant(c.get("session"));
  return c.json({ ok: true, tenant: updated.tenant });
});

merchant.post("/settings/test-email", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.email) return c.json({ error: "No email on your account" }, 400);
  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    return c.json({ error: "Email provider not configured on server" }, 503);
  }
  const { sendStoreEmail } = await import("../lib/tenant-email.js");
  await sendStoreEmail(tenant.id, {
    to: user.email,
    subject: `Test email from ${tenant.name}`,
    html: `<p>This is a test of your store transactional email settings (From name and Reply-to).</p><p>If you received this, delivery works.</p>`,
  });
  return c.json({ ok: true, sentTo: user.email });
});

merchant.get("/email-domain", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const { getEmailDomain } = await import("../lib/email-domain.js");
  return c.json({ domain: await getEmailDomain(tenant.id) });
});

merchant.post("/email-domain", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ domain?: string }>();
  try {
    const { registerEmailDomain } = await import("../lib/email-domain.js");
    const domain = await registerEmailDomain(tenant.id, String(body.domain ?? ""));
    return c.json({ domain });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed" }, 400);
  }
});

merchant.post("/email-domain/verify", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  try {
    const { refreshEmailDomain } = await import("../lib/email-domain.js");
    const domain = await refreshEmailDomain(tenant.id);
    return c.json({ domain });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed" }, 400);
  }
});

function pushThemeVersion(
  history: unknown,
  snapshot: {
    id: string;
    label: string;
    savedAt: string;
    homeBlocks: unknown;
    globalBlocks?: unknown;
  }
) {
  const list = Array.isArray(history) ? [...history] : [];
  list.unshift(snapshot);
  return list.slice(0, 15);
}

merchant.get("/settings/theme-versions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const draft = parseStoreTheme(tenant.settings?.themeDraft ?? tenant.settings?.theme);
  return c.json({ versions: draft.themeVersionHistory ?? [] });
});

merchant.post("/settings/theme-versions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ label?: string }>();
  const label = String(body.label ?? "").trim() || "Manual snapshot";
  const draft = parseStoreTheme(tenant.settings?.themeDraft ?? tenant.settings?.theme);
  const homeBlocks = draft.homeBlocks ?? resolveHomeBlocks(draft);
  const snapshot = {
    id: `ver_${Date.now().toString(36)}`,
    label,
    savedAt: new Date().toISOString(),
    homeBlocks,
    globalBlocks: draft.globalBlocks,
  };
  const nextDraft = jsonForPrisma({
    ...draft,
    themeVersionHistory: pushThemeVersion(draft.themeVersionHistory, snapshot),
  });
  await prisma.storeSettings.update({
    where: { tenantId: tenant.id },
    data: { themeDraft: nextDraft },
  });
  return c.json({ ok: true, version: snapshot });
});

merchant.post("/settings/theme-versions/:id/restore", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const draft = parseStoreTheme(tenant.settings?.themeDraft ?? tenant.settings?.theme);
  const id = c.req.param("id");
  const match = (draft.themeVersionHistory ?? []).find((v) => v.id === id);
  if (!match) return c.json({ error: "Version not found" }, 404);
  const nextDraft = jsonForPrisma({
    ...draft,
    homeBlocks: match.homeBlocks,
    ...(match.globalBlocks ? { globalBlocks: match.globalBlocks } : {}),
  });
  await prisma.storeSettings.update({
    where: { tenantId: tenant.id },
    data: { themeDraft: nextDraft },
  });
  return c.json({ ok: true });
});

merchant.post("/settings/publish-theme", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  try {
    await publishStoreTheme(tenant.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    return c.json({ error: msg }, 400);
  }
  const updated = await requireTenant(c.get("session"));
  const meta = readThemeDraftMeta(updated.tenant.settings?.themeDraft);
  return c.json({
    ok: true,
    tenant: updated.tenant,
    themePublishAt: meta.publishAt,
    themeExperiment: meta.experiment,
  });
});

merchant.post("/settings/schedule-theme", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ publishAt?: string | null }>();
  const publishAt = body.publishAt ? String(body.publishAt).trim() : null;
  if (publishAt && !Number.isFinite(Date.parse(publishAt))) {
    return c.json({ error: "Invalid publishAt" }, 400);
  }
  const draftRaw = tenant.settings?.themeDraft ?? tenant.settings?.theme;
  if (!draftRaw) return c.json({ error: "No theme draft" }, 400);
  const theme = parseStoreTheme(draftRaw);
  const meta = readThemeDraftMeta(draftRaw);
  const nextDraft = themeDraftWithMeta(theme, {
    publishAt,
    experiment: meta.experiment,
  });
  await prisma.storeSettings.update({
    where: { tenantId: tenant.id },
    data: { themeDraft: nextDraft as Prisma.InputJsonValue },
  });
  return c.json({ ok: true, publishAt });
});

merchant.post("/settings/theme-experiment", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    enabled?: boolean;
    trafficBPercent?: number;
    snapshotVariantB?: boolean;
  }>();
  const draftRaw = tenant.settings?.themeDraft ?? tenant.settings?.theme;
  if (!draftRaw) return c.json({ error: "No theme draft" }, 400);
  const theme = parseStoreTheme(draftRaw);
  const meta = readThemeDraftMeta(draftRaw);
  const prev = meta.experiment;
  const enabled = body.enabled === true;
  const trafficBPercent =
    body.trafficBPercent != null
      ? Math.min(100, Math.max(0, Math.round(Number(body.trafficBPercent))))
      : (prev.trafficBPercent ?? 50);
  let variantBTheme = prev.variantBTheme;
  if (enabled && (body.snapshotVariantB !== false || !variantBTheme)) {
    variantBTheme = parseStoreTheme(theme);
  }
  const experiment = enabled
    ? { enabled: true, trafficBPercent, variantBTheme }
    : { enabled: false, trafficBPercent, variantBTheme };
  const nextDraft = themeDraftWithMeta(theme, {
    publishAt: meta.publishAt,
    experiment,
  });
  await prisma.storeSettings.update({
    where: { tenantId: tenant.id },
    data: { themeDraft: nextDraft as Prisma.InputJsonValue },
  });
  return c.json({
    ok: true,
    themeExperiment: parseThemeExperiment(experiment),
  });
});

merchant.post("/ai/block-edit", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  void tenant;
  const body = await c.req.json<{ prompt?: string; block?: HomeBlock }>();
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return c.json({ error: "prompt required" }, 400);
  if (!body.block || typeof body.block !== "object") {
    return c.json({ error: "block required" }, 400);
  }
  const patch = applyAiBlockEdit(body.block, prompt);
  return c.json({ patch, block: { ...body.block, ...patch } });
});

merchant.get("/platform-announcement", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const full = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { subscriptionPlan: { select: { slug: true } } },
  });
  const planSlug = full?.subscriptionPlan?.slug;
  const items = await prisma.platformAnnouncement.findMany({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });
  const match = items.find((a) => {
    if (a.tenantIds.length > 0 && !a.tenantIds.includes(tenant.id)) return false;
    if (a.planSlugs.length === 0) return true;
    return planSlug != null && a.planSlugs.includes(planSlug);
  });
  return c.json({
    announcement: match
      ? { title: match.title, message: match.message }
      : null,
  });
});

merchant.get("/platform-messages", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const rows = await prisma.platformMerchantMessage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = rows.filter((r) => !r.readAt).length;
  return c.json({
    unreadCount,
    messages: rows.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      actorEmail: m.actorEmail,
      readAt: m.readAt?.toISOString() ?? null,
      merchantReply: m.merchantReply,
      merchantRepliedAt: m.merchantRepliedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

merchant.post("/platform-messages/:id/read", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const msg = await prisma.platformMerchantMessage.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!msg) return c.json({ error: "Not found" }, 404);
  if (!msg.readAt) {
    await prisma.platformMerchantMessage.update({
      where: { id: msg.id },
      data: { readAt: new Date() },
    });
  }
  return c.json({ ok: true });
});

merchant.post("/platform-messages/:id/reply", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ body?: string }>();
  const text = String(body.body ?? "").trim();
  if (!text) return c.json({ error: "Reply required" }, 400);
  const msg = await prisma.platformMerchantMessage.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!msg) return c.json({ error: "Not found" }, 404);
  const updated = await prisma.platformMerchantMessage.update({
    where: { id: msg.id },
    data: {
      merchantReply: text,
      merchantRepliedAt: new Date(),
      readAt: msg.readAt ?? new Date(),
    },
  });
  try {
    const { sendEmail } = await import("../lib/email.js");
    await sendEmail({
      to: msg.actorEmail,
      subject: `Re: ${msg.subject} (${tenant.slug})`,
      html: `<p>Merchant reply from <strong>${tenant.name}</strong> (${session.email}):</p>
<blockquote style="border-left:3px solid #0ea5e9;padding-left:12px">${text.replace(/\n/g, "<br/>")}</blockquote>
<p style="font-size:12px;color:#71717a">Original: ${msg.subject}</p>`,
      text: `Reply from ${tenant.slug}:\n\n${text}`,
      priority: "high",
    });
  } catch {
    /* optional */
  }
  return c.json({
    message: {
      id: updated.id,
      merchantReply: updated.merchantReply,
      merchantRepliedAt: updated.merchantRepliedAt?.toISOString() ?? null,
    },
  });
});

export { merchant };
