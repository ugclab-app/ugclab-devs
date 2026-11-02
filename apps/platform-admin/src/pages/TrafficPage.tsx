import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

export default function TrafficPage() {
  const query = useQuery({
    queryKey: ["platform-traffic"],
    queryFn: () => api.traffic(),
    refetchInterval: 15_000,
  });

  return (
    <QueryState query={query} loadingLabel="Loading traffic…">
      {(data) => (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Traffic</h1>
            <p className="mt-1 text-sm text-slate-500">
              People on storefronts in the last {data.liveWindowSeconds} seconds, and where paid
              orders came from in the last 30 days.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="platform-stat">
              <p className="text-sm text-slate-500">On storefronts now</p>
              <p className="mt-2 text-2xl font-bold">{data.visitorsRightNow}</p>
            </div>
            <div className="platform-stat">
              <p className="text-sm text-slate-500">Stores with visitors</p>
              <p className="mt-2 text-2xl font-bold">{data.storesWithVisitors}</p>
            </div>
            <div className="platform-stat">
              <p className="text-sm text-slate-500">Paid orders (30 days)</p>
              <p className="mt-2 text-2xl font-bold">{data.orders30d.totalOrders}</p>
              <p className="text-xs text-slate-500">
                {formatMoney(data.orders30d.totalRevenue, "USD")}
              </p>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="platform-card overflow-hidden">
              <h2 className="border-b px-6 py-4 font-semibold">Visitors by store</h2>
              {data.stores.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500">No one is on a storefront right now.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {data.stores.map((store) => (
                      <tr key={store.tenantId}>
                        <td className="px-6 py-3">
                          <Link to={`/tenants/${store.tenantId}`} className="font-medium text-sky-600">
                            {store.name}
                          </Link>
                          <p className="text-xs text-slate-500">{store.slug}</p>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold">{store.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="platform-card overflow-hidden">
              <h2 className="border-b px-6 py-4 font-semibold">Where they came from</h2>
              {data.liveSources.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500">No live sources yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {data.liveSources.map((row) => (
                      <tr key={row.source}>
                        <td className="px-6 py-3 font-medium">{row.source}</td>
                        <td className="px-6 py-3 text-right">{row.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="platform-card overflow-x-auto">
            <h2 className="border-b px-6 py-4 font-semibold">Live visitors</h2>
            {data.visitors.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-500">No live visitors.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.visitors.map((v, i) => (
                    <tr key={`${v.tenantId}-${v.lastSeenAt}-${i}`}>
                      <td className="px-4 py-3">
                        <Link to={`/tenants/${v.tenantId}`} className="text-sky-600">
                          {v.store}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{v.country ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{v.path ?? "/"}</td>
                      <td className="px-4 py-3">{v.stage}</td>
                      <td className="px-4 py-3">
                        {v.source}
                        {v.campaign ? (
                          <span className="ml-1 text-xs text-slate-500">{v.campaign}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <SourceTable
              title="Order sources (30 days)"
              empty="No paid orders in the last 30 days."
              rows={data.orders30d.bySource.map((row) => ({
                key: row.source,
                label: row.source,
                orders: row.orders,
                revenue: row.revenue,
              }))}
            />
            <SourceTable
              title="Campaigns"
              empty="No campaign tags on paid orders."
              rows={data.orders30d.byCampaign.map((row) => ({
                key: row.campaign,
                label: row.campaign,
                orders: row.orders,
                revenue: row.revenue,
              }))}
            />
            <SourceTable
              title="Affiliates"
              empty="No affiliate orders in the last 30 days."
              rows={data.orders30d.byAffiliate.map((row) => ({
                key: row.code,
                label: `${row.partner} (${row.code})`,
                orders: row.orders,
                revenue: row.revenue,
              }))}
            />
          </section>
        </div>
      )}
    </QueryState>
  );
}

function SourceTable({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: string; label: string; orders: number; revenue: number }[];
}) {
  return (
    <div className="platform-card overflow-hidden">
      <h2 className="border-b px-6 py-4 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="px-6 py-3">
                  <p className="font-medium">{row.label}</p>
                  <p className="text-xs text-slate-500">{row.orders} orders</p>
                </td>
                <td className="px-6 py-3 text-right">{formatMoney(row.revenue, "USD")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
