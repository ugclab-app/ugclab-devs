import {
  OrderStatus,
  ProductStatus,
  ProductType,
  prisma,
} from "@ugclab/database";
import { getMerchantPaymentMetrics } from "./payment-metrics.js";
import { resolvePlatformFeeBps } from "./platform-fee.js";

export type DayRevenue = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getDashboardMetrics(
  tenantId: string,
  rangeDays: 7 | 30,
  feeBps = 500
) {
  const now = new Date();
  const start = startOfDay(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  const dayStart = startOfDay(now);

  const [ordersToday, paidOrders, products, pendingOrders, lowStockCount, allPaidInRange, recentOrders] =
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
      prisma.order.count({
        where: { tenantId, status: OrderStatus.PENDING },
      }),
      prisma.product.count({
        where: {
          tenantId,
          type: ProductType.PHYSICAL,
          status: ProductStatus.ACTIVE,
          inventory: { not: null, lte: 5 },
        },
      }),
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
    buckets.push({
      date: d.toISOString().slice(0, 10),
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

  const paidToday = await prisma.order.aggregate({
    where: {
      tenantId,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      createdAt: { gte: dayStart },
    },
    _sum: { totalAmount: true, platformFeeAmount: true },
  });

  const paymentRange = await getMerchantPaymentMetrics(tenantId, start);

  return {
    ordersToday,
    revenueToday: paidToday._sum.totalAmount ?? 0,
    totalRevenue: paidOrders._sum.totalAmount ?? 0,
    paidOrderCount: paidOrders._count,
    pendingOrders,
    lowStockCount,
    productCount: products,
    rangeRevenue: buckets.reduce((s, b) => s + b.revenue, 0),
    rangeOrders: buckets.reduce((s, b) => s + b.orders, 0),
    chartData: buckets,
    recentOrders,
    gmv: paymentRange.gmv,
    platformFees: paymentRange.platformFees,
    netPayout: paymentRange.netPayout,
    platformFeeBps: feeBps,
  };
}
