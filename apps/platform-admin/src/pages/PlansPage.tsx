import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function PlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.plans(),
  });

  const plans = (data?.plans ?? []) as {
    id: string;
    slug: string;
    name: string;
    priceMonthly: number;
    currency: string;
    productLimit: number | null;
    _count: { tenants: number };
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription plans</h1>
      <p className="text-sm text-slate-500">
        Plans are defined in the database seed. Billing integration coming later.
      </p>
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="platform-card p-6">
              <p className="font-mono text-xs text-slate-400">{p.slug}</p>
              <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
              <p className="mt-2 text-2xl font-bold text-sky-600">
                {formatMoney(p.priceMonthly, p.currency)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <p className="mt-4 text-sm text-slate-600">
                {p._count.tenants} store{p._count.tenants === 1 ? "" : "s"}
              </p>
              {p.productLimit != null ? (
                <p className="text-sm text-slate-500">Up to {p.productLimit} products</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
