import { prisma } from "@ugclab/database";
import { BLOCK_CATALOG_SEED } from "../data/block-catalog-seed.js";

export type BlockCatalogRow = {
  id: string;
  label: string;
  description: string | null;
  category: string;
  published: boolean;
  sortOrder: number;
  minPlan: string | null;
  deprecated: boolean;
};

export async function ensureBlockCatalog() {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "StoreBlockCatalog"
  `;
  const count = Number(rows[0]?.count ?? 0);
  if (count > 0) return;

  for (const b of BLOCK_CATALOG_SEED) {
    await prisma.$executeRaw`
      INSERT INTO "StoreBlockCatalog" (id, label, description, category, published, "sortOrder", deprecated)
      VALUES (${b.id}, ${b.label}, ${b.description}, ${b.category}, true, ${b.sortOrder}, false)
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function listBlockCatalogRows(): Promise<BlockCatalogRow[]> {
  return prisma.$queryRaw<BlockCatalogRow[]>`
    SELECT id, label, description, category, published, "sortOrder", "minPlan", deprecated
    FROM "StoreBlockCatalog"
    ORDER BY "sortOrder" ASC, label ASC
  `;
}

export function mapBlockCatalogRow(row: BlockCatalogRow) {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    category: row.category,
    published: row.published,
    sortOrder: row.sortOrder,
    minPlan: row.minPlan,
    deprecated: row.deprecated,
    inCodebase: BLOCK_CATALOG_SEED.some((b) => b.id === row.id),
  };
}

export async function syncBlockCatalogFromSeed() {
  await ensureBlockCatalog();
  for (const b of BLOCK_CATALOG_SEED) {
    await prisma.$executeRaw`
      INSERT INTO "StoreBlockCatalog" (id, label, description, category, published, "sortOrder", deprecated)
      VALUES (${b.id}, ${b.label}, ${b.description}, ${b.category}, true, ${b.sortOrder}, false)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        deprecated = false
    `;
  }
  const seedIds = new Set<string>(BLOCK_CATALOG_SEED.map((b) => b.id));
  const existing = await listBlockCatalogRows();
  for (const row of existing) {
    if (!seedIds.has(row.id)) {
      await prisma.$executeRaw`
        UPDATE "StoreBlockCatalog" SET deprecated = true WHERE id = ${row.id}
      `;
    }
  }
  return listBlockCatalogRows();
}

export async function getPublishedBlockIds(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "StoreBlockCatalog"
    WHERE published = true AND deprecated = false
  `;
  return new Set(rows.map((r) => r.id));
}

export async function updateBlockCatalogRow(
  id: string,
  data: {
    published?: boolean;
    label?: string;
    sortOrder?: number;
    minPlan?: string | null;
    description?: string;
  }
) {
  const rows = await listBlockCatalogRows();
  const current = rows.find((r) => r.id === id);
  if (!current) throw new Error("Block not found");

  await prisma.$executeRaw`
    UPDATE "StoreBlockCatalog"
    SET
      published = ${data.published ?? current.published},
      label = ${data.label ?? current.label},
      "sortOrder" = ${data.sortOrder ?? current.sortOrder},
      "minPlan" = ${data.minPlan !== undefined ? data.minPlan : current.minPlan},
      description = ${data.description ?? current.description}
    WHERE id = ${id}
  `;
  const updated = await listBlockCatalogRows();
  return updated.find((r) => r.id === id)!;
}

export async function bulkSetBlocksPublished(ids: string[], published: boolean) {
  for (const id of ids) {
    await prisma.$executeRaw`
      UPDATE "StoreBlockCatalog" SET published = ${published} WHERE id = ${id}
    `;
  }
}
