import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { sendStoreEmail } from "./tenant-email.js";
import { getStorefrontUrl } from "./storefront.js";

export type EmailTemplate = { subject: string; html: string };

export const EMAIL_TEMPLATE_KEYS = [
  "shipping",
  "pickupReady",
  "passwordReset",
  "abandonedCart",
  "orderCancelled",
  "orderRefunded",
  "returnRequested",
  "returnUpdate",
  "reviewRequest",
  "subscriptionStarted",
  "subscriptionRenewed",
  "subscriptionCancelled",
  "subscriptionFailed",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

const DEFAULTS: Record<EmailTemplateKey | "merchantPending" | "merchantPaid" | "merchantRefund" | "merchantReturn" | "merchantDispute", EmailTemplate> = {
  shipping: {
    subject: "Your order #{{orderNumber}} has shipped",
    html: `<p>Hi{{name}},</p><p>Your order <strong>#{{orderNumber}}</strong> from {{storeName}} is on the way.</p><p>Tracking: <strong>{{tracking}}</strong></p><p><a href="{{url}}">View order</a></p>`,
  },
  pickupReady: {
    subject: "Order #{{orderNumber}} is ready for pickup",
    html: `<p>Your order <strong>#{{orderNumber}}</strong> is ready for pickup{{place}}.</p><p>{{address}}</p><p>{{instructions}}</p><p>{{hours}}</p>`,
  },
  passwordReset: {
    subject: "Reset your {{storeName}} password",
    html: `<p>Set a new password for {{storeName}}.</p><p><a href="{{url}}">Reset password</a></p><p>This link expires in one hour.</p>`,
  },
  abandonedCart: {
    subject: "You left items in your cart — {{storeName}}",
    html: `<h2>Complete your order</h2><p>You have items waiting at <strong>{{storeName}}</strong>.</p><p>Cart total: {{total}}</p><p><a href="{{url}}">Return to cart</a></p>`,
  },
  orderCancelled: {
    subject: "Order #{{orderNumber}} was cancelled",
    html: `<p>Your order <strong>#{{orderNumber}}</strong> at {{storeName}} was cancelled.</p><p>{{reason}}</p>`,
  },
  orderRefunded: {
    subject: "Refund for order #{{orderNumber}}",
    html: `<p>{{storeName}} refunded <strong>{{amount}}</strong> on order <strong>#{{orderNumber}}</strong>.</p><p>{{reason}}</p>`,
  },
  returnRequested: {
    subject: "We received return {{rma}}",
    html: `<p>Your return <strong>{{rma}}</strong> for order <strong>#{{orderNumber}}</strong> is in review.</p>`,
  },
  returnUpdate: {
    subject: "Return {{rma}} is {{status}}",
    html: `<p>Return <strong>{{rma}}</strong> for order <strong>#{{orderNumber}}</strong> is now <strong>{{status}}</strong>.</p><p>{{note}}</p>`,
  },
  reviewRequest: {
    subject: "How was your order #{{orderNumber}}?",
    html: `<p>Your order <strong>#{{orderNumber}}</strong> from {{storeName}} is complete.</p><p><a href="{{url}}">Leave a review</a></p>`,
  },
  subscriptionStarted: {
    subject: "Subscription started — {{product}}",
    html: `<p>Your subscription to <strong>{{product}}</strong> at {{storeName}} is active.</p><p>Next renewal: {{renewsAt}}</p>`,
  },
  subscriptionRenewed: {
    subject: "Subscription renewed — {{product}}",
    html: `<p>We renewed your subscription to <strong>{{product}}</strong>.</p><p>Next renewal: {{renewsAt}}</p>`,
  },
  subscriptionCancelled: {
    subject: "Subscription cancelled — {{product}}",
    html: `<p>Your subscription to <strong>{{product}}</strong> at {{storeName}} is cancelled. You will not be charged again.</p>`,
  },
  subscriptionFailed: {
    subject: "Payment failed for {{product}}",
    html: `<p>We could not charge your card for <strong>{{product}}</strong>. Update your payment method to keep access.</p>`,
  },
  merchantPending: {
    subject: "New unpaid order #{{orderNumber}} — {{total}}",
    html: `<h2>Order waiting for payment</h2><p><strong>Order:</strong> #{{orderNumber}}</p><p><strong>Customer:</strong> {{customer}}</p><p><strong>Total:</strong> {{total}}</p><p><strong>Items:</strong><br/>{{items}}</p><p><a href="{{url}}">View in admin</a></p>`,
  },
  merchantPaid: {
    subject: "New order #{{orderNumber}} — {{total}}",
    html: `<h2>New order received</h2><p><strong>Order:</strong> #{{orderNumber}}</p><p><strong>Status:</strong> {{status}}</p><p><strong>Customer:</strong> {{customer}}</p><p><strong>Total:</strong> {{total}}</p><p><strong>Items:</strong><br/>{{items}}</p><p><a href="{{url}}">View in admin</a></p>`,
  },
  merchantRefund: {
    subject: "Refund on order #{{orderNumber}}",
    html: `<p>Order <strong>#{{orderNumber}}</strong> was refunded ({{amount}}).</p><p>{{reason}}</p><p><a href="{{url}}">View in admin</a></p>`,
  },
  merchantReturn: {
    subject: "Return request {{rma}} on order #{{orderNumber}}",
    html: `<p>A customer requested return <strong>{{rma}}</strong> for order <strong>#{{orderNumber}}</strong>.</p><p>{{reason}}</p><p><a href="{{url}}">View in admin</a></p>`,
  },
  merchantDispute: {
    subject: "Payment dispute on order #{{orderNumber}}",
    html: `<p>A card dispute was opened on order <strong>#{{orderNumber}}</strong>.</p><p>Status: {{status}}. Reason: {{reason}}.</p><p><a href="{{url}}">View in admin</a></p>`,
  },
};

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function defaultEmailTemplates(): Record<EmailTemplateKey, EmailTemplate> {
  const out = {} as Record<EmailTemplateKey, EmailTemplate>;
  for (const key of EMAIL_TEMPLATE_KEYS) out[key] = DEFAULTS[key];
  return out;
}

export function sanitizeEmailTemplates(raw: unknown): Record<string, EmailTemplate> | null {
  if (!raw || typeof raw !== "object") return null;
  const allowed = new Set<string>(EMAIL_TEMPLATE_KEYS);
  const out: Record<string, EmailTemplate> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key) || !value || typeof value !== "object") continue;
    const row = value as { subject?: unknown; html?: unknown };
    const subject = String(row.subject ?? "").slice(0, 200);
    const html = String(row.html ?? "").slice(0, 8000);
    if (!subject.trim() && !html.trim()) continue;
    out[key] = { subject, html };
  }
  return out;
}

