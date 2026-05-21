import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

type Discount = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  usedCount: number;
  maxUses: number | null;
  active: boolean;
  expiresAt: string | null;
};

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["discounts"],
    queryFn: () => api.discounts(),
  });
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const discounts = (data?.discounts ?? []) as Discount[];

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.createDiscount({
        code: fd.get("code"),
        type: fd.get("type"),
        value: fd.get("value"),
        minOrderAmount: fd.get("minOrderAmount") || null,
        maxUses: fd.get("maxUses") || null,
      });
      (e.target as HTMLFormElement).reset();
      setAlert({ ok: true, message: "Discount created" });
      await queryClient.invalidateQueries({ queryKey: ["discounts"] });
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discount codes</h1>
      <FormAlert ok={alert.ok} message={alert.message} />

      {isLoading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Uses</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {discounts.map((d) => (
                <tr key={d.id}>
                  <td className="px-6 py-4 font-mono font-semibold">{d.code}</td>
                  <td className="px-6 py-4">{d.type}</td>
                  <td className="px-6 py-4">
                    {d.type === "PERCENT" ? `${d.value}%` : `$${(d.value / 100).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4">
                    {d.usedCount}
                    {d.maxUses != null ? ` / ${d.maxUses}` : ""}
                  </td>
                  <td className="px-6 py-4">
                    {d.active ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-zinc-400">Off</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.updateDiscount(d.id, { active: !d.active });
                        await queryClient.invalidateQueries({ queryKey: ["discounts"] });
                      }}
                      className="text-sm text-violet-600"
                    >
                      {d.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={onCreate} className="admin-card max-w-lg space-y-4 p-6">
        <h2 className="font-semibold">New code</h2>
        <input name="code" placeholder="SAVE10" required className="ugclab-input font-mono uppercase" />
        <select name="type" className="ugclab-select">
          <option value="PERCENT">Percent off</option>
          <option value="FIXED">Fixed amount off</option>
        </select>
        <input name="value" type="number" step="0.01" placeholder="10 or 5.00" required className="ugclab-input" />
        <input name="minOrderAmount" type="number" step="0.01" placeholder="Min order (optional)" className="ugclab-input" />
        <input name="maxUses" type="number" placeholder="Max uses (optional)" className="ugclab-input" />
        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
          Create
        </button>
      </form>
    </div>
  );
}
