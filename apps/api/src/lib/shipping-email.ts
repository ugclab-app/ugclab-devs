import { prisma } from "@ugclab/database";
import { emailCustomerAboutOrder } from "./transactional-email.js";

export async function sendShippingNotification(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { trackingNumber: true },
  });
  if (!order?.trackingNumber) return;
  await emailCustomerAboutOrder(orderId, "shipping", {
    tracking: order.trackingNumber,
  });
}
