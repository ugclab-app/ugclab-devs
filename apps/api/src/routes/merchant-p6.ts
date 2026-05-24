import { randomBytes } from "crypto";
import { Hono } from "hono";
import { prisma, ProductStatus } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant, normalizeSlug } from "../lib/merchant.js";
import {
  getMerchantAccess,
  hasPermission,
  type MerchantPermission,
} from "../lib/permissions.js";
import { logActivity } from "../lib/activity-log.js";
import {
  parseIntegrations,
  parsePostCheckoutUpsell,
} from "../lib/growth-settings.js";
import { generateGiftCardCode } from "../lib/gift-card.js";
import { dispatchMerchantWebhooks } from "../lib/merchant-webhooks.js";
import {
  extractSeoFromTranslations,
  mergeTranslationsWithSeo,
} from "../lib/product-form-data.js";
import { hash } from "bcryptjs";

const p6 = new Hono<AuthEnv>();
p6.use("*", requireAuth);

async function actor(c: import("hono").Context) {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  return { tenant, session, access };
}

function requireGrowth(access: { permissions: MerchantPermission[] }) {
  return hasPermission(access.permissions, "growth");
}

function parseMoney(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

p6.get("/growth", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);

  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
  });

  const [giftCards, bundles, warehouses, webhooks, apiKeys, products] =
    await Promise.all([
      prisma.giftCard.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.productBundle.findMany({
        where: { tenantId: tenant.id },
        include: { items: { include: { product: { select: { id: true, title: true, slug: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.warehouse.findMany({
        where: { tenantId: tenant.id },
        include: { stock: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.merchantWebhook.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.merchantApiKey.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      prisma.product.findMany({
        where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
        select: {
          id: true,
          title: true,
          slug: true,
          subscriptionEnabled: true,
          subscriptionInterval: true,
        },
        orderBy: { title: "asc" },
      }),
    ]);

  const activeProducts = await prisma.product.count({
    where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
  });
  const storefrontBase = `/${tenant.slug}`;

  return c.json({
    settings: {
      currency: settings?.currency ?? "USD",
      taxRateBps: settings?.taxRateBps ?? 0,
      taxIncluded: settings?.taxIncluded ?? false,
      stripeTaxEnabled: settings?.stripeTaxEnabled ?? false,
      seoTitle: settings?.seoTitle,
      seoDescription: settings?.seoDescription,
      integrations: parseIntegrations(settings?.integrations),
      postCheckoutUpsell: parsePostCheckoutUpsell(settings?.postCheckoutUpsell),
    },
    giftCards,
    bundles,
    warehouses,
    webhooks: webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
    })),
    apiKeys,
    subscriptionProducts: products.filter((p) => p.subscriptionEnabled),
    products,
    seo: {
      storeTitle: settings?.seoTitle ?? tenant.name,
      storeDescription: settings?.seoDescription ?? "",
      activeProducts,
      sitemapHint: `${storefrontBase}/sitemap.xml`,
      robotsHint: "index,follow",
    },
  });
});

p6.patch("/growth/settings", async (c) => {
  const { tenant, access, session } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<Record<string, unknown>>();

  const integrations =
    body.integrations != null
      ? parseIntegrations(body.integrations)
      : undefined;
  const postCheckoutUpsell =
    body.postCheckoutUpsell != null
      ? parsePostCheckoutUpsell(body.postCheckoutUpsell)
      : undefined;

  await prisma.storeSettings.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id },
    update: {
      ...(body.taxRateBps != null
        ? { taxRateBps: parseInt(String(body.taxRateBps), 10) || 0 }
        : {}),
      ...(body.taxIncluded != null
        ? {
            taxIncluded:
              body.taxIncluded === true || body.taxIncluded === "true",
          }
        : {}),
      ...(body.stripeTaxEnabled != null
        ? {
            stripeTaxEnabled:
              body.stripeTaxEnabled === true ||
              body.stripeTaxEnabled === "true",
          }
        : {}),
      ...(body.seoTitle != null
        ? { seoTitle: String(body.seoTitle).trim() || null }
        : {}),
      ...(body.seoDescription != null
        ? { seoDescription: String(body.seoDescription).trim() || null }
        : {}),
      ...(integrations !== undefined
        ? { integrations: integrations as object }
        : {}),
      ...(postCheckoutUpsell !== undefined
        ? { postCheckoutUpsell: postCheckoutUpsell as object }
        : {}),
    },
  });

  logActivity({
    tenantId: tenant.id,
    userId: session.sub,
    userEmail: session.email,
    action: "growth.settings",
    entityType: "settings",
    entityId: tenant.id,
    summary: "Updated growth settings",
  }).catch(() => {});

  return c.json({ ok: true });
});

p6.post("/growth/gift-cards", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<Record<string, unknown>>();
  const balance = parseMoney(body.balance ?? body.amount);
  if (balance <= 0) return c.json({ error: "Balance required" }, 400);
  const code =
    String(body.code ?? "").trim().toUpperCase().replace(/\s+/g, "") ||
    generateGiftCardCode();
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { currency: true },
  });

  try {
    const card = await prisma.giftCard.create({
      data: {
        tenantId: tenant.id,
        code,
        initialBalance: balance,
        balanceCents: balance,
        currency: settings?.currency ?? "USD",
        recipientEmail: body.recipientEmail
          ? String(body.recipientEmail).trim()
          : null,
        note: body.note ? String(body.note) : null,
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
      },
    });
    return c.json({ giftCard: card });
  } catch {
    return c.json({ error: "Code already exists" }, 400);
  }
});

