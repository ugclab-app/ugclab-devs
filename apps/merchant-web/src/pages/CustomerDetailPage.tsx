import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { OrderStatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/database-types";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customer(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const customer = data.customer as {
    email: string;
    name: string | null;
    orders: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      totalAmount: number;
      createdAt: string;
    }[];
  };

  return (
    <div className="space-y-6">
      <Link to="/customers" className="text-sm text-zinc-500">← Customers</Link>
      <h1 className="text-2xl font-bold">{customer.email}</h1>
      <div className="admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customer.orders.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-4">
                  <Link to={`/orders/${o.id}`} className="font-semibold text-violet-600">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  {formatMoney(o.totalAmount, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
