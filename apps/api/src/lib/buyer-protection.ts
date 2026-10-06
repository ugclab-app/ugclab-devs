import { OrderStatus, prisma } from "@ugclab/database";
import { captureOrderPayment, voidAuthorizedPayment } from "./payment-capture.js";
import { sendStoreEmail } from "./tenant-email.js";
import { isShippoDelivered } from "./shippo.js";

export const SHIP_DEADLINE_DAYS = 7;
export const AFTER_DELIVERY_DAYS = 3;
export const AFTER_TRACKED_SHIP_DAYS = 7;
export const AFTER_UNTRACKED_SHIP_DAYS = 14;
/** 10% of released protected earnings stays on the platform for disputes. */
export const RESERVE_BPS = 1000;

const DAY = 24 * 60 * 60 * 1000;

type ProtectOrder = {
  buyerProtection: boolean;
  fulfillmentMethod: string;
  shippingCountry: string | null;
  trackingNumber: string | null;
  paymentCaptureStatus: string;
  captureMethod: string;
  status: OrderStatus;
};

export function needsTrackingToCharge(order: ProtectOrder) {
  return (
    order.buyerProtection &&
    order.fulfillmentMethod === "SHIP" &&
    (order.shippingCountry ?? "").toUpperCase() !== "KG"
  );
}

/** Null when the merchant may record this shipment. */
export function shipmentBlockReason(
  order: ProtectOrder,
  tracking: string | null,
  charging: boolean
): string | null {
  if (!charging || !order.buyerProtection) return null;
  if (order.fulfillmentMethod === "SHIP" && needsTrackingToCharge(order)) {
    const track = tracking?.trim() || order.trackingNumber?.trim();
    if (!track) return "Add a tracking number before charging the buyer.";
  }
  if (
    order.captureMethod === "manual" &&
    order.paymentCaptureStatus === "NONE" &&
    order.status === OrderStatus.PENDING
  ) {
    return "The buyer's card is not authorized yet.";
  }
  return null;
}

export async function captureAuthorizedPayment(orderId: string, authorEmail?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (
    order.buyerProtection &&
    order.captureMethod === "manual" &&
    order.paymentCaptureStatus === "AUTHORIZED"
  ) {
    await captureOrderPayment(orderId, authorEmail);
  }
}

export async function confirmBuyerReceived(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: { select: { name: true, ownerId: true } } },
  });
  if (!order) throw new Error("Order not found");
  if (!order.buyerProtection) return order;
  if (order.payoutBlocked) throw new Error("This order is in a refund or dispute");
  if (order.buyerReceivedAt) return order;
  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLED) {
    throw new Error("Order is not paid yet");
  }
  const now = new Date();
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      buyerReceivedAt: now,
      fundsReleasedAt: order.fundsReleasedAt ?? now,
    },
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: "Buyer confirmed the order was received",
    },
  });
  if (!order.fundsReleasedAt) await emailSellerFundsReleased(order.id);
  return updated;
}

function releaseAt(order: {
  buyerReceivedAt: Date | null;
  deliveredAt: Date | null;
  shippedAt: Date | null;
  pickupReadyAt: Date | null;
  trackingNumber: string | null;
  shippingCountry: string | null;
  fulfillmentMethod: string;
}): Date | null {
  if (order.buyerReceivedAt) return order.buyerReceivedAt;
  const handoff = order.shippedAt ?? order.pickupReadyAt;
  if (order.deliveredAt) return new Date(order.deliveredAt.getTime() + AFTER_DELIVERY_DAYS * DAY);
  if (!handoff) return null;
  const kg = (order.shippingCountry ?? "").toUpperCase() === "KG";
  const untracked = order.fulfillmentMethod === "SHIP" && (kg || !order.trackingNumber?.trim());
  const days = untracked ? AFTER_UNTRACKED_SHIP_DAYS : AFTER_TRACKED_SHIP_DAYS;
  if (order.fulfillmentMethod === "PICKUP") {
    return new Date(handoff.getTime() + AFTER_DELIVERY_DAYS * DAY);
  }
  return new Date(handoff.getTime() + days * DAY);
}

