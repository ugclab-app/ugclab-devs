import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { CustomerSegmentBadges } from "@/components/customer-segment-badges";
import { EmptyState } from "@/components/empty-state";
import { useState } from "react";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "vip", label: "VIP" },
  { id: "repeat", label: "Repeat" },
  { id: "new", label: "No paid orders" },
  { id: "with_orders", label: "Has orders" },
  { id: "no_orders", label: "No orders" },
] as const;

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "spent", label: "Total spent" },
  { id: "orders", label: "Order count" },
  { id: "last_order", label: "Last order" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type SortId = (typeof SORTS)[number]["id"];

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("newest");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", search, filter, sort],
    queryFn: () => api.customers({ q: search || undefined, filter, sort }),
  });

  const customers = (data?.customers ?? []) as {
    id: string;
    email: string;
    name: string | null;
    country: string | null;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
    segment: string[];
  }[];

  if (isLoading) {
    return (
      <AdminPageShell crumbs={[{ label: "Customers" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Customers" }]}
      title="Customers"
      description="Shopper accounts, spend, and order history."
      actions={
        <>
          <Link
            to="/customers/segments"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Segments
          </Link>
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await api.exportCustomersCsv({
                  q: search || undefined,
                  filter,
                });
              } catch (e) {
                setImportMsg(e instanceof Error ? e.message : "Export failed");
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <label className="ugclab-btn border border-zinc-200 bg-white text-sm cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const r = await api.importCustomersCsv(file);
                  setImportMsg(`Imported ${r.created} customers`);
                  refetch();
                } catch (err) {
                  setImportMsg(
                    err instanceof Error ? err.message : "Import failed"
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </>
      }
    >
      {importMsg ? (
        <p className="mb-4 text-sm text-violet-700">{importMsg}</p>
      ) : null}
      <p className="mb-4 text-xs text-zinc-500">
        Import CSV columns: email, name, country · VIP = $500+ paid revenue
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? "rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <input
          className="ugclab-input max-w-md flex-1"
          placeholder="Search email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
          Search
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Sort
          <select
            className="ugclab-input py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Try another filter or import a CSV."
        />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Segment</th>
                <th className="px-6 py-3">Orders</th>
                <th className="px-6 py-3 text-right">Total spent</th>
                <th className="px-6 py-3">Last order</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4">
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-medium text-violet-600 hover:underline"
                    >
                      {c.email}
                    </Link>
                    {c.name ? (
                      <p className="text-zinc-500">{c.name}</p>
                    ) : null}
                    {c.country ? (
                      <p className="text-xs text-zinc-400">{c.country}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <CustomerSegmentBadges segment={c.segment} />
                  </td>
                  <td className="px-6 py-4">{c.orderCount}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatMoney(c.totalSpent, data?.currency ?? "USD")}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatShortDate(c.lastOrderAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-semibold text-violet-600"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
