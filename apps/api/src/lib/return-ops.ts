import { OrderStatus, prisma, ProductType, ReturnStatus } from "@ugclab/database";
import { createShippoLabel, isShippoConfigured } from "./shippo.js";
import {
  markOrderRefunded,
  refundOrderInStripe,
} from "./stripe-refund.js";
import { logInventoryMovement, getDefaultWarehouse } from "./inventory.js";
import { sendStoreEmail } from "./tenant-email.js";
import { newAccessToken } from "./checkout.js";

export async function restockReturnItems(returnId: string, authorEmail?: string) {
  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      items: { include: { orderLineItem: { include: { product: true } } } },
      order: true,
    },
  });
  if (!ret) return;

  const wh =
    (ret.order.pickupWarehouseId
      ? await prisma.warehouse.findUnique({ where: { id: ret.order.pickupWarehouseId } })
      : null) ?? (await getDefaultWarehouse(ret.tenantId));

  for (const item of ret.items) {
    const line = item.orderLineItem;
    const product = line.product;
    if (!product || product.type !== ProductType.PHYSICAL || !line.productId) continue;

    if (line.variantId) {
      await prisma.productVariant.updateMany({
        where: { id: line.variantId, inventory: { not: null } },
        data: { inventory: { increment: item.quantity } },
      });
    }
    await prisma.product.updateMany({
      where: { id: line.productId, inventory: { not: null } },
      data: { inventory: { increment: item.quantity } },
    });

    if (wh) {
      const stock = await prisma.warehouseStock.findFirst({
        where: {
          warehouseId: wh.id,
          productId: line.productId,
          variantId: line.variantId,
        },
      });
      if (stock) {
        await prisma.warehouseStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: item.quantity } },
        });
      } else {
        await prisma.warehouseStock.create({
          data: {
            warehouseId: wh.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: item.quantity,
            reservedQty: 0,
          },
        });
      }
      await logInventoryMovement({
        tenantId: ret.tenantId,
        warehouseId: wh.id,
        productId: line.productId,
        variantId: line.variantId,
        type: "RETURN_RESTOCK",
        quantityDelta: item.quantity,
        referenceType: "return",
        referenceId: ret.id,
        note: `Restock RMA ${ret.rmaCode}`,
        authorEmail,
      });
    }
  }
}

export async function createReturnLabelForRequest(returnId: string) {
  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      order: true,
      items: { include: { orderLineItem: true } },
    },
  });
  if (!ret) throw new Error("Return not found");

  if (!isShippoConfigured()) {
    if (process.env.ALLOW_STUB_RETURN_LABELS === "true") {
      const stub = `https://returns.local/label/${ret.rmaCode}`;
      return prisma.returnRequest.update({
        where: { id: ret.id },
        data: {
          status: ReturnStatus.LABEL_CREATED,
          labelUrl: stub,
          trackingNumber: `RMA-${ret.rmaCode.slice(-6)}`,
        },
      });
    }
    throw new Error(
      "Shipping labels require SHIPPO_API_KEY. Configure Shippo or set ALLOW_STUB_RETURN_LABELS=true for local testing only."
    );
  }

  const wh =
    (ret.order.pickupWarehouseId
      ? await prisma.warehouse.findUnique({ where: { id: ret.order.pickupWarehouseId } })
      : null) ?? (await getDefaultWarehouse(ret.tenantId));

  const tenant = await prisma.tenant.findUnique({ where: { id: ret.tenantId } });
  const weight = Math.max(
    100,
    ret.items.reduce((s, i) => s + i.quantity * 200, 0)
  );

  const label = await createShippoLabel({
    from: {
      name: ret.order.shippingName || "Customer",
      street1: ret.order.shippingAddress1 || "1 Main St",
      street2: ret.order.shippingAddress2 || undefined,
      city: ret.order.shippingCity || "New York",
      zip: ret.order.shippingPostal || "10001",
      country: ret.order.shippingCountry || "US",
      email: ret.order.guestEmail || undefined,
    },
    to: {
      name: tenant?.name || "Store returns",
      street1: wh?.address1 || "1 Warehouse St",
      street2: wh?.address2 || undefined,
      city: wh?.city || "New York",
      zip: wh?.postal || "10001",
      country: wh?.country || "US",
    },
    weightGrams: weight,
  });

  return prisma.returnRequest.update({
    where: { id: ret.id },
    data: {
      status: ReturnStatus.LABEL_CREATED,
      labelUrl: label.labelUrl,
      trackingNumber: label.trackingNumber,
    },
  });
}

