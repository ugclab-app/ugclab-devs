import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";

export default function DraftOrdersPage() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);

  const params = new URLSearchParams({ status: "DRAFT" });
  const { data: ordersData } = useQuery({
    queryKey: ["orders", "DRAFT"],
    queryFn: () => api.orders(params),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products", "draft-picker"],
    queryFn: () => api.products(new URLSearchParams({ limit: "100" })),
  });

  const orders = (ordersData?.orders ?? []) as {
    id: string;
    orderNumber: string;
    customer?: { email: string } | null;
  }[];
  const products = (productsData?.products ?? []) as { id: string; title: string }[];

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      setAlert({ ok: false, message: "Select a product" });
      return;
    }
    setPending(true);
    setAlert({});
    try {
      const r = await api.createDraftOrder({
        email,
        name: name || undefined,
        lines: [{ productId, quantity: qty }],
      });
      setAlert({
        ok: true,
        message: `Draft #${r.order.orderNumber} created`,
      });
      setEmail("");
      setName("");
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Draft orders" }]}
      title="Draft orders"
      description="Create manual orders for phone sales or invoices. Mark paid when payment is received outside checkout."
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      <section className="admin-card p-6">
        <h2 className="font-semibold text-zinc-900">Create draft order</h2>
        <form onSubmit={createDraft} className="mt-4 grid gap-4 sm:grid-cols-2 max-w-2xl">
          <label className="block text-sm sm:col-span-2">
            Customer email
            <input
              type="email"
              required
              className="ugclab-input mt-1.5 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Name (optional)
            <input
              className="ugclab-input mt-1.5 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Product
            <select
              required
              className="ugclab-select mt-1.5 w-full"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Quantity
            <input
              type="number"
              min={1}
              className="ugclab-input mt-1.5 w-full"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card mt-6 overflow-hidden">
        <h2 className="border-b px-6 py-4 font-semibold">Draft list</h2>
        <ul className="divide-y">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-6 py-4">
              <Link to={`/orders/${o.id}`} className="font-medium text-violet-600">
                #{o.orderNumber}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">{o.customer?.email ?? "—"}</span>
                <button
                  type="button"
                  className="text-sm font-medium text-violet-600"
                  onClick={async () => {
                    await api.markDraftPaid(o.id);
                    await qc.invalidateQueries({ queryKey: ["orders"] });
                  }}
                >
                  Mark paid
                </button>
              </div>
            </li>
          ))}
          {orders.length === 0 ? (
            <li className="px-6 py-8 text-sm text-zinc-500">No drafts yet.</li>
          ) : null}
        </ul>
      </section>
    </AdminPageShell>
  );
}
