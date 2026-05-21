import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { sendEmail } from "./email.js";

export async function notifyMerchantNewOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      tenant: { include: { owner: true } },
    },
  });
  if (!order?.tenant?.owner?.email) return;

  const adminUrl =
    process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001";
  const total = formatMoney(order.totalAmount, order.currency);
  const itemsList = order.items
    .map((i) => `${i.title} × ${i.quantity}`)
    .join("<br/>");

  await sendEmail({
    to: order.tenant.owner.email,
    subject: `New order #${order.orderNumber} — ${total}`,
    html: `
      <h2>New order received</h2>
      <p><strong>Order:</strong> #${order.orderNumber}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Customer:</strong> ${order.customer?.email ?? "Guest"}</p>
      <p><strong>Total:</strong> ${total}</p>
      <p><strong>Items:</strong><br/>${itemsList}</p>
      <p><a href="${adminUrl}/orders/${order.id}">View in admin →</a></p>
    `,
  });
}
