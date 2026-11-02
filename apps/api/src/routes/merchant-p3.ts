import { Hono } from "hono";
import { PromotionType, ProductStatus, ProductType, prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { normalizeSlug, requireTenant } from "../lib/merchant.js";
import { getMerchantAnalytics, analyticsToCsv } from "../lib/analytics.js";
import { parseAnalyticsRange } from "../lib/analytics-range.js";
import {
  getMerchantAccess,
  hasPermission,
} from "../lib/permissions.js";

import { useOrderRouteGuards } from "../middleware/merchant-guards.js";

const p3 = new Hono<AuthEnv>();
p3.use("*", requireAuth);
useOrderRouteGuards(p3);

p3.get("/analytics", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const rangeInput = parseAnalyticsRange({
    range: c.req.query("range"),
    from: c.req.query("from"),
    to: c.req.query("to"),
  });
  const analytics = await getMerchantAnalytics(tenant.id, rangeInput);
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    paymentModel: analytics.paymentModel,
    analytics,
  });
});

p3.get("/analytics/export.csv", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const rangeInput = parseAnalyticsRange({
    range: c.req.query("range"),
    from: c.req.query("from"),
    to: c.req.query("to"),
  });
  const analytics = await getMerchantAnalytics(tenant.id, rangeInput);
  const currency = tenant.settings?.currency ?? "USD";
  const csv = analyticsToCsv(analytics, currency);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${tenant.slug}.csv"`,
    },
  });
});

p3.get("/analytics/live", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { getLiveViewMetrics } = await import("../lib/live-view.js");
  const live = await getLiveViewMetrics(tenant.id);
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    live,
  });
});

p3.get("/analytics/cohorts", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const rangeInput = parseAnalyticsRange({
    range: c.req.query("range"),
    from: c.req.query("from"),
    to: c.req.query("to"),
  });
  const { getMerchantCohorts } = await import("../lib/analytics-insights.js");
  const data = await getMerchantCohorts(tenant.id, rangeInput);
  return c.json({ currency: tenant.settings?.currency ?? "USD", ...data });
});

p3.get("/analytics/attribution", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const rangeInput = parseAnalyticsRange({
    range: c.req.query("range"),
    from: c.req.query("from"),
    to: c.req.query("to"),
  });
  const { getMerchantAttribution } = await import("../lib/analytics-insights.js");
  const data = await getMerchantAttribution(tenant.id, rangeInput);
  return c.json({ currency: tenant.settings?.currency ?? "USD", ...data });
});

p3.get("/analytics/session-funnel", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const access = await getMerchantAccess(session, tenant.id);
  if (!hasPermission(access.permissions, "analytics")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const rangeInput = parseAnalyticsRange({
    range: c.req.query("range"),
    from: c.req.query("from"),
    to: c.req.query("to"),
  });
  const { getMerchantSessionFunnel } = await import("../lib/analytics-insights.js");
  const data = await getMerchantSessionFunnel(tenant.id, rangeInput);
  return c.json({ ...data });
});

p3.get("/promotions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const promotions = await prisma.storePromotion.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ promotions });
});

p3.post("/promotions", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    type?: string;
    value?: number;
    minOrderAmount?: number;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  }>();
  const type =
    body.type === "FREE_SHIPPING"
      ? PromotionType.FREE_SHIPPING
      : PromotionType.CART_PERCENT;

  const promotion = await prisma.storePromotion.create({
    data: {
      tenantId: tenant.id,
      type,
      value: Math.round(Number(body.value ?? 0)),
      minOrderAmount:
        body.minOrderAmount != null
          ? Math.round(Number(body.minOrderAmount))
          : null,
      active: body.active !== false,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  });
  return c.json({ promotion }, 201);
});

p3.patch("/promotions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json<{
    active?: boolean;
    value?: number;
    minOrderAmount?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }>();
  const promo = await prisma.storePromotion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!promo) return c.json({ error: "Not found" }, 404);
  const updated = await prisma.storePromotion.update({
    where: { id: promo.id },
    data: {
      ...(body.active != null ? { active: body.active } : {}),
      ...(body.value != null ? { value: Math.round(body.value) } : {}),
      ...(body.minOrderAmount !== undefined
        ? {
            minOrderAmount:
              body.minOrderAmount == null
                ? null
                : Math.round(body.minOrderAmount),
          }
        : {}),
      ...(body.startsAt !== undefined
        ? { startsAt: body.startsAt ? new Date(body.startsAt) : null }
        : {}),
      ...(body.endsAt !== undefined
        ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
        : {}),
    },
  });
  return c.json({ promotion: updated });
});

p3.delete("/promotions/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const promo = await prisma.storePromotion.findFirst({
    where: { id: c.req.param("id"), tenantId: tenant.id },
  });
  if (!promo) return c.json({ error: "Not found" }, 404);
  await prisma.storePromotion.delete({ where: { id: promo.id } });
  return c.json({ ok: true });
});

p3.post("/customers/import.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV required" }, 400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let created = 0;
  for (const line of lines.slice(1)) {
    const [email, name, country] = line.split(",").map((x) => x.trim());
    if (!email?.includes("@")) continue;
    const norm = email.toLowerCase();
    const existing = await prisma.customer.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: norm } },
    });
    if (existing) continue;
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        email: norm,
        name: name || null,
        country: country?.slice(0, 2).toUpperCase() || null,
      },
    });
    created += 1;
  }
  return c.json({ created });
});

