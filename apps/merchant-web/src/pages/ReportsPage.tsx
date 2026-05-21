import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function ReportsPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", range],
    queryFn: () => api.reportsSummary(range),
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  const r = data as {
    currency: string;
    revenue: number;
    gmv: number;
    platformFees: number;
    netPayout: number;
    platformFeeBps: number;
    tax: number;
    discounts: number;
    refunds: number;
    orderCount: number;
    digitalDownloads: number;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Reports</h1>
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
      <p className="mb-4 text-sm text-zinc-500">
        Platform fee: {(r.platformFeeBps / 100).toFixed(2)}% — net payout is GMV minus
        platform fee (Stripe processing fees are separate).
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="GMV (paid)" value={formatMoney(r.gmv ?? r.revenue, r.currency)} />
        <Stat label="Platform fee" value={formatMoney(r.platformFees ?? 0, r.currency)} />
        <Stat label="Net payout (est.)" value={formatMoney(r.netPayout ?? r.revenue, r.currency)} />
        <Stat label="Revenue" value={formatMoney(r.revenue, r.currency)} />
        <Stat label="Tax collected" value={formatMoney(r.tax, r.currency)} />
        <Stat label="Discounts" value={formatMoney(r.discounts, r.currency)} />
        <Stat label="Refunds" value={formatMoney(r.refunds, r.currency)} />
        <Stat label="Orders" value={String(r.orderCount)} />
        <Stat label="Digital downloads" value={String(r.digitalDownloads)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card p-6">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
