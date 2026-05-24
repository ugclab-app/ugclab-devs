import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function DisputesPage() {
  const query = useQuery({ queryKey: ["disputes"], queryFn: () => api.disputes() });
  const disputes = (query.data?.disputes ?? []) as {
    id: string;
    tenantId: string;
    tenantName: string;
    orderNumber: string;
    amount: number;
    currency: string;
    status: string;
    reason: string;
    createdAt: string;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disputes & refunds</h1>
      <p className="text-sm text-slate-500">Stripe dispute events (last 100)</p>
      <QueryState query={query}>
        {() => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Store</th>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {disputes.map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <Link to={`/tenants/${d.tenantId}`} className="text-sky-600">
                        {d.tenantName}
                      </Link>
                    </td>
                    <td className="px-6 py-3 font-mono">#{d.orderNumber}</td>
                    <td className="px-6 py-3 font-medium">
                      {formatMoney(d.amount, d.currency)}
                    </td>
                    <td className="px-6 py-3">{d.status}</td>
                    <td className="px-6 py-3 text-slate-600">{d.reason || "—"}</td>
                  </tr>
                ))}
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      No disputes recorded
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
