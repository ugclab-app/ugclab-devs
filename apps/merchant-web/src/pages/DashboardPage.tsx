import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { RevenueChart } from "@/components/revenue-chart";
import { RecentOrders } from "@/components/recent-orders";
import { LaunchChecklist } from "@/components/launch-checklist";
import { NotificationsBar } from "@/components/notifications-bar";
import { DashboardStatCards } from "@/components/dashboard-stat-cards";
import { LowStockPanel } from "@/components/low-stock-panel";
import { LowStockAlert } from "@/components/low-stock-alert";
import { StripeConnectBanner } from "@/components/stripe-connect-banner";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { StoreUrlCard } from "@/components/store-url-card";
import { FirstSalePanel } from "@/components/first-sale-panel";
import { PlanLimitsBanner } from "@/components/plan-limits-banner";

export default function DashboardPage() {
  const { tenant } = useAuth();
  const [params, setParams] = useSearchParams();
  const range = params.get("range") === "30" ? 30 : 7;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => api.dashboard(range as 7 | 30),
  });

  if (!tenant) return null;
  if (isLoading || !data) {
    return <p className="text-zinc-500">Loading dashboard…</p>;
  }

  const metrics = data.metrics as {
    ordersToday: number;
    revenueToday: number;
    rangeRevenue: number;
    pendingOrders: number;
    lowStockCount: number;
    paidOrderCount: number;
    productCount: number;
    gmv: number;
    platformFees: number;
    netPayout: number;
    chartData: { date: string; label: string; revenue: number; orders: number }[];
    recentOrders: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      createdAt: string;
      customer?: { email: string } | null;
    }[];
  };

  const currency = data.currency;
  const firstSale =
    (metrics as {
      firstSale?: {
        hasFirstSale: boolean;
        firstSaleAt: string | null;
        hoursToFirstSale: number | null;
        firstOrderNumber: string | null;
        firstOrderAmount: number | null;
      };
    }).firstSale ??
    ({
      hasFirstSale: metrics.paidOrderCount > 0,
      firstSaleAt: null,
      hoursToFirstSale: null,
      firstOrderNumber: null,
      firstOrderAmount: null,
    } as const);
  const planLimits = (data as { planLimits?: { planName: string; productLimit: number | null; productCount: number; staffCount: number } }).planLimits;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {planLimits ? (
        <PlanLimitsBanner
          planName={planLimits.planName}
          productCount={planLimits.productCount}
          productLimit={planLimits.productLimit}
          staffCount={planLimits.staffCount}
        />
      ) : null}
      <OnboardingWizard
        tenantSlug={tenant.slug}
        productCount={metrics.productCount}
      />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
        <p className="text-sm text-zinc-500">
          {metrics.ordersToday} orders today ·{" "}
          {formatMoney(metrics.revenueToday, currency)} revenue today
        </p>
      </div>

      <NotificationsBar />

      <FirstSalePanel firstSale={firstSale} currency={currency} />

      <StripeConnectBanner />

      <LowStockAlert count={metrics.lowStockCount} />

      <DashboardStatCards
        currency={currency}
        ordersToday={metrics.ordersToday}
        revenueToday={metrics.revenueToday}
        pendingOrders={metrics.pendingOrders}
        lowStockCount={metrics.lowStockCount}
        rangeRevenue={metrics.rangeRevenue}
        range={range}
        netPayout={metrics.netPayout}
        platformFees={metrics.platformFees}
      />

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <RevenueChart
            data={metrics.chartData}
            currency={currency}
            range={range as 7 | 30}
            rangeRevenue={metrics.rangeRevenue}
          />
          <RecentOrders
            currency={currency}
            orders={metrics.recentOrders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              status: o.status as "PENDING",
              totalAmount: o.totalAmount,
              customerEmail: o.customer?.email ?? null,
              createdAt: new Date(o.createdAt),
            }))}
          />
        </div>
        <div className="space-y-8">
          <StoreUrlCard tenantSlug={tenant.slug} />
          <LaunchChecklist
            tenantSlug={tenant.slug}
            productCount={metrics.productCount}
          />
          <LowStockPanel />
        </div>
      </div>
    </div>
  );
}
