import { OrderStatus, prisma, ProductStatus } from "@ugclab/database";

export async function createMerchantDraftOrder(
  tenantId: string,
  body: {
    email: string;
    name?: string;
    lines: { productId: string; quantity?: number }[];
    note?: string;
  }
) {
  const email = body.email.trim().toLowerCase();
  if (!email) throw new Error("Customer email is required");
  if (!body.lines?.length) throw new Error("Add at least one line item");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { settings: true },
  });
  if (!tenant) throw new Error("Store not found");

  const productIds = body.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      id: { in: productIds },
      status: { in: [ProductStatus.ACTIVE, ProductStatus.DRAFT] },
    },
  });
  if (products.length !== productIds.length) {
    throw new Error("One or more products not found");
  }

  let subtotal = 0;
  const lineData: {
    productId: string;
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[] = [];

  for (const line of body.lines) {
    const p = products.find((x) => x.id === line.productId)!;
    const qty = Math.max(1, line.quantity ?? 1);
    const unit = p.priceAmount;
    const total = unit * qty;
    subtotal += total;
    lineData.push({
      productId: p.id,
      title: p.title,
      quantity: qty,
      unitAmount: unit,
      totalAmount: total,
    });
  }

  const currency = tenant.settings?.currency ?? "USD";
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const orderNumber = String(
    (lastOrder ? parseInt(lastOrder.orderNumber, 10) : 1000) + 1
  );

  let customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { tenantId, email, name: body.name?.trim() || null },
    });
  }

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      orderNumber,
      status: OrderStatus.DRAFT,
      currency,
      subtotalAmount: subtotal,
      totalAmount: subtotal,
      guestEmail: email,
      shippingName: body.name?.trim() || null,
      items: {
        create: lineData.map((l) => ({
          tenantId,
          productId: l.productId,
          title: l.title,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          totalAmount: l.totalAmount,
        })),
      },
      events: body.note?.trim()
        ? {
            create: {
              tenantId,
              type: "NOTE",
              body: body.note.trim(),
            },
          }
        : undefined,
    },
    include: { customer: true, items: true },
  });

  return order;
}
