import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { OrdersToolbar } from "@/components/orders-toolbar";
import { OrdersTable, type OrderListRow } from "@/components/orders-table";
import { EmptyState } from "@/components/empty-state";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import type { OrderStatus } from "@/lib/database-types";
import { useAdminT } from "@/hooks/use-admin-t";

export default function OrdersPage() {
  const { ta, c, t } = useAdminT();
  const SORT_OPTIONS = [
    { value: "newest", label: ta("sort.newest") },
    { value: "oldest", label: ta("sort.oldest") },
    { value: "total-desc", label: ta("sort.totalDesc") },
    { value: "total-asc", label: ta("sort.totalAsc") },
  ];
  const [banner, setBanner] = useState<{ ok?: boolean; message?: string } | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["orders", params.toString()],
    queryFn: () => api.orders(params),
  });

  const orders = (data?.orders ?? []) as OrderListRow[];
  const showMorColumns = data?.paymentModel === "mor";

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
      setBanner({ ok: false, message: ta("ordersPage.noPaidToFulfill") });
      return;
    }
    try {
      const r = await api.bulkFulfillOrders(ids);
      setBanner({ ok: true, message: ta("ordersPage.bulkFulfillSuccess", { count: r.updated }) });
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setBanner({
        ok: false,
        message: err instanceof Error ? err.message : ta("ordersPage.bulkFulfillFailed"),
      });
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: t.nav.orders }]}
      title={ta("ordersPage.title")}
      description={ta("ordersPage.description")}
      actions={
        <>
          <button
            type="button"
            onClick={() => api.downloadOrdersCsv(params)}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            {ta("ordersPage.exportCsv")}
          </button>
          <button
            type="button"
            onClick={() => api.downloadOrdersCsv(params, true)}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            {c.export}
          </button>
          <label className="ugclab-btn cursor-pointer border border-zinc-200 bg-white text-sm">
            {ta("ordersPage.importCsv")}
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
            {someSelected
              ? ta("ordersPage.bulkFulfillSelected", { count: selected.size })
              : ta("ordersPage.bulkFulfill")}
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
              for (const id of selected) {
                window.open(api.orderInvoiceUrl(id), "_blank");
              }
            }}
          >
            Print invoices
          </button>
          <button
            type="button"
            className="font-medium text-violet-700 hover:underline"
            onClick={async () => {
              const tag = window.prompt("Tag to add to selected orders?");
              if (!tag?.trim()) return;
              try {
                const r = await api.bulkOrderTags([...selected], [tag.trim()], []);
                setBanner({ ok: true, message: `Tagged ${r.updated} order(s)` });
                setSelected(new Set());
                await qc.invalidateQueries({ queryKey: ["orders"] });
              } catch (e) {
                setBanner({
                  ok: false,
                  message: e instanceof Error ? e.message : "Failed",
                });
              }
            }}
          >
            Add tag
          </button>
          <button
            type="button"
            className="font-medium text-violet-700 hover:underline"
            onClick={async () => {
              try {
                const r = await api.bulkShippingLabels([...selected]);
                setBanner({
                  ok: true,
                  message: `Labels: ${r.results.filter((x) => x.ok).length}/${r.attempted} ok`,
                });
                await qc.invalidateQueries({ queryKey: ["orders"] });
              } catch (e) {
                setBanner({
                  ok: false,
                  message: e instanceof Error ? e.message : "Labels failed",
                });
              }
            }}
          >
            Shippo labels
          </button>
          <button
            type="button"
            className="font-medium text-red-700 hover:underline"
            onClick={async () => {
              if (!confirm("Cancel selected pending/draft orders?")) return;
              const r = await api.bulkCancelOrders([...selected]);
              setBanner({ ok: true, message: `Cancelled ${r.updated} order(s)` });
              setSelected(new Set());
              await qc.invalidateQueries({ queryKey: ["orders"] });
            }}
          >
            Cancel pending
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
        <p className="mt-6 text-zinc-500">{ta("ordersPage.loading")}</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-700">
          {error instanceof Error ? error.message : ta("ordersPage.loadFailed")}
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={ta("ordersPage.empty")}
            description={ta("ordersPage.emptyDesc")}
            actionHref="/products"
            actionLabel={t.nav.products}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
            <p>
              Showing {orders.length} of {data?.total ?? orders.length} orders
              {data?.summary
                ? ` · ${formatMoney(data.summary.totalCents, data.currency)} total`
                : ""}
              {isFetching && !isLoading ? " · updating…" : ""}
            </p>
            {(data?.total ?? 0) > (data?.pageSize ?? 50) ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={(data?.page ?? 1) <= 1}
                  className="ugclab-btn border border-zinc-200 bg-white text-xs disabled:opacity-40"
                  onClick={() => {
                    const p = new URLSearchParams(params);
                    p.set("page", String(Math.max(1, (data?.page ?? 1) - 1)));
                    navigate(`/orders?${p.toString()}`);
                  }}
                >
                  Previous
                </button>
                <span className="py-2 text-xs">Page {data?.page ?? 1}</span>
                <button
                  type="button"
                  disabled={orders.length < (data?.pageSize ?? 50)}
                  className="ugclab-btn border border-zinc-200 bg-white text-xs disabled:opacity-40"
                  onClick={() => {
                    const p = new URLSearchParams(params);
                    p.set("page", String((data?.page ?? 1) + 1));
                    navigate(`/orders?${p.toString()}`);
                  }}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
          <OrdersTable
            orders={orders}
            currency={data!.currency}
            showMorColumns={showMorColumns}
            selected={selected}
            allVisibleSelected={allVisibleSelected}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
          />
        </>
      )}
    </AdminPageShell>
  );
}
