import { OrderStatus, prisma, ProductStatus, ProductType } from "@ugclab/database";
import { forecastDaysLeft } from "./stock-forecast-math.js";

export { forecastDaysLeft, type Forecast, type ForecastInput } from "./stock-forecast-math.js";

/** Run-rate forecast for every active physical product that tracks inventory. */
export async function getStockForecast(
  tenantId: string,
  opts: { windowDays?: number; limit?: number } = {}
) {
  const windowDays = Math.min(180, Math.max(7, opts.windowDays ?? 30));
  const since = new Date(Date.now() - windowDays * 86_400_000);

  const [products, sold] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        status: ProductStatus.ACTIVE,
        type: ProductType.PHYSICAL,
        inventory: { not: null },
      },
      select: { id: true, title: true, sku: true, inventory: true, slug: true },
    }),
    prisma.orderLineItem.groupBy({
      by: ["productId"],
      where: {
        tenantId,
        productId: { not: null },
        order: {
          status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
          createdAt: { gte: since },
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  const soldById = new Map<string, number>();
  for (const row of sold) {
    if (row.productId) soldById.set(row.productId, row._sum.quantity ?? 0);
  }

  const now = new Date();
  const rows = products.map((p) => {
    const unitsSold = soldById.get(p.id) ?? 0;
    const f = forecastDaysLeft({ inventory: p.inventory, unitsSold, windowDays }, now);
    return {
      productId: p.id,
      title: p.title,
      sku: p.sku,
      slug: p.slug,
      inventory: p.inventory ?? 0,
      unitsSold,
      dailyRate: Math.round(f.dailyRate * 100) / 100,
      daysLeft: f.daysLeft,
      runOutAt: f.runOutAt?.toISOString() ?? null,
      level: f.level,
      /** Units to order to cover the next window at the same rate. */
      suggestedReorder:
        f.dailyRate > 0 ? Math.max(0, Math.ceil(f.dailyRate * windowDays - (p.inventory ?? 0))) : 0,
    };
  });

  const order = { out: 0, critical: 1, warning: 2, ok: 3, unknown: 4 };
  rows.sort(
    (a, b) =>
      order[a.level] - order[b.level] ||
      (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) ||
      a.title.localeCompare(b.title)
  );

  return {
    windowDays,
    generatedAt: now.toISOString(),
    summary: {
      out: rows.filter((r) => r.level === "out").length,
      critical: rows.filter((r) => r.level === "critical").length,
      warning: rows.filter((r) => r.level === "warning").length,
      tracked: rows.length,
    },
    products: rows.slice(0, opts.limit ?? 200),
  };
}
