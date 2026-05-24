import { useState } from "react";
import { api } from "@/api/client";

export function TenantBillingPanel({
  tenantId,
  onDone,
}: {
  tenantId: string;
  onDone: () => Promise<void>;
}) {
  const [trialDays, setTrialDays] = useState("7");
  const [credit, setCredit] = useState("");

  return (
    <section className="platform-card p-6 space-y-3 text-sm">
      <h2 className="font-semibold">Billing actions</h2>
      <div className="flex flex-wrap gap-2 items-end">
        <label>
          <span className="text-xs text-slate-500">Extend trial (days)</span>
          <input
            type="number"
            className="ugclab-input mt-1 w-24 block"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="ugclab-btn border border-slate-200 bg-white text-sm"
          onClick={async () => {
            await api.updateTenantBilling(tenantId, {
              extendTrialDays: Number(trialDays) || 0,
            });
            await onDone();
          }}
        >
          Extend trial
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700"
          onClick={async () => {
            if (!confirm("Cancel Stripe subscription for this store?")) return;
            await api.updateTenantBilling(tenantId, { cancelSubscription: true });
            await onDone();
          }}
        >
          Cancel subscription
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label>
          <span className="text-xs text-slate-500">Manual credit (cents)</span>
          <input
            type="number"
            className="ugclab-input mt-1 w-32 block"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={async () => {
            await api.updateTenantBilling(tenantId, {
              creditCents: Number(credit) || 0,
            });
            setCredit("");
            await onDone();
          }}
        >
          Add credit
        </button>
      </div>
    </section>
  );
}
