import type { Hono } from "hono";
import type { AuthEnv } from "../middleware/session.js";
import {
  listSectionCatalogRows,
  mapSectionCatalogRow,
  syncSectionCatalogFromSeed,
  updateSectionCatalogRow,
} from "../lib/section-catalog.js";
import { ensureSectionCatalog } from "../lib/section-catalog.js";

export function registerPlatformSectionsRoutes(platform: Hono<AuthEnv>) {
  platform.get("/sections", async (c) => {
    await ensureSectionCatalog();
    const rows = await listSectionCatalogRows();
    return c.json({
      summary: {
        total: rows.length,
        published: rows.filter((r) => r.published && !r.deprecated).length,
      },
      sections: rows.map(mapSectionCatalogRow),
    });
  });

  platform.post("/sections/sync", async (c) => {
    const synced = await syncSectionCatalogFromSeed();
    return c.json({ sections: synced.map(mapSectionCatalogRow), count: synced.length });
  });

  platform.patch("/sections/:id", async (c) => {
    const body = await c.req.json<{
      published?: boolean;
      label?: string;
      sortOrder?: number;
      description?: string;
      blocksJson?: unknown;
    }>();
    const section = await updateSectionCatalogRow(c.req.param("id"), body);
    return c.json({ section: mapSectionCatalogRow(section) });
  });
}
