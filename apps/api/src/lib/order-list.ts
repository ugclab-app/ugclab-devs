import { ProductType } from "@ugclab/database";
import { merchantNetFromOrder } from "./merchant-balance.js";

function formatLocation(country: string | null, city: string | null): string | null {
  if (!country && !city) return null;
  if (country && city) return `${city}, ${country}`;
  return city ?? country;
}

export function formatOrderItemsLabel(
  itemCount: number,
  hasPhysical: boolean,
  hasDigital: boolean
): string {
  const n = itemCount === 1 ? "1 item" : `${itemCount} items`;
  if (hasPhysical && hasDigital) return `${n} · mixed`;
  if (hasDigital) return `${n} · digital`;
  if (hasPhysical) return `${n} · physical`;
  return n;
}

export function mapOrderListRow(order: {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  platformFeeAmount: number;
  createdAt: Date;
  shippingCountry: string | null;
  shippingCity: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  guestEmail: string | null;
  tags: string[];
  customer: { email: string } | null;
  items: { quantity: number; product: { type: ProductType } | null }[];
}) {
  let hasPhysical = false;
  let hasDigital = false;
  let itemCount = 0;
  for (const line of order.items) {
    itemCount += line.quantity;
    if (line.product?.type === ProductType.PHYSICAL) hasPhysical = true;
    if (line.product?.type === ProductType.DIGITAL) hasDigital = true;
  }
  if (!hasPhysical && !hasDigital && order.shippingCountry) {
    hasPhysical = true;
  }

  const merchantNetCents = merchantNetFromOrder(
    order.totalAmount,
    order.platformFeeAmount
  );

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    platformFeeAmount: order.platformFeeAmount,
    merchantNetCents,
    createdAt: order.createdAt.toISOString(),
    shippingCountry: order.shippingCountry,
    shippingCity: order.shippingCity,
    locationLabel: formatLocation(order.shippingCountry, order.shippingCity),
    trackingNumber: order.trackingNumber,
    tags: order.tags ?? [],
    shippedAt: order.shippedAt?.toISOString() ?? null,
    itemCount,
    hasPhysical,
    hasDigital,
    itemsLabel: formatOrderItemsLabel(itemCount, hasPhysical, hasDigital),
    customer: order.customer
      ? { email: order.customer.email }
      : order.guestEmail
        ? { email: order.guestEmail }
        : null,
  };
}
