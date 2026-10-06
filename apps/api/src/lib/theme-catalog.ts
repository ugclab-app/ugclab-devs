import { prisma } from "@ugclab/database";
import { THEME_CATALOG_SEED, THEME_SEED_BY_ID } from "../data/theme-catalog-seed.js";
import { getStorefrontUrl } from "./storefront.js";

type CatalogRow = {
  id: string;
  label: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  category?: string | null;
  description?: string | null;
  previewUrl?: string | null;
  minPlan?: string | null;
  deprecated?: boolean;
  priceCents?: number;
};

export function getCatalogThemeId(theme: unknown): string | null {
  if (!theme || typeof theme !== "object") return null;
  const o = theme as Record<string, unknown>;
  if (typeof o.catalogThemeId === "string" && o.catalogThemeId) return o.catalogThemeId;
  if (typeof o.presetId === "string" && o.presetId) return o.presetId;
  return null;
}

/** Published, non-deprecated theme ids (raw SQL works before Prisma client regen). */
export async function getPublishedCatalogIds(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "StoreThemeCatalog"
      WHERE published = true AND COALESCE(deprecated, false) = false
    `;
    return new Set(rows.map((r) => r.id));
  } catch {
    const rows = await prisma.storeThemeCatalog.findMany({
      where: { published: true },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}

export async function patchThemeCatalogMeta(
  id: string,
  meta: {
    category?: string;
    description?: string;
    previewUrl?: string | null;
    minPlan?: string | null;
    deprecated?: boolean;
  }
) {
  try {
    if (meta.category !== undefined) {
      await prisma.$executeRaw`
        UPDATE "StoreThemeCatalog" SET category = ${meta.category} WHERE id = ${id}
      `;
    }
    if (meta.description !== undefined) {
      await prisma.$executeRaw`
        UPDATE "StoreThemeCatalog" SET description = ${meta.description} WHERE id = ${id}
      `;
    }
    if (meta.previewUrl !== undefined) {
      await prisma.$executeRaw`
        UPDATE "StoreThemeCatalog" SET "previewUrl" = ${meta.previewUrl} WHERE id = ${id}
      `;
    }
    if (meta.minPlan !== undefined) {
      await prisma.$executeRaw`
        UPDATE "StoreThemeCatalog" SET "minPlan" = ${meta.minPlan} WHERE id = ${id}
      `;
    }
    if (meta.deprecated !== undefined) {
      await prisma.$executeRaw`
        UPDATE "StoreThemeCatalog" SET deprecated = ${meta.deprecated} WHERE id = ${id}
      `;
    }
  } catch (e) {
    console.warn("[theme-catalog] meta patch skipped:", e);
  }
}

export async function ensureThemeCatalog() {
  const count = await prisma.storeThemeCatalog.count();
  if (count === 0) {
    await prisma.storeThemeCatalog.createMany({
      data: THEME_CATALOG_SEED.map((t) => ({
        id: t.id,
        label: t.label,
        featured: t.featured,
        sortOrder: t.sortOrder,
        published: true,
      })),
      skipDuplicates: true,
    });
    for (const t of THEME_CATALOG_SEED) {
      await patchThemeCatalogMeta(t.id, {
        category: t.category,
        description: t.description,
        deprecated: false,
      });
    }
    return;
  }

  // Add any new seed themes without touching existing rows
  const existing = await prisma.storeThemeCatalog.findMany({ select: { id: true } });
  const have = new Set(existing.map((r) => r.id));
  const missing = THEME_CATALOG_SEED.filter((t) => !have.has(t.id));
  if (missing.length === 0) return;

  await prisma.storeThemeCatalog.createMany({
    data: missing.map((t) => ({
      id: t.id,
      label: t.label,
      featured: t.featured,
      sortOrder: t.sortOrder,
      published: true,
    })),
    skipDuplicates: true,
  });
  for (const t of missing) {
    await patchThemeCatalogMeta(t.id, {
      category: t.category,
      description: t.description,
      deprecated: false,
    });
  }
}

export function mapThemeCatalogRow(row: CatalogRow) {
  const seed = THEME_SEED_BY_ID.get(row.id);
  const deprecated = row.deprecated ?? !THEME_SEED_BY_ID.has(row.id);
  return {
    id: row.id,
    label: row.label,
    published: row.published,
    featured: row.featured,
    sortOrder: row.sortOrder,
    category: row.category ?? seed?.category ?? "minimal",
    description: row.description ?? seed?.description ?? "",
    previewUrl: row.previewUrl ?? null,
    minPlan: row.minPlan ?? null,
    priceCents: row.priceCents ?? 0,
    deprecated,
    preview: seed?.preview ?? {
      primary: "#18181b",
      secondary: "#71717a",
      background: "#ffffff",
    },
    inCodebase: Boolean(seed),
  };
}

export async function loadThemeCatalogRows() {
  try {
    return await prisma.$queryRaw<CatalogRow[]>`
      SELECT id, label, published, featured, "sortOrder",
        category, description, "previewUrl", "minPlan", deprecated, "priceCents"
      FROM "StoreThemeCatalog"
      ORDER BY "sortOrder" ASC, label ASC
    `;
  } catch {
    const rows = await prisma.storeThemeCatalog.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return rows as CatalogRow[];
  }
}

export async function syncThemeCatalogFromSeed() {
  await ensureThemeCatalog();
  const existing = await loadThemeCatalogRows();
  const seedIds = new Set(THEME_CATALOG_SEED.map((t) => t.id));

  for (const entry of THEME_CATALOG_SEED) {
    await prisma.storeThemeCatalog.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        label: entry.label,
        featured: entry.featured,
        sortOrder: entry.sortOrder,
        published: true,
      },
      update: {
        label: entry.label,
        featured: entry.featured,
        sortOrder: entry.sortOrder,
      },
    });
    await patchThemeCatalogMeta(entry.id, {
      category: entry.category,
      description: entry.description,
      deprecated: false,
    });
  }

  for (const row of existing) {
    if (!seedIds.has(row.id)) {
      await patchThemeCatalogMeta(row.id, { deprecated: true });
    }
  }

  return loadThemeCatalogRows();
}

export type ThemeStoreUsage = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  catalogThemeId: string | null;
  publishedThemeId: string | null;
  draftThemeId: string | null;
  hasDraftMismatch: boolean;
  storefrontUrl: string;
  tenantUpdatedAt: string;
};

export async function collectThemeUsage() {
  const settings = await prisma.storeSettings.findMany({
    select: {
      tenantId: true,
      theme: true,
      themeDraft: true,
      tenant: { select: { name: true, slug: true, updatedAt: true, featureFlags: true } },
    },
  });

  const publishedIds = await getPublishedCatalogIds();

  const counts = new Map<string, number>();
  const storesByTheme = new Map<string, ThemeStoreUsage[]>();
  const untracked: ThemeStoreUsage[] = [];
  let custom = 0;
  let draftMismatch = 0;

  for (const s of settings) {
    const publishedThemeId = getCatalogThemeId(s.theme);
    const draftThemeId = getCatalogThemeId(s.themeDraft);
    const catalogThemeId = draftThemeId ?? publishedThemeId;
    const hasDraftMismatch =
      Boolean(draftThemeId && publishedThemeId && draftThemeId !== publishedThemeId);
    if (hasDraftMismatch) draftMismatch += 1;

    const row: ThemeStoreUsage = {
      tenantId: s.tenantId,
      tenantName: s.tenant.name,
      tenantSlug: s.tenant.slug,
      catalogThemeId,
      publishedThemeId,
      draftThemeId,
      hasDraftMismatch,
      storefrontUrl: getStorefrontUrl(s.tenant.slug),
      tenantUpdatedAt: s.tenant.updatedAt.toISOString(),
    };

    if (!catalogThemeId) {
      custom += 1;
      untracked.push(row);
      continue;
    }

    if (!publishedIds.has(catalogThemeId)) {
      untracked.push({ ...row, catalogThemeId });
      continue;
    }

    counts.set(catalogThemeId, (counts.get(catalogThemeId) ?? 0) + 1);
    const list = storesByTheme.get(catalogThemeId) ?? [];
    list.push(row);
    storesByTheme.set(catalogThemeId, list);
  }

  return {
    counts,
    storesByTheme,
    untracked,
    customThemeStores: custom,
    draftMismatchStores: draftMismatch,
    totalStores: settings.length,
  };
}
