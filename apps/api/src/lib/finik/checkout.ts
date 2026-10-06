import { prisma } from "@ugclab/database";
import type { PreparedOrder } from "../store-place-order.js";
import { createFinikPayment, newFinikPaymentId } from "./client.js";
import { getFinikAccountId, getFinikQrName } from "./config.js";

export { newFinikPaymentId };

function finikLang(locale: string): "ky" | "ru" | "en" {
  const l = locale.toLowerCase().slice(0, 2);
  if (l === "ky" || l === "ru" || l === "en") return l;
  return "ru";
}

export async function createFinikCheckout(
  prepared: PreparedOrder,
  orderId: string,
  locale: string
): Promise<{ checkoutUrl: string; paymentId: string }> {
  const paymentId = newFinikPaymentId();
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const successUrl = new URL(`${base}/orders/${orderId}`);
  successUrl.searchParams.set("tenant", prepared.tenantSlug);
  successUrl.searchParams.set("locale", locale);
  successUrl.searchParams.set("token", prepared.accessToken);
  successUrl.searchParams.set("paid", "1");

  const apiBase =
    process.env.API_PUBLIC_URL ?? process.env.API_URL ?? "http://localhost:4000";
  const webhookUrl = `${apiBase.replace(/\/$/, "")}/api/finik/webhook`;

  // Store amounts are minor units (tyiyn); Finik Amount is soms.
  const amountMajor = prepared.totalAmount / 100;

  const { paymentUrl } = await createFinikPayment({
    paymentId,
    amountMajor,
    redirectUrl: successUrl.toString(),
    webhookUrl,
    accountId: getFinikAccountId(),
    nameEn: getFinikQrName(),
    description: `Order #${prepared.orderNumber}`,
    lang: finikLang(locale),
    additionalData: [
      {
        fieldId: "orderId",
        name: "Order ID",
        value: orderId,
        isHidden: true,
      },
      {
        fieldId: "orderNumber",
        name: "Order number",
        value: prepared.orderNumber,
        isHidden: true,
      },
    ],
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProvider: "finik",
      finikPaymentId: paymentId,
    },
  });

  return { checkoutUrl: paymentUrl, paymentId };
}