export async function refundReturnRequest(
  returnId: string,
  authorEmail?: string,
  amountCents?: number | null
) {
  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: { items: true, order: true },
  });
  if (!ret) throw new Error("Return not found");

  const lineItems = ret.items.map((i) => ({
    lineId: i.orderLineItemId,
    quantity: i.quantity,
  }));
  const { refundId, amountCents: refunded } = await refundOrderInStripe(ret.orderId, {
    amountCents: amountCents ?? undefined,
    lineItems,
  });

  await markOrderRefunded(ret.orderId, {
    reason: `Return ${ret.rmaCode}`,
    authorEmail,
    stripeNote: refundId ? `Stripe refund ${refundId}` : undefined,
    partial: refunded < ret.order.totalAmount,
    refundAmountCents: refunded,
  });

  await restockReturnItems(returnId, authorEmail);

  return prisma.returnRequest.update({
    where: { id: ret.id },
    data: {
      status: ReturnStatus.REFUNDED,
      refundAmountCents: refunded,
    },
  });
}

export async function createExchangeOrder(returnId: string, authorEmail?: string) {
  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      order: { include: { customer: true } },
      items: { include: { orderLineItem: true } },
    },
  });
  if (!ret) throw new Error("Return not found");
  if (!ret.isExchange) throw new Error("Not an exchange return");

  const productId = ret.exchangeProductId;
  if (!productId) throw new Error("No exchange product selected");

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: ret.tenantId },
    include: { variants: true },
  });
  if (!product) throw new Error("Exchange product not found");

  const variant = ret.exchangeVariantId
    ? product.variants.find((v) => v.id === ret.exchangeVariantId)
    : null;
  const unit = variant?.priceAmount ?? product.priceAmount;
  const qty = ret.items.reduce((s, i) => s + i.quantity, 0) || 1;

  const last = await prisma.order.findFirst({
    where: { tenantId: ret.tenantId },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = String((last ? parseInt(last.orderNumber, 10) : 1000) + 1);

  const exchangeOrder = await prisma.order.create({
    data: {
      tenantId: ret.tenantId,
      customerId: ret.order.customerId,
      orderNumber,
      status: OrderStatus.PAID,
      currency: ret.order.currency,
      subtotalAmount: unit * qty,
      shippingAmount: 0,
      taxAmount: 0,
      totalAmount: unit * qty,
      platformFeeAmount: 0,
      shippingCountry: ret.order.shippingCountry,
      shippingName: ret.order.shippingName,
      shippingAddress1: ret.order.shippingAddress1,
      shippingAddress2: ret.order.shippingAddress2,
      shippingCity: ret.order.shippingCity,
      shippingPostal: ret.order.shippingPostal,
      guestEmail: ret.order.guestEmail,
      accessToken: newAccessToken(),
      tags: ["exchange", `rma:${ret.rmaCode}`],
      fulfillmentMethod: ret.order.fulfillmentMethod,
      pickupWarehouseId: ret.order.pickupWarehouseId,
      b2bCompanyId: ret.order.b2bCompanyId,
      items: {
        create: [
          {
            tenantId: ret.tenantId,
            productId: product.id,
            variantId: variant?.id ?? null,
            title: variant ? `${product.title} — ${variant.title}` : product.title,
            quantity: qty,
            unitAmount: unit,
            totalAmount: unit * qty,
          },
        ],
      },
      events: {
        create: {
          tenantId: ret.tenantId,
          type: "STATUS_CHANGE",
          body: `Exchange order for RMA ${ret.rmaCode}${authorEmail ? ` (${authorEmail})` : ""}`,
        },
      },
    },
  });

  await prisma.returnRequest.update({
    where: { id: ret.id },
    data: { status: ReturnStatus.EXCHANGED },
  });

  await restockReturnItems(returnId, authorEmail);

  if (ret.order.guestEmail || ret.order.customer?.email) {
    const email = ret.order.guestEmail || ret.order.customer!.email;
    await sendStoreEmail(ret.tenantId, {
      to: email,
      subject: `Exchange order #${orderNumber}`,
      html: `<p>Your exchange for RMA <strong>${ret.rmaCode}</strong> created order <strong>#${orderNumber}</strong>.</p>`,
      text: `Exchange order #${orderNumber} for RMA ${ret.rmaCode}`,
    }).catch(() => {});
  }

  return exchangeOrder;
}
