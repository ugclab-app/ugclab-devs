import { OrderStatus, prisma } from "@ugclab/database";

export type DayRevenue = { date: string; label: string; revenue: number; orders: number };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getDashboardMetrics(tenantId: string, rangeDays: 7 | 30) {
  const now = new Date();
  const start = startOfDay(now);
  start.setDate(start.getDate() - (rangeDays - 1));

  const dayStart = startOfDay(now);

  const [ordersToday, paidOrders, products, allPaidInRange, recentOrders] =
    await Promise.all([
      prisma.order.count({
        where: { tenantId, createdAt: { gte: dayStart } },
      }),
      prisma.order.aggregate({
        where: { tenantId, status: OrderStatus.PAID },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.product.count({ where: { tenantId } }),
      prisma.order.findMany({
        where: {
          tenantId,
          status: OrderStatus.PAID,
          createdAt: { gte: start },
        },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.order.findMany({
        where: { tenantId },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const buckets: DayRevenue[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      date: key,
      label: formatDayLabel(d),
      revenue: 0,
      orders: 0,
    });
  }

  for (const o of allPaidInRange) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.date === key);
    if (bucket) {
      bucket.revenue += o.totalAmount;
      bucket.orders += 1;
    }
  }

  const rangeRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const rangeOrders = buckets.reduce((s, b) => s + b.orders, 0);

  return {
    ordersToday,
    totalRevenue: paidOrders._sum.totalAmount ?? 0,
    paidOrderCount: paidOrders._count,
    productCount: products,
    rangeRevenue,
    rangeOrders,
    chartData: buckets,
    recentOrders,
  };
}
