"use server";

import { OrderStatus, prisma } from "@ugclab/database";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/merchant";

export type OrderActionState = {
  ok: boolean;
  message?: string;
};

const ALLOWED: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.FULFILLED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

export async function updateOrderStatus(
  orderId: string,
  _prev: OrderActionState,
  formData: FormData
): Promise<OrderActionState> {
  try {
    const { tenant } = await requireTenant();
    const status = String(formData.get("status")) as OrderStatus;

    if (!ALLOWED.includes(status)) {
      return { ok: false, message: "Invalid status" };
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
    });
    if (!order) return { ok: false, message: "Order not found" };

    const wasPending = order.status === "PENDING";
    await prisma.order.update({
      where: { id: order.id },
      data: { status },
    });

    if (wasPending && status === "PAID") {
      const { notifyMerchantNewOrder } = await import("@/lib/notifications");
      notifyMerchantNewOrder(order.id).catch(console.error);
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, message: "Status updated" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to update order",
    };
  }
}
