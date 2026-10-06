import { formatMoney } from "@ugclab/i18n";

export type OrderDoc = {
  orderNumber: string;
  status: string;
  currency: string;
  createdAt: Date;
  tenantName: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessAddress?: string | null;
  taxId?: string | null;
  taxLegalName?: string | null;
  refundUrl?: string | null;
  customerEmail: string | null;
  customerName: string | null;
  shippingName?: string | null;
  shippingAddress1?: string | null;
  shippingAddress2?: string | null;
  shippingCity?: string | null;
  shippingPostal?: string | null;
  shippingCountry: string | null;
  billingName?: string | null;
  billingAddress1?: string | null;
  billingAddress2?: string | null;
  billingCity?: string | null;
  billingPostal?: string | null;
  billingCountry?: string | null;
  paymentProvider?: string | null;
  paymentId?: string | null;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount?: number;
  platformFeeAmount?: number;
  totalAmount: number;
  items: {
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
};

function money(amount: number, currency: string): string {
  const formatted = formatMoney(amount, currency);
  const code = currency.toUpperCase();
  if (formatted.includes(code)) return formatted;
  return `${code} ${formatted}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
    case "DRAFT":
      return "Unpaid — payment due";
    case "PAID":
      return "Paid";
    case "FULFILLED":
      return "Paid · Fulfilled";
    case "REFUNDED":
      return "Refunded";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatAddress(parts: {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal?: string | null;
  country?: string | null;
}): string {
  const lines = [
    parts.name,
    parts.line1,
    parts.line2,
    [parts.city, parts.postal].filter(Boolean).join(" "),
    parts.country,
  ].filter((x) => Boolean(x && String(x).trim()));
  if (!lines.length) return "—";
  return lines.map((l) => esc(String(l))).join("<br/>");
}

function dueDateFor(status: string, createdAt: Date): string | null {
  if (status !== "PENDING" && status !== "DRAFT") return null;
  const due = new Date(createdAt);
  due.setDate(due.getDate() + 7);
  return due.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function renderOrderHtml(
  order: OrderDoc,
  kind: "invoice" | "packing",
  opts?: { includePlatformFee?: boolean }
) {
  const title = kind === "invoice" ? "Invoice" : "Packing slip";
  const cur = order.currency;
  const rows = order.items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7">${esc(i.title)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:center">${i.quantity}</td>
      ${
        kind === "invoice"
          ? `<td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:right">${money(i.totalAmount, cur)}</td>`
          : ""
      }
    </tr>`
    )
    .join("");

  const shipHtml = formatAddress({
    name: order.shippingName ?? order.customerName,
    line1: order.shippingAddress1,
    line2: order.shippingAddress2,
    city: order.shippingCity,
    postal: order.shippingPostal,
    country: order.shippingCountry,
  });

  const hasBilling = Boolean(
    order.billingAddress1 || order.billingCity || order.billingCountry
  );
  const billHtml = hasBilling
    ? formatAddress({
        name: order.billingName ?? order.customerName,
        line1: order.billingAddress1,
        line2: order.billingAddress2,
        city: order.billingCity,
        postal: order.billingPostal,
        country: order.billingCountry,
      })
    : null;

  const due = dueDateFor(order.status, order.createdAt);
  const discount = order.discountAmount ?? 0;
  const showFee =
    opts?.includePlatformFee === true && (order.platformFeeAmount ?? 0) > 0;

  const sellerBits = [
    order.contactEmail ? esc(order.contactEmail) : null,
    order.contactPhone ? esc(order.contactPhone) : null,
    order.businessAddress
      ? esc(order.businessAddress).replace(/\n/g, "<br/>")
      : null,
    order.taxId
      ? `Tax ID: ${esc(order.taxId)}${
          order.taxLegalName ? ` (${esc(order.taxLegalName)})` : ""
        }`
      : null,
  ].filter(Boolean);

  const totals =
    kind === "invoice"
      ? `
    <table style="margin-top:20px;margin-left:auto;width:280px;font-size:14px">
      <tr><td style="padding:4px 0;color:#52525b">Subtotal</td><td style="padding:4px 0;text-align:right">${money(order.subtotalAmount, cur)}</td></tr>
      ${
        discount > 0
          ? `<tr><td style="padding:4px 0;color:#16a34a">Discount</td><td style="padding:4px 0;text-align:right;color:#16a34a">−${money(discount, cur)}</td></tr>`
          : ""
      }
      <tr><td style="padding:4px 0;color:#52525b">Shipping</td><td style="padding:4px 0;text-align:right">${money(order.shippingAmount, cur)}</td></tr>
      <tr><td style="padding:4px 0;color:#52525b">Tax</td><td style="padding:4px 0;text-align:right">${money(order.taxAmount, cur)}</td></tr>
      ${
        showFee
          ? `<tr><td style="padding:4px 0;color:#52525b">Platform fee</td><td style="padding:4px 0;text-align:right">${money(order.platformFeeAmount ?? 0, cur)}</td></tr>`
          : ""
      }
      <tr><td style="padding:10px 0 0;border-top:2px solid #18181b;font-size:18px"><strong>Total (${esc(cur.toUpperCase())})</strong></td><td style="padding:10px 0 0;border-top:2px solid #18181b;text-align:right;font-size:18px"><strong>${money(order.totalAmount, cur)}</strong></td></tr>
    </table>`
      : "";

  const paymentBlock =
    kind === "invoice"
      ? `
    <div style="margin-top:20px;padding:12px 14px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:14px">
      <p style="margin:0"><strong>Payment status:</strong> ${esc(paymentStatusLabel(order.status))}</p>
      ${due ? `<p style="margin:6px 0 0"><strong>Due date:</strong> ${esc(due)}</p>` : ""}
      ${
        order.paymentProvider || order.paymentId
          ? `<p style="margin:6px 0 0"><strong>Method:</strong> ${esc(order.paymentProvider ?? "—")}${
              order.paymentId
                ? ` · <span style="font-family:ui-monospace,monospace;font-size:12px">${esc(order.paymentId)}</span>`
                : ""
            }</p>`
          : unpaidHint(order.status)
      }
    </div>`
      : "";

  const footer =
    kind === "invoice"
      ? `
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;color:#71717a">
      <p style="margin:0 0 8px">Thank you for your business.</p>
      ${
        order.refundUrl
          ? `<p style="margin:0"><a href="${esc(order.refundUrl)}" style="color:#7c3aed">Refund policy</a></p>`
          : ""
      }
    </div>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${esc(title)} #${esc(order.orderNumber)}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#18181b;line-height:1.45}
  @media print{body{margin:16px;padding:0} .no-print{display:none}}
</style>
</head><body>
<header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:28px">
  <div>
    ${
      order.logoUrl
        ? `<img src="${esc(order.logoUrl)}" alt="" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:12px"/>`
        : ""
    }
    <h1 style="margin:0;font-size:28px">${esc(title)}</h1>
    <p style="margin:8px 0 0;font-size:16px"><strong>${esc(order.tenantName)}</strong></p>
    ${
      sellerBits.length
        ? `<p style="margin:8px 0 0;font-size:13px;color:#52525b">${sellerBits.join("<br/>")}</p>`
        : `<p style="margin:8px 0 0;font-size:12px;color:#a1a1aa">Seller contact not set in store settings</p>`
    }
  </div>
  <div style="text-align:right;font-size:14px">
    <p style="margin:0;font-size:18px"><strong>#${esc(order.orderNumber)}</strong></p>
    <p style="margin:6px 0 0;color:#52525b">${esc(order.createdAt.toLocaleString("en-US"))}</p>
    <p style="margin:6px 0 0">${esc(cur.toUpperCase())}</p>
  </div>
</header>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;font-size:14px">
  <div>
    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#71717a">Ship to</p>
    <p style="margin:0">${shipHtml}</p>
    ${
      order.customerEmail
        ? `<p style="margin:8px 0 0;color:#52525b">${esc(order.customerEmail)}</p>`
        : ""
    }
  </div>
  <div>
    <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#71717a">Bill to</p>
    <p style="margin:0">${billHtml ?? shipHtml}</p>
    ${
      !hasBilling
        ? `<p style="margin:6px 0 0;font-size:12px;color:#a1a1aa">Same as shipping</p>`
        : ""
    }
  </div>
</div>

${paymentBlock}

<table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:14px">
<thead><tr style="background:#f4f4f5;text-align:left">
<th style="padding:10px 8px">Item</th><th style="padding:10px 8px;text-align:center">Qty</th>
${kind === "invoice" ? '<th style="padding:10px 8px;text-align:right">Amount</th>' : ""}
</tr></thead><tbody>${rows}</tbody></table>
${totals}
${footer}
<script>window.onload=()=>window.print()</script>
</body></html>`;
}

function unpaidHint(status: string): string {
  if (status === "PENDING" || status === "DRAFT") {
    return `<p style="margin:6px 0 0;color:#b45309">No payment recorded yet.</p>`;
  }
  return "";
}

/** Map a Prisma order + settings into OrderDoc. */
export function orderToDoc(order: {
  orderNumber: string;
  status: string;
  currency: string;
  createdAt: Date;
  guestEmail?: string | null;
  shippingName?: string | null;
  shippingAddress1?: string | null;
  shippingAddress2?: string | null;
  shippingCity?: string | null;
  shippingPostal?: string | null;
  shippingCountry?: string | null;
  paymentProvider?: string | null;
  stripePaymentId?: string | null;
  finikPaymentId?: string | null;
  gopayPaymentId?: string | null;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount?: number;
  platformFeeAmount?: number;
  totalAmount: number;
  customer?: { email: string | null; name: string | null } | null;
  items: {
    title: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }[];
  tenant: {
    name: string;
    settings?: {
      logoUrl?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      businessAddress?: string | null;
      refundUrl?: string | null;
      taxFormId?: string | null;
      taxFormLegalName?: string | null;
      taxFormType?: string | null;
    } | null;
  };
}): OrderDoc {
  const s = order.tenant.settings;
  const paymentId =
    order.stripePaymentId || order.finikPaymentId || order.gopayPaymentId || null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    createdAt: order.createdAt,
    tenantName: order.tenant.name,
    logoUrl: s?.logoUrl ?? null,
    contactEmail: s?.contactEmail ?? null,
    contactPhone: s?.contactPhone ?? null,
    businessAddress: s?.businessAddress ?? null,
    taxId: s?.taxFormId ?? null,
    taxLegalName: s?.taxFormLegalName ?? null,
    refundUrl: s?.refundUrl ?? null,
    customerEmail: order.customer?.email ?? order.guestEmail ?? null,
    customerName: order.customer?.name ?? order.shippingName ?? null,
    shippingName: order.shippingName ?? order.customer?.name ?? null,
    shippingAddress1: order.shippingAddress1 ?? null,
    shippingAddress2: order.shippingAddress2 ?? null,
    shippingCity: order.shippingCity ?? null,
    shippingPostal: order.shippingPostal ?? null,
    shippingCountry: order.shippingCountry ?? null,
    paymentProvider: order.paymentProvider ?? null,
    paymentId,
    subtotalAmount: order.subtotalAmount,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    discountAmount: order.discountAmount ?? 0,
    platformFeeAmount: order.platformFeeAmount ?? 0,
    totalAmount: order.totalAmount,
    items: order.items,
  };
}
