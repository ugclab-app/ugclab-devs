import Link from "next/link";
import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { EmptyState } from "@/components/empty-state";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const currency = tenant.settings?.currency ?? "USD";

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { totalAmount: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="Customers"
      description="Everyone who bought from your store."
    >
      <form method="get" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search email or name…"
          className="ugclab-input max-w-md"
        />
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title={query ? "No customers found" : "No customers yet"}
          description="Customers appear after their first order."
          actionLabel="View orders"
          actionHref="/orders"
        />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Orders</th>
                <th className="px-6 py-3">Last order</th>
                <th className="px-6 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.map((c) => {
                const last = c.orders[0];
                return (
                  <tr key={c.id} className="hover:bg-violet-50/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900">{c.email}</p>
                      {c.name ? (
                        <p className="text-zinc-500">{c.name}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {c._count.orders}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {last
                        ? `${formatMoney(last.totalAmount, currency)} · ${last.createdAt.toLocaleDateString()}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                      >
                        History →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
