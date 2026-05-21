import { prisma } from "@ugclab/database";
import { sendEmail } from "./email.js";
import { getStorefrontUrl } from "./storefront.js";

export async function sendShippingNotification(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, tenant: true },
  });
  if (!order?.trackingNumber) return;

  const email = order.customer?.email ?? order.guestEmail;
  if (!email) return;

  const storeUrl = getStorefrontUrl(order.tenant.slug);
  const trackUrl = order.accessToken
    ? `${storeUrl}/orders/${order.id}?token=${order.accessToken}`
    : storeUrl;

  await sendEmail({
    to: email,
    subject: `Your order #${order.orderNumber} has shipped`,
    html: `
      <p>Hi${order.shippingName ? ` ${order.shippingName}` : ""},</p>
      <p>Your order <strong>#${order.orderNumber}</strong> is on the way.</p>
      <p>Tracking: <strong>${order.trackingNumber}</strong></p>
      <p><a href="${trackUrl}">View order</a></p>
    `,
  });
}
