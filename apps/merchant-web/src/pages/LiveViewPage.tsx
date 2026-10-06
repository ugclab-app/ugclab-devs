import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { useAdminT } from "@/hooks/use-admin-t";

type LiveData = {
  generatedAt: string;
  visitorsRightNow: number;
  totalSales: number;
  sessionsToday: number;
  ordersToday: number;
  funnel: { activeCarts: number; checkingOut: number; purchased: number };
  locations: { country: string; count: number }[];
  customers: { new: number; returning: number };
  sparklines: { sessions: number[]; orders: number[] };
  markers: {
    country: string;
    kind: "visitor" | "order";
    lat: number;
    lng: number;
  }[];
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 80;
  const h = 28;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-20" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

/** Orthographic-ish projection onto a circle for the decorative globe. */
function project(lat: number, lng: number, r: number) {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const x = r * Math.cos(latR) * Math.sin(lngR);
  const y = -r * Math.sin(latR);
  const z = Math.cos(latR) * Math.cos(lngR);
  return { x, y, visible: z > -0.15 };
}

function LiveGlobe({
  markers,
}: {
  markers: LiveData["markers"];
}) {
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const dots: { x: number; y: number }[] = [];
  for (let lat = -70; lat <= 70; lat += 12) {
    for (let lng = -180; lng < 180; lng += 12) {
      const p = project(lat, lng, r);
      if (p.visible) dots.push({ x: cx + p.x, y: cy + p.y });
    }
  }

  return (
    <div className="relative flex h-full min-h-[320px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-sky-50 to-white">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[min(420px,100%)] w-full max-w-md">
        <defs>
          <radialGradient id="globeGlow" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="70%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 8} fill="url(#globeGlow)" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#bae6fd"
          strokeWidth="1"
        />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={1.4} fill="#7dd3fc" opacity={0.55} />
        ))}
        {markers.map((m, i) => {
          const p = project(m.lat, m.lng, r);
          if (!p.visible) return null;
          const color = m.kind === "order" ? "#7c3aed" : "#0ea5e9";
          return (
            <circle
              key={`${m.kind}-${m.country}-${i}`}
              cx={cx + p.x}
              cy={cy + p.y}
              r={m.kind === "order" ? 5 : 4}
              fill={color}
              opacity={0.9}
            >
              <title>
                {m.kind === "order" ? "Order" : "Visitor"} · {m.country}
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute bottom-3 right-3 flex gap-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-zinc-600 shadow-sm ring-1 ring-zinc-200/80">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-600" /> Orders
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Visitors
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900">
          {value}
        </p>
        {spark ? <Sparkline values={spark} color={sparkColor ?? "#7c3aed"} /> : null}
      </div>
    </div>
  );
}

export default function LiveViewPage() {
  const { ta, c, t } = useAdminT();
  const { data, isLoading, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["analytics-live"],
    queryFn: () => api.analyticsLive(),
    refetchInterval: 8_000,
  });

  const live = data?.live as LiveData | undefined;
  const currency = data?.currency ?? "USD";

  const updatedLabel = dataUpdatedAt
    ? isFetching
      ? "Updating…"
      : "Just now"
    : "—";

  return (
    <AdminPageShell
      crumbs={[
        { label: t.nav.analytics, to: "/analytics" },
        { label: "Live View" },
      ]}
      title="Live View"
      description="Real-time visitors, sales, and checkout activity on your storefront."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
          {updatedLabel}
        </div>
        <Link
          to="/analytics"
          className="text-sm text-violet-600 hover:underline"
        >
          ← Reports
        </Link>
      </div>

      {isLoading || !live ? (
        <p className="text-zinc-500">{c.loading}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,380px)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visitors right now"
                value={String(live.visitorsRightNow)}
              />
              <MetricCard
                label="Total sales"
                value={formatMoney(live.totalSales, currency)}
              />
              <MetricCard
                label="Sessions"
                value={String(live.sessionsToday)}
                spark={live.sparklines.sessions}
                sparkColor="#0ea5e9"
              />
              <MetricCard
                label="Orders"
                value={String(live.ordersToday)}
                spark={live.sparklines.orders}
                sparkColor="#7c3aed"
              />
            </div>

            <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">
                Customer behavior
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(
                  [
                    ["Active carts", live.funnel.activeCarts],
                    ["Checking out", live.funnel.checkingOut],
                    ["Purchased", live.funnel.purchased],
                  ] as const
                ).map(([label, n]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-zinc-50 px-3 py-3 text-center"
                  >
                    <p className="text-2xl font-semibold text-zinc-900">{n}</p>
                    <p className="mt-1 text-xs text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Sessions by location
                </h2>
                {live.locations.length === 0 ? (
                  <p className="mt-6 text-sm text-zinc-400">
                    No data for this date range.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {live.locations.slice(0, 8).map((row) => (
                      <li
                        key={row.country}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium text-zinc-700">
                          {row.country === "??" ? "Unknown" : row.country}
                        </span>
                        <span className="text-zinc-500">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">
                  New vs returning customers
                </h2>
                {live.customers.new + live.customers.returning === 0 ? (
                  <p className="mt-6 text-sm text-zinc-400">
                    No data for this date range.
                  </p>
                ) : (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">New</span>
                      <span className="font-semibold">{live.customers.new}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${
                            (live.customers.new /
                              Math.max(
                                live.customers.new + live.customers.returning,
                                1
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">Returning</span>
                      <span className="font-semibold">
                        {live.customers.returning}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-2 shadow-sm">
            <LiveGlobe markers={live.markers} />
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        {ta("analyticsPage.title")}: visitors update when shoppers browse your
        live storefront. Open the store in another tab to see activity here.
      </p>
    </AdminPageShell>
  );
}
