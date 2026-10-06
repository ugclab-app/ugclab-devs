import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useAdminT } from "@/hooks/use-admin-t";
import { FormAlert } from "@/components/form-alert";
import { CsvImportPanel } from "@/components/csv-import-panel";

const CSV_TEMPLATE =
  "id,title,slug,type,status,price_cents,inventory,tags,weight_grams,barcode\n" +
  ',Sample Tee,sample-tee,PHYSICAL,ACTIVE,2999,10,"apparel;summer",200,\n';

export default function ProductsPage() {
  const { ta, c, t } = useAdminT();
  const [importAlert, setImportAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [importOpen, setImportOpen] = useState(false);
  const SORT_OPTIONS = [
    { value: "newest", label: ta("sort.newest") },
    { value: "oldest", label: ta("sort.oldest") },
    { value: "title-asc", label: ta("sort.titleAsc") },
    { value: "title-desc", label: ta("sort.titleDesc") },
    { value: "price-asc", label: ta("sort.priceAsc") },
    { value: "price-desc", label: ta("sort.priceDesc") },
  ];
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

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-zinc-500">{ta("productsPage.loading")}</p>;

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
    DIGITAL: ta("status.productType.DIGITAL"),
    PHYSICAL: ta("status.productType.PHYSICAL"),
    SERVICE: ta("status.productType.SERVICE"),
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
      <Breadcrumbs items={[{ label: t.nav.products }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{ta("productsPage.title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{ta("productsPage.description")}</p>
      </div>
      <FormAlert ok={importAlert.ok} message={importAlert.message} />
      {importOpen ? (
        <CsvImportPanel
          onCancel={() => setImportOpen(false)}
          onDone={(message) => {
            setImportOpen(false);
            setImportAlert({ ok: true, message });
          }}
        />
      ) : null}
      <ProductFilterChips />
      {lowStockFilter ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          Showing physical products with 5 or fewer units in stock.{" "}
          <Link to="/products" className="font-medium underline">
            {c.all}
          </Link>
        </p>
      ) : null}
      {!lowStockFilter && typeFilter && typeLabels[typeFilter] ? (
        <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900">
          {typeLabels[typeFilter]}{" "}
          <Link to="/products" className="font-medium underline">
            {c.all}
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
            onClick={() => downloadTemplate()}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            CSV template
          </button>
          <button
            type="button"
            onClick={() => api.exportProductsCsv()}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            {c.export}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
          >
            {c.import}
          </button>
          <Link to="/products/new" className="ugclab-btn ugclab-btn-primary px-5 py-2.5 text-center">
            {ta("productsPage.addProduct")}
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={ta("productsPage.empty")}
          description={ta("productsPage.emptyDesc")}
          actionLabel={ta("productsPage.addProduct")}
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
