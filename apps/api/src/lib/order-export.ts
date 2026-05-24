import type { Order, Customer, OrderLineItem } from "@ugclab/database";
import { merchantNetFromOrder } from "./merchant-balance.js";

type OrderExportRow = Order & {
  customer: Customer | null;
  items: OrderLineItem[];
};

export function ordersToAccountingCsv(orders: OrderExportRow[]): string {
  const header = [
    "orderNumber",
    "status",
    "createdAt",
    "customerEmail",
    "customerName",
    "currency",
    "subtotal",
    "shipping",
    "tax",
    "discount",
    "total",
    "platformFee",
    "merchantNet",
    "shippingCountry",
    "shippingCity",
    "shippingPostal",
    "trackingNumber",
    "shippedAt",
    "stripePaymentId",
    "lineItems",
  ].join(",");

  const rows = orders.map((o) => {
    const email = o.customer?.email ?? o.guestEmail ?? "";
    const net = merchantNetFromOrder(o.totalAmount, o.platformFeeAmount);
    const lines = o.items
      .map((i) => `${i.title} x${i.quantity}`)
      .join("; ");
    return [
      o.orderNumber,
      o.status,
      o.createdAt.toISOString(),
      email,
      o.customer?.name ?? o.shippingName ?? "",
      o.currency,
      (o.subtotalAmount / 100).toFixed(2),
      (o.shippingAmount / 100).toFixed(2),
      (o.taxAmount / 100).toFixed(2),
      (o.discountAmount / 100).toFixed(2),
      (o.totalAmount / 100).toFixed(2),
      (o.platformFeeAmount / 100).toFixed(2),
      (net / 100).toFixed(2),
      o.shippingCountry ?? "",
      o.shippingCity ?? "",
      o.shippingPostal ?? "",
      o.trackingNumber ?? "",
      o.shippedAt?.toISOString() ?? "",
      o.stripePaymentId ?? "",
      lines,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [header, ...rows].join("\n");
}
