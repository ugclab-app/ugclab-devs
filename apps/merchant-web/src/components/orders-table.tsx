import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import { OrderStatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/database-types";

export type OrderListRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  platformFeeAmount: number;
  merchantNetCents: number;
  createdAt: string;
  locationLabel: string | null;
  trackingNumber: string | null;
  tags?: string[];
  itemsLabel: string;
  customer?: { email: string } | null;
};

function formatOrderDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatOrderTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersTable({
  orders,
  currency,
  showMorColumns,
  selected,
  onToggleAll,
  onToggleOne,
  allVisibleSelected,
}: {
  orders: OrderListRow[];
  currency: string;
  showMorColumns: boolean;
  selected: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
  allVisibleSelected: boolean;
}) {
  return (
    <div className="admin-card overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b bg-zinc-50/80 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all orders"
                checked={allVisibleSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Date</th>
            <th className="hidden px-4 py-3 md:table-cell">Customer</th>
            <th className="hidden px-4 py-3 lg:table-cell">Items</th>
            <th className="hidden px-4 py-3 lg:table-cell">Ship to</th>
            <th className="hidden px-4 py-3 xl:table-cell">Tracking</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Total</th>
            {showMorColumns ? (
              <th className="hidden px-4 py-3 text-right xl:table-cell">Your net</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((o) => (
            <tr
              key={o.id}
              className={`transition hover:bg-violet-50/40 ${
                selected.has(o.id) ? "bg-violet-50/60" : ""
              }`}
            >
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  aria-label={`Select order ${o.orderNumber}`}
                  onChange={(e) => onToggleOne(o.id, e.target.checked)}
                />
              </td>
              <td className="px-4 py-4">
                <Link
                  to={`/orders/${o.id}`}
                  className="font-semibold text-violet-600 hover:underline"
                >
                  #{o.orderNumber}
                </Link>
                {o.tags?.length ? (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {o.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                      >
                        {t}
                      </span>
                    ))}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-zinc-500 md:hidden">
                  {o.customer?.email ?? "—"}
                </p>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-zinc-700">
                <span className="font-medium">{formatOrderDate(o.createdAt)}</span>
                <span className="block text-xs text-zinc-400">
                  {formatOrderTime(o.createdAt)}
                </span>
              </td>
              <td className="hidden px-4 py-4 text-zinc-700 md:table-cell">
                {o.customer?.email ?? "—"}
              </td>
              <td className="hidden px-4 py-4 text-zinc-600 lg:table-cell">
                {o.itemsLabel}
              </td>
              <td className="hidden px-4 py-4 text-zinc-600 lg:table-cell">
                {o.locationLabel ?? "—"}
              </td>
              <td className="hidden px-4 py-4 xl:table-cell">
                {o.trackingNumber ? (
                  <span className="font-mono text-xs text-zinc-700">{o.trackingNumber}</span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
              <td className="px-4 py-4">
                <OrderStatusBadge status={o.status} />
              </td>
              <td className="px-4 py-4 text-right font-medium tabular-nums text-zinc-900">
                {formatMoney(o.totalAmount, currency)}
              </td>
              {showMorColumns ? (
                <td className="hidden px-4 py-4 text-right tabular-nums xl:table-cell">
                  <span className="font-medium text-emerald-700">
                    {formatMoney(o.merchantNetCents, currency)}
                  </span>
                  {o.platformFeeAmount > 0 ? (
                    <span className="block text-[10px] text-zinc-400">
                      fee {formatMoney(o.platformFeeAmount, currency)}
                    </span>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
