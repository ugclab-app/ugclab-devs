import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["stripe-events"], queryFn: () => api.stripeEvents() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="text-sm text-slate-500">Stripe webhook log and resync tools.</p>
      <QueryState query={query}>
        {(data) => (
          <>
            <p className="text-sm">
              Stripe: {data.stripeConfigured ? "configured" : "not configured"}
            </p>
            <div className="platform-card max-h-[32rem] overflow-y-auto text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.events as {
                    id: string;
                    type: string;
                    processed: boolean;
                    error: string | null;
                    createdAt: string;
                    stripeDashboardUrl: string | null;
                  }[]).map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {e.stripeDashboardUrl ? (
                          <a
                            href={e.stripeDashboardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600"
                          >
                            {e.type}
                          </a>
                        ) : (
                          e.type
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {e.processed ? "OK" : <span className="text-red-600">Pending</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-red-600">{e.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
      <button
        type="button"
        className="text-sm text-sky-600"
        onClick={() => qc.invalidateQueries({ queryKey: ["stripe-events"] })}
      >
        Refresh
      </button>
    </div>
  );
}