p6.patch("/growth/gift-cards/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ active?: boolean; note?: string }>();
  const card = await prisma.giftCard.updateMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    data: {
      ...(body.active != null ? { active: body.active } : {}),
      ...(body.note != null ? { note: body.note } : {}),
    },
  });
  if (!card.count) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

p6.post("/growth/bundles", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<Record<string, unknown>>();
  const title = String(body.title ?? "").trim();
  const slug = normalizeSlug(String(body.slug ?? title));
  const priceAmount = parseMoney(body.price);
  const productIds = Array.isArray(body.productIds)
    ? (body.productIds as string[])
    : [];
  const quantities = Array.isArray(body.quantities)
    ? (body.quantities as number[])
    : productIds.map(() => 1);
  if (!title || !slug || priceAmount <= 0 || !productIds.length) {
    return c.json({ error: "Title, price, and products required" }, 400);
  }

  const bundle = await prisma.productBundle.create({
    data: {
      tenantId: tenant.id,
      title,
      slug,
      description: body.description ? String(body.description) : null,
      priceAmount,
      currency: tenant.settings?.currency ?? "USD",
      items: {
        create: productIds.map((productId, i) => ({
          productId,
          quantity: Math.max(1, quantities[i] ?? 1),
        })),
      },
    },
    include: { items: { include: { product: { select: { title: true } } } } },
  });
  return c.json({ bundle });
});

p6.patch("/growth/bundles/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ active?: boolean; title?: string }>();
  await prisma.productBundle.updateMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    data: {
      ...(body.active != null ? { active: body.active } : {}),
      ...(body.title ? { title: String(body.title).trim() } : {}),
    },
  });
  return c.json({ ok: true });
});

p6.post("/growth/warehouses", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ name?: string; isDefault?: boolean }>();
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "Name required" }, 400);
  if (body.isDefault) {
    await prisma.warehouse.updateMany({
      where: { tenantId: tenant.id },
      data: { isDefault: false },
    });
  }
  const wh = await prisma.warehouse.create({
    data: {
      tenantId: tenant.id,
      name,
      isDefault: body.isDefault === true,
    },
  });
  return c.json({ warehouse: wh });
});

