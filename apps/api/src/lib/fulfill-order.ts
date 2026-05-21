import {
  OrderStatus,
  prisma,
  ProductType,
} from "@ugclab/database";
import { newDownloadToken } from "./checkout.js";
import { sendCustomerOrderReceipt } from "./order-emails.js";
import { notifyMerchantNewOrder } from "./notifications.js";
import { triggerPostPurchaseEmail } from "./email-automations.js";

/** Mark order paid, decrement stock, create digital downloads, send emails. */
export async function fulfillPaidOrder(
  orderId: string,
  opts: { stripePaymentId?: string; platformFeeAmount?: number } = {}
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
    },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
    return order;
  }
  if (order.status !== OrderStatus.PENDING) {
    throw new Error(`Cannot fulfill order in status ${order.status}`);
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: order.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        ...(opts.stripePaymentId ? { stripePaymentId: opts.stripePaymentId } : {}),
        ...(opts.platformFeeAmount != null
          ? { platformFeeAmount: opts.platformFeeAmount }
          : {}),
      },
    });

    await tx.orderEvent.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "STATUS_CHANGE",
        body: opts.stripePaymentId
          ? "Payment received via Stripe"
          : "Order marked as paid",
      },
    });

    if (order.discountCodeId) {
      await tx.discountCode.update({
        where: { id: order.discountCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    for (const line of order.items) {
      const product = line.product;
      if (!product) continue;
      if (product.type === ProductType.PHYSICAL) {
        if (line.variantId) {
          await tx.productVariant.updateMany({
            where: { id: line.variantId, inventory: { not: null } },
            data: { inventory: { decrement: line.quantity } },
          });
        }
        await tx.product.updateMany({
          where: { id: line.productId!, inventory: { not: null } },
          data: { inventory: { decrement: line.quantity } },
        });
      } else if (product.type === ProductType.DIGITAL && line.productId) {
        const days = settings?.digitalLinkDays ?? 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        await tx.digitalDownload.create({
          data: {
            tenantId: order.tenantId,
            orderId: order.id,
            productId: line.productId,
            token: newDownloadToken(),
            expiresAt,
          },
        });
      }
    }
  });

  try {
    await sendCustomerOrderReceipt(orderId);
    await notifyMerchantNewOrder(orderId);
    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (full?.customer?.email && !full.customer.marketingOptOut) {
      triggerPostPurchaseEmail(
        full.tenantId,
        full.customer.email,
        full.customer.name
      ).catch(console.error);
    }
  } catch {
    /* optional */
  }

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });
}
