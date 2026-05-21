import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useState } from "react";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", q],
    queryFn: () => api.customers(q || undefined),
  });

  const customers = (data?.customers ?? []) as {
    id: string;
    email: string;
    name: string | null;
    _count: { orders: number };
    orders: { totalAmount: number; createdAt: string }[];
  }[];

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="ugclab-btn border border-zinc-200 bg-white text-sm cursor-pointer">
          Import CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const r = await api.importCustomersCsv(file);
                setImportMsg(`Imported ${r.created} customers`);
                refetch();
              } catch (err) {
                setImportMsg(
                  err instanceof Error ? err.message : "Import failed"
                );
              }
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-xs text-zinc-500">
          Columns: email, name, country
        </span>
        {importMsg ? (
          <span className="text-sm text-violet-700">{importMsg}</span>
        ) : null}
      </div>
      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          refetch();
        }}
      >
        <input
          className="ugclab-input max-w-md"
          placeholder="Search email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <div className="admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Orders</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4">
                  <p className="font-medium">{c.email}</p>
                  {c.name ? <p className="text-zinc-500">{c.name}</p> : null}
                </td>
                <td className="px-6 py-4">{c._count.orders}</td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/customers/${c.id}`} className="text-violet-600 font-semibold">
                    History →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
