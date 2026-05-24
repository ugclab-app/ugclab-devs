import { OrderStatus, prisma } from "@ugclab/database";
import { fulfillPaidOrder } from "./fulfill-order.js";
import { getStripe, isStripeConfigured } from "./stripe.js";

/** Reconcile order status from Stripe Checkout / PaymentIntent (webhook fallback). */
export async function syncOrderFromStripe(orderId: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const stripe = getStripe();
  let paid = false;
  let paymentIntentId: string | undefined;

  if (order.stripeCheckoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (session.payment_status === "paid" || session.status === "complete") {
      paid = true;
      paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? undefined;
    }
  }

  if (!paid && order.stripePaymentId) {
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentId);
    if (pi.status === "succeeded") {
      paid = true;
      paymentIntentId = pi.id;
    }
  }

  if (!paid) {
    return {
      synced: false,
      status: order.status,
      message: "Stripe payment not completed yet",
    };
  }

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
    return {
      synced: true,
      status: order.status,
      message: "Already paid",
    };
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new Error(`Cannot sync order in status ${order.status}`);
  }

  const updated = await fulfillPaidOrder(orderId, {
    stripePaymentId: paymentIntentId ?? order.stripePaymentId ?? undefined,
    platformFeeAmount: order.platformFeeAmount,
  });

  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "NOTE",
      body: "Synced as paid from Stripe",
    },
  });

  return {
    synced: true,
    status: updated?.status ?? OrderStatus.PAID,
    message: "Order marked paid from Stripe",
  };
}
