import { prisma } from "@ugclab/database";
import type Stripe from "stripe";

export async function handleStripeDispute(dispute: Stripe.Dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await prisma.order.findFirst({
    where: { stripePaymentId: paymentIntentId },
  });
  if (!order) return;

  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STRIPE_DISPUTE",
      body: `Stripe dispute: ${dispute.status} — ${dispute.reason ?? "unknown"}`,
      meta: {
        disputeId: dispute.id,
        status: dispute.status,
        amount: dispute.amount,
        currency: dispute.currency,
      },
    },
  });
}
