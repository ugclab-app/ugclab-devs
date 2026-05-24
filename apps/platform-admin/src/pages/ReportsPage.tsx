import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function ReportsPage() {
  const cohortQ = useQuery({ queryKey: ["cohort"], queryFn: () => api.cohortReport() });
  const retentionQ = useQuery({
    queryKey: ["retention"],
    queryFn: () => api.retentionAnalytics(),
  });
  const modQ = useQuery({ queryKey: ["moderation"], queryFn: () => api.moderation() });
  const emailQ = useQuery({ queryKey: ["email-log"], queryFn: () => api.emailLog() });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Retention (90d signups)</h2>
        <QueryState query={retentionQ}>
          {(data) => {
            const s = data.summary as {
              signedUp90d: number;
              activatedPct: number;
              retained30dPct: number;
            };
            return (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="platform-card p-4">
                  <p className="text-xs text-slate-500">Signed up (90d)</p>
                  <p className="text-2xl font-bold">{s.signedUp90d}</p>
                </div>
                <div className="platform-card p-4">
                  <p className="text-xs text-slate-500">Activated (first order)</p>
                  <p className="text-2xl font-bold">{s.activatedPct}%</p>
                </div>
                <div className="platform-card p-4">
                  <p className="text-xs text-slate-500">Retained (orders 30d)</p>
                  <p className="text-2xl font-bold">{s.retained30dPct}%</p>
                </div>
              </div>
            );
          }}
        </QueryState>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Cohort: signup → first order → GMV 30d</h2>
        <QueryState query={cohortQ}>
          {(data) => (
            <div className="platform-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Signed up</th>
                    <th className="px-4 py-3">First order</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">GMV 30d</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.cohort as {
                    tenantId: string;
                    name: string;
                    slug: string;
                    signedUp: string;
                    firstOrderAt: string | null;
                    orderCount: number;
                    gmv30d: number;
                  }[]).map((r) => (
                    <tr key={r.tenantId}>
                      <td className="px-4 py-3">
                        <Link to={`/tenants/${r.tenantId}`} className="text-sky-600">
                          {r.slug}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{r.signedUp}</td>
                      <td className="px-4 py-3">{r.firstOrderAt ?? "—"}</td>
                      <td className="px-4 py-3">{r.orderCount}</td>
                      <td className="px-4 py-3">{formatMoney(r.gmv30d, "USD")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Moderation — pending reviews</h2>
        <QueryState query={modQ}>
          {(data) => (
            <ul className="platform-card divide-y text-sm">
              {(data.pendingReviews as {
                id: string;
                tenantName: string;
                productTitle: string;
                authorName: string;
                rating: number;
              }[]).map((r) => (
                <li key={r.id} className="px-6 py-3">
                  <strong>{r.tenantName}</strong> · {r.productTitle} · {r.rating}★ by{" "}
                  {r.authorName}
                </li>
              ))}
              {data.pendingReviews.length === 0 ? (
                <li className="px-6 py-6 text-slate-500">No pending reviews</li>
              ) : null}
            </ul>
          )}
        </QueryState>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Email log</h2>
        <QueryState query={emailQ}>
          {(data) => (
            <div className="platform-card max-h-80 overflow-y-auto text-sm">
              <ul className="divide-y">
                {(data.logs as { to: string; subject: string; status: string; createdAt: string }[]).map(
                  (l, i) => (
                    <li key={i} className="px-6 py-2">
                      <span className="text-slate-500">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>{" "}
                      · {l.to} · {l.subject}{" "}
                      <span className="text-xs">({l.status})</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </QueryState>
      </section>
    </div>
  );
}
