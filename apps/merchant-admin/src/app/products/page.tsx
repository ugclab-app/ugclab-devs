import Link from "next/link";
import { Suspense } from "react";
import { prisma, ProductStatus } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { EmptyState } from "@/components/empty-state";
import { ProductsTable } from "@/components/products-table";
import { SearchSortBar } from "@/components/search-sort-bar";
import {
  parseProductSort,
  productOrderBy,
} from "@/lib/list-query";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "price-asc", label: "Price low–high" },
  { value: "price-desc", label: "Price high–low" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; status?: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { q, sort: sortParam, status: statusParam } = await searchParams;
  const sort = parseProductSort(sortParam);
  const query = q?.trim() ?? "";

  const statusFilter =
    statusParam &&
    Object.values(ProductStatus).includes(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: productOrderBy(sort),
  });

  const currency = tenant.settings?.currency ?? "USD";

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="Products"
      description="Search, sort, bulk publish, or duplicate products."
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <SearchSortBar
            basePath="/products"
            sortOptions={SORT_OPTIONS}
            placeholder="Search by title or slug…"
          />
        </Suspense>
        <Link
          href="/products/new"
          className="ugclab-btn ugclab-btn-primary shrink-0 px-5 py-2.5 text-center"
        >
          New product
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((s) => {
          const label = s === "" ? "All" : s;
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (sortParam) params.set("sort", sortParam);
          if (s) params.set("status", s);
          const href = params.toString()
            ? `/products?${params}`
            : "/products";
          const active = (statusParam ?? "") === s;
          return (
            <Link
              key={label}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                active
                  ? "bg-violet-600 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title={query ? "No matches" : "No products yet"}
          description={
            query
              ? "Try a different search or clear filters."
              : "Create your first product to start selling."
          }
          actionLabel="Add product"
          actionHref="/products/new"
        />
      ) : (
        <ProductsTable
          products={products.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            type: p.type,
            status: p.status,
            priceLabel: formatMoney(p.priceAmount, currency),
            compareLabel: p.compareAt
              ? formatMoney(p.compareAt, currency)
              : undefined,
          }))}
        />
      )}
    </AdminShell>
  );
}