async function resolveTemplate(tenantId: string, key: string): Promise<EmailTemplate> {
  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
    select: { emailTemplates: true, emailOrderSubject: true, emailOrderBody: true },
  });
  const base = DEFAULTS[key as keyof typeof DEFAULTS] ?? { subject: key, html: "" };
  if (key === "receipt") {
    return {
      subject: settings?.emailOrderSubject?.trim() || "Receipt for order #{{orderNumber}} — {{storeName}}",
      html:
        settings?.emailOrderBody?.trim() ||
        `<h2>Thank you for your order</h2><p><strong>Store:</strong> {{storeName}}</p><p><strong>Order:</strong> #{{orderNumber}}</p><p><strong>Status:</strong> {{status}}</p><p><strong>Items:</strong><br/>{{items}}</p><p><strong>Total:</strong> {{total}}</p>{{downloads}}`,
    };
  }
  const saved = (settings?.emailTemplates ?? null) as Record<string, EmailTemplate> | null;
  const custom = saved?.[key];
  return {
    subject: custom?.subject?.trim() || base.subject,
    html: custom?.html?.trim() || base.html,
  };
}

export async function sendTemplatedStoreEmail(
  tenantId: string,
  key: string,
  to: string,
  vars: Record<string, string>
) {
  const tpl = await resolveTemplate(tenantId, key);
  await sendStoreEmail(tenantId, {
    to,
    subject: fill(tpl.subject, vars),
    html: fill(tpl.html, vars),
    template: key,
  });
}

