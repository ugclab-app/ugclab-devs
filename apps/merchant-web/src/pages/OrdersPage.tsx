import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { OrdersToolbar } from "@/components/orders-toolbar";
import { OrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import type { OrderStatus } from "@/lib/database-types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Total high–low" },
  { value: "total-asc", label: "Total low–high" },
];

export default function OrdersPage() {
  const [banner, setBanner] = useState<{ ok?: boolean; message?: string } | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["orders", params.toString()],
    queryFn: () => api.orders(params),
  });

  const orders = (data?.orders ?? []) as {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
    customer?: { email: string } | null;
  }[];

  const paidIds = useMemo(
    () => orders.filter((o) => o.status === "PAID").map((o) => o.id),
    [orders]
  );

  const allVisibleSelected =
    orders.length > 0 && orders.every((o) => selected.has(o.id));
  const someSelected = selected.size > 0;

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(orders.map((o) => o.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkFulfill() {
    const ids = someSelected
      ? [...selected].filter((id) => orders.find((o) => o.id === id)?.status === "PAID")
      : paidIds;
    if (!ids.length) {
      setBanner({ ok: false, message: "No paid orders to fulfill" });
      return;
    }
    try {
      const r = await api.bulkFulfillOrders(ids);
      setBanner({ ok: true, message: `Marked ${r.updated} order(s) as fulfilled` });
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setBanner({
        ok: false,
        message: err instanceof Error ? err.message : "Bulk fulfill failed",
      });
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Orders" }]}
      title="Orders"
      actions={
        <>
          <button
            type="button"
            onClick={() => api.downloadOrdersCsv(params)}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Export CSV
          </button>
          <label className="ugclab-btn cursor-pointer border border-zinc-200 bg-white text-sm">
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const r = await api.importOrdersCsv(file);
                  setBanner({
                    ok: true,
                    message: `Imported ${r.created} order(s)`,
                  });
                  await qc.invalidateQueries({ queryKey: ["orders"] });
                } catch (err) {
                  setBanner({
                    ok: false,
                    message: err instanceof Error ? err.message : "Import failed",
                  });
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            disabled={paidIds.length === 0 && !someSelected}
            onClick={() => bulkFulfill()}
            className="ugclab-btn border border-zinc-200 bg-white text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bulk fulfill {someSelected ? `(${selected.size})` : "paid"}
          </button>
        </>
      }
    >
      <OrdersToolbar sortOptions={SORT_OPTIONS} />

      {banner ? (
        <div className="mt-4">
          <FormAlert ok={banner.ok} message={banner.message} />
        </div>
      ) : null}

      {someSelected ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm">
          <span className="font-medium text-violet-900">
            {selected.size} selected
          </span>
          <button
            type="button"
            className="font-medium text-violet-700 hover:underline"
            onClick={async () => {
              const blob = await api.bulkExportOrders([...selected]);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "orders-export.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export selected
          </button>
          <button
            type="button"
            className="font-medium text-violet-700 hover:underline"
            onClick={() => {
              const id = [...selected][0];
              if (id) window.open(api.packingSlipUrl(id), "_blank");
            }}
          >
            Print packing slip
          </button>
          <button
            type="button"
            className="text-zinc-600 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-zinc-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No orders"
            description="Orders appear after customers complete checkout."
            actionHref="/products"
            actionLabel="Products"
          />
        </div>
      ) : (
        <>
          <p className="mb-3 mt-4 text-sm text-zinc-500">
            {orders.length} order{orders.length === 1 ? "" : "s"}
            {isFetching && !isLoading ? " · updating…" : ""}
          </p>
          <div className="admin-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50/80 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all orders"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className={`transition hover:bg-violet-50/40 ${
                      selected.has(o.id) ? "bg-violet-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        aria-label={`Select order ${o.orderNumber}`}
                        onChange={(e) => toggleOne(o.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-semibold text-violet-600 hover:underline"
                      >
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
                      {o.customer?.email ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums text-zinc-900">
                      {formatMoney(o.totalAmount, data!.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
