import Link from "next/link";
import { Suspense } from "react";
import { OrderStatus, prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { EmptyState } from "@/components/empty-state";
import { OrderFilters } from "@/components/order-filters";
import { SearchSortBar } from "@/components/search-sort-bar";
import { OrderStatusBadge } from "@/components/status-badge";
import { orderOrderBy, parseOrderSort } from "@/lib/list-query";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Total high–low" },
  { value: "total-asc", label: "Total low–high" },
  { value: "number-desc", label: "Order # high–low" },
  { value: "number-asc", label: "Order # low–high" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { status: statusParam, q, sort: sortParam } = await searchParams;
  const sort = parseOrderSort(sortParam);
  const query = q?.trim() ?? "";

  const statusFilter =
    statusParam &&
    Object.values(OrderStatus).includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: "insensitive" } },
              {
                customer: {
                  email: { contains: query, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: orderOrderBy(sort),
    take: 100,
  });

  const currency = tenant.settings?.currency ?? "USD";

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="Orders"
      description="Search, filter, and open any order for details."
    >
      <div className="mb-4 space-y-4">
        <Suspense fallback={null}>
          <SearchSortBar
            basePath="/orders"
            sortOptions={SORT_OPTIONS}
            placeholder="Search order # or email…"
          />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-9 w-64 animate-pulse rounded-full bg-zinc-200" />
          }
        >
          <OrderFilters />
        </Suspense>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title={
            query || statusFilter ? "No matching orders" : "No orders yet"
          }
          description="Share your store link or adjust filters."
          actionLabel={statusFilter || query ? "View all" : "View products"}
          actionHref={statusFilter || query ? "/orders" : "/products"}
        />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-violet-50/30">
                  <td className="px-6 py-4">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-semibold text-violet-600 hover:text-violet-700"
                    >
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {o.customer?.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {o.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-zinc-900">
                    {formatMoney(o.totalAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
