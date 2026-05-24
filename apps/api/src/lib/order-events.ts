import { prisma } from "@ugclab/database";

export async function logOrderEmailEvent(
  orderId: string,
  subject: string,
  authorEmail?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { tenantId: true },
  });
  if (!order) return;
  await prisma.orderEvent.create({
    data: {
      tenantId: order.tenantId,
      orderId,
      type: "EMAIL",
      body: subject,
      authorEmail,
    },
  });
}
