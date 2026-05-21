import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function CustomerSegmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-segments"],
    queryFn: () => api.customerSegments(),
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const d = data as {
    all: number;
    vip: number;
    repeat: number;
    new: number;
    byCountry: Record<string, number>;
    customers: {
      id: string;
      email: string;
      name: string | null;
      country: string | null;
      orderCount: number;
      totalSpent: number;
      segment: string[];
    }[];
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Customer segments</h1>
        <p className="mt-1 text-sm text-zinc-500">
          VIP ($500+ spent), repeat buyers (2+ orders), and more.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="All customers" value={d.all} />
        <Stat label="VIP" value={d.vip} />
        <Stat label="Repeat buyers" value={d.repeat} />
        <Stat label="No orders yet" value={d.new} />
      </div>
      {Object.keys(d.byCountry).length > 0 ? (
        <section className="admin-card p-6">
          <h2 className="font-semibold">By country</h2>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {Object.entries(d.byCountry).map(([code, n]) => (
              <li key={code} className="rounded-full bg-zinc-100 px-3 py-1">
                {code}: {n}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50/80 text-left text-xs uppercase text-zinc-500">
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Segments</th>
              <th className="px-6 py-3">Orders</th>
              <th className="px-6 py-3 text-right">Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {d.customers
              .filter((c) => c.segment.length > 0)
              .slice(0, 100)
              .map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4">
                    <Link to={`/customers/${c.id}`} className="font-medium text-violet-600">
                      {c.email}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                      {c.segment.join(", ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{c.orderCount}</td>
                  <td className="px-6 py-4 text-right">
                    {formatMoney(c.totalSpent, "USD")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-card p-5">
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
