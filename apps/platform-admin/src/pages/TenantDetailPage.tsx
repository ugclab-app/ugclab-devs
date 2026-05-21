import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => api.tenant(id!),
    enabled: !!id,
  });

  if (isLoading || !data) return <p className="text-slate-500">Loading…</p>;

  const t = data.tenant as {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptionPlanId: string | null;
    storefrontUrl: string;
    owner: { email: string; name: string | null };
    subscriptionPlan: { id: string; name: string } | null;
    settings: { currency: string } | null;
    customDomains: { domain: string; verified: boolean }[];
    _count: { products: number; orders: number; customers: number };
    stats: { orders30d: number; gmv30d: number };
    recentOrders: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      currency: string;
      customer?: { email: string } | null;
    }[];
  };

  const currency = t.settings?.currency ?? "USD";
  const merchantUrl = import.meta.env.VITE_MERCHANT_ADMIN_URL ?? "http://localhost:3001";

  async function setStatus(status: string) {
    await api.updateTenant(t.id, { status });
    await queryClient.invalidateQueries({ queryKey: ["tenant", id] });
    await queryClient.invalidateQueries({ queryKey: ["tenants"] });
  }

  return (
    <div className="space-y-6">
      <Link to="/tenants" className="text-sm text-slate-500 hover:text-sky-600">
        ← Stores
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <p className="font-mono text-sm text-slate-500">{t.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.status !== "ACTIVE" ? (
            <button
              type="button"
              onClick={() => setStatus("ACTIVE")}
              className="ugclab-btn ugclab-btn-primary text-sm"
            >
              Activate
            </button>
          ) : null}
          {t.status !== "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => setStatus("SUSPENDED")}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
            >
              Suspend
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={t.status} />
        <Stat label="Plan" value={t.subscriptionPlan?.name ?? "—"} />
        <Stat label="GMV (30d)" value={formatMoney(t.stats.gmv30d, currency)} />
        <Stat label="Orders (30d)" value={String(t.stats.orders30d)} />
      </div>

      <section className="platform-card p-6 space-y-3 text-sm">
        <h2 className="font-semibold">Owner</h2>
        <p>{t.owner.name ?? "—"} · {t.owner.email}</p>
        <h2 className="font-semibold pt-2">Links</h2>
        <p>
          <a href={t.storefrontUrl} target="_blank" rel="noreferrer" className="text-sky-600">
            Storefront ↗
          </a>
        </p>
        <p>
          Merchant admin is separate — owner signs in at{" "}
          <a href={merchantUrl} className="text-sky-600">
            {merchantUrl}
          </a>
        </p>
        {t.customDomains.length > 0 ? (
          <p className="text-slate-500">
            Domains: {t.customDomains.map((d) => d.domain).join(", ")}
          </p>
        ) : null}
      </section>

      <section className="platform-card overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Recent orders</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {t.recentOrders.map((o) => (
              <tr key={o.id}>
                <td className="px-6 py-3">#{o.orderNumber}</td>
                <td className="px-6 py-3">{o.customer?.email ?? "Guest"}</td>
                <td className="px-6 py-3">{o.status}</td>
                <td className="px-6 py-3 text-right">
                  {formatMoney(o.totalAmount, o.currency)}
                </td>
              </tr>
            ))}
            {t.recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No orders
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-stat">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
