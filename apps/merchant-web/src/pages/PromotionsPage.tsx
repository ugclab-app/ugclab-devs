import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";

type Promotion = {
  id: string;
  type: "CART_PERCENT" | "FREE_SHIPPING";
  active: boolean;
  value: number;
  minOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function PromotionsPage() {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const currency = tenant?.settings?.currency ?? "USD";
  const { data, isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => api.promotions(),
  });

  const [type, setType] = useState<"CART_PERCENT" | "FREE_SHIPPING">("CART_PERCENT");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createPromotion({
        type,
        value: type === "CART_PERCENT" ? Math.round(parseFloat(value) || 0) : 0,
        minOrderAmount: minOrder ? Math.round(parseFloat(minOrder) * 100) : undefined,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      setMinOrder("");
      setStartsAt("");
      setEndsAt("");
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.updatePromotion(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions"] }),
  });

  const promotions = (data?.promotions ?? []) as Promotion[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Auto discounts</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Automatic cart discounts and free shipping — with optional schedule.
      </p>

      <form
        className="admin-card mb-8 max-w-xl space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-semibold">New promotion</h2>
        <label className="block text-sm">
          Type
          <select
            className="ugclab-input mt-1"
            value={type}
            onChange={(e) => setType(e.target.value as "CART_PERCENT" | "FREE_SHIPPING")}
          >
            <option value="CART_PERCENT">% off cart</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </label>
        {type === "CART_PERCENT" ? (
          <label className="block text-sm">
            Percent off
            <input
              className="ugclab-input mt-1"
              type="number"
              min={1}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        ) : null}
        <label className="block text-sm">
          Minimum order ({currency}, optional)
          <input
            className="ugclab-input mt-1"
            type="number"
            step="0.01"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Starts (optional)
            <input
              type="datetime-local"
              className="ugclab-input mt-1"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Ends (optional)
            <input
              type="datetime-local"
              className="ugclab-input mt-1"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={create.isPending} className="ugclab-btn ugclab-btn-primary">
          {create.isPending ? "Adding…" : "Add promotion"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : promotions.length === 0 ? (
        <p className="text-zinc-500">No auto discounts yet.</p>
      ) : (
        <ul className="admin-card divide-y">
          {promotions.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="font-medium">
                  {p.type === "CART_PERCENT" ? `${p.value}% off cart` : "Free shipping"}
                </p>
                {p.minOrderAmount != null ? (
                  <p className="text-xs text-zinc-500">
                    Min order {formatMoney(p.minOrderAmount, currency)}
                  </p>
                ) : null}
                <p className="text-xs text-zinc-400">
                  {fmtDate(p.startsAt)} → {fmtDate(p.endsAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.active}
                    onChange={(e) => toggle.mutate({ id: p.id, active: e.target.checked })}
                  />
                  Active
                </label>
                <button type="button" className="text-sm text-red-600" onClick={() => remove.mutate(p.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
