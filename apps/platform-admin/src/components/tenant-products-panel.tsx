import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";
import { PermissionGate } from "@/components/permission-gate";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  priceAmount: number;
  currency: string;
  inventory: number | null;
  sku: string | null;
  imageUrl: string | null;
  ordersCount: number;
  updatedAt: string;
};

function productStorefrontUrl(storefrontBase: string, productSlug: string) {
  const u = new URL(storefrontBase);
  const tenant = u.searchParams.get("tenant");
  u.pathname = `/products/${productSlug}`;
  u.search = "";
  if (tenant) u.searchParams.set("tenant", tenant);
  return u.toString();
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "text-emerald-700 bg-emerald-50";
  if (status === "DRAFT") return "text-slate-600 bg-slate-100";
  return "text-amber-800 bg-amber-50";
}

export function TenantProductsPanel({
  tenantId,
  tenantSlug,
  storefrontUrl,
}: {
  tenantId: string;
  tenantSlug: string;
  storefrontUrl: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [submittedQ, setSubmittedQ] = useState("");

  const query = useQuery({
    queryKey: ["tenant-products", tenantId, submittedQ, status],
    queryFn: () => {
      const p = new URLSearchParams();
      if (submittedQ) p.set("q", submittedQ);
      if (status !== "all") p.set("status", status);
      return api.tenantProducts(tenantId, p);
    },
  });

  const products = (query.data?.products ?? []) as ProductRow[];

  const counts = useMemo(() => {
    const c = { ACTIVE: 0, DRAFT: 0, ARCHIVED: 0 };
    for (const p of products) {
      if (p.status in c) c[p.status as keyof typeof c]++;
    }
    return c;
  }, [products]);

  return (
    <section id="store-products" className="platform-card overflow-hidden scroll-mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 px-6 py-4">
        <div>
          <h2 className="font-semibold">Products</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Catalog for <span className="font-mono">{tenantSlug}</span> — edit in merchant admin
          </p>
        </div>
        <a
          href={import.meta.env.VITE_MERCHANT_ADMIN_URL ?? "http://localhost:3001"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-600 hover:underline"
        >
          Merchant admin → Products
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <form
          className="flex flex-1 flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQ(q.trim());
          }}
        >
          <input
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Title, slug, SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
            Filter
          </button>
        </form>
      </div>

      <QueryState query={query}>
        {() => (
          <>
            {products.length > 0 ? (
              <p className="px-6 py-2 text-xs text-slate-500">
                Showing {products.length}
                {submittedQ || status !== "all"
                  ? " (filtered)"
                  : ""}{" "}
                · Active {counts.ACTIVE} · Draft {counts.DRAFT}
                {counts.ARCHIVED > 0 ? ` · Archived ${counts.ARCHIVED}` : ""}
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                    <th className="px-6 py-2 w-14" />
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Stock</th>
                    <th className="px-4 py-2">Orders</th>
                    <th className="px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => {
                    const storeUrl =
                      p.status === "ACTIVE"
                        ? productStorefrontUrl(storefrontUrl, p.slug)
                        : null;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded border object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded border bg-slate-100 text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{p.title}</p>
                          <p className="font-mono text-xs text-slate-500">{p.slug}</p>
                          {p.sku ? (
                            <p className="text-xs text-slate-400">SKU {p.sku}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(p.status)}`}
                          >
                            {p.status}
                          </span>
                          <p className="mt-0.5 text-xs text-slate-400">{p.type}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatMoney(p.priceAmount, p.currency)}
                        </td>
                        <td className="px-4 py-3">
                          {p.inventory != null ? p.inventory : "—"}
                        </td>
                        <td className="px-4 py-3">{p.ordersCount}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {storeUrl ? (
                              <a
                                href={storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-sky-600 hover:underline"
                              >
                                View on store
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">Not on storefront</span>
                            )}
                            <PermissionGate permission="moderation:write">
                              {p.status !== "ARCHIVED" ? (
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:underline"
                                  onClick={async () => {
                                    if (!confirm(`Archive "${p.title}"?`)) return;
                                    await api.banProduct(p.id);
                                    await qc.invalidateQueries({
                                      queryKey: ["tenant-products", tenantId],
                                    });
                                    await qc.invalidateQueries({ queryKey: ["tenant", tenantId] });
                                  }}
                                >
                                  Archive
                                </button>
                              ) : null}
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        No products match filters
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </section>
  );
}
