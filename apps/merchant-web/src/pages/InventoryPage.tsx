import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { AdminPageShell } from "@/components/admin-page-shell";

export default function InventoryPage() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [scanCode, setScanCode] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "transfers" | "po" | "history">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.inventory(),
  });

  if (isLoading || !data) {
    return (
      <AdminPageShell crumbs={[{ label: "Inventory" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  const warehouses = (data.warehouses ?? []) as Array<Record<string, unknown>>;
  const alerts = (data.alerts ?? []) as Array<Record<string, unknown>>;
  const movements = (data.movements ?? []) as Array<Record<string, unknown>>;
  const transfers = (data.transfers ?? []) as Array<Record<string, unknown>>;
  const purchaseOrders = (data.purchaseOrders ?? []) as Array<Record<string, unknown>>;

  return (
    <AdminPageShell
      crumbs={[{ label: "Inventory" }]}
      title="Inventory"
      actions={
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await api.inventoryLookup(scanCode);
              const p = r.product as { title: string; sku: string | null };
              setScanResult(`${p.title}${p.sku ? ` (${p.sku})` : ""}`);
            } catch {
              setScanResult("Not found");
            }
          }}
        >
          <input
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan barcode / SKU"
            className="ugclab-input w-48 font-mono text-sm"
          />
          <button type="submit" className="ugclab-btn border border-zinc-200 bg-white text-sm">
            Lookup
          </button>
        </form>
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      {scanResult ? (
        <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
          {scanResult}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {(["overview", "transfers", "po", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t === "po" ? "Purchase orders" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="admin-card p-6">
            <h2 className="font-semibold">SKU alerts</h2>
            <ul className="mt-4 divide-y text-sm">
              {alerts.map((a) => (
                <li key={String(a.id)} className="flex justify-between py-2">
                  <span>
                    {(a.product as { title?: string })?.title}
                    {(a.product as { sku?: string })?.sku
                      ? ` · ${(a.product as { sku?: string }).sku}`
                      : ""}
                  </span>
                  <span className="font-medium text-amber-700">
                    {String(a.available)} avail
                  </span>
                </li>
              ))}
              {!alerts.length ? (
                <li className="py-4 text-zinc-500">All SKUs above threshold.</li>
              ) : null}
            </ul>
          </section>

          <section className="admin-card p-6">
            <h2 className="font-semibold">Warehouses</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {warehouses.map((w) => (
                <li key={String(w.id)} className="rounded-lg border border-zinc-100 p-3">
                  <span className="font-medium">{String(w.name)}</span>
                  {w.isDefault ? (
                    <span className="ml-2 text-xs text-violet-600">default</span>
                  ) : null}
                  <p className="mt-1 text-zinc-500">
                    {Array.isArray(w.stock) ? w.stock.length : 0} SKUs tracked
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              Add warehouses in Growth → Warehouses. Stock reserves on new orders.
            </p>
          </section>
        </div>
      )}

      {tab === "transfers" && (
        <div className="mt-6 space-y-6">
          <form
            className="admin-card max-w-lg space-y-3 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const lines = String(fd.get("lines") ?? "")
                .split("\n")
                .map((row) => {
                  const [productId, qty] = row.split(",").map((s) => s.trim());
                  return productId ? { productId, quantity: parseInt(qty ?? "", 10) || 1 } : null;
                })
                .filter(Boolean) as { productId: string; quantity: number }[];
              try {
                await api.createInventoryTransfer({
                  fromWarehouseId: String(fd.get("fromId") ?? ""),
                  toWarehouseId: String(fd.get("toId") ?? ""),
                  lines,
                });
                setAlert({ ok: true, message: "Transfer created" });
                await qc.invalidateQueries({ queryKey: ["inventory"] });
              } catch (err) {
                setAlert({
                  ok: false,
                  message: err instanceof Error ? err.message : "Failed",
                });
              }
            }}
          >
            <h2 className="font-semibold">New transfer</h2>
            <select name="fromId" required className="ugclab-select w-full">
              {warehouses.map((w) => (
                <option key={String(w.id)} value={String(w.id)}>
                  From: {String(w.name)}
                </option>
              ))}
            </select>
            <select name="toId" required className="ugclab-select w-full">
              {warehouses.map((w) => (
                <option key={String(w.id)} value={String(w.id)}>
                  To: {String(w.name)}
                </option>
              ))}
            </select>
            <textarea
              name="lines"
              required
              placeholder="productId, qty per line"
              className="ugclab-input min-h-[80px] w-full font-mono text-xs"
            />
            <button type="submit" className="ugclab-btn-primary text-sm">
              Ship transfer
            </button>
          </form>
          <ul className="divide-y rounded-xl border text-sm">
            {transfers.map((t) => (
              <li key={String(t.id)} className="flex items-center justify-between px-4 py-3">
                <span>
                  {(t.fromWarehouse as { name?: string })?.name} →{" "}
                  {(t.toWarehouse as { name?: string })?.name} · {String(t.status)}
                </span>
                {t.status === "IN_TRANSIT" ? (
                  <button
                    type="button"
                    className="text-violet-700 font-medium"
                    onClick={async () => {
                      await api.receiveInventoryTransfer(String(t.id));
                      setAlert({ ok: true, message: "Received" });
                      await qc.invalidateQueries({ queryKey: ["inventory"] });
                    }}
                  >
                    Receive
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "po" && (
        <div className="mt-6 space-y-6">
          <form
            className="admin-card max-w-lg space-y-3 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const lines = String(fd.get("lines") ?? "")
                .split("\n")
                .map((row) => {
                  const [productId, qty] = row.split(",").map((s) => s.trim());
                  return productId ? { productId, quantity: parseInt(qty ?? "", 10) || 1 } : null;
                })
                .filter(Boolean) as { productId: string; quantity: number }[];
              try {
                await api.createPurchaseOrder({
                  warehouseId: String(fd.get("warehouseId") ?? ""),
                  supplierName: String(fd.get("supplier") ?? ""),
                  lines,
                });
                setAlert({ ok: true, message: "PO created" });
                await qc.invalidateQueries({ queryKey: ["inventory"] });
              } catch (err) {
                setAlert({
                  ok: false,
                  message: err instanceof Error ? err.message : "Failed",
                });
              }
            }}
          >
            <h2 className="font-semibold">Purchase order</h2>
            <input name="supplier" required placeholder="Supplier name" className="ugclab-input w-full" />
            <select name="warehouseId" required className="ugclab-select w-full">
              {warehouses.map((w) => (
                <option key={String(w.id)} value={String(w.id)}>
                  {String(w.name)}
                </option>
              ))}
            </select>
            <textarea
              name="lines"
              required
              placeholder="productId, qty"
              className="ugclab-input min-h-[80px] w-full font-mono text-xs"
            />
            <button type="submit" className="ugclab-btn-primary text-sm">
              Create PO
            </button>
          </form>
          <ul className="divide-y rounded-xl border text-sm">
            {purchaseOrders.map((po) => (
              <li key={String(po.id)} className="flex items-center justify-between px-4 py-3">
                <span>
                  {String(po.supplierName)} · {(po.warehouse as { name?: string })?.name} ·{" "}
                  {String(po.status)}
                </span>
                {po.status === "ORDERED" ? (
                  <button
                    type="button"
                    className="text-violet-700 font-medium"
                    onClick={async () => {
                      await api.receivePurchaseOrder(String(po.id));
                      setAlert({ ok: true, message: "Stock received" });
                      await qc.invalidateQueries({ queryKey: ["inventory"] });
                    }}
                  >
                    Receive
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "history" && (
        <ul className="mt-6 divide-y rounded-xl border bg-white text-sm">
          {movements.map((m) => (
            <li key={String(m.id)} className="px-4 py-3">
              <span className="font-medium">{String(m.type)}</span>
              <span className="text-zinc-500">
                {" "}
                · {(m.product as { title?: string })?.title} · Δ{String(m.quantityDelta)}
              </span>
              <p className="text-xs text-zinc-400">
                {(m.warehouse as { name?: string })?.name} ·{" "}
                {new Date(String(m.createdAt)).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
