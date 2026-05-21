import { OrderStatus, prisma } from "@ugclab/database";

export async function getMerchantAnalytics(tenantId: string, rangeDays: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeDays - 1));

  const paidStatuses = [OrderStatus.PAID, OrderStatus.FULFILLED];

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: paidStatuses },
      createdAt: { gte: start },
    },
    include: { items: true },
  });

  const buckets: Record<string, { revenue: number; orders: number }> = {};
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 };
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].revenue += o.totalAmount;
      buckets[key].orders += 1;
    }
  }

  const revenueByDay = Object.entries(buckets).map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: v.revenue,
    orders: v.orders,
  }));

  const productMap = new Map<
    string,
    { productId: string; title: string; quantity: number; revenue: number }
  >();
  for (const o of orders) {
    for (const item of o.items) {
      if (!item.productId) continue;
      const cur = productMap.get(item.productId) ?? {
        productId: item.productId,
        title: item.title,
        quantity: 0,
        revenue: 0,
      };
      cur.quantity += item.quantity;
      cur.revenue += item.totalAmount;
      productMap.set(item.productId, cur);
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const countryMap = new Map<string, number>();
  for (const o of orders) {
    const cc = o.shippingCountry ?? "—";
    countryMap.set(cc, (countryMap.get(cc) ?? 0) + 1);
  }

  const ordersByCountry = [...countryMap.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  return {
    rangeDays,
    totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    totalOrders: orders.length,
    revenueByDay,
    topProducts,
    ordersByCountry,
  };
}
