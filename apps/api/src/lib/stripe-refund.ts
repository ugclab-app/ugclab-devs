import { OrderStatus, prisma } from "@ugclab/database";
import { getStripe, isStripeConfigured } from "./stripe.js";

export type RefundLineInput = { lineId: string; quantity: number };

/** Refund via platform Stripe account (MoR). Returns Stripe refund id or null if skipped. */
export async function refundOrderInStripe(
  orderId: string,
  opts: { amountCents?: number; lineItems?: RefundLineInput[] } = {}
): Promise<{ refundId: string | null; amountCents: number }> {
  if (!isStripeConfigured()) return { refundId: null, amountCents: 0 };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order?.stripePaymentId) return { refundId: null, amountCents: 0 };

  let amountCents = opts.amountCents;
  if (opts.lineItems?.length) {
    amountCents = 0;
    for (const req of opts.lineItems) {
      const line = order.items.find((i) => i.id === req.lineId);
      if (!line || req.quantity <= 0) continue;
      const qty = Math.min(req.quantity, line.quantity);
      amountCents += Math.round((line.unitAmount * qty));
    }
  }
  if (amountCents == null || amountCents <= 0) {
    amountCents = order.totalAmount;
  }
  amountCents = Math.min(amountCents, order.totalAmount);

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentId,
    amount: amountCents < order.totalAmount ? amountCents : undefined,
    reason: "requested_by_customer",
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
      partial: amountCents < order.totalAmount ? "1" : "0",
    },
  });
  return { refundId: refund.id, amountCents };
}

export async function markOrderRefunded(
  orderId: string,
  opts: {
    reason?: string;
    authorEmail?: string | null;
    stripeNote?: string;
    partial?: boolean;
    refundAmountCents?: number;
  }
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  const partial =
    opts.partial === true &&
    (opts.refundAmountCents ?? 0) > 0 &&
    (opts.refundAmountCents ?? 0) < order.totalAmount;

  if (order.status === OrderStatus.REFUNDED && !partial) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } } },
    });
  }

  const updated = partial
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } } },
      })
    : await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
        include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } } },
      });
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: partial
        ? `Partial refund ${(opts.refundAmountCents ?? 0) / 100} — ${opts.reason?.trim() || opts.stripeNote || ""}`.trim()
        : opts.reason?.trim() || opts.stripeNote || "Order refunded",
      authorEmail: opts.authorEmail ?? null,
      meta: partial
        ? { partial: true, refundAmountCents: opts.refundAmountCents }
        : undefined,
    },
  });

  if (!partial) {
    return updated;
  }
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true, events: { orderBy: { createdAt: "desc" } } },
  });
}
