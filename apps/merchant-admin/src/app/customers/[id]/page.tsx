import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { OrderStatusBadge } from "@/components/status-badge";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { id } = await params;
  const currency = tenant.settings?.currency ?? "USD";

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.orders
    .filter((o) => o.status === "PAID" || o.status === "FULFILLED")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title={customer.email}
      description={customer.name ?? "Customer order history"}
    >
      <Link
        href="/customers"
        className="mb-6 inline-flex text-sm font-medium text-zinc-500 hover:text-violet-600"
      >
        ← All customers
      </Link>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="admin-card p-5">
          <p className="text-xs font-medium uppercase text-zinc-500">Orders</p>
          <p className="mt-1 text-2xl font-bold">{customer.orders.length}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-medium uppercase text-zinc-500">Total spent</p>
          <p className="mt-1 text-2xl font-bold">
            {formatMoney(totalSpent, currency)}
          </p>
        </div>
        <div className="admin-card p-5">
          <p className="text-xs font-medium uppercase text-zinc-500">Country</p>
          <p className="mt-1 text-2xl font-bold">{customer.country ?? "—"}</p>
        </div>
      </div>

      <section className="admin-card overflow-hidden">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="font-semibold text-zinc-900">Order history</h2>
        </div>
        {customer.orders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No orders yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase text-zinc-500">
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customer.orders.map((o) => (
                <tr key={o.id} className="hover:bg-violet-50/30">
                  <td className="px-6 py-4">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-semibold text-violet-600"
                    >
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {o.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatMoney(o.totalAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
