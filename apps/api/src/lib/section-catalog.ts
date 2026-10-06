import { prisma } from "@ugclab/database";
import { SECTION_CATALOG_SEED } from "../data/section-catalog-seed.js";

export type SectionCatalogRow = {
  id: string;
  label: string;
  description: string | null;
  category: string;
  published: boolean;
  sortOrder: number;
  blocksJson: unknown;
  deprecated: boolean;
};

export async function ensureSectionCatalog() {
  for (const s of SECTION_CATALOG_SEED) {
    await prisma.$executeRaw`
      INSERT INTO "StoreSectionCatalog" (id, label, description, category, published, "sortOrder", deprecated)
      VALUES (${s.id}, ${s.label}, ${s.description}, ${s.category}, true, ${s.sortOrder}, false)
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function listSectionCatalogRows(): Promise<SectionCatalogRow[]> {
  return prisma.$queryRaw<SectionCatalogRow[]>`
    SELECT id, label, description, category, published, "sortOrder", "blocksJson", deprecated
    FROM "StoreSectionCatalog"
    ORDER BY "sortOrder" ASC, label ASC
  `;
}

export function mapSectionCatalogRow(row: SectionCatalogRow) {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    category: row.category,
    published: row.published,
    sortOrder: row.sortOrder,
    blocksJson: row.blocksJson,
    deprecated: row.deprecated,
    inCodebase: SECTION_CATALOG_SEED.some((s) => s.id === row.id),
  };
}

export async function syncSectionCatalogFromSeed() {
  await ensureSectionCatalog();
  for (const s of SECTION_CATALOG_SEED) {
    await prisma.$executeRaw`
      INSERT INTO "StoreSectionCatalog" (id, label, description, category, published, "sortOrder", deprecated)
      VALUES (${s.id}, ${s.label}, ${s.description}, ${s.category}, true, ${s.sortOrder}, false)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        deprecated = false
    `;
  }
  const seedIds = new Set<string>(SECTION_CATALOG_SEED.map((s) => s.id));
  const existing = await listSectionCatalogRows();
  for (const row of existing) {
    if (!seedIds.has(row.id)) {
      await prisma.$executeRaw`
        UPDATE "StoreSectionCatalog" SET deprecated = true WHERE id = ${row.id}
      `;
    }
  }
  return listSectionCatalogRows();
}

export async function getPublishedSectionIds(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "StoreSectionCatalog"
    WHERE published = true AND deprecated = false
  `;
  if (rows.length === 0) {
    return new Set(SECTION_CATALOG_SEED.map((s) => s.id));
  }
  return new Set(rows.map((r) => r.id));
}

export async function updateSectionCatalogRow(
  id: string,
  patch: {
    published?: boolean;
    label?: string;
    sortOrder?: number;
    description?: string;
  },
) {
  const rows = await listSectionCatalogRows();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error("Section not found");

  const published = patch.published ?? row.published;
  const label = patch.label ?? row.label;
  const sortOrder = patch.sortOrder ?? row.sortOrder;
  const description = patch.description ?? row.description;

  await prisma.$executeRaw`
    UPDATE "StoreSectionCatalog"
    SET published = ${published},
        label = ${label},
        "sortOrder" = ${sortOrder},
        description = ${description}
    WHERE id = ${id}
  `;
  return (await listSectionCatalogRows()).find((r) => r.id === id)!;
}
