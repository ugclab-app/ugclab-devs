import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function PastDuePage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["past-due"], queryFn: () => api.pastDue() });
  const retry = useMutation({
    mutationFn: (id: string) => api.retryPastDue(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["past-due"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Past due</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stores whose plan charge is past due, unpaid, or incomplete. Days count from the last store update.
        </p>
      </div>
      {retry.error ? <p className="text-sm text-red-600">{(retry.error as Error).message}</p> : null}
      {retry.isSuccess ? <p className="text-sm text-emerald-700">Charge sent. Stripe status: {retry.data.status ?? "unknown"}.</p> : null}
      <QueryState query={query}>
        {(data) => (
          <div className="platform-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2">Store</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Days</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.stores.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <Link to={`/tenants/${row.id}`} className="font-medium text-sky-700">
                        {row.name}
                      </Link>
                      <p className="text-slate-500">{row.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.plan}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.days}</td>
                    <td className="px-4 py-3 text-right">
                      {row.canRetry ? (
                        <button
                          type="button"
                          className="ugclab-btn ugclab-btn-primary"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(row.id)}
                        >
                          Retry charge
                        </button>
                      ) : (
                        <span className="text-slate-400">No Stripe plan</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.stores.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={5}>
                      No past-due stores.
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
