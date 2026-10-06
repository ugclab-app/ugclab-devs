import { randomBytes } from "node:crypto";
import { prisma } from "@ugclab/database";
import type { PreparedOrder } from "../store-place-order.js";
import { createGoPayPayment } from "./client.js";

export function newGoPayOrderId(): string {
  return randomBytes(12).toString("hex");
}

export async function createGoPayCheckout(
  prepared: PreparedOrder,
  orderId: string,
  gopayOrderId: string,
  locale: string
): Promise<string> {
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const successUrl = new URL(`${base}/orders/${orderId}`);
  successUrl.searchParams.set("tenant", prepared.tenantSlug);
  successUrl.searchParams.set("locale", locale);
  successUrl.searchParams.set("token", prepared.accessToken);
  successUrl.searchParams.set("paid", "1");

  const failureUrl = new URL(`${base}/checkout`);
  failureUrl.searchParams.set("tenant", prepared.tenantSlug);
  failureUrl.searchParams.set("locale", locale);
  failureUrl.searchParams.set("gopay", "failed");

  const apiBase = process.env.API_PUBLIC_URL ?? process.env.API_URL ?? "http://localhost:4000";
  const callbackUrl = `${apiBase.replace(/\/$/, "")}/api/gopay/webhook`;

  const payment = await createGoPayPayment({
    orderId: gopayOrderId,
    amountMinor: prepared.totalAmount,
    description: `Order #${prepared.orderNumber}`,
    successUrl: successUrl.toString(),
    failureUrl: failureUrl.toString(),
    callbackUrl,
    buyerEmail: prepared.email,
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProvider: "gopay",
      gopayPaymentId: payment.payment_id,
      gopayOrderId,
    },
  });

  if (!payment.checkout_url) {
    throw new Error("GoPay did not return checkout_url");
  }
  return payment.checkout_url;
}
