import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { sendStoreEmail } from "./tenant-email.js";

export async function sendCustomerOrderReceipt(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      digitalDownloads: true,
      tenant: { include: { settings: true } },
    },
  });
  const to = order?.customer?.email || order?.guestEmail;
  if (!order || !to) return;

  const total = formatMoney(order.totalAmount, order.currency);
  const itemsList = order.items
    .map(
      (i) =>
        `${i.title} × ${i.quantity} — ${formatMoney(i.totalAmount, order.currency)}`
    )
    .join("<br/>");

  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const downloadLinks = order.digitalDownloads
    .map(
      (d) =>
        `<a href="${base}/api/store/download/${d.token}?tenant=${order.tenant.slug}">Download</a>`
    )
    .join("<br/>");

  const vars: Record<string, string> = {
    orderNumber: order.orderNumber,
    storeName: order.tenant.name,
    status: order.status,
    total,
    items: itemsList,
    downloads: downloadLinks,
  };

  const defaultSubject = `Receipt for order #${order.orderNumber} — ${order.tenant.name}`;
  const defaultHtml = `
      <h2>Thank you for your order</h2>
      <p><strong>Store:</strong> ${order.tenant.name}</p>
      <p><strong>Order:</strong> #${order.orderNumber}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong><br/>${itemsList}</p>
      <p><strong>Total:</strong> ${total}</p>
      ${downloadLinks ? `<p><strong>Downloads:</strong><br/>${downloadLinks}</p>` : ""}
    `;

  const subjectTemplate =
    order.tenant.settings?.emailOrderSubject?.trim() || defaultSubject;
  const bodyTemplate =
    order.tenant.settings?.emailOrderBody?.trim() || defaultHtml;

  const subject = subjectTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] ?? ""
  );
  const html = bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] ?? ""
  );

  await sendStoreEmail(order.tenantId, {
    to,
    subject,
    html,
  });

  const { logOrderEmailEvent } = await import("./order-events.js");
  await logOrderEmailEvent(orderId, `Receipt email: ${subject}`);
}
