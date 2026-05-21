import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function AnalyticsPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => api.analytics(range),
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  const currency = data?.currency ?? "USD";
  const a = data?.analytics as {
    totalRevenue: number;
    totalOrders: number;
    revenueByDay: { label: string; revenue: number; orders: number }[];
    topProducts: { title: string; quantity: number; revenue: number }[];
    ordersByCountry: { country: string; count: number }[];
  };

  if (!a) return <p className="text-zinc-500">No data</p>;

  const maxRevenue = Math.max(...a.revenueByDay.map((d) => d.revenue), 1);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          className="ugclab-input w-auto"
          value={range}
          onChange={(e) => setRange(e.target.value as "7" | "30" | "90")}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="admin-card p-6">
          <p className="text-sm text-zinc-500">GMV</p>
          <p className="mt-1 text-2xl font-bold">
            {formatMoney(a.totalRevenue, currency)}
          </p>
        </div>
        <div className="admin-card p-6">
          <p className="text-sm text-zinc-500">Orders</p>
          <p className="mt-1 text-2xl font-bold">{a.totalOrders}</p>
        </div>
      </div>

      <section className="admin-card mb-8 p-6">
        <h2 className="font-semibold">Revenue by day</h2>
        <ul className="mt-6 space-y-3">
          {a.revenueByDay.map((d) => (
            <li key={d.label} className="flex items-center gap-4 text-sm">
              <span className="w-16 shrink-0 text-zinc-500">{d.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right font-medium">
                {formatMoney(d.revenue, currency)}
              </span>
              <span className="w-12 text-right text-zinc-500">{d.orders}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="admin-card p-6">
          <h2 className="font-semibold">Top products</h2>
          <ul className="mt-4 divide-y text-sm">
            {a.topProducts.length === 0 ? (
              <li className="py-4 text-zinc-500">No sales yet</li>
            ) : (
              a.topProducts.map((p) => (
                <li
                  key={p.title}
                  className="flex justify-between gap-4 py-3"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-zinc-600">
                    {p.quantity} sold · {formatMoney(p.revenue, currency)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold">Orders by country</h2>
          <ul className="mt-4 divide-y text-sm">
            {a.ordersByCountry.length === 0 ? (
              <li className="py-4 text-zinc-500">No data</li>
            ) : (
              a.ordersByCountry.map((row) => (
                <li
                  key={row.country}
                  className="flex justify-between py-3"
                >
                  <span>{row.country}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
