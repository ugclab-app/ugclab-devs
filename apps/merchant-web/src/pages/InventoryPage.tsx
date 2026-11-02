import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type InventoryForecastLevel } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { AdminPageShell } from "@/components/admin-page-shell";
import { useAdminT } from "@/hooks/use-admin-t";

const FORECAST_WINDOWS = [14, 30, 90] as const;
type ForecastWindow = (typeof FORECAST_WINDOWS)[number];

const FORECAST_LEVEL_CLASS: Record<InventoryForecastLevel, string> = {
  out: "text-red-700 font-semibold",
  critical: "text-red-600 font-medium",
  warning: "text-amber-700 font-medium",
  ok: "text-emerald-700",
  unknown: "text-zinc-400",
};

function StockForecast() {
  const [days, setDays] = useState<ForecastWindow>(30);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inventory-forecast", days],
    queryFn: () => api.inventoryForecast(days),
  });
  const products = data?.products ?? [];
  const summary = data?.summary;

  return (
    <section className="admin-card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Stock forecast</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Based on units sold in the last {days} days. Products without sales show “—”.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5 text-xs">
          {FORECAST_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                days === w ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>

      {summary ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
            Out: {summary.out}
          </span>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-orange-700">
            ≤7 days: {summary.critical}
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            ≤21 days: {summary.warning}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
            Tracked: {summary.tracked}
          </span>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading forecast…</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Could not load forecast"}
        </p>
      ) : products.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No tracked products yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">In stock</th>
                <th className="px-3 py-2 text-right">Sold ({days}d)</th>
                <th className="px-3 py-2 text-right">Per day</th>
                <th className="px-3 py-2 text-right">Runs out in</th>
                <th className="px-3 py-2 text-right">Suggested reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.productId}>
                  <td className="px-3 py-2">
                    <Link
                      to={`/products/${p.productId}/edit`}
                      className="font-medium text-violet-700 hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.sku ? (
                      <span className="ml-2 font-mono text-xs text-zinc-500">{p.sku}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">{p.inventory}</td>
                  <td className="px-3 py-2 text-right">{p.unitsSold}</td>
                  <td className="px-3 py-2 text-right text-zinc-600">
                    {p.dailyRate > 0 ? p.dailyRate.toFixed(p.dailyRate < 1 ? 2 : 1) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${FORECAST_LEVEL_CLASS[p.level] ?? ""}`}
                    title={p.runOutAt ? new Date(p.runOutAt).toLocaleDateString() : undefined}
                  >
                    {p.level === "out"
                      ? "Out"
                      : p.daysLeft === null
                        ? "—"
                        : `${Math.round(p.daysLeft)} days`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.suggestedReorder > 0 ? p.suggestedReorder : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function InventoryPage() {
  const { ta, t } = useAdminT();
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
      <AdminPageShell crumbs={[{ label: t.nav.inventory }]}>
        <p className="text-zinc-500">{ta("inventoryPage.loading")}</p>
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
      crumbs={[{ label: t.nav.inventory }]}
      title={ta("inventoryPage.title")}
      description={ta("inventoryPage.description")}
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

      {tab === "overview" && <StockForecast />}

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
