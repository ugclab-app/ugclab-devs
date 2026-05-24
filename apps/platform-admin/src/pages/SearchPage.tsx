import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const query = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.search(submitted),
    enabled: submitted.length >= 2,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <input
          className="flex-1 rounded-lg border px-4 py-2 text-sm"
          placeholder="Store, order #, email, domain, Stripe ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="ugclab-btn ugclab-btn-primary">
          Search
        </button>
      </form>

      {query.isLoading ? <p className="text-slate-500">Searching…</p> : null}
      {query.data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Stores">
            {(query.data.stores as { id: string; slug: string; name: string; status: string }[]).map(
              (s) => (
                <Link key={s.id} to={`/tenants/${s.id}`} className="block text-sm text-sky-600">
                  {s.name} ({s.slug}) — {s.status}
                </Link>
              )
            )}
          </Section>
          <Section title="Orders">
            {(query.data.orders as {
              id: string;
              orderNumber: string;
              tenantSlug: string;
              totalAmount: number;
              currency: string;
            }[]).map((o) => (
              <p key={o.id} className="text-sm">
                #{o.orderNumber} · {o.tenantSlug} · {formatMoney(o.totalAmount, o.currency)}
              </p>
            ))}
          </Section>
          <Section title="Users">
            {(query.data.users as { id: string; email: string; role: string }[]).map((u) => (
              <Link key={u.id} to={`/users/${u.id}`} className="block text-sm text-sky-600">
                {u.email} ({u.role})
              </Link>
            ))}
          </Section>
          <Section title="Domains">
            {(query.data.domains as { id: string; domain: string; tenantSlug: string }[]).map((d) => (
              <p key={d.id} className="text-sm">
                {d.domain} → {d.tenantSlug}
              </p>
            ))}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="platform-card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
