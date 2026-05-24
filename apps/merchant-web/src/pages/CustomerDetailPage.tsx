import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { CustomerSegmentBadges } from "@/components/customer-segment-badges";
import { OrderStatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/database-types";

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customer(id!),
    enabled: !!id,
  });

  const patch = useMutation({
    mutationFn: (marketingOptOut: boolean) =>
      api.updateCustomer(id!, { marketingOptOut }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer", id] }),
  });

  if (isLoading || !data) {
    return (
      <AdminPageShell crumbs={[{ label: "Customers", to: "/customers" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  const customer = data.customer as {
    email: string;
    name: string | null;
    country: string | null;
    createdAt: string;
    marketingOptOut: boolean;
    emailBounced: boolean;
    orders: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      totalAmount: number;
      createdAt: string;
      shippingName: string | null;
      shippingCity: string | null;
      shippingCountry: string | null;
    }[];
  };

  const summary = data.summary as {
    orderCount: number;
    paidOrderCount: number;
    totalSpent: number;
    aov: number;
    segment: string[];
    lastOrderAt: string | null;
    firstOrderAt: string | null;
  };

  const openCart = data.openAbandonedCart as {
    id: string;
    subtotalAmount: number;
    currency: string;
    updatedAt: string;
  } | null;

  const latestOrder = customer.orders[0];
  const shipLine = latestOrder
    ? [
        latestOrder.shippingName,
        latestOrder.shippingCity,
        latestOrder.shippingCountry,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <AdminPageShell
      crumbs={[
        { label: "Customers", to: "/customers" },
        { label: customer.email },
      ]}
      title={customer.name || customer.email}
      description={customer.name ? customer.email : undefined}
      actions={
        <Link
          to="/marketing"
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
          state={{ audienceEmail: customer.email }}
        >
          Email marketing
        </Link>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CustomerSegmentBadges segment={summary.segment} />
        {customer.country ? (
          <span className="text-sm text-zinc-500">Country: {customer.country}</span>
        ) : null}
        {customer.emailBounced ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Email bounced
          </span>
        ) : null}
        <span className="text-sm text-zinc-500">
          Customer since {formatShortDate(customer.createdAt)}
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total spent"
          value={formatMoney(summary.totalSpent, data.currency)}
        />
        <Stat label="Orders" value={String(summary.orderCount)} />
        <Stat
          label="Average order"
          value={
            summary.paidOrderCount > 0
              ? formatMoney(summary.aov, data.currency)
              : "—"
          }
        />
        <Stat
          label="Last order"
          value={formatShortDate(summary.lastOrderAt)}
        />
      </div>

      <section className="admin-card mb-8 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Preferences</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={customer.marketingOptOut}
            disabled={patch.isPending}
            onChange={(e) => patch.mutate(e.target.checked)}
          />
          <span>
            Unsubscribed from marketing
            {data.emailSubscriber ? " (synced with email list)" : ""}
          </span>
        </label>
        {shipLine ? (
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">Latest shipping: </span>
            {shipLine}
          </p>
        ) : null}
        {openCart ? (
          <p className="text-sm">
            <span className="font-medium text-amber-800">Open abandoned cart: </span>
            {formatMoney(openCart.subtotalAmount, openCart.currency)} · updated{" "}
            {formatShortDate(openCart.updatedAt)}
            {" · "}
            <Link to="/abandoned-carts" className="text-violet-600 font-medium">
              View carts
            </Link>
          </p>
        ) : null}
      </section>

      <div className="admin-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Order history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customer.orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                  No orders yet
                </td>
              </tr>
            ) : (
              customer.orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-4">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-semibold text-violet-600"
                    >
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatShortDate(o.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatMoney(o.totalAmount, data.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
