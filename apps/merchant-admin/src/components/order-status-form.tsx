"use client";

import { useActionState } from "react";
import {
  updateOrderStatus,
  type OrderActionState,
} from "@/app/actions/orders";
import { FormAlert } from "@/components/form-alert";
import type { OrderStatus } from "@ugclab/database";

const statuses: OrderStatus[] = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "CANCELLED",
  "REFUNDED",
];

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const bound = updateOrderStatus.bind(null, orderId);
  const [state, action, pending] = useActionState<OrderActionState, FormData>(
    bound,
    { ok: false }
  );

  return (
    <form action={action} className="space-y-3">
      <FormAlert ok={state.ok} message={state.message} />
      <label className="block text-sm font-medium text-zinc-700">
        Order status
      </label>
      <select
        name="status"
        defaultValue={currentStatus}
        className="ugclab-select"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="ugclab-btn ugclab-btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update status"}
      </button>
    </form>
  );
}
