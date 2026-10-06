import { prisma } from "@ugclab/database";
import { fulfillPaidOrder } from "../fulfill-order.js";
import { getGoPayWebhookSecret } from "./config.js";
import { verifyGoPaySignature } from "./sign.js";

export type GoPayWebhookPayload = {
  event?: string;
  type?: string;
  data?: {
    payment_id?: string;
    order_id?: string;
    status?: string;
    amount?: string;
  };
  payment_id?: string;
  order_id?: string;
  status?: string;
};

export function verifyGoPayWebhookRequest(
  rawBody: string,
  headers: { nonce?: string; signature?: string }
): boolean {
  const secret = getGoPayWebhookSecret();
  if (!secret) return false;
  const { nonce, signature } = headers;
  if (!nonce || !signature) return false;
  return verifyGoPaySignature(rawBody, nonce, signature, secret);
}

export function parseGoPayWebhookEvent(rawBody: string): GoPayWebhookPayload {
  return JSON.parse(rawBody) as GoPayWebhookPayload;
}

function eventType(payload: GoPayWebhookPayload): string {
  return (payload.event ?? payload.type ?? "").toLowerCase();
}

function extractIds(payload: GoPayWebhookPayload): {
  paymentId?: string;
  orderId?: string;
  status?: string;
} {
  const d = payload.data ?? payload;
  return {
    paymentId: d.payment_id,
    orderId: d.order_id,
    status: (d.status ?? "").toUpperCase(),
  };
}

export async function handleGoPayWebhook(rawBody: string): Promise<void> {
  const payload = parseGoPayWebhookEvent(rawBody);
  const ev = eventType(payload);
  const { paymentId, orderId, status } = extractIds(payload);

  const committed =
    ev.includes("committed") ||
    status === "COMMITTED" ||
    ev === "payment.committed";

  if (!committed) return;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ gopayOrderId: orderId }] : []),
        ...(paymentId ? [{ gopayPaymentId: paymentId }] : []),
      ],
    },
  });
  if (!order) {
    console.warn("[gopay webhook] order not found", { orderId, paymentId });
    return;
  }

  await fulfillPaidOrder(order.id, {
    platformFeeAmount: order.platformFeeAmount,
  });

  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      type: "STATUS_CHANGE",
      body: "Payment received via GoPay",
      meta: { gopayPaymentId: paymentId ?? order.gopayPaymentId },
    },
  });
}
