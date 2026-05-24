import { formatMoney } from "@ugclab/i18n";

type OrderDoc = {
  orderNumber: string;
  status: string;
  currency: string;
  createdAt: Date;
  tenantName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessAddress?: string | null;
  customerEmail: string | null;
  customerName: string | null;
  shippingCountry: string | null;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: {
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
};

export function renderOrderHtml(
  order: OrderDoc,
  kind: "invoice" | "packing"
) {
  const title = kind === "invoice" ? "Invoice" : "Packing slip";
  const rows = order.items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      ${
        kind === "invoice"
          ? `<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatMoney(i.totalAmount, order.currency)}</td>`
          : ""
      }
    </tr>`
    )
    .join("");

  const totals =
    kind === "invoice"
      ? `
    <p style="margin-top:16px"><strong>Subtotal:</strong> ${formatMoney(order.subtotalAmount, order.currency)}</p>
    <p><strong>Shipping:</strong> ${formatMoney(order.shippingAmount, order.currency)}</p>
    <p><strong>Tax:</strong> ${formatMoney(order.taxAmount, order.currency)}</p>
    <p style="font-size:18px"><strong>Total:</strong> ${formatMoney(order.totalAmount, order.currency)}</p>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title} #${order.orderNumber}</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#18181b}@media print{body{margin:20px}}</style>
</head><body>
<h1>${title}</h1>
<p><strong>${order.tenantName}</strong></p>
${
    order.contactEmail || order.contactPhone || order.businessAddress
      ? `<p style="font-size:14px;color:#52525b;margin-top:8px">
${order.contactEmail ? `${order.contactEmail}<br/>` : ""}
${order.contactPhone ? `${order.contactPhone}<br/>` : ""}
${order.businessAddress ? order.businessAddress.replace(/\n/g, "<br/>") : ""}
</p>`
      : ""
  }
<p>Order #${order.orderNumber} · ${order.status}<br/>
Date: ${order.createdAt.toLocaleString("en-US")}</p>
<p><strong>Ship to:</strong> ${order.customerName ?? "—"}<br/>
${order.customerEmail ?? ""}${order.shippingCountry ? `<br/>${order.shippingCountry}` : ""}</p>
<table style="width:100%;border-collapse:collapse;margin-top:24px">
<thead><tr style="background:#f4f4f5;text-align:left">
<th style="padding:8px">Item</th><th style="padding:8px;text-align:center">Qty</th>
${kind === "invoice" ? '<th style="padding:8px;text-align:right">Amount</th>' : ""}
</tr></thead><tbody>${rows}</tbody></table>
${totals}
<script>window.onload=()=>window.print()</script>
</body></html>`;
}
