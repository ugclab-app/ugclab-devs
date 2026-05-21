import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ugclab/database";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { OrderStatusForm } from "@/components/order-status-form";
import { OrderStatusBadge } from "@/components/status-badge";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      customer: true,
      items: true,
    },
  });
  if (!order) notFound();

  const currency = order.currency;

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title={`Order #${order.orderNumber}`}
      description={order.createdAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    >
      <Link
        href="/orders"
        className="mb-6 inline-flex text-sm font-medium text-zinc-500 hover:text-violet-600"
      >
        ← Back to orders
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="admin-card overflow-hidden">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">Line items</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-right">Unit</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-600">
                      {formatMoney(item.unitAmount, currency)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900">
                      {formatMoney(item.totalAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <dl className="ml-auto max-w-xs space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(order.subtotalAmount, currency)}</dd>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <dt>Shipping</dt>
                  <dd>{formatMoney(order.shippingAmount, currency)}</dd>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <dt>Tax</dt>
                  <dd>{formatMoney(order.taxAmount, currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.totalAmount, currency)}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="admin-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Status</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="mt-4">
              <OrderStatusForm orderId={order.id} currentStatus={order.status} />
            </div>
          </section>

          <section className="admin-card p-6">
            <h2 className="font-semibold text-zinc-900">Customer</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Email
                </dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {order.customer?.email ?? "Guest checkout"}
                </dd>
              </div>
              {order.customer?.name ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Name
                  </dt>
                  <dd className="mt-1 text-zinc-900">{order.customer.name}</dd>
                </div>
              ) : null}
              {order.shippingCountry ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Ship to
                  </dt>
                  <dd className="mt-1 text-zinc-900">{order.shippingCountry}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {order.stripePaymentId ? (
            <section className="admin-card p-6">
              <h2 className="font-semibold text-zinc-900">Payment</h2>
              <p className="mt-2 break-all font-mono text-xs text-zinc-600">
                {order.stripePaymentId}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
