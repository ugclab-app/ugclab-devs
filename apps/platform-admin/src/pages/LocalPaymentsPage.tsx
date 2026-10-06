import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function LocalPaymentsPage() {
  const query = useQuery({
    queryKey: ["local-payments"],
    queryFn: () => api.localPayments(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GoPay / Finik</h1>
        <p className="mt-1 text-sm text-slate-500">
          Local KG payment providers — config status and recent orders.
        </p>
      </div>

      <QueryState query={query}>
        {(data) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="platform-card p-4">
                <p className="text-xs uppercase text-slate-500">Finik</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    data.finikConfigured ? "text-emerald-600" : "text-amber-700"
                  }`}
                >
                  {data.finikConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div className="platform-card p-4">
                <p className="text-xs uppercase text-slate-500">GoPay</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    data.gopayConfigured ? "text-emerald-600" : "text-amber-700"
                  }`}
                >
                  {data.gopayConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
            </div>

            <div className="platform-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">Provider</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {((data.orders ?? []) as {
                    id: string;
                    createdAt: string;
                    orderNumber: string;
                    tenantId: string;
                    tenantName: string;
                    paymentProvider: string | null;
                    finikPaymentId: string | null;
                    gopayPaymentId: string | null;
                    status: string;
                    totalAmount: number;
                    currency: string;
                  }[]).map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <Link to={`/orders/${o.id}`} className="font-mono text-sky-600">
                          #{o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Link to={`/tenants/${o.tenantId}`} className="text-sky-600">
                          {o.tenantName}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {o.paymentProvider ||
                          (o.finikPaymentId ? "finik" : o.gopayPaymentId ? "gopay" : "—")}
                      </td>
                      <td className="px-4 py-2">{o.status}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatMoney(o.totalAmount, o.currency)}
                      </td>
                    </tr>
                  ))}
                  {(data.orders as unknown[])?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No Finik/GoPay orders yet
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
