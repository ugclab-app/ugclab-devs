import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

function money(rows: { currency: string; cents: number }[] | undefined) {
  if (!rows?.length) return "—";
  return rows
    .map((row) => {
      try {
        return new Intl.NumberFormat("en", { style: "currency", currency: row.currency }).format(row.cents / 100);
      } catch {
        return `${(row.cents / 100).toFixed(2)} ${row.currency}`;
      }
    })
    .join(" · ");
}

export default function ReconcilePage() {
  const query = useQuery({ queryKey: ["reconcile"], queryFn: () => api.reconcile() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Money</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stripe balance next to what stores are still owed, what is already on the way, and what has been paid.
        </p>
      </div>
      <QueryState query={query}>
        {(data) => (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="platform-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stripe available</p>
              <p className="mt-2 text-2xl font-bold">{money(data.stripe?.available)}</p>
              <p className="mt-2 text-sm text-slate-500">Pending in Stripe: {money(data.stripe?.pending)}</p>
              {data.stripeError ? <p className="mt-2 text-sm text-red-600">{data.stripeError}</p> : null}
              {!data.stripe && !data.stripeError ? (
                <p className="mt-2 text-sm text-slate-500">Stripe key is not set.</p>
              ) : null}
            </section>
            <section className="platform-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owed to stores</p>
              <p className="mt-2 text-2xl font-bold">{money(data.owedToMerchants)}</p>
              <p className="mt-2 text-sm text-slate-500">Held for buyer protection: {money(data.heldForProtection)}</p>
            </section>
            <section className="platform-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payouts in transit</p>
              <p className="mt-2 text-2xl font-bold">{money(data.payoutsInFlight)}</p>
            </section>
            <section className="platform-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</p>
              <p className="mt-2 text-2xl font-bold">{money(data.paidLast30Days)}</p>
              <p className="mt-2 text-sm text-slate-500">Last 30 days. All time: {money(data.paidAllTime)}</p>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}
