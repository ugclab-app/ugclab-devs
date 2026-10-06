import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["stripe-events"], queryFn: () => api.stripeEvents() });
  const [orderId, setOrderId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setPending(true);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="text-sm text-slate-500">Stripe webhook log and resync tools.</p>

      <section className="platform-card space-y-4 p-5">
        <h2 className="font-semibold">Stripe resync</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            Order ID
            <input
              className="ugclab-input mt-1 min-w-[16rem]"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="cuid…"
            />
          </label>
          <button
            type="button"
            disabled={pending || !orderId.trim()}
            className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
            onClick={() =>
              run(() => api.resyncOrder(orderId.trim()), "Order synced from Stripe")
            }
          >
            Resync order
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            Tenant ID
            <input
              className="ugclab-input mt-1 min-w-[16rem]"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="cuid…"
            />
          </label>
          <button
            type="button"
            disabled={pending || !tenantId.trim()}
            className="ugclab-btn border border-slate-200 bg-white text-sm disabled:opacity-50"
            onClick={() =>
              run(
                () => api.resyncSubscription(tenantId.trim()),
                "Subscription synced from Stripe"
              )
            }
          >
            Resync subscription
          </button>
        </div>
        {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
      </section>

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
