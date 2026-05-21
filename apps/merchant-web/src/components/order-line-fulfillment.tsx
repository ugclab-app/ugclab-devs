import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

export function OrderLineFulfillment({
  orderId,
  items,
}: {
  orderId: string;
  items: { id: string; title: string; quantity: number; fulfilledQuantity: number }[];
}) {
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.fulfilledQuantity]))
  );
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  async function save(markFulfilled: boolean) {
    try {
      await api.updateLineFulfillment(
        orderId,
        items.map((i) => ({
          lineId: i.id,
          fulfilledQuantity: qty[i.id] ?? 0,
        })),
        markFulfilled
      );
      await qc.invalidateQueries({ queryKey: ["order", orderId] });
      setAlert({ ok: true, message: "Fulfillment updated" });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Failed" });
    }
  }

  return (
    <section className="admin-card p-6 space-y-4">
      <h2 className="font-semibold">Partial fulfillment</h2>
      <FormAlert ok={alert.ok} message={alert.message} />
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 flex-1 truncate">{i.title}</span>
            <span className="text-zinc-500">/ {i.quantity}</span>
            <input
              type="number"
              min={0}
              max={i.quantity}
              value={qty[i.id] ?? 0}
              onChange={(e) =>
                setQty((prev) => ({
                  ...prev,
                  [i.id]: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-16 rounded border px-2 py-1"
            />
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button type="button" onClick={() => save(false)} className="ugclab-btn border border-zinc-200 bg-white text-sm">
          Save quantities
        </button>
        <button type="button" onClick={() => save(true)} className="ugclab-btn ugclab-btn-primary text-sm">
          Save & mark fulfilled
        </button>
      </div>
    </section>
  );
}
