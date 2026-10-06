type CatalogItem = {
  priceAmount: number;
  inventory: number | null;
  type: string;
};

export function parseMajorToCents(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function filterCatalog<T extends CatalogItem>(
  items: T[],
  opts: { minCents: number | null; maxCents: number | null; inStock: boolean }
): T[] {
  return items.filter((item) => {
    if (opts.minCents != null && item.priceAmount < opts.minCents) return false;
    if (opts.maxCents != null && item.priceAmount > opts.maxCents) return false;
    if (
      opts.inStock &&
      item.type === "PHYSICAL" &&
      item.inventory != null &&
      item.inventory <= 0
    ) {
      return false;
    }
    return true;
  });
}

export function paginate<T>(items: T[], pageRaw: string | undefined, sizeRaw?: string) {
  const total = items.length;
  if (!pageRaw) {
    return { items, total, page: 1, pageSize: total || 1 };
  }
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const pageSize = Math.min(48, Math.max(1, parseInt(sizeRaw ?? "12", 10) || 12));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}
