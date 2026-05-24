import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";

type AnalyticsData = {
  rangeDays: number;
  period: { from: string; to: string };
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  previous: {
    totalRevenue: number;
    totalOrders: number;
    revenueChangePct: number | null;
    ordersChangePct: number | null;
  };
  refunds: { count: number; amount: number };
  paymentModel: string;
  netRevenue: number;
  platformFees: number;
  stripeFeeEstimate: number;
  netAfterStripeEstimate: number;
  revenueByDay: { date: string; label: string; revenue: number; orders: number }[];
  topProducts: { title: string; quantity: number; revenue: number }[];
  topCollections: { title: string; quantity: number; revenue: number }[];
  ordersByCountry: { country: string; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  customers: { new: number; returning: number };
  paymentMix: { method: string; count: number }[];
  fulfillment: { shippedCount: number; avgDaysToShip: number | null };
  discounts: { ordersWithDiscount: number; discountTotal: number };
  abandoned: {
    openCarts: number;
    openValueCents: number;
    recoveryRatePct: number | null;
    currency: string;
  };
  marketing: {
    emailsSent: number;
    openRatePct: number | null;
    clickRatePct: number | null;
    campaignsSent: number;
  };
};

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-zinc-400">—</span>;
  const up = pct >= 0;
  return (
    <span
      className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}
    >
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs prev period
    </span>
  );
}

