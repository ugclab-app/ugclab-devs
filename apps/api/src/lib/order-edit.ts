import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import { calcTax, resolveShipping } from "./checkout.js";
import { canEditOrder } from "./inventory.js";

export async function recalculateOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { type: true } } } },
      tenant: { include: { settings: true } },
    },
  });
  if (!order) throw new Error("Order not found");

  const subtotal = order.items.reduce((s, i) => s + i.totalAmount, 0);
  const discountAmount = Math.min(order.discountAmount, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const hasPhysical =
    order.items.some((i) => i.product?.type === ProductType.PHYSICAL) ||
    Boolean(order.shippingAddress1);

  const country = order.shippingCountry ?? "US";
  const shippingQuote = order.shippingAddress1
    ? await resolveShipping(order.tenantId, country, afterDiscount, 0)
    : { amount: 0, label: null };

  const settings = order.tenant.settings;
  const taxAmount = calcTax(
    afterDiscount + shippingQuote.amount,
    settings?.taxRateBps ?? 0,
    settings?.taxIncluded ?? false
  );
  const giftCardAmount = Math.min(
    order.giftCardAmount,
    afterDiscount + shippingQuote.amount + taxAmount
  );
  const totalAmount =
    afterDiscount + shippingQuote.amount + taxAmount - giftCardAmount;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      subtotalAmount: subtotal,
      shippingAmount: shippingQuote.amount,
      taxAmount,
      giftCardAmount,
      totalAmount: Math.max(0, totalAmount),
    },
  });
}

export async function editOrderShipping(
  orderId: string,
  tenantId: string,
  body: Record<string, unknown>,
  authorEmail?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) throw new Error("Order not found");
  if (!canEditOrder(order.status)) {
    throw new Error("Order cannot be edited in this status");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingName: body.shippingName != null ? String(body.shippingName) : order.shippingName,
      shippingAddress1:
        body.shippingAddress1 != null
          ? String(body.shippingAddress1)
          : order.shippingAddress1,
      shippingAddress2:
        body.shippingAddress2 != null
          ? String(body.shippingAddress2)
          : order.shippingAddress2,
      shippingCity:
        body.shippingCity != null ? String(body.shippingCity) : order.shippingCity,
      shippingPostal:
        body.shippingPostal != null
          ? String(body.shippingPostal)
          : order.shippingPostal,
      shippingCountry:
        body.shippingCountry != null
          ? String(body.shippingCountry).slice(0, 2).toUpperCase()
          : order.shippingCountry,
    },
  });

  await recalculateOrderTotals(orderId);
  await prisma.orderEvent.create({
    data: {
      tenantId,
      orderId,
      type: "EDIT",
      body: "Shipping address updated",
      authorEmail,
    },
  });
  return updated;
}

export async function addOrderLine(
  orderId: string,
  tenantId: string,
  body: { productId: string; variantId?: string; quantity?: number },
  authorEmail?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!order) throw new Error("Order not found");
  if (!canEditOrder(order.status)) {
    throw new Error("Order cannot be edited in this status");
  }

  const qty = Math.max(1, body.quantity ?? 1);
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId, status: ProductStatus.ACTIVE },
    include: { variants: true },
  });
  if (!product) throw new Error("Product not found");

  const variant = body.variantId
    ? product.variants.find((v) => v.id === body.variantId)
    : null;
  const unit = variant?.priceAmount ?? product.priceAmount;
  const title = variant ? `${product.title} — ${variant.title}` : product.title;

  await prisma.orderLineItem.create({
    data: {
      tenantId,
      orderId,
      productId: product.id,
      variantId: variant?.id ?? null,
      title,
      quantity: qty,
      unitAmount: unit,
      totalAmount: unit * qty,
    },
  });

  await recalculateOrderTotals(orderId);
  if (product.type === ProductType.PHYSICAL && order.status === OrderStatus.PENDING) {
    const { reserveInventoryForOrder } = await import("./inventory.js");
    await reserveInventoryForOrder(orderId).catch(() => {});
  }

  await prisma.orderEvent.create({
    data: {
      tenantId,
      orderId,
      type: "EDIT",
      body: `Added line: ${title} × ${qty}`,
      authorEmail,
    },
  });
}

export async function removeOrderLine(
  orderId: string,
  tenantId: string,
  lineId: string,
  authorEmail?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");
  if (!canEditOrder(order.status)) {
    throw new Error("Order cannot be edited in this status");
  }
  if (order.items.length <= 1) {
    throw new Error("Order must have at least one line");
  }

  const line = order.items.find((i) => i.id === lineId);
  if (!line) throw new Error("Line not found");

  await prisma.orderLineItem.delete({ where: { id: lineId } });
  await recalculateOrderTotals(orderId);
  await prisma.orderEvent.create({
    data: {
      tenantId,
      orderId,
      type: "EDIT",
      body: `Removed line: ${line.title}`,
      authorEmail,
    },
  });
}
