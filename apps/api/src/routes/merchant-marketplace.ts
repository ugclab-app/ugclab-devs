import { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireAuth } from "../middleware/session.js";
import { requireTenant } from "../lib/merchant.js";
import { ensureThemeCatalog } from "../lib/theme-catalog.js";
import {
  activeAddonIds,
  ensureMarketplace,
  parseGiftWrapConfig,
  reconcileAddonCheckouts,
  startAddonCheckout,
} from "../lib/marketplace.js";

const marketplace = new Hono<AuthEnv>();
marketplace.use("*", requireAuth);

marketplace.get("/marketplace", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  await ensureMarketplace();
  await ensureThemeCatalog();
  await reconcileAddonCheckouts(tenant.id).catch(() => {});
  const [themes, apps, ownedThemes, ownedApps, purchases] = await Promise.all([
    prisma.storeThemeCatalog.findMany({
      where: { published: true, deprecated: false },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.platformApp.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    activeAddonIds(tenant.id, "THEME"),
    activeAddonIds(tenant.id, "APP"),
    prisma.tenantAddon.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const themeNames = new Map(themes.map((t) => [t.id, t.label]));
  const appNames = new Map(apps.map((a) => [a.id, a.name]));
  return c.json({
    themes: themes.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      category: t.category,
      priceCents: t.priceCents,
      owned: t.priceCents <= 0 || ownedThemes.has(t.id),
    })),
    apps: apps.map((a) => ({
      id: a.id,
      name: a.name,
      summary: a.summary,
      description: a.description,
      category: a.category,
      priceCents: a.priceCents,
      interval: a.interval,
      owned: ownedApps.has(a.id),
      config: a.id === "gift-wrap" ? parseGiftWrapConfig(
        purchases.find((p) => p.kind === "APP" && p.itemId === "gift-wrap")?.config
      ) : null,
    })),
    purchases: purchases.map((p) => ({
      id: p.id,
      kind: p.kind,
      itemId: p.itemId,
      name:
        p.kind === "THEME"
          ? themeNames.get(p.itemId) ?? p.itemId
          : appNames.get(p.itemId) ?? p.itemId,
      priceCents: p.priceCents,
      interval: p.interval,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      currentPeriodEnd: p.currentPeriodEnd?.toISOString() ?? null,
    })),
  });
});

marketplace.patch("/marketplace/apps/gift-wrap", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const owned = await prisma.tenantAddon.findUnique({
    where: {
      tenantId_kind_itemId: { tenantId: tenant.id, kind: "APP", itemId: "gift-wrap" },
    },
  });
  if (owned?.status !== "active") return c.json({ error: "Gift wrap is not installed" }, 403);
  const body = await c.req.json<{ priceCents?: number; label?: string; cardEnabled?: boolean }>();
  const config = parseGiftWrapConfig({
    priceCents: body.priceCents,
    label: body.label,
    cardEnabled: body.cardEnabled,
  });
  await prisma.tenantAddon.update({
    where: { id: owned.id },
    data: { config },
  });
  return c.json({ config });
});

marketplace.post("/marketplace/checkout", async (c) => {
  const { tenant, session } = await requireTenant(c.get("session"));
  const body = await c.req.json<{ kind?: string; itemId?: string }>();
  const kind = body.kind === "THEME" ? "THEME" : body.kind === "APP" ? "APP" : null;
  const itemId = String(body.itemId ?? "").trim();
  if (!kind || !itemId) return c.json({ error: "kind and itemId are required" }, 400);
  const owner = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!owner?.email) return c.json({ error: "Owner email required" }, 400);
  try {
    await ensureMarketplace();
    const result = await startAddonCheckout({
      tenantId: tenant.id,
      tenantName: tenant.name,
      ownerEmail: owner.email,
      kind,
      itemId,
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Checkout failed" }, 400);
  }
});

marketplace.delete("/marketplace/apps/:id", async (c) => {
  const { tenant } = await requireTenant(c.get("session"));
  const row = await prisma.tenantAddon.findUnique({
    where: {
      tenantId_kind_itemId: {
        tenantId: tenant.id,
        kind: "APP",
        itemId: c.req.param("id"),
      },
    },
  });
  if (row?.stripeSubscriptionId) {
    const { getStripe, isStripeConfigured } = await import("../lib/stripe.js");
    if (isStripeConfigured()) {
      await getStripe().subscriptions.cancel(row.stripeSubscriptionId).catch(() => {});
    }
  }
  await prisma.tenantAddon.updateMany({
    where: { tenantId: tenant.id, kind: "APP", itemId: c.req.param("id") },
    data: { status: "canceled" },
  });
  return c.json({ ok: true });
});

export { marketplace };
