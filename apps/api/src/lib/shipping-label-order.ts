import { prisma } from "@ugclab/database";
import { createShippoLabel, isShippoConfigured } from "./shippo.js";

export async function createShippingLabelForOrder(orderId: string, tenantId: string) {
  if (!isShippoConfigured()) {
    throw new Error("Shippo is not configured (SHIPPO_API_KEY)");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, tenant: true },
  });
  if (!order) throw new Error("Order not found");
  if (!order.shippingAddress1 || !order.shippingCity || !order.shippingCountry) {
    throw new Error("Order has no shipping address");
  }

  const weightGrams = order.items.reduce((s, i) => s + i.quantity * 200, 200);
  const label = await createShippoLabel({
    from: {
      name: order.tenant.name,
      street1: "1 Warehouse St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
    },
    to: {
      name: order.shippingName?.trim() || "Customer",
      street1: order.shippingAddress1,
      street2: order.shippingAddress2 ?? undefined,
      city: order.shippingCity,
      zip: order.shippingPostal ?? "00000",
      country: (order.shippingCountry ?? "US").slice(0, 2).toUpperCase(),
    },
    weightGrams,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: label.trackingNumber || order.trackingNumber,
      shippedAt: order.shippedAt ?? new Date(),
    },
  });

  return label;
}
