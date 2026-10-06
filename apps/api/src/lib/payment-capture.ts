import { OrderStatus, prisma } from "@ugclab/database";
import { getStripe, isStripeConfigured } from "./stripe.js";
import { fulfillPaidOrder } from "./fulfill-order.js";

/** Capture a previously authorized PaymentIntent. */
export async function captureOrderPayment(orderId: string, authorEmail?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.captureMethod !== "manual") {
    throw new Error("Order was not authorized for manual capture");
  }
  if (order.paymentCaptureStatus === "CAPTURED") {
    return order;
  }
  if (!order.stripePaymentId || !isStripeConfigured()) {
    throw new Error("No Stripe payment to capture");
  }

  const stripe = getStripe();
  await stripe.paymentIntents.capture(order.stripePaymentId);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentCaptureStatus: "CAPTURED",
      capturedAt: new Date(),
      paymentHold: false,
    },
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId,
      type: "STATUS_CHANGE",
      body: `Payment captured${authorEmail ? ` by ${authorEmail}` : ""}`,
    },
  });

  if (order.status === OrderStatus.PENDING) {
    await fulfillPaidOrder(orderId, { stripePaymentId: order.stripePaymentId });
  }

  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function voidAuthorizedPayment(orderId: string, authorEmail?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.stripePaymentId || !isStripeConfigured()) {
    throw new Error("No authorized payment");
  }
  const stripe = getStripe();
  await stripe.paymentIntents.cancel(order.stripePaymentId);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CANCELLED,
      paymentCaptureStatus: "VOIDED",
      paymentHold: false,
    },
  });
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId,
      type: "STATUS_CHANGE",
      body: `Authorization voided${authorEmail ? ` by ${authorEmail}` : ""}`,
    },
  });
  const { emailCustomerAboutOrder } = await import("./transactional-email.js");
  emailCustomerAboutOrder(orderId, "orderCancelled", {
    reason: "Payment authorization was cancelled",
  }).catch(() => {});
}
