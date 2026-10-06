import { prisma } from "@ugclab/database";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "./stripe.js";

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

  const closed = dispute.status === "won" || dispute.status === "warning_closed";
  await prisma.order.update({
    where: { id: order.id },
    data: closed
      ? { payoutBlocked: false }
      : { payoutBlocked: true, fundsReleasedAt: null },
  });

  const priorDisputes = await prisma.orderEvent.count({
    where: { orderId: order.id, type: "STRIPE_DISPUTE" },
  });

  const dueBy =
    dispute.evidence_details?.due_by != null
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null;

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
        reason: dispute.reason ?? null,
        evidenceDueBy: dueBy,
        hasEvidence: Boolean(dispute.evidence?.shipping_documentation || dispute.evidence?.uncategorized_text),
        chargeId:
          typeof dispute.charge === "string"
            ? dispute.charge
            : dispute.charge?.id ?? null,
      },
    },
  });

  if (priorDisputes === 0) {
    const { emailMerchantAboutOrder } = await import("./transactional-email.js");
    emailMerchantAboutOrder(order.id, "merchantDispute", {
      status: dispute.status,
      reason: dispute.reason ?? "",
    }).catch(() => {});
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: order.tenantId },
      select: { name: true },
    });
    const { notifyDispute } = await import("./platform-ops-notify.js");
    await notifyDispute(tenant?.name ?? "Store", order.orderNumber);
  } catch {
    /* optional */
  }
}

export type DisputeEvidenceInput = {
  customerName?: string;
  customerEmailAddress?: string;
  shippingTrackingNumber?: string;
  shippingCarrier?: string;
  shippingDocumentation?: string;
  billingAddress?: string;
  productDescription?: string;
  refundPolicy?: string;
  refundPolicyDisclosure?: string;
  cancellationPolicy?: string;
  uncategorizedText?: string;
  submit?: boolean;
};

export async function submitDisputeEvidence(
  disputeId: string,
  evidence: DisputeEvidenceInput
) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const stripe = getStripe();

  const payload: Stripe.DisputeUpdateParams = {
    evidence: {
      customer_name: evidence.customerName || undefined,
      customer_email_address: evidence.customerEmailAddress || undefined,
      shipping_tracking_number: evidence.shippingTrackingNumber || undefined,
      shipping_carrier: evidence.shippingCarrier || undefined,
      shipping_documentation: evidence.shippingDocumentation || undefined,
      billing_address: evidence.billingAddress || undefined,
      product_description: evidence.productDescription || undefined,
      refund_policy: evidence.refundPolicy || undefined,
      refund_policy_disclosure: evidence.refundPolicyDisclosure || undefined,
      cancellation_policy: evidence.cancellationPolicy || undefined,
      uncategorized_text: evidence.uncategorizedText || undefined,
    },
    submit: evidence.submit === true,
  };

  const updated = await stripe.disputes.update(disputeId, payload);

  const events = await prisma.orderEvent.findMany({
    where: { type: "STRIPE_DISPUTE" },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const matched = events.find((e) => {
    const m = e.meta as { disputeId?: string } | null;
    return m?.disputeId === disputeId;
  });

  if (matched) {
    const prev =
      matched.meta && typeof matched.meta === "object"
        ? (matched.meta as Record<string, unknown>)
        : {};
    await prisma.orderEvent.update({
      where: { id: matched.id },
      data: {
        body: `Stripe dispute: ${updated.status} — evidence ${
          evidence.submit ? "submitted" : "saved"
        }`,
        meta: {
          ...prev,
          status: updated.status,
          evidenceSubmitted: evidence.submit === true,
          evidenceUpdatedAt: new Date().toISOString(),
        },
      },
    });
  }

  return updated;
}