p6.patch("/growth/warehouses/:id/stock", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    productId: string;
    variantId?: string | null;
    quantity: number;
  }>();
  const wh = await prisma.warehouse.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!wh) return c.json({ error: "Warehouse not found" }, 404);

  const variantId = body.variantId ? String(body.variantId) : null;
  const qty = Math.max(0, body.quantity);
  const existing = await prisma.warehouseStock.findFirst({
    where: {
      warehouseId: wh.id,
      productId: body.productId,
      variantId,
    },
  });
  const stock = existing
    ? await prisma.warehouseStock.update({
        where: { id: existing.id },
        data: { quantity: qty },
      })
    : await prisma.warehouseStock.create({
        data: {
          warehouseId: wh.id,
          productId: body.productId,
          variantId,
          quantity: qty,
        },
      });
  return c.json({ stock });
});

p6.post("/growth/webhooks", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ url?: string; events?: string[] }>();
  const url = String(body.url ?? "").trim();
  const events = (body.events ?? ["order.paid"]).filter((e) =>
    ["order.paid", "product.updated", "order.created"].includes(e)
  );
  if (!url.startsWith("https://")) {
    return c.json({ error: "HTTPS URL required" }, 400);
  }
  const hook = await prisma.merchantWebhook.create({
    data: {
      tenantId: tenant.id,
      url,
      events: events.length ? events : ["order.paid"],
      secret: randomBytes(24).toString("hex"),
    },
  });
  return c.json({
    webhook: { id: hook.id, url: hook.url, events: hook.events, secret: hook.secret },
  });
});

p6.delete("/growth/webhooks/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  await prisma.merchantWebhook.deleteMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  return c.json({ ok: true });
});

p6.post("/growth/webhooks/:id/test", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const hook = await prisma.merchantWebhook.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!hook) return c.json({ error: "Not found" }, 404);
  await dispatchMerchantWebhooks(tenant.id, "order.paid", {
    test: true,
    orderId: "test_order",
  });
  return c.json({ ok: true });
});

p6.post("/growth/api-keys", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{ name?: string }>();
  const name = String(body.name ?? "API key").trim() || "API key";
  const raw = `ugc_${randomBytes(24).toString("hex")}`;
  const keyPrefix = raw.slice(0, 12);
  const keyHash = await hash(raw, 10);
  const row = await prisma.merchantApiKey.create({
    data: { tenantId: tenant.id, name, keyPrefix, keyHash },
  });
  return c.json({
    apiKey: { id: row.id, name: row.name, keyPrefix: row.keyPrefix },
    secret: raw,
  });
});

p6.delete("/growth/api-keys/:id", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  await prisma.merchantApiKey.deleteMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  return c.json({ ok: true });
});

p6.get("/growth/seo/products", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, title: true, slug: true, status: true, translations: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return c.json({
    products: products.map((p) => {
      const seo = extractSeoFromTranslations(p.translations);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      };
    }),
  });
});

p6.patch("/growth/seo/bulk", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    items: { id: string; seoTitle?: string; seoDescription?: string }[];
  }>();
  const items = body.items ?? [];
  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.id, tenantId: tenant.id },
    });
    if (!product) continue;
    const translations = mergeTranslationsWithSeo(
      { seoTitle: item.seoTitle, seoDescription: item.seoDescription },
      product.translations
    );
    if (translations !== undefined) {
      await prisma.product.update({
        where: { id: product.id },
        data: { translations: translations as object },
      });
      dispatchMerchantWebhooks(tenant.id, "product.updated", {
        productId: product.id,
      }).catch(() => {});
    }
  }
  return c.json({ ok: true, updated: items.length });
});

p6.patch("/growth/products/:id/subscription", async (c) => {
  const { tenant, access } = await actor(c);
  if (!requireGrowth(access)) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json<{
    subscriptionEnabled?: boolean;
    subscriptionInterval?: string | null;
  }>();
  const allowed = ["week", "month", "year", null, ""];
  const interval = body.subscriptionInterval
    ? String(body.subscriptionInterval)
    : null;
  if (interval && !allowed.includes(interval)) {
    return c.json({ error: "Invalid interval" }, 400);
  }
  const product = await prisma.product.updateMany({
    where: { id: c.req.param("id"), tenantId: tenant.id },
    data: {
      subscriptionEnabled: body.subscriptionEnabled === true,
      subscriptionInterval:
        body.subscriptionEnabled && interval ? interval : null,
    },
  });
  if (!product.count) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export { p6 };
