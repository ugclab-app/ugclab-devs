import { Hono } from "hono";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { useOwnerOnlyStripeGuards } from "../middleware/merchant-guards.js";
import { requireTenant } from "../lib/merchant.js";
import {
  SUPPLIER_CATALOG,
  connectSupplier,
  disconnectSupplier,
  importSupplierProduct,
  listSupplierAccounts,
  listSupplierVariants,
  parseSupplierProvider,
  pushSupplierOrders,
  searchSupplierCatalog,
  syncSupplierStock,
  syncSupplierTracking,
  setSupplierMarkup,
} from "../lib/suppliers.js";

const merchantSuppliers = new Hono<AuthEnv>();
merchantSuppliers.use("*", requireAuth);
useOwnerOnlyStripeGuards(merchantSuppliers);

merchantSuppliers.get("/suppliers", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const accounts = await listSupplierAccounts(tenant.id);
  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    catalog: SUPPLIER_CATALOG,
    accounts,
  });
});

merchantSuppliers.post("/suppliers/:provider/connect", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json().catch(() => ({}));
  const apiKey = String((body as { apiKey?: string }).apiKey ?? "");
  try {
    const account = await connectSupplier(tenant.id, provider, apiKey);
    return c.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect.";
    return c.json({ error: message }, 400);
  }
});

merchantSuppliers.delete("/suppliers/:provider", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  await disconnectSupplier(tenant.id, provider);
  return c.json({ ok: true });
});

merchantSuppliers.get("/suppliers/:provider/search", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  try {
    const products = await searchSupplierCatalog(
      tenant.id,
      provider,
      c.req.query("q") ?? "",
      tenant.settings?.currency ?? "USD"
    );
    return c.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return c.json({ error: message }, 400);
  }
});

merchantSuppliers.get("/suppliers/:provider/variants", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  try {
    const variants = await listSupplierVariants(tenant.id, provider, c.req.query("productId") ?? "");
    return c.json({ variants });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load variants.";
    return c.json({ error: message }, 400);
  }
});

merchantSuppliers.post("/suppliers/:provider/import", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json().catch(() => ({}));
  const payload = body as {
    externalProductId?: string;
    externalVariantId?: string;
    title?: string;
    imageUrl?: string | null;
    sku?: string | null;
    costCents?: number | null;
    price?: number;
    variantIds?: string[];
  };
  const externalProductId = String(payload.externalProductId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const price = Number(payload.price);
  if (!externalProductId || !title) return c.json({ error: "Choose a product to import." }, 400);
  if (!Number.isFinite(price) || price <= 0) {
    return c.json({ error: "Enter your selling price in the store currency." }, 400);
  }
  try {
    const product = await importSupplierProduct({
      tenantId: tenant.id,
      provider,
      externalProductId,
      externalVariantId: payload.externalVariantId,
      title,
      imageUrl: payload.imageUrl,
      sku: payload.sku,
      costCents: payload.costCents,
      priceAmountCents: Math.round(price * 100),
      currency: tenant.settings?.currency ?? "USD",
      variantIds: Array.isArray(payload.variantIds) ? payload.variantIds.map(String) : undefined,
    });
    return c.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return c.json({ error: message }, 400);
  }
});

merchantSuppliers.post("/suppliers/sync", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const tracking = await syncSupplierTracking(tenant.id);
  return c.json(tracking);
});

merchantSuppliers.post("/suppliers/stock", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const stock = await syncSupplierStock(tenant.id);
  return c.json(stock);
});

merchantSuppliers.post("/suppliers/:provider/markup", async (c) => {
  const provider = parseSupplierProvider(c.req.param("provider"));
  if (!provider) return c.json({ error: "Unknown supplier." }, 400);
  const { tenant } = await requireTenant(c.get("session"));
  const body = await c.req.json().catch(() => ({}));
  const raw = (body as { percent?: number | string | null }).percent;
  const percent = raw == null || raw === "" ? null : Number(raw);
  if (percent != null && (!Number.isFinite(percent) || percent < 0 || percent > 500)) {
    return c.json({ error: "Markup must be between 0 and 500." }, 400);
  }
  try {
    const account = await setSupplierMarkup(tenant.id, provider, percent);
    return c.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save markup.";
    return c.json({ error: message }, 400);
  }
});

merchantSuppliers.post("/suppliers/orders/:orderId/push", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const orderId = c.req.param("orderId");
  const { prisma } = await import("@ugclab/database");
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!order) return c.json({ error: "Order not found." }, 404);
  await pushSupplierOrders(order.id);
  return c.json({ ok: true });
});

export { merchantSuppliers };
