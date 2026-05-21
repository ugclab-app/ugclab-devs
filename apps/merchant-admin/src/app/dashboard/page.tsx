import Link from "next/link";
import { formatMoney } from "@ugclab/i18n";
import { AdminShell } from "@/components/admin-shell";
import { LaunchChecklist } from "@/components/launch-checklist";
import { RecentOrders } from "@/components/recent-orders";
import { RevenueChart } from "@/components/revenue-chart";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { getStorefrontUrl } from "@/lib/storefront";
import { getAuthenticatedTenant } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { tenant } = await getAuthenticatedTenant();

  if (!tenant) {
    return <p>No store found.</p>;
  }

  const { range: rangeParam } = await searchParams;
  const range: 7 | 30 = rangeParam === "30" ? 30 : 7;
  const metrics = await getDashboardMetrics(tenant.id, range);
  const currency = tenant.settings?.currency ?? "USD";
  const storeUrl = getStorefrontUrl(tenant.slug);

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title={`Welcome back`}
      description="Your store at a glance — revenue, orders, and next steps."
    >
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 p-6 text-white shadow-lg shadow-violet-500/25 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-violet-200">Today</p>
            <p className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">
              {metrics.ordersToday}{" "}
              <span className="text-xl font-semibold text-violet-100 lg:text-2xl">
                {metrics.ordersToday === 1 ? "order" : "orders"}
              </span>
            </p>
            <p className="mt-2 text-sm text-violet-100">
              {range}-day revenue:{" "}
              <span className="font-semibold text-white">
                {formatMoney(metrics.rangeRevenue, currency)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products/new"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow hover:bg-violet-50"
            >
              Add product
            </Link>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              View store
            </a>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Orders today"
          value={String(metrics.ordersToday)}
          accent="border-l-amber-500"
        />
        <StatPill
          label={`Revenue (${range}d)`}
          value={formatMoney(metrics.rangeRevenue, currency)}
          accent="border-l-violet-600"
        />
        <StatPill
          label="Paid orders (all)"
          value={String(metrics.paidOrderCount)}
          accent="border-l-emerald-500"
        />
        <StatPill
          label="Products"
          value={String(metrics.productCount)}
          accent="border-l-sky-500"
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <RevenueChart
            data={metrics.chartData}
            currency={currency}
            range={range}
            rangeRevenue={metrics.rangeRevenue}
          />
          <RecentOrders
            currency={currency}
            orders={metrics.recentOrders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              status: o.status,
              totalAmount: o.totalAmount,
              customerEmail: o.customer?.email ?? null,
              createdAt: o.createdAt,
            }))}
          />
        </div>
        <LaunchChecklist
          tenantSlug={tenant.slug}
          productCount={metrics.productCount}
        />
      </div>
    </AdminShell>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className={`admin-card border-l-4 p-5 ${accent}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
        {value}
      </p>
    </div>
  );
}