function RevenueLineChart({
  data,
  maxRevenue,
}: {
  data: AnalyticsData["revenueByDay"];
  maxRevenue: number;
}) {
  if (data.length === 0) return null;
  const w = 600;
  const h = 160;
  const pad = 8;
  const max = Math.max(maxRevenue, 1);
  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (d.revenue / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-4 w-full text-violet-600"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points.join(" ")}
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<"7" | "30" | "90" | "custom">("7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (preset === "custom" && from && to) {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.set("range", preset === "custom" ? "7" : preset);
    }
    return p.toString();
  }, [preset, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", queryString],
    queryFn: () => api.analytics(queryString),
  });

  const currency = data?.currency ?? "USD";
  const a = data?.analytics as AnalyticsData | undefined;
  const maxRevenue = Math.max(...(a?.revenueByDay.map((d) => d.revenue) ?? [0]), 1);

  return (
    <AdminPageShell
      crumbs={[{ label: "Analytics" }]}
      title="Analytics"
      description="Sales trends, customers, marketing, and recovery — paid & fulfilled orders."
      actions={
        <button
          type="button"
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
          onClick={() => api.exportAnalyticsCsv(queryString)}
        >
          Export CSV
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-600">
          Period
          <select
            className="ugclab-select mt-1 block"
            value={preset}
            onChange={(e) =>
              setPreset(e.target.value as "7" | "30" | "90" | "custom")
            }
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        {preset === "custom" ? (
          <>
            <label className="text-sm text-zinc-600">
              From
              <input
                type="date"
                className="ugclab-input mt-1 block"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-sm text-zinc-600">
              To
              <input
                type="date"
                className="ugclab-input mt-1 block"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-zinc-500">Loading analytics…</p>
      ) : !a ? (
        <p className="text-zinc-500">No data</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="admin-card p-5">
              <p className="text-sm text-zinc-500">GMV</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMoney(a.totalRevenue, currency)}
              </p>
              <DeltaBadge pct={a.previous.revenueChangePct} />
            </div>
            <div className="admin-card p-5">
              <p className="text-sm text-zinc-500">Orders</p>
              <p className="mt-1 text-2xl font-bold">{a.totalOrders}</p>
              <DeltaBadge pct={a.previous.ordersChangePct} />
            </div>
            <div className="admin-card p-5">
              <p className="text-sm text-zinc-500">AOV</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMoney(a.aov, currency)}
              </p>
            </div>
            <div className="admin-card p-5">
              <p className="text-sm text-zinc-500">Refunds</p>
              <p className="mt-1 text-2xl font-bold">{a.refunds.count}</p>
              <p className="text-xs text-zinc-500">
                {formatMoney(a.refunds.amount, currency)}
              </p>
            </div>
          </div>

          {a.paymentModel === "mor" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="admin-card p-5">
                <p className="text-sm text-zinc-500">Net (after platform fee)</p>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(a.netRevenue, currency)}
                </p>
              </div>
              <div className="admin-card p-5">
                <p className="text-sm text-zinc-500">Platform fees</p>
                <p className="mt-1 text-xl font-bold text-zinc-700">
                  {formatMoney(a.platformFees, currency)}
                </p>
              </div>
              <div className="admin-card p-5">
                <p className="text-sm text-zinc-500">Est. after Stripe (~3%)</p>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(a.netAfterStripeEstimate, currency)}
                </p>
              </div>
            </div>
          ) : null}

          <section className="admin-card p-6">
            <h2 className="font-semibold">Revenue trend</h2>
            <RevenueLineChart data={a.revenueByDay} maxRevenue={maxRevenue} />
            <ul className="mt-6 space-y-2">
              {a.revenueByDay.map((d) => (
                <li key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-zinc-500">{d.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-medium">
                    {formatMoney(d.revenue, currency)}
                  </span>
                  <span className="w-8 text-right text-zinc-500">{d.orders}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="admin-card p-6">
              <h2 className="font-semibold">Top products</h2>
              <ul className="mt-4 divide-y text-sm">
                {a.topProducts.length === 0 ? (
                  <li className="py-4 text-zinc-500">No sales yet</li>
                ) : (
                  a.topProducts.map((p) => (
                    <li key={p.title} className="flex justify-between gap-4 py-3">
                      <span className="font-medium">{p.title}</span>
                      <span className="text-zinc-600">
                        {p.quantity} · {formatMoney(p.revenue, currency)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Top collections</h2>
              <ul className="mt-4 divide-y text-sm">
                {a.topCollections.length === 0 ? (
                  <li className="py-4 text-zinc-500">No collection sales</li>
                ) : (
                  a.topCollections.map((c) => (
                    <li key={c.title} className="flex justify-between gap-4 py-3">
                      <span className="font-medium">{c.title}</span>
                      <span className="text-zinc-600">
                        {formatMoney(c.revenue, currency)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Orders by country</h2>
              <ul className="mt-4 divide-y text-sm">
                {a.ordersByCountry.map((row) => (
                  <li key={row.country} className="flex justify-between py-3">
                    <span>{row.country}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Orders by status</h2>
              <ul className="mt-4 divide-y text-sm">
                {a.ordersByStatus.map((row) => (
                  <li key={row.status} className="flex justify-between py-3">
                    <span>{row.status}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Customers</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-zinc-500">New</p>
                  <p className="text-2xl font-bold">{a.customers.new}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-zinc-500">Returning</p>
                  <p className="text-2xl font-bold">{a.customers.returning}</p>
                </div>
              </div>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Payment mix</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {a.paymentMix.map((m) => (
                  <li key={m.method} className="flex justify-between">
                    <span>{m.method}</span>
                    <span className="font-medium">{m.count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Fulfillment</h2>
              <p className="mt-3 text-sm text-zinc-600">
                {a.fulfillment.shippedCount} orders shipped
                {a.fulfillment.avgDaysToShip != null
                  ? ` · avg ${a.fulfillment.avgDaysToShip} days to ship`
                  : ""}
              </p>
            </section>

            <section className="admin-card p-6">
              <h2 className="font-semibold">Discounts</h2>
              <p className="mt-3 text-sm text-zinc-600">
                {a.discounts.ordersWithDiscount} orders with codes ·{" "}
                {formatMoney(a.discounts.discountTotal, currency)} total
              </p>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="admin-card p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Abandoned carts</h2>
                <Link to="/abandoned-carts" className="text-sm text-violet-600">
                  View all
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-amber-800/70">Open carts</p>
                  <p className="text-xl font-bold text-amber-900">
                    {a.abandoned.openCarts}
                  </p>
                  <p className="text-xs text-amber-800">
                    {formatMoney(a.abandoned.openValueCents, a.abandoned.currency)}{" "}
                    value
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-emerald-800/70">Recovery rate</p>
                  <p className="text-xl font-bold text-emerald-900">
                    {a.abandoned.recoveryRatePct != null
                      ? `${a.abandoned.recoveryRatePct}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="admin-card p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Email marketing</h2>
                <Link to="/marketing" className="text-sm text-violet-600">
                  Campaigns
                </Link>
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                {a.marketing.campaignsSent} campaigns sent in period ·{" "}
                {a.marketing.emailsSent.toLocaleString()} emails
              </p>
              <div className="mt-3 flex gap-6 text-sm">
                <span>
                  Open rate:{" "}
                  <strong>
                    {a.marketing.openRatePct != null
                      ? `${a.marketing.openRatePct}%`
                      : "—"}
                  </strong>
                </span>
                <span>
                  Click rate:{" "}
                  <strong>
                    {a.marketing.clickRatePct != null
                      ? `${a.marketing.clickRatePct}%`
                      : "—"}
                  </strong>
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
