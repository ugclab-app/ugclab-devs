import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function RevenuePage() {
  const revenueQ = useQuery({ queryKey: ["revenue"], queryFn: () => api.revenue() });
  const healthQ = useQuery({
    queryKey: ["billing-health"],
    queryFn: () => api.billingHealth(),
  });
  const profitQ = useQuery({
    queryKey: ["profitability"],
    queryFn: () => api.profitability(30),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Revenue & billing</h1>

      <QueryState query={profitQ}>
        {(data) => (
          <section className="platform-card overflow-hidden">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Merchant profitability (30d)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Contribution = platform fees + plan MRR − partner commissions.{" "}
                {data.losingCount} store(s) below zero.
              </p>
            </div>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Store</th>
                    <th className="px-4 py-2">GMV</th>
                    <th className="px-4 py-2">Fees</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.slice(0, 40).map((r) => (
                    <tr key={r.id} className={r.losingMoney ? "bg-red-50/60" : undefined}>
                      <td className="px-4 py-2">
                        <Link to={`/tenants/${r.id}`} className="font-medium text-sky-600">
                          {r.name}
                        </Link>
                        <p className="text-xs text-slate-400">{r.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-2">{formatMoney(r.gmvCents, "USD")}</td>
                      <td className="px-4 py-2">{formatMoney(r.feeCents, "USD")}</td>
                      <td className="px-4 py-2">{formatMoney(r.planMrrCents, "USD")}</td>
                      <td
                        className={`px-4 py-2 font-medium ${r.losingMoney ? "text-red-700" : "text-emerald-700"}`}
                      >
                        {formatMoney(r.contributionCents, "USD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </QueryState>

      <QueryState query={revenueQ}>
        {(data) => {
          const months = data.months as {
            key: string;
            gmv: number;
            platformFees: number;
            orders: number;
          }[];
          const maxGmv = Math.max(...months.map((m) => m.gmv), 1);
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="platform-stat">
                  <p className="text-sm text-slate-500">MRR (plans)</p>
                  <p className="mt-2 text-2xl font-bold text-violet-700">
                    {formatMoney(data.totalMrrCents, "USD")}
                  </p>
                </div>
              </div>
              <section className="platform-card p-6">
                <h2 className="font-semibold">GMV (6 months)</h2>
                <div className="mt-6 flex items-end gap-2 h-40">
                  {months.map((m) => (
                    <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-sky-500/80"
                        style={{ height: `${(m.gmv / maxGmv) * 100}%`, minHeight: 4 }}
                        title={formatMoney(m.gmv, "USD")}
                      />
                      <span className="text-[10px] text-slate-500">{m.key.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="platform-card overflow-hidden">
                <h2 className="border-b px-6 py-4 font-semibold">By plan</h2>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {(data.planBreakdown as { name: string; tenants: number; mrrCents: number }[]).map(
                      (p) => (
                        <tr key={p.name}>
                          <td className="px-6 py-3 font-medium">{p.name}</td>
                          <td className="px-6 py-3">{p.tenants} stores</td>
                          <td className="px-6 py-3">{formatMoney(p.mrrCents, "USD")}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </section>
            </>
          );
        }}
      </QueryState>

      <QueryState query={healthQ}>
        {(health) => (
          <BillingTable
            title="No Stripe Connect"
            rows={health.noStripeConnect as HealthRow[]}
          />
        )}
      </QueryState>
      <QueryState query={healthQ}>
        {(health) => (
          <BillingTable title="Trial expired" rows={health.trialExpired as HealthRow[]} />
        )}
      </QueryState>
      <QueryState query={healthQ}>
        {(health) => (
          <BillingTable
            title="Failed billing"
            rows={health.failedBilling as HealthRow[]}
          />
        )}
      </QueryState>
      <QueryState query={healthQ}>
        {(health) => (
          <BillingTable
            title="Over product limit"
            rows={(health.overProductLimit as HealthRow[]) ?? []}
          />
        )}
      </QueryState>
    </div>
  );
}

type HealthRow = { id: string; name: string; slug: string; ownerEmail: string };

function BillingTable({ title, rows }: { title: string; rows: HealthRow[] }) {
  if (!rows?.length) return null;
  return (
    <section className="platform-card overflow-hidden">
      <h2 className="border-b px-6 py-4 font-semibold text-amber-800">{title}</h2>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-6 py-3">
                <Link to={`/tenants/${r.id}`} className="font-medium text-sky-600">
                  {r.name}
                </Link>
                <p className="text-xs text-slate-400">{r.slug}</p>
              </td>
              <td className="px-6 py-3">{r.ownerEmail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
