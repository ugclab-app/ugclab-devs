import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { useAdminT } from "@/hooks/use-admin-t";

type ProductRow = {
  id: string;
  title: string;
  priceAmount?: number;
  status?: string;
};

type CartLine = { productId: string; title: string; priceAmount: number; qty: number };

export default function PosPage() {
  const { t } = useAdminT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("pos@walk-in.local");
  const [name, setName] = useState("Walk-in");
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  const { data } = useQuery({
    queryKey: ["products", "pos"],
    queryFn: () => api.products(new URLSearchParams({ limit: "100", sort: "newest" })),
  });
  const currency = data?.currency ?? "USD";
  const products = (data?.products ?? []) as ProductRow[];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const active = products.filter((p) => !p.status || p.status === "ACTIVE");
    if (!needle) return active.slice(0, 24);
    return active
      .filter((p) => p.title.toLowerCase().includes(needle))
      .slice(0, 24);
  }, [products, q]);

  const total = cart.reduce((s, l) => s + l.priceAmount * l.qty, 0);

  function addProduct(p: ProductRow) {
    setCart((prev) => {
      const hit = prev.find((l) => l.productId === p.id);
      if (hit) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          title: p.title,
          priceAmount: p.priceAmount ?? 0,
          qty: 1,
        },
      ];
    });
  }

  async function checkout(markPaid: boolean) {
    if (cart.length === 0) {
      setAlert({ ok: false, message: "Add at least one product" });
      return;
    }
    setPending(true);
    setAlert({});
    try {
      const r = await api.createDraftOrder({
        email: email.trim() || "pos@walk-in.local",
        name: name.trim() || "Walk-in",
        lines: cart.map((l) => ({ productId: l.productId, quantity: l.qty })),
        note: "POS sale",
      });
      if (markPaid) {
        await api.markDraftPaid(r.order.id);
      }
      setAlert({
        ok: true,
        message: markPaid
          ? `Sale #${r.order.orderNumber} marked paid`
          : `Draft #${r.order.orderNumber} created`,
      });
      setCart([]);
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Sale failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "POS" }]}
      title="Point of sale"
      description="Quick in-person sale — create a draft and mark paid when cash/card is taken."
    >
      <FormAlert ok={alert.ok} message={alert.message} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card space-y-3 p-4">
          <input
            className="ugclab-input w-full"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-violet-50"
                  onClick={() => addProduct(p)}
                >
                  <span className="truncate font-medium text-zinc-900">{p.title}</span>
                  <span className="shrink-0 text-zinc-600">
                    {formatMoney(p.priceAmount ?? 0, currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card space-y-4 p-4">
          <h2 className="font-semibold text-zinc-900">Cart</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-zinc-500">Tap products to add</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((l) => (
                <li
                  key={l.productId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {l.title} × {l.qty}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {formatMoney(l.priceAmount * l.qty, currency)}
                    <button
                      type="button"
                      className="text-zinc-400 hover:text-red-600"
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((x) => x.productId !== l.productId)
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-lg font-bold">
            Total {formatMoney(total, currency)}
          </p>
          <label className="block text-sm">
            Customer email
            <input
              className="ugclab-input mt-1 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Name
            <input
              className="ugclab-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="ugclab-btn ugclab-btn-primary"
              onClick={() => void checkout(true)}
            >
              {pending ? "…" : "Charge / Mark paid"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="ugclab-btn border border-zinc-200 bg-white"
              onClick={() => void checkout(false)}
            >
              Save as draft
            </button>
            <Link to="/draft-orders" className="ugclab-btn border border-zinc-200 bg-white text-sm">
              Draft orders
            </Link>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
