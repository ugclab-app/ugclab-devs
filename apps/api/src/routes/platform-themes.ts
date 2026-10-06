import type { Hono } from "hono";
import { prisma } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { logPlatformAudit } from "../lib/platform-audit.js";
import { getStorefrontUrl } from "../lib/storefront.js";
import {
  collectThemeUsage,
  ensureThemeCatalog,
  loadThemeCatalogRows,
  mapThemeCatalogRow,
  patchThemeCatalogMeta,
  syncThemeCatalogFromSeed,
} from "../lib/theme-catalog.js";
import { parseStoreTheme } from "@ugclab/tenant/store-theme";
import { jsonForPrisma } from "../lib/theme-json.js";

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function registerPlatformThemesRoutes(platform: Hono<AuthEnv>) {
  platform.get("/themes", async (c) => {
    await ensureThemeCatalog();
    const status = c.req.query("status") ?? "all";
    const q = (c.req.query("q") ?? "").trim().toLowerCase();

    const usage = await collectThemeUsage();
    const themes = await loadThemeCatalogRows();

    let rows = themes.map((t) => ({
      ...mapThemeCatalogRow(t),
      storeCount: usage.counts.get(t.id) ?? 0,
    }));

    if (status === "published") rows = rows.filter((t) => t.published);
    else if (status === "unpublished") rows = rows.filter((t) => !t.published);
    else if (status === "featured") rows = rows.filter((t) => t.featured);
    else if (status === "zero") rows = rows.filter((t) => t.storeCount === 0);
    else if (status === "deprecated") rows = rows.filter((t) => t.deprecated);

    if (q) {
      rows = rows.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.label.toLowerCase().includes(q) ||
          (t.category ?? "").toLowerCase().includes(q)
      );
    }

    const mapped = themes.map(mapThemeCatalogRow);
    const published = mapped.filter((t) => t.published && !t.deprecated).length;
    const featured = mapped.filter((t) => t.featured && t.published && !t.deprecated).length;
    const withTheme = [...usage.counts.values()].reduce((a, b) => a + b, 0);

    return c.json({
      summary: {
        total: themes.length,
        published,
        featured,
        storesWithTheme: withTheme,
        customThemeStores: usage.customThemeStores,
        untrackedStores: usage.untracked.length,
        draftMismatchStores: usage.draftMismatchStores,
      },
      themes: rows,
    });
  });

  platform.get("/themes/export.csv", async (c) => {
    await ensureThemeCatalog();
    const usage = await collectThemeUsage();
    const themes = await loadThemeCatalogRows();
    const header = "theme_id,label,stores,published,featured,sort_order,category";
    const rows = themes.map((t) => {
      const m = mapThemeCatalogRow(t);
      return [
        escapeCsv(t.id),
        escapeCsv(t.label),
        String(usage.counts.get(t.id) ?? 0),
        t.published ? "yes" : "no",
        t.featured ? "yes" : "no",
        String(t.sortOrder),
        escapeCsv(m.category),
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="themes.csv"',
      },
    });
  });

  platform.get("/themes/untracked", async (c) => {
    const usage = await collectThemeUsage();
    return c.json({ stores: usage.untracked });
  });

  platform.get("/themes/:id/stores", async (c) => {
    const id = c.req.param("id");
    const usage = await collectThemeUsage();
    return c.json({
      stores: usage.storesByTheme.get(id) ?? [],
    });
  });

  platform.post("/themes/sync", async (c) => {
    const session = c.get("session");
    const synced = await syncThemeCatalogFromSeed();
    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "theme.sync",
      summary: `Synced theme catalog from codebase (${synced.length} themes)`,
    });
    return c.json({
      themes: synced.map(mapThemeCatalogRow),
      count: synced.length,
    });
  });

  platform.post("/themes/bulk", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{
      ids?: string[];
      published?: boolean;
      featured?: boolean;
      clearFeatured?: boolean;
    }>();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return c.json({ error: "ids required" }, 400);

    const data: {
      published?: boolean;
      featured?: boolean;
    } = {};
    if (body.published !== undefined) data.published = body.published;
    if (body.clearFeatured) data.featured = false;
    else if (body.featured !== undefined) data.featured = body.featured;

    if (!Object.keys(data).length) {
      return c.json({ error: "No bulk action specified" }, 400);
    }

    await prisma.storeThemeCatalog.updateMany({
      where: { id: { in: ids } },
      data,
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "theme.bulk",
      summary: `Bulk theme update on ${ids.length} themes`,
      meta: { ids, ...data },
    });

    return c.json({ ok: true, updated: ids.length });
  });

  platform.patch("/themes/:id", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{
      published?: boolean;
      featured?: boolean;
      label?: string;
      sortOrder?: number;
      category?: string;
      description?: string;
      previewUrl?: string | null;
      minPlan?: string | null;
      deprecated?: boolean;
    }>();
    const before = await prisma.storeThemeCatalog.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!before) return c.json({ error: "Not found" }, 404);

    const theme = await prisma.storeThemeCatalog.update({
      where: { id: before.id },
      data: {
        ...(body.published !== undefined ? { published: body.published } : {}),
        ...(body.featured !== undefined ? { featured: body.featured } : {}),
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.sortOrder !== undefined
          ? { sortOrder: Math.floor(body.sortOrder) }
          : {}),
      },
    });

    await patchThemeCatalogMeta(before.id, {
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.previewUrl !== undefined ? { previewUrl: body.previewUrl } : {}),
      ...(body.minPlan !== undefined ? { minPlan: body.minPlan } : {}),
      ...(body.deprecated !== undefined ? { deprecated: body.deprecated } : {}),
    });

    const refreshed = (await loadThemeCatalogRows()).find((t) => t.id === theme.id) ?? theme;

    if (body.published === false && before.published) {
      await logPlatformAudit({
        actorUserId: session.sub,
        actorEmail: session.email,
        action: "theme.unpublish",
        summary: `Unpublished theme ${theme.label}`,
        meta: { themeId: theme.id },
      });
    }

    return c.json({ theme: mapThemeCatalogRow(refreshed) });
  });

  platform.post("/themes/:id/move", async (c) => {
    const body = await c.req.json<{ direction?: "up" | "down" }>();
    const direction = body.direction === "down" ? "down" : "up";
    const current = await prisma.storeThemeCatalog.findUnique({
      where: { id: c.req.param("id") },
    });
    if (!current) return c.json({ error: "Not found" }, 404);

    const neighbors = await prisma.storeThemeCatalog.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    const idx = neighbors.findIndex((t) => t.id === current.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= neighbors.length) {
      return c.json({ theme: mapThemeCatalogRow(current) });
    }
    const other = neighbors[swapIdx]!;
    await prisma.$transaction([
      prisma.storeThemeCatalog.update({
        where: { id: current.id },
        data: { sortOrder: other.sortOrder },
      }),
      prisma.storeThemeCatalog.update({
        where: { id: other.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);

    const theme = await prisma.storeThemeCatalog.findUnique({
      where: { id: current.id },
    });
    return c.json({ theme: mapThemeCatalogRow(theme!) });
  });

  platform.post("/themes/assign", async (c) => {
    const session = c.get("session");
    const body = await c.req.json<{ tenantId?: string; themeId?: string }>();
    const tenantId = String(body.tenantId ?? "").trim();
    const themeId = String(body.themeId ?? "").trim();
    if (!tenantId || !themeId) {
      return c.json({ error: "tenantId and themeId required" }, 400);
    }

    const theme = await prisma.storeThemeCatalog.findUnique({ where: { id: themeId } });
    if (!theme) return c.json({ error: "Theme not found" }, 404);

    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    if (!settings) return c.json({ error: "Store not found" }, 404);

    const parsed = parseStoreTheme(settings.theme ?? {});
    const next = { ...parsed, catalogThemeId: themeId };
    await prisma.storeSettings.update({
      where: { tenantId },
      data: { theme: jsonForPrisma(next) },
    });

    await logPlatformAudit({
      actorUserId: session.sub,
      actorEmail: session.email,
      action: "theme.assign",
      summary: `Assigned catalog theme ${themeId} to tenant ${tenantId}`,
      meta: { tenantId, themeId },
    });

    return c.json({ ok: true });
  });

  /** Legacy usage endpoint — enriched counts */
  platform.get("/themes/usage", async (c) => {
    const usage = await collectThemeUsage();
    return c.json({
      byTheme: [...usage.counts.entries()].map(([themeId, storeCount]) => ({
        themeId,
        storeCount,
      })),
      customThemeStores: usage.customThemeStores,
      draftMismatchStores: usage.draftMismatchStores,
      totalStores: usage.totalStores,
    });
  });
}
