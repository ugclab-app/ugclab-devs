import { Hono } from "hono";
import { OrderStatus, prisma, TenantStatus, UserRole } from "@ugclab/database";
import type { AuthEnv } from "../middleware/session.js";
import { requireSuperAdmin } from "../middleware/super-admin.js";
import { getStorefrontUrl } from "../lib/storefront.js";
import { getPlatformPaymentMetrics } from "../lib/payment-metrics.js";

const platform = new Hono<AuthEnv>();
platform.use("*", requireSuperAdmin);

platform.get("/dashboard", async (c) => {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const payment30d = await getPlatformPaymentMetrics(d30);

  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    newTenants7d,
    paidOrders30d,
    gmvAgg,
    gmvPrevAgg,
    totalMerchants,
    recentTenants,
    stripeConnectedCount,
    inactiveStores30d,
    churnedStores30d,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
    prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
    prisma.tenant.count({ where: { createdAt: { gte: d7 } } }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d60, lt: d30 },
      },
      _sum: { totalAmount: true },
    }),
    prisma.user.count({ where: { role: UserRole.MERCHANT } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        owner: { select: { email: true, name: true } },
        subscriptionPlan: { select: { name: true, slug: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.tenant.count({
      where: { stripeAccountId: { not: null }, stripeChargesEnabled: true },
    }),
    prisma.tenant.count({
      where: {
        status: TenantStatus.ACTIVE,
        createdAt: { lt: d30 },
        orders: {
          none: {
            status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
            createdAt: { gte: d30 },
          },
        },
      },
    }),
    prisma.tenant.count({
      where: {
        status: TenantStatus.ACTIVE,
        createdAt: { lt: d30 },
        orders: {
          none: {
            status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
            createdAt: { gte: d60 },
          },
        },
      },
    }),
  ]);

  const gmv30d = gmvAgg._sum.totalAmount ?? 0;
  const gmvPrev30d = gmvPrevAgg._sum.totalAmount ?? 0;
  const gmvGrowthPct =
    gmvPrev30d > 0
      ? Math.round(((gmv30d - gmvPrev30d) / gmvPrev30d) * 100)
      : gmv30d > 0
        ? 100
        : 0;

  return c.json({
    metrics: {
      totalTenants,
      activeTenants,
      suspendedTenants,
      pendingTenants: totalTenants - activeTenants - suspendedTenants,
      newTenants7d,
      paidOrders30d,
      gmv30d,
      gmvPrev30d,
      gmvGrowthPct,
      inactiveStores30d,
      churnedStores30d,
      stripeConnectedCount,
      platformFees30d: payment30d.platformFees,
      mrrCents: payment30d.mrrCents,
      totalMerchants,
    },
    topStoresByGmv: payment30d.byTenant
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 8),
    recentTenants: recentTenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      createdAt: t.createdAt,
      ownerEmail: t.owner.email,
      plan: t.subscriptionPlan?.name ?? "—",
      productCount: t._count.products,
      orderCount: t._count.orders,
      storefrontUrl: getStorefrontUrl(t.slug),
    })),
  });
});

platform.get("/tenants", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const status = c.req.query("status");

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(status && Object.values(TenantStatus).includes(status as TenantStatus)
        ? { status: status as TenantStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { owner: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      subscriptionPlan: { select: { id: true, name: true, slug: true } },
      settings: { select: { currency: true } },
      _count: { select: { products: true, orders: true, customers: true } },
    },
  });

  return c.json({
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      createdAt: t.createdAt,
      owner: t.owner,
      plan: t.subscriptionPlan,
      currency: t.settings?.currency ?? "USD",
      productCount: t._count.products,
      orderCount: t._count.orders,
      customerCount: t._count.customers,
      storefrontUrl: getStorefrontUrl(t.slug),
      merchantAdminUrl: `${process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001"}`,
    })),
  });
});

platform.get("/tenants/:id", async (c) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param("id") },
    include: {
      owner: { select: { id: true, email: true, name: true, createdAt: true } },
      subscriptionPlan: true,
      settings: true,
      customDomains: true,
      _count: { select: { products: true, orders: true, customers: true } },
    },
  });
  if (!tenant) return c.json({ error: "Not found" }, 404);

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [orders30d, gmv] = await Promise.all([
    prisma.order.count({
      where: {
        tenantId: tenant.id,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
        createdAt: { gte: d30 },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const recentOrders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { customer: { select: { email: true } } },
  });

  return c.json({
    tenant: {
      ...tenant,
      storefrontUrl: getStorefrontUrl(tenant.slug),
      stats: {
        orders30d,
        gmv30d: gmv._sum.totalAmount ?? 0,
      },
      recentOrders,
    },
  });
});

platform.patch("/tenants/:id", async (c) => {
  const body = await c.req.json<{ status?: TenantStatus; subscriptionPlanId?: string | null }>();
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!tenant) return c.json({ error: "Not found" }, 404);

  if (body.status && !Object.values(TenantStatus).includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.subscriptionPlanId !== undefined
        ? { subscriptionPlanId: body.subscriptionPlanId }
        : {}),
    },
    include: {
      owner: { select: { email: true, name: true } },
      subscriptionPlan: true,
    },
  });

  return c.json({ tenant: updated });
});

platform.get("/plans", async (c) => {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthly: "asc" },
    include: { _count: { select: { tenants: true } } },
  });
  return c.json({ plans });
});

platform.get("/users", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      country: true,
      createdAt: true,
      _count: { select: { tenants: true } },
    },
  });
  return c.json({ users });
});

export { platform };
