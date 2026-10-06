import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type ShipmentLine = {
  id: string;
  quantity: number;
  orderLineItemId: string;
  orderLineItem?: { id: string; title: string; quantity: number } | null;
};

type Shipment = {
  id: string;
  status: string;
  trackingNumber: string | null;
  labelUrl: string | null;
  warehouse: { id: string; name: string } | null;
  lines: ShipmentLine[];
};

type PreviewGroup = {
  warehouseId: string | null;
  warehouseName: string;
  lines: {
    orderLineItemId: string;
    title: string;
    quantity: number;
    stockOk: boolean;
  }[];
};

export function OrderShipmentsPanel({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["order-fulfillments", orderId],
    queryFn: () => api.listFulfillments(orderId),
  });

  const { data: preview, refetch: refetchPreview } = useQuery({
    queryKey: ["order-fulfillment-preview", orderId],
    queryFn: () => api.fulfillmentPreview(orderId),
  });

  const shipments = (data?.shipments ?? []) as Shipment[];
  const groups = (preview?.groups ?? []) as PreviewGroup[];
  const shipped = shipments.filter((s) => s.status === "SHIPPED").length;
  const packed = shipments.filter((s) => s.status === "PACKED").length;
  const total = shipments.length;
  const progressPct = total === 0 ? 0 : Math.round((shipped / total) * 100);

  async function refreshAll() {
    await refetch();
    await refetchPreview();
    await qc.invalidateQueries({ queryKey: ["order", orderId] });
  }

  return (
    <section className="admin-card p-6 text-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Warehouse shipments</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Preview routing, split into per-warehouse packages, then pack & ship with tracking.
          </p>
        </div>
        {total > 0 ? (
          <span className="text-xs font-medium text-zinc-600">
            {shipped}/{total} shipped · {packed} packed
          </span>
        ) : null}
      </div>

      {total > 0 ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">{progressPct}% complete</p>
        </div>
      ) : null}

      {shipments.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium text-zinc-700">Routing preview</p>
          {groups.length === 0 ? (
            <p className="text-xs text-zinc-500">No physical lines to fulfill.</p>
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <li key={g.warehouseId ?? "unassigned"} className="text-xs">
                  <p className="font-medium text-zinc-800">{g.warehouseName}</p>
                  <ul className="mt-1 space-y-0.5 text-zinc-600">
                    {g.lines.map((l) => (
                      <li key={l.orderLineItemId} className="flex justify-between gap-2">
                        <span>
                          {l.title} × {l.quantity}
                        </span>
                        {!l.stockOk ? (
                          <span className="text-amber-700">Low stock</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-zinc-400">
            Use “Split fulfillments” above to create these packages.
          </p>
        </div>
      ) : (
        shipments.map((s) => (
          <div key={s.id} className="rounded-lg border border-zinc-100 px-3 py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {s.warehouse?.name ?? "Unassigned"}{" "}
                <span className="text-xs font-normal uppercase text-zinc-500">
                  {s.status}
                </span>
              </p>
              <span className="text-xs text-zinc-400">
                {s.lines.length} line{s.lines.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-0.5 text-xs text-zinc-600">
              {s.lines.map((l) => (
                <li key={l.id}>
                  {l.orderLineItem?.title ?? l.orderLineItemId.slice(0, 8)} × {l.quantity}
                </li>
              ))}
            </ul>
            {s.trackingNumber ? (
              <p className="font-mono text-xs text-zinc-600">
                Tracking: {s.trackingNumber}
              </p>
            ) : null}
            {s.status !== "SHIPPED" && s.status !== "CANCELLED" ? (
              <div className="flex flex-wrap gap-2">
                {s.status === "OPEN" ? (
                  <button
                    type="button"
                    disabled={busy === s.id}
                    className="ugclab-btn border border-zinc-200 bg-white text-xs disabled:opacity-50"
                    onClick={async () => {
                      setBusy(s.id);
                      try {
                        await api.patchFulfillment(s.id, { status: "PACKED" });
                        await refreshAll();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Update failed");
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Mark packed
                  </button>
                ) : null}
                <input
                  className="ugclab-input flex-1 min-w-[10rem] text-xs"
                  placeholder="Tracking number"
                  value={tracking[s.id] ?? ""}
                  onChange={(e) =>
                    setTracking((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  disabled={busy === s.id}
                  className="ugclab-btn ugclab-btn-primary text-xs disabled:opacity-50"
                  onClick={async () => {
                    setBusy(s.id);
                    try {
                      await api.patchFulfillment(s.id, {
                        status: "SHIPPED",
                        trackingNumber: tracking[s.id]?.trim() || undefined,
                      });
                      await refreshAll();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Update failed");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === s.id ? "…" : "Mark shipped"}
                </button>
                <button
                  type="button"
                  disabled={busy === s.id}
                  className="ugclab-btn border border-red-100 bg-white text-xs text-red-700 disabled:opacity-50"
                  onClick={async () => {
                    if (!confirm("Cancel this shipment?")) return;
                    setBusy(s.id);
                    try {
                      await api.patchFulfillment(s.id, { status: "CANCELLED" });
                      await refreshAll();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Update failed");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </section>
  );
}
