import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { useAdminT } from "@/hooks/use-admin-t";
import { FormAlert } from "@/components/form-alert";

export default function DraftOrdersPage() {
  const { ta, t } = useAdminT();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
  const [pending, setPending] = useState(false);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);

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
    const ready = lines.filter((l) => l.productId);
    if (ready.length === 0) {
      setAlert({ ok: false, message: "Add at least one product" });
      return;
    }
    setPending(true);
    setAlert({});
    try {
      const r = await api.createDraftOrder({
        email,
        name: name || undefined,
        lines: ready,
      });
      setAlert({
        ok: true,
        message: `Draft #${r.order.orderNumber} created`,
      });
      setEmail("");
      setName("");
      setLines([{ productId: "", quantity: 1 }]);
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

  async function copyPaymentLink(orderId: string) {
    setLinkBusy(orderId);
    setAlert({});
    try {
      const r = await api.createDraftPaymentLink(orderId);
      await navigator.clipboard.writeText(r.checkoutUrl);
      setAlert({
        ok: true,
        message: "Payment link copied — send it to the customer to pay via Stripe.",
      });
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Could not create payment link",
      });
    } finally {
      setLinkBusy(null);
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: t.nav.draftOrders }]}
      title={ta("draftOrdersPage.title")}
      description={ta("draftOrdersPage.description")}
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
          <div className="space-y-3 sm:col-span-2">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_6rem_auto]">
                <label className="block text-sm">
                  Product
                  <select
                    className="ugclab-select mt-1.5 w-full"
                    value={line.productId}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, productId: e.target.value } : row
                        )
                      )
                    }
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
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, quantity: parseInt(e.target.value, 10) || 1 }
                            : row
                        )
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="self-end text-sm text-zinc-500"
                  onClick={() =>
                    setLines((prev) =>
                      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-medium text-violet-700"
              onClick={() => setLines((prev) => [...prev, { productId: "", quantity: 1 }])}
            >
              Add line
            </button>
          </div>
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
            <li key={o.id} className="flex items-center justify-between gap-3 px-6 py-4">
              <Link to={`/orders/${o.id}`} className="font-medium text-violet-600">
                #{o.orderNumber}
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-zinc-500">{o.customer?.email ?? "—"}</span>
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-700 disabled:opacity-50"
                  disabled={linkBusy === o.id}
                  onClick={() => void copyPaymentLink(o.id)}
                >
                  {linkBusy === o.id ? "Creating link…" : "Copy payment link"}
                </button>
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
