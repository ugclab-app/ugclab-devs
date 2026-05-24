import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { EmptyState } from "@/components/empty-state";

export default function AbandonedCartsPage() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const { data: stats } = useQuery({
    queryKey: ["abandoned-cart-stats"],
    queryFn: () => api.abandonedCartStats(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["abandoned-carts"],
    queryFn: () => api.abandonedCarts(),
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;

  const carts = (data?.carts ?? []) as {
    id: string;
    email: string | null;
    subtotalAmount: number;
    currency: string;
    updatedAt: string;
    remindedAt1h: string | null;
    remindedAt24h: string | null;
  }[];

  const totalValue = carts.reduce((s, c) => s + c.subtotalAmount, 0);
  const currency = carts[0]?.currency ?? "USD";

  return (
    <AdminPageShell
      crumbs={[{ label: "Abandoned carts" }]}
      title="Abandoned carts"
      description="Recovery emails send after 1h and 24h when the shopper left an email."
      actions={
        <Link
          to="/marketing"
          className="ugclab-btn ugclab-btn-primary text-sm"
          state={{ segment: "ABANDONED_CART" }}
        >
          Create recovery campaign
        </Link>
      }
    >
      {stats ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <div className="admin-card p-4">
            <p className="text-xs text-zinc-500">Open carts</p>
            <p className="text-xl font-bold">{stats.openCarts}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-zinc-500">Open value</p>
            <p className="text-xl font-bold">
              {formatMoney(stats.openValueCents, stats.currency)}
            </p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-zinc-500">Recovery rate</p>
            <p className="text-xl font-bold">
              {stats.recoveryRatePct != null ? `${stats.recoveryRatePct}%` : "—"}
            </p>
          </div>
          <div className="admin-card p-4 text-xs text-zinc-500">
            Recovery = carts that converted after at least one reminder email.
          </div>
        </div>
      ) : null}
      {alert ? (
        <p className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-2 text-sm text-violet-900">
          {alert}
        </p>
      ) : null}
      {carts.length > 0 ? (
        <p className="mb-4 text-sm text-zinc-600">
          {carts.length} cart{carts.length === 1 ? "" : "s"} · potential{" "}
          {formatMoney(totalValue, currency)}
        </p>
      ) : null}
      {carts.length === 0 ? (
        <EmptyState
          title="No abandoned carts"
          description="Carts appear when shoppers add items and leave without checkout."
        />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50/80 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Reminders</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {carts.map((cart) => (
                <tr key={cart.id}>
                  <td className="px-6 py-4">{cart.email ?? "—"}</td>
                  <td className="px-6 py-4 font-medium">
                    {formatMoney(cart.subtotalAmount, cart.currency)}
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500">
                    {cart.remindedAt1h ? "1h ✓" : "1h —"} ·{" "}
                    {cart.remindedAt24h ? "24h ✓" : "24h —"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(cart.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {cart.email ? (
                      <button
                        type="button"
                        disabled={sending === cart.id}
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50"
                        onClick={async () => {
                          setSending(cart.id);
                          setAlert("");
                          try {
                            const r = await api.sendAbandonedCartRecovery(cart.id);
                            setAlert(`Recovery email sent to ${r.email}`);
                            await qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
                          } catch (e) {
                            setAlert(e instanceof Error ? e.message : "Send failed");
                          } finally {
                            setSending(null);
                          }
                        }}
                      >
                        {sending === cart.id ? "Sending…" : "Send recovery"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">No email</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
