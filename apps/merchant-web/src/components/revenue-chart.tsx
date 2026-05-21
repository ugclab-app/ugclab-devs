import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import type { DayRevenue } from "@/lib/chart-types";

export function RevenueChart({
  data,
  currency,
  range,
  rangeRevenue,
}: {
  data: DayRevenue[];
  currency: string;
  range: 7 | 30;
  rangeRevenue: number;
}) {
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Revenue</h2>
          <p className="text-sm text-zinc-500">
            {formatMoney(rangeRevenue, currency)} from paid orders
          </p>
        </div>
        <div className="flex rounded-lg bg-zinc-100 p-1 text-sm">
          <Link
            to="/dashboard?range=7"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              range === 7
                ? "bg-white text-violet-700 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            7 days
          </Link>
          <Link
            to="/dashboard?range=30"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              range === 30
                ? "bg-white text-violet-700 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            30 days
          </Link>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex h-48 items-end gap-1 sm:gap-2">
          {data.map((d) => {
            const h = max > 0 ? (d.revenue / max) * 100 : 0;
            return (
              <div
                key={d.date}
                className="group flex flex-1 flex-col items-center gap-2"
                title={`${d.label}: ${formatMoney(d.revenue, currency)}`}
              >
                <div className="relative flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-violet-600 to-indigo-500 transition group-hover:from-violet-500 group-hover:to-indigo-400"
                    style={{
                      height: `${Math.max(h, d.revenue > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <span className="hidden text-[10px] text-zinc-400 sm:block">
                  {range === 7
                    ? d.label
                    : d.label.replace(/\s+\d{4}$/, "").split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-zinc-400">
          Daily paid order revenue
        </p>
      </div>
    </section>
  );
}
