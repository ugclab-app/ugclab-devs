import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

function payoutStatusClass(status: string) {
  if (status === "PAID") return "text-emerald-700";
  if (status === "FAILED") return "text-red-700";
  if (status === "PROCESSING") return "text-sky-700";
  return "text-amber-700";
}

function payoutLabel(status: string) {
  if (status === "PENDING") return "Requested";
  if (status === "PROCESSING") return "Processing";
  if (status === "PAID") return "Paid";
  if (status === "FAILED") return "Failed";
  return status;
}

export default function PayoutsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "open";
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["platform-payouts", status],
    queryFn: () => api.payouts(status === "open" ? "open" : status),
  });

  const mor = query.data?.paymentModel === "mor";
  const payouts = (query.data?.payouts ?? []) as {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    amount: number;
    currency: string;
    status: string;
    note: string | null;
    createdAt: string;
  }[];

  async function mark(
    tenantId: string,
    payoutId: string,
    action: "processing" | "paid" | "failed"
  ) {
    if (action === "failed") {
      const note = window.prompt("Failure reason (optional):");
      if (note === null) return;
      await api.markPayoutFailed(tenantId, payoutId, note || undefined);
    } else if (action === "processing") {
      await api.markPayoutProcessing(tenantId, payoutId);
    } else {
      await api.markPayoutPaid(tenantId, payoutId);
    }
    await qc.invalidateQueries({ queryKey: ["platform-payouts"] });
    await qc.invalidateQueries({ queryKey: ["platform-dashboard"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">
            MoR merchant withdrawal queue — process from one place.
          </p>
        </div>
        {mor ? (
          <button
            type="button"
            onClick={() => api.exportPayoutsCsv().catch((e) => alert(String(e)))}
            className="ugclab-btn border border-slate-200 bg-white text-sm"
          >
            Export CSV
          </button>
        ) : null}
      </div>

      {!mor ? (
        <p className="platform-card p-6 text-sm text-slate-600">
          Payout queue is available in MoR mode (`PAYMENT_MODEL=mor`).
        </p>
      ) : (
        <>
          {query.data?.summary ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="platform-stat">
                <p className="text-sm text-slate-500">Open requests</p>
                <p className="mt-2 text-2xl font-bold text-violet-700">
                  {query.data.summary.pendingCount}
                </p>
              </div>
              <div className="platform-stat">
                <p className="text-sm text-slate-500">Open amount</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(query.data.summary.pendingCents, "USD")}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {[
              { id: "open", label: "Open (pending + processing)" },
              { id: "PENDING", label: "Requested" },
              { id: "PROCESSING", label: "Processing" },
              { id: "PAID", label: "Paid" },
              { id: "FAILED", label: "Failed" },
              { id: "all", label: "All" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  const p = new URLSearchParams(params);
                  p.set("status", f.id);
                  setParams(p);
                }}
                className={
                  status === f.id
                    ? "rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <QueryState query={query}>
            {() => (
            <div className="platform-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Store</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Note</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          to={`/tenants/${p.tenantId}`}
                          className="font-medium text-sky-600"
                        >
                          {p.tenantName}
                        </Link>
                        <p className="font-mono text-xs text-slate-400">{p.tenantSlug}</p>
                      </td>
                      <td className="px-6 py-3 font-semibold">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className={`px-6 py-3 font-medium ${payoutStatusClass(p.status)}`}>
                        {payoutLabel(p.status)}
                      </td>
                      <td className="max-w-xs truncate px-6 py-3 text-slate-500">
                        {p.note ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                        {p.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-sky-600 hover:underline"
                              onClick={() => mark(p.tenantId, p.id, "processing")}
                            >
                              Processing
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-emerald-700 hover:underline"
                              onClick={() => mark(p.tenantId, p.id, "paid")}
                            >
                              Paid
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => mark(p.tenantId, p.id, "failed")}
                            >
                              Failed
                            </button>
                          </>
                        ) : p.status === "PROCESSING" ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-emerald-700 hover:underline"
                              onClick={() => mark(p.tenantId, p.id, "paid")}
                            >
                              Paid
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => mark(p.tenantId, p.id, "failed")}
                            >
                              Failed
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        No payouts in this filter
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            )}
          </QueryState>
        </>
      )}
    </div>
  );
}