function adminOrderUrl(orderId: string) {
  const adminUrl =
    process.env.MERCHANT_ADMIN_URL ??
    process.env.MERCHANT_WEB_URL ??
    "http://localhost:3001";
  return `${adminUrl.replace(/\/$/, "")}/orders/${orderId}`;
}

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: true,
      tenant: { include: { owner: true, settings: true } },
    },
  });
}

function orderVars(
  order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>,
  extra: Record<string, string> = {}
) {
  const items = order.items.map((i) => `${i.title} × ${i.quantity}`).join("<br/>");
  return {
    orderNumber: order.orderNumber,
    storeName: order.tenant.name,
    status: order.status,
    total: formatMoney(order.totalAmount, order.currency),
    amount: extra.amount || formatMoney(order.totalAmount, order.currency),
    items,
    customer: order.customer?.email || order.guestEmail || "Guest",
    name: order.shippingName ? ` ${order.shippingName}` : "",
    tracking: order.trackingNumber ?? "",
    url: extra.url || adminOrderUrl(order.id),
    reason: extra.reason ?? "",
    rma: extra.rma ?? "",
    note: extra.note ?? "",
    place: extra.place ?? "",
    address: extra.address ?? "",
    instructions: extra.instructions ?? "",
    hours: extra.hours ?? "",
    product: extra.product ?? "",
    renewsAt: extra.renewsAt ?? "",
    downloads: extra.downloads ?? "",
    ...extra,
  };
}

export async function emailCustomerAboutOrder(
  orderId: string,
  key: string,
  extra: Record<string, string> = {}
) {
  const order = await loadOrder(orderId);
  if (!order) return;
  const to = order.customer?.email || order.guestEmail;
  if (!to) return;
  const storeUrl = getStorefrontUrl(order.tenant.slug);
  const vars = orderVars(order, {
    url: extra.url || `${storeUrl}/orders/${order.id}${order.accessToken ? `?token=${order.accessToken}` : ""}`,
    ...extra,
  });
  try {
    await sendTemplatedStoreEmail(order.tenantId, key, to, vars);
    const { logOrderEmailEvent } = await import("./order-events.js");
    await logOrderEmailEvent(orderId, `${key} email: ${fill((await resolveTemplate(order.tenantId, key)).subject, vars)}`);
  } catch (e) {
    console.error("[tx-email]", key, e);
  }
}

export async function emailMerchantAboutOrder(
  orderId: string,
  key: "merchantPending" | "merchantPaid" | "merchantRefund" | "merchantReturn" | "merchantDispute",
  extra: Record<string, string> = {}
) {
  const order = await loadOrder(orderId);
  if (!order?.tenant.owner?.email) return;
  if (
    (key === "merchantPending" || key === "merchantPaid") &&
    order.tenant.settings?.notifyNewOrders === false
  ) {
    return;
  }
  const vars = orderVars(order, extra);
  try {
    await sendTemplatedStoreEmail(order.tenantId, key, order.tenant.owner.email, vars);
  } catch (e) {
    console.error("[tx-email]", key, e);
  }
}

export async function sendReviewRequestOnce(orderId: string) {
  const existing = await prisma.orderEvent.findFirst({
    where: { orderId, body: { startsWith: "reviewRequest email" } },
  });
  if (existing) return;
  const order = await loadOrder(orderId);
  if (!order) return;
  const storeUrl = getStorefrontUrl(order.tenant.slug);
  await emailCustomerAboutOrder(orderId, "reviewRequest", {
    url: `${storeUrl}/products`,
  });
}
