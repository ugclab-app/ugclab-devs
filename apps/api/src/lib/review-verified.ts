import { OrderStatus, prisma } from "@ugclab/database";

/** True if email bought this product (paid / fulfilled order). */
export async function hasVerifiedProductPurchase(
  tenantId: string,
  productId: string,
  email: string | null | undefined
): Promise<boolean> {
  const match = await findVerifiedPurchaseOrder(tenantId, productId, email);
  return Boolean(match);
}

/** Return matching paid order id for verified buyer badge + admin link. */
export async function findVerifiedPurchaseOrder(
  tenantId: string,
  productId: string,
  email: string | null | undefined
): Promise<{ orderId: string } | null> {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  const order = await prisma.order.findFirst({
    where: {
      tenantId,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      items: { some: { productId } },
      OR: [
        { guestEmail: { equals: normalized, mode: "insensitive" } },
        { customer: { email: { equals: normalized, mode: "insensitive" } } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return order ? { orderId: order.id } : null;
}
