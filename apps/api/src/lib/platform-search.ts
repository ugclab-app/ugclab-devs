import { prisma } from "@ugclab/database";

export async function platformGlobalSearch(q: string) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) {
    return { stores: [], orders: [], users: [], domains: [] };
  }

  const [stores, orders, users, domains] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        OR: [
          { slug: { contains: term, mode: "insensitive" } },
          { name: { contains: term, mode: "insensitive" } },
          { owner: { email: { contains: term, mode: "insensitive" } } },
          { stripeBillingCustomerId: term },
          { stripeSubscriptionId: term },
        ],
      },
      take: 15,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: term, mode: "insensitive" } },
          { stripeCheckoutSessionId: { contains: term, mode: "insensitive" } },
          { customer: { email: { contains: term, mode: "insensitive" } } },
        ],
      },
      take: 15,
      select: {
        id: true,
        orderNumber: true,
        tenantId: true,
        totalAmount: true,
        currency: true,
        status: true,
        tenant: { select: { slug: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { email: { contains: term, mode: "insensitive" } },
      take: 10,
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.customDomain.findMany({
      where: { domain: { contains: term, mode: "insensitive" } },
      take: 10,
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    }),
  ]);

  return {
    stores: stores.map((s) => ({
      ...s,
      href: `/tenants/${s.id}`,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tenantId: o.tenantId,
      tenantSlug: o.tenant.slug,
      tenantName: o.tenant.name,
      totalAmount: o.totalAmount,
      currency: o.currency,
      status: o.status,
      href: `/orders?q=${encodeURIComponent(o.orderNumber)}`,
    })),
    users: users.map((u) => ({
      ...u,
      href: `/users/${u.id}`,
    })),
    domains: domains.map((d) => ({
      id: d.id,
      domain: d.domain,
      verified: d.verified,
      tenantId: d.tenant.id,
      tenantSlug: d.tenant.slug,
      href: `/tenants/${d.tenant.id}`,
    })),
  };
}
