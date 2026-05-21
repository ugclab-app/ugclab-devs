import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import { OrderStatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/database-types";

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  customerEmail: string | null;
  createdAt: Date;
};

export function RecentOrders({
  orders,
  currency,
}: {
  orders: RecentOrder[];
  currency: string;
}) {
  if (orders.length === 0) {
    return (
      <section className="admin-card p-6">
        <h2 className="font-semibold text-zinc-900">Recent orders</h2>
        <p className="mt-2 text-sm text-zinc-500">No orders yet.</p>
        <Link
          to="/orders"
          className="mt-4 inline-block text-sm font-semibold text-violet-600"
        >
          View orders →
        </Link>
      </section>
    );
  }

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
        <h2 className="font-semibold text-zinc-900">Recent orders</h2>
        <Link to="/orders" className="text-sm font-semibold text-violet-600">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-zinc-100">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-violet-50/40"
            >
              <div>
                <p className="font-medium text-zinc-900">#{o.orderNumber}</p>
                <p className="text-sm text-zinc-500">
                  {o.customerEmail ?? "Guest"} ·{" "}
                  {o.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="font-semibold text-zinc-900">
                  {formatMoney(o.totalAmount, currency)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
