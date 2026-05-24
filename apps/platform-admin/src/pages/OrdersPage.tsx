import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";

  const query = useQuery({
    queryKey: ["platform-orders", params.toString()],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (status) p.set("status", status);
      return api.orders(p);
    },
  });

  const orders = (query.data?.orders ?? []) as {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    customerEmail: string | null;
    createdAt: string;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cross-store order feed — last 100 matches.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Order #, email, store…"
          defaultValue={q}
          className="ugclab-input max-w-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value;
              const p = new URLSearchParams(params);
              if (v) p.set("q", v);
              else p.delete("q");
              setParams(p);
            }
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            const p = new URLSearchParams(params);
            if (e.target.value) p.set("status", e.target.value);
            else p.delete("status");
            setParams(p);
          }}
          className="ugclab-select w-44"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      <QueryState query={query}>
        {() => (
        <div className="platform-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 font-mono">#{o.orderNumber}</td>
                  <td className="px-6 py-3">
                    <Link
                      to={`/tenants/${o.tenantId}`}
                      className="font-medium text-sky-600"
                    >
                      {o.tenantName}
                    </Link>
                    <p className="text-xs text-slate-400">{o.tenantSlug}</p>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {o.customerEmail ?? "—"}
                  </td>
                  <td className="px-6 py-3">{o.status}</td>
                  <td className="px-6 py-3 text-right font-semibold">
                    {formatMoney(o.totalAmount, o.currency)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No orders found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        )}
      </QueryState>
    </div>
  );
}
