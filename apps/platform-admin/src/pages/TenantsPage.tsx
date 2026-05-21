import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function TenantsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", params.toString()],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (status) p.set("status", status);
      return api.tenants(p);
    },
  });

  const tenants = (data?.tenants ?? []) as {
    id: string;
    name: string;
    slug: string;
    status: string;
    owner: { email: string; name: string | null };
    plan: { name: string } | null;
    productCount: number;
    orderCount: number;
    storefrontUrl: string;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stores</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name, slug, email…"
          defaultValue={q}
          className="ugclab-input max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value;
              const p = new URLSearchParams(params);
              if (v) p.set("q", v);
              else p.delete("q");
              setParams(p);
            }
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            const p = new URLSearchParams(params);
            if (e.target.value) p.set("status", e.target.value);
            else p.delete("status");
            setParams(p);
          }}
          className="ugclab-select w-40"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="platform-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3">Orders</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium">{t.name}</p>
                    <p className="font-mono text-xs text-slate-400">{t.slug}</p>
                  </td>
                  <td className="px-6 py-4">{t.owner.email}</td>
                  <td className="px-6 py-4">{t.productCount}</td>
                  <td className="px-6 py-4">{t.orderCount}</td>
                  <td className="px-6 py-4">{t.status}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/tenants/${t.id}`} className="font-semibold text-sky-600">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
