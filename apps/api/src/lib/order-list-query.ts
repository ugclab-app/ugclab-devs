import { OrderStatus, Prisma } from "@ugclab/database";

export function buildOrderListWhere(
  tenantId: string,
  query: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    country?: string;
    view?: string;
    tag?: string;
  }
): Prisma.OrderWhereInput {
  const statusParam = query.status;
  const statusFilter =
    statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  const from = query.from;
  const to = query.to;
  const createdAtFilter =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to
            ? {
                lte: new Date(
                  to.length === 10 ? `${to}T23:59:59.999Z` : to
                ),
              }
            : {}),
        }
      : undefined;

  const country = query.country?.trim().toUpperCase().slice(0, 2);
  const q = query.q?.trim() ?? "";

  const base: Prisma.OrderWhereInput = {
    tenantId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(country ? { shippingCountry: country } : {}),
    ...(query.tag?.trim()
      ? { tags: { has: query.tag.trim().toLowerCase() } }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { customer: { email: { contains: q, mode: "insensitive" } } },
            { guestEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (query.view === "paid-unfulfilled") {
    const { status: _drop, ...rest } = base;
    return {
      AND: [
        rest,
        { status: OrderStatus.PAID },
        { OR: [{ trackingNumber: null }, { shippedAt: null }] },
      ],
    };
  }

  return base;
}

export async function summarizeOrders(where: Prisma.OrderWhereInput) {
  const { prisma } = await import("@ugclab/database");
  const agg = await prisma.order.aggregate({
    where,
    _count: true,
    _sum: { totalAmount: true, platformFeeAmount: true },
  });
  return {
    count: agg._count,
    totalCents: agg._sum.totalAmount ?? 0,
    platformFeesCents: agg._sum.platformFeeAmount ?? 0,
  };
}
