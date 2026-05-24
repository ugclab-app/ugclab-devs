import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type Plan = {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  currency: string;
  productLimit: number | null;
  platformFeeBps: number;
  trialDays: number;
  stripePriceId: string | null;
  archived?: boolean;
  _count: { tenants: number };
};

export default function PlansPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["plans"], queryFn: () => api.plans() });
  const [editing, setEditing] = useState<Plan | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Subscription plans</h1>
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={() =>
            setEditing({
              id: "",
              slug: "",
              name: "",
              priceMonthly: 0,
              currency: "USD",
              productLimit: 50,
              platformFeeBps: 500,
              trialDays: 14,
              stripePriceId: null,
              _count: { tenants: 0 },
            })
          }
        >
          Add plan
        </button>
      </div>

      <QueryState query={query}>
        {(data) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.plans as Plan[]).map((p) => (
              <div key={p.id} className="platform-card p-6">
                <p className="font-mono text-xs text-slate-400">{p.slug}</p>
                <h2 className="mt-1 text-lg font-bold">{p.name}</h2>
                <p className="mt-2 text-2xl font-bold text-sky-600">
                  {formatMoney(p.priceMonthly, p.currency)}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  {p._count.tenants} store{p._count.tenants === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-slate-600">
                  Fee {(p.platformFeeBps / 100).toFixed(2)}% · {p.trialDays}d trial
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-sky-600"
                    onClick={() => setEditing(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-slate-500"
                    onClick={async () => {
                      await api.archivePlan(p.id, !p.archived);
                      await qc.invalidateQueries({ queryKey: ["plans"] });
                    }}
                  >
                    {p.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    type="button"
                    className="text-sm text-slate-500"
                    onClick={async () => {
                      const target = window.prompt("Target plan ID to migrate tenants to:");
                      if (!target) return;
                      const r = await api.migratePlan(p.id, target);
                      alert(`Migrated ${(r as { count: number }).count} stores`);
                    }}
                  >
                    Migrate tenants
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>

      {editing ? (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await qc.invalidateQueries({ queryKey: ["plans"] });
          }}
        />
      ) : null}
    </div>
  );
}

function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !plan.id;

  async function save(fd: FormData) {
    const body = {
      slug: fd.get("slug"),
      name: fd.get("name"),
      priceMonthly: Number(fd.get("priceMonthly")),
      productLimit: fd.get("productLimit")
        ? Number(fd.get("productLimit"))
        : null,
      platformFeeBps: Number(fd.get("platformFeeBps")),
      trialDays: Number(fd.get("trialDays")),
      stripePriceId: String(fd.get("stripePriceId") || "") || null,
    };
    if (isNew) await api.createPlan(body);
    else await api.updatePlan(plan.id, body);
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="platform-card w-full max-w-md space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save(new FormData(e.currentTarget));
        }}
      >
        <h2 className="text-lg font-bold">{isNew ? "New plan" : "Edit plan"}</h2>
        {isNew ? (
          <input
            name="slug"
            placeholder="slug"
            required
            className="ugclab-input w-full font-mono"
          />
        ) : (
          <p className="font-mono text-sm text-slate-500">{plan.slug}</p>
        )}
        <input
          name="name"
          defaultValue={plan.name}
          required
          className="ugclab-input w-full"
        />
        <input
          name="priceMonthly"
          type="number"
          defaultValue={plan.priceMonthly}
          className="ugclab-input w-full"
          placeholder="cents / month"
        />
        <input
          name="platformFeeBps"
          type="number"
          defaultValue={plan.platformFeeBps}
          className="ugclab-input w-full"
        />
        <input
          name="trialDays"
          type="number"
          defaultValue={plan.trialDays}
          className="ugclab-input w-full"
        />
        <input
          name="productLimit"
          type="number"
          defaultValue={plan.productLimit ?? ""}
          placeholder="product limit (empty = unlimited)"
          className="ugclab-input w-full"
        />
        <input
          name="stripePriceId"
          defaultValue={plan.stripePriceId ?? ""}
          className="ugclab-input w-full font-mono text-xs"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="ugclab-btn text-sm">
            Cancel
          </button>
          <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
