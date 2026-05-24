import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import {
  PlatformActionItems,
  type ActionItem,
} from "@/components/platform-action-items";
import { QueryState } from "@/components/query-state";

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ["platform-dashboard"],
    queryFn: () => api.dashboard(),
  });

  return (
    <QueryState query={query} loadingLabel="Loading platform metrics…">
      {(data) => <DashboardContent data={data} />}
    </QueryState>
  );
}

function DashboardContent({
  data,
}: {
  data: Awaited<ReturnType<typeof api.dashboard>>;
}) {
  const m = data.metrics as {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    newTenants7d: number;
    paidOrders30d: number;
    gmv30d: number;
    gmvGrowthPct?: number;
    inactiveStores30d?: number;
    churnedStores30d?: number;
    stripeConnectedCount?: number;
    platformFees30d: number;
    mrrCents: number;
    totalMerchants: number;
    merchantDebtCents?: number;
    pendingPayoutCents?: number;
    pendingPayoutCount?: number;
    openDisputeEvents?: number;
  };

  const paymentModel = data.paymentModel;
  const mor = paymentModel === "mor";
  const actionItems = (data.actionItems as ActionItem[] | undefined ?? []).slice(
    0,
    8
  );

  const topStores = (data.topStoresByGmv ?? []) as {
    tenantId: string;
    name: string;
    slug: string;
    gmv: number;
    platformFees: number;
    netPayout: number;
    orderCount: number;
  }[];

  const recent = data.recentTenants as {
    id: string;
    name: string;
    slug: string;
    status: string;
    ownerEmail: string;
    plan: string;
    productCount: number;
    orderCount: number;
    createdAt: string;
  }[];

  const stats = [
    { label: "Total stores", value: String(m.totalTenants) },
    { label: "Active", value: String(m.activeTenants), tone: "text-emerald-600" },
    { label: "Suspended", value: String(m.suspendedTenants), tone: "text-red-600" },
    { label: "New (7 days)", value: String(m.newTenants7d) },
    { label: "GMV (30 days)", value: formatMoney(m.gmv30d, "USD") },
    ...(m.gmvGrowthPct != null
      ? [
          {
            label: "GMV vs prior 30d",
            value: `${m.gmvGrowthPct >= 0 ? "+" : ""}${m.gmvGrowthPct}%`,
            tone: m.gmvGrowthPct >= 0 ? "text-emerald-600" : "text-red-600",
          },
        ]
      : []),
    {
      label: "At-risk stores (no orders 30d)",
      value: String(m.inactiveStores30d ?? 0),
      tone: (m.inactiveStores30d ?? 0) > 0 ? "text-amber-600" : undefined,
    },
    {
      label: "Churn signal (no orders 60d)",
      value: String(m.churnedStores30d ?? 0),
      tone: (m.churnedStores30d ?? 0) > 0 ? "text-red-600" : undefined,
    },
    ...(mor
      ? [
          {
            label: "Merchant debt (owed)",
            value: formatMoney(m.merchantDebtCents ?? 0, "USD"),
            tone: "text-amber-700",
          },
          {
            label: "Pending payouts",
            value: `${formatMoney(m.pendingPayoutCents ?? 0, "USD")} (${m.pendingPayoutCount ?? 0})`,
            tone: "text-violet-600",
          },
          {
            label: "Stripe disputes (90d)",
            value: String(m.openDisputeEvents ?? 0),
            tone: (m.openDisputeEvents ?? 0) > 0 ? "text-red-600" : undefined,
          },
        ]
      : [
          {
            label: "Stripe Connect ready",
            value: String(m.stripeConnectedCount ?? 0),
            tone: "text-violet-600",
          },
        ]),
    {
      label: "Platform fees (30d)",
      value: formatMoney(m.platformFees30d ?? 0, "USD"),
      tone: "text-violet-600",
    },
    { label: "MRR (plans)", value: formatMoney(m.mrrCents ?? 0, "USD") },
    { label: "Paid orders (30d)", value: String(m.paidOrders30d) },
    { label: "Merchant accounts", value: String(m.totalMerchants) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>
          <Link to="/inbox" className="mt-2 inline-block text-sm font-medium text-sky-600">
            Open inbox →
          </Link>
          <p className="mt-1 text-slate-500">
            {mor ? "MoR — platform collects all payments" : "Connect mode"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mor ? (
            <>
              <Link
                to="/payouts?status=open"
                className="ugclab-btn ugclab-btn-primary text-sm"
              >
                Payout queue
              </Link>
              <button
                type="button"
                onClick={() => api.exportPayoutsCsv().catch((e) => alert(String(e)))}
                className="ugclab-btn border border-slate-200 bg-white text-sm"
              >
                Export payouts CSV
              </button>
            </>
          ) : null}
        </div>
      </div>

      <PlatformActionItems items={actionItems} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="platform-stat">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-2 text-2xl font-bold ${s.tone ?? "text-slate-900"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {topStores.length > 0 ? (
        <section className="platform-card overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Top stores by GMV (30 days)</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">GMV</th>
                <th className="px-6 py-3">Platform fee</th>
                <th className="px-6 py-3">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topStores.map((t) => (
                <tr key={t.tenantId}>
                  <td className="px-6 py-4 font-medium">{t.name}</td>
                  <td className="px-6 py-4">{formatMoney(t.gmv, "USD")}</td>
                  <td className="px-6 py-4 text-violet-700">
                    {formatMoney(t.platformFees, "USD")}
                  </td>
                  <td className="px-6 py-4">{t.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="platform-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">Recent stores</h2>
          <Link to="/tenants" className="text-sm font-medium text-sky-600">
            View all →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-6 py-3">Store</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recent.map((t) => (
              <tr key={t.id}>
                <td className="px-6 py-4">
                  <Link to={`/tenants/${t.id}`} className="font-medium text-sky-600">
                    {t.name}
                  </Link>
                  <p className="font-mono text-xs text-slate-400">{t.slug}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{t.ownerEmail}</td>
                <td className="px-6 py-4">{t.plan}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SUSPENDED: "bg-red-50 text-red-700",
    PENDING: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}
