import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import type { OrderStatus } from "@/lib/database-types";

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
  const queryClient = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.updateOrderStatus(orderId, String(fd.get("status")));
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setAlert({ ok: true, message: "Status updated" });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormAlert ok={alert.ok} message={alert.message} />
      <select name="status" defaultValue={currentStatus} className="ugclab-select">
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary w-full py-2.5">
        {pending ? "Updating…" : "Update status"}
      </button>
    </form>
  );
}
