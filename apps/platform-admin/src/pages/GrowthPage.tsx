import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

const SOURCE_LABEL: Record<string, string> = {
  outreach: "Outreach",
  partner: "Partner",
  direct: "Direct",
  earlier: "Earlier",
};

export default function GrowthPage() {
  const query = useQuery({ queryKey: ["platform-growth"], queryFn: () => api.growth() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth</h1>
        <p className="mt-1 text-sm text-slate-500">Stores opened in the last 7 days, and how far they got.</p>
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="New stores" value={String(data.signups)} />
              <Stat label="From outreach" value={String(data.bySource.outreach)} />
              <Stat label="From a partner" value={String(data.bySource.partner)} />
              <Stat label="Direct" value={String(data.bySource.direct)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label="Added a product" value={String(data.withProduct)} />
              <Stat label="Took a payment" value={String(data.withPaidOrder)} />
            </div>
            <section className="platform-card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.stores.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={4}>
                        No stores opened in the last 7 days.
                      </td>
                    </tr>
                  ) : (
                    data.stores.map((store) => (
                      <tr key={store.id}>
                        <td className="px-4 py-3">
                          <Link to={`/tenants/${store.id}`} className="font-medium text-sky-600">
                            {store.name}
                          </Link>
                          <p className="text-xs text-slate-500">{store.ownerEmail}</p>
                        </td>
                        <td className="px-4 py-3">{SOURCE_LABEL[store.source] ?? store.source}</td>
                        <td className="px-4 py-3">{store.hasProduct ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{store.hasPaidOrder ? "Yes" : "No"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
