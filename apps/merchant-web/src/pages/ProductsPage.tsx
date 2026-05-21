import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { ProductsTable, type ProductRow } from "@/components/products-table";
import { SearchSortBar } from "@/components/search-sort-bar";
import { EmptyState } from "@/components/empty-state";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductFilterChips } from "@/components/product-filter-chips";
import { useAuth } from "@/context/auth";
import { getStorefrontUrl } from "@/lib/storefront";
import type { ProductStatus, ProductType } from "@/lib/database-types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "price-asc", label: "Price low–high" },
  { value: "price-desc", label: "Price high–low" },
];

export default function ProductsPage() {
  const { tenant } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const storefrontBase = tenant ? getStorefrontUrl(tenant.slug) : "";
  const queryParams = new URLSearchParams(params);
  if (!queryParams.has("limit")) queryParams.set("limit", "25");
  if (!queryParams.has("page")) queryParams.set("page", String(page));

  const { data, isLoading } = useQuery({
    queryKey: ["products", queryParams.toString()],
    queryFn: () => api.products(queryParams),
  });

  const { data: collectionsData } = useQuery({
    queryKey: ["collections"],
    queryFn: () => api.collections(),
  });
  const collections = (collectionsData?.collections ?? []) as {
    id: string;
    title: string;
  }[];

  if (isLoading) return <p className="text-zinc-500">Loading products…</p>;

  const lowStockFilter = params.get("lowStock") === "1";
  const typeFilter = params.get("type");

  const products = (data?.products ?? []) as {
    id: string;
    title: string;
    slug: string;
    type: ProductType;
    status: ProductStatus;
    priceAmount: number;
    compareAt: number | null;
    thumbUrl?: string | null;
    inventory?: number | null;
  }[];
  const currency = data?.currency ?? "USD";

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    status: p.status,
    priceLabel: formatMoney(p.priceAmount, currency),
    compareLabel: p.compareAt ? formatMoney(p.compareAt, currency) : undefined,
    thumbUrl: p.thumbUrl,
    inventory: p.inventory,
  }));

  const typeLabels: Record<string, string> = {
    DIGITAL: "digital",
    PHYSICAL: "physical",
    SERVICE: "service",
  };

  const total = data?.total ?? rows.length;
  const totalPages = data?.totalPages ?? 1;

  function setPage(p: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "Products" }]} />
      <ProductFilterChips />
      {lowStockFilter ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          Showing physical products with 5 or fewer units in stock.{" "}
          <Link to="/products" className="font-medium underline">
            Show all
          </Link>
        </p>
      ) : null}
      {!lowStockFilter && typeFilter && typeLabels[typeFilter] ? (
        <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900">
          Showing {typeLabels[typeFilter]} products only.{" "}
          <Link to="/products" className="font-medium underline">
            Show all
          </Link>
        </p>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchSortBar
          basePath="/products"
          sortOptions={SORT_OPTIONS}
          placeholder="Search by title or slug…"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => api.exportProductsCsv()}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            Export CSV
          </button>
          <label className="ugclab-btn border border-zinc-200 bg-white text-sm cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = await api.importProductsCsv(f);
                alert(`Imported ${r.created} products`);
                e.target.value = "";
              }}
            />
          </label>
          <Link to="/products/new" className="ugclab-btn ugclab-btn-primary px-5 py-2.5 text-center">
            New product
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No products"
          description="Create your first product."
          actionLabel="Add product"
          actionHref="/products/new"
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500">
            {total} product{total === 1 ? "" : "s"}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
          <ProductsTable
            products={rows}
            storefrontBase={storefrontBase}
            collections={collections}
          />
          {totalPages > 1 ? (
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="ugclab-btn border border-zinc-200 bg-white text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="ugclab-btn border border-zinc-200 bg-white text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
