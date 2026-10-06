import type { Hono } from "hono";
import type { AuthEnv } from "../middleware/session.js";
import {
  bulkSetBlocksPublished,
  ensureBlockCatalog,
  listBlockCatalogRows,
  mapBlockCatalogRow,
  syncBlockCatalogFromSeed,
  updateBlockCatalogRow,
} from "../lib/block-catalog.js";

export function registerPlatformBlocksRoutes(platform: Hono<AuthEnv>) {
  platform.get("/blocks", async (c) => {
    await ensureBlockCatalog();
    const status = c.req.query("status") ?? "all";
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    const blocks = await listBlockCatalogRows();
    let rows = blocks.map(mapBlockCatalogRow);
    if (status === "published") rows = rows.filter((b) => b.published);
    else if (status === "unpublished") rows = rows.filter((b) => !b.published);
    else if (status === "deprecated") rows = rows.filter((b) => b.deprecated);
    if (q) {
      rows = rows.filter(
        (b) =>
          b.id.includes(q) ||
          b.label.toLowerCase().includes(q) ||
          b.category.includes(q)
      );
    }
    return c.json({
      summary: {
        total: blocks.length,
        published: blocks.filter((b) => b.published && !b.deprecated).length,
      },
      blocks: rows,
    });
  });

  platform.post("/blocks/sync", async (c) => {
    const synced = await syncBlockCatalogFromSeed();
    return c.json({ blocks: synced.map(mapBlockCatalogRow), count: synced.length });
  });

  platform.patch("/blocks/:id", async (c) => {
    const body = await c.req.json<{
      published?: boolean;
      label?: string;
      sortOrder?: number;
      minPlan?: string | null;
      description?: string;
    }>();
    const block = await updateBlockCatalogRow(c.req.param("id"), body);
    return c.json({ block: mapBlockCatalogRow(block) });
  });

  platform.post("/blocks/bulk", async (c) => {
    const body = await c.req.json<{ ids?: string[]; published?: boolean }>();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return c.json({ error: "ids required" }, 400);
    await bulkSetBlocksPublished(ids, body.published === true);
    return c.json({ ok: true, updated: ids.length });
  });
}