p3.post("/orders/import.csv", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV required" }, 400);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let created = 0;
  const currency = tenant.settings?.currency ?? "USD";

  for (const line of lines.slice(1)) {
    const [email, orderNumber, totalStr, country] = line
      .split(",")
      .map((x) => x.trim());
    if (!email?.includes("@") || !orderNumber) continue;

    const exists = await prisma.order.findFirst({
      where: { tenantId: tenant.id, orderNumber },
    });
    if (exists) continue;

    const totalAmount = Math.round(parseFloat(totalStr || "0") * 100);
    let customer = await prisma.customer.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() },
      },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
          country: country?.slice(0, 2).toUpperCase() || null,
        },
      });
    }

    await prisma.order.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        orderNumber,
        status: "PAID",
        currency,
        subtotalAmount: totalAmount,
        totalAmount,
        shippingCountry: country?.slice(0, 2).toUpperCase() || null,
        guestEmail: email.toLowerCase(),
        accessToken: crypto.randomUUID().replace(/-/g, ""),
      },
    });
    created += 1;
  }
  return c.json({ created });
});

/**
 * Store migration: auto-detects Shopify / WooCommerce / Etsy exports.
 * `?dry=1` returns a preview without writing.
 */
p3.post("/import/store", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "CSV required" }, 400);
  const dry = c.req.query("dry") === "1" || form.dry === "1";
  const withImages = form.images !== "0";
  const text = await file.text();
  const { parseStoreImport } = await import("../lib/store-import.js");
  const parsed = parseStoreImport(text);

  if (dry) {
    return c.json({
      source: parsed.source,
      kind: parsed.kind,
      count: parsed.rows.length,
      warnings: parsed.warnings,
      sample: parsed.rows.slice(0, 10),
    });
  }

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  if (parsed.kind === "products") {
    const currency = tenant.settings?.currency ?? "USD";
    const { saveProductImage, downloadRemoteImage } = await import("../lib/uploads.js");
    for (const row of parsed.rows) {
      const slug = normalizeSlug(row.handle) || normalizeSlug(row.title);
      if (!slug) {
        skipped += 1;
        continue;
      }
      const dup = await prisma.product.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
      });
      if (dup) {
        skipped += 1;
        errors.push(`“${row.title}”: slug ${slug} already exists`);
        continue;
      }
      try {
        const product = await prisma.product.create({
          data: {
            tenantId: tenant.id,
            title: row.title.slice(0, 200),
            slug,
            description: row.descriptionHtml,
            type: row.isDigital ? ProductType.DIGITAL : ProductType.PHYSICAL,
            status: row.published ? ProductStatus.ACTIVE : ProductStatus.DRAFT,
            priceAmount: row.priceCents,
            compareAt: row.compareAtCents,
            currency,
            inventory: row.isDigital ? null : row.inventory ?? 0,
            weightGrams: row.weightGrams,
            requiresShipping: !row.isDigital,
            sku: row.sku,
            barcode: row.barcode,
            tags: row.tags.slice(0, 30),
            variants: row.variants.length
              ? {
                  create: row.variants.slice(0, 100).map((v) => ({
                    tenantId: tenant.id,
                    title: v.title.slice(0, 120),
                    sku: v.sku,
                    priceAmount: v.priceCents,
                    inventory: v.inventory,
                    weightGrams: v.weightGrams,
                  })),
                }
              : undefined,
          },
        });
        created += 1;
        if (withImages) {
          let sort = 0;
          for (const url of row.imageUrls.slice(0, 5)) {
            try {
              const dl = await downloadRemoteImage(url);
              const meta = await saveProductImage(tenant.id, product.id, dl);
              await prisma.productImage.create({
                data: {
                  tenantId: tenant.id,
                  productId: product.id,
                  storageKey: meta.storageKey,
                  fileName: meta.fileName,
                  mimeType: meta.mimeType,
                  sortOrder: sort++,
                },
              });
            } catch (e) {
              errors.push(`“${row.title}”: image skipped (${e instanceof Error ? e.message : "download failed"})`);
            }
          }
        }
      } catch (e) {
        skipped += 1;
        errors.push(`“${row.title}”: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
  } else if (parsed.kind === "customers") {
    for (const row of parsed.rows) {
      const existing = await prisma.customer.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: row.email } },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          email: row.email,
          name: row.name,
          country: row.country,
          marketingOptOut: !row.acceptsMarketing,
        },
      });
      created += 1;
    }
  } else {
    const currency = tenant.settings?.currency ?? "USD";
    for (const row of parsed.rows) {
      const exists = await prisma.order.findFirst({
        where: { tenantId: tenant.id, orderNumber: row.orderNumber },
      });
      if (exists) {
        skipped += 1;
        continue;
      }
      let customer = await prisma.customer.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: row.email } },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: { tenantId: tenant.id, email: row.email, country: row.country },
        });
      }
      await prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          orderNumber: row.orderNumber,
          status: row.paid ? "PAID" : "PENDING",
          currency: row.currency ?? currency,
          subtotalAmount: row.totalCents,
          totalAmount: row.totalCents,
          shippingCountry: row.country,
          guestEmail: row.email,
          accessToken: crypto.randomUUID().replace(/-/g, ""),
          tags: [`imported:${parsed.source}`],
          ...(row.createdAt ? { createdAt: row.createdAt } : {}),
        },
      });
      created += 1;
    }
  }

  return c.json({
    source: parsed.source,
    kind: parsed.kind,
    created,
    skipped,
    errors: errors.slice(0, 50),
    warnings: parsed.warnings,
  });
});

export { p3 };