export async function emailSellerFundsReleased(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: { select: { name: true, ownerId: true } } },
  });
  if (!order) return;
  const owner = await prisma.user.findUnique({
    where: { id: order.tenant.ownerId },
    select: { email: true },
  });
  if (!owner?.email) return;
  await sendStoreEmail(order.tenantId, {
    to: owner.email,
    subject: `Payout available for order #${order.orderNumber}`,
    html: `<p>Order #${order.orderNumber} at ${order.tenant.name} cleared buyer protection. The amount is now in your available balance.</p>`,
    text: `Order #${order.orderNumber} cleared buyer protection and is in your available balance.`,
    template: "buyer_protection_released",
  }).catch(() => {});
}

export async function emailBuyerReserved(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true } },
      tenant: { select: { name: true } },
    },
  });
  const to = order?.customer?.email || order?.guestEmail;
  if (!order || !to || !order.buyerProtection) return;
  const amount = (order.totalAmount / 100).toFixed(2);
  await sendStoreEmail(order.tenantId, {
    to,
    subject: `Payment reserved for order #${order.orderNumber}`,
    html: `<p>${order.tenant.name} reserved ${amount} ${order.currency} for order #${order.orderNumber}. You are charged when the store ships. If it does not ship within ${SHIP_DEADLINE_DAYS} days, the reservation is released.</p>`,
    text: `${order.tenant.name} reserved ${amount} ${order.currency} for order #${order.orderNumber}. You are charged when the store ships.`,
    template: "buyer_protection_reserved",
  }).catch(() => {});
}

async function alreadyNoted(orderId: string, body: string) {
  const row = await prisma.orderEvent.findFirst({
    where: { orderId, body },
    select: { id: true },
  });
  return Boolean(row);
}

export async function processBuyerProtection() {
  const now = new Date();
  const deadline = new Date(now.getTime() - SHIP_DEADLINE_DAYS * DAY);

  const stale = await prisma.order.findMany({
    where: {
      buyerProtection: true,
      shippedAt: null,
      pickupReadyAt: null,
      status: { in: [OrderStatus.PENDING, OrderStatus.PAID] },
      OR: [
        { authorizedAt: { lt: deadline } },
        { authorizedAt: null, createdAt: { lt: deadline }, status: OrderStatus.PAID },
      ],
    },
    take: 40,
  });

  for (const order of stale) {
    try {
      if (order.paymentCaptureStatus === "AUTHORIZED") {
        await voidAuthorizedPayment(order.id, "buyer-protection");
        continue;
      }
      if (order.status === OrderStatus.PAID && order.stripePaymentId) {
        const { refundOrderInStripe } = await import("./stripe-refund.js");
        const { markOrderRefunded } = await import("./stripe-refund.js");
        await refundOrderInStripe(order.id);
        await markOrderRefunded(order.id, {
          reason: `Not shipped within ${SHIP_DEADLINE_DAYS} days`,
          authorEmail: "buyer-protection",
        });
        continue;
      }
      const note = "Buyer protection: ship this order or refund the buyer";
      if (await alreadyNoted(order.id, note)) continue;
      await prisma.orderEvent.create({
        data: { tenantId: order.tenantId, orderId: order.id, type: "NOTE", body: note },
      });
    } catch (e) {
      console.error("[buyer-protection] expire", order.id, e);
    }
  }

  const waiting = await prisma.order.findMany({
    where: {
      buyerProtection: true,
      payoutBlocked: false,
      fundsReleasedAt: null,
      deliveredAt: null,
      trackingNumber: { not: null },
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
    select: { id: true, trackingNumber: true },
    take: 20,
  });
  for (const order of waiting) {
    if (!order.trackingNumber) continue;
    const delivered = await isShippoDelivered(order.trackingNumber).catch(() => false);
    if (!delivered) continue;
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveredAt: new Date() },
    });
  }

  const held = await prisma.order.findMany({
    where: {
      buyerProtection: true,
      payoutBlocked: false,
      fundsReleasedAt: null,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
    take: 80,
  });
  for (const order of held) {
    const at = releaseAt(order);
    if (!at || at > now) continue;
    await prisma.order.update({
      where: { id: order.id },
      data: { fundsReleasedAt: now },
    });
    await emailSellerFundsReleased(order.id);
  }
}
