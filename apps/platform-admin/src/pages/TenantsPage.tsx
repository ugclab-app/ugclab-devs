import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SUSPENDED: "bg-red-50 text-red-700",
    PENDING: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}

export default function TenantsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    gmv30d: number;
    orders30d: number;
    currency: string;
    storefrontUrl: string;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Stores</h1>
        <div className="flex gap-2">
        <Link to="/tenants/new" className="ugclab-btn ugclab-btn-primary text-sm">
          Create store
        </Link>
        <button
          type="button"
          onClick={() => api.exportTenantsCsv().catch((e) => alert(String(e)))}
          className="ugclab-btn border border-slate-200 bg-white text-sm"
        >
          Export CSV
        </button>
        {selected.size > 0 ? (
          <>
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              onClick={async () => {
                if (!confirm(`Suspend ${selected.size} store(s)?`)) return;
                await api.bulkSuspendTenants([...selected]);
                setSelected(new Set());
              }}
            >
              Suspend ({selected.size})
            </button>
            <button
              type="button"
              className="ugclab-btn border border-slate-200 bg-white text-sm"
              onClick={async () => {
                const subject = window.prompt("Email subject:");
                if (!subject) return;
                const html = window.prompt("HTML body:") ?? "<p>Message from UGCLab</p>";
                const r = await api.bulkEmailTenants([...selected], subject, html);
                alert(`Sent ${(r as { sent: number }).sent} emails`);
              }}
            >
              Email owners
            </button>
          </>
        ) : null}
        </div>
      </div>

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
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={tenants.length > 0 && selected.size === tenants.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(tenants.map((t) => t.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">GMV (30d)</th>
                <th className="px-6 py-3">Orders (30d)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(t.id);
                        else next.delete(t.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{t.name}</p>
                    <p className="font-mono text-xs text-slate-400">{t.slug}</p>
                  </td>
                  <td className="px-6 py-4">{t.owner.email}</td>
                  <td className="px-6 py-4 text-slate-600">{t.plan?.name ?? "—"}</td>
                  <td className="px-6 py-4 font-medium">
                    {formatMoney(t.gmv30d, t.currency)}
                  </td>
                  <td className="px-6 py-4">{t.orders30d}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/tenants/${t.id}`} className="font-semibold text-sky-600">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    No stores found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
