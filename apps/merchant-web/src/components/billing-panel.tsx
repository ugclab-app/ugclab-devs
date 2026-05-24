import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { BillingInvoicesPanel } from "@/components/billing-invoices-panel";

export function BillingPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const billingReturn = searchParams.get("billing");
  if (billingReturn === "success") {
    void qc.invalidateQueries({ queryKey: ["billing"] });
    searchParams.delete("billing");
    setSearchParams(searchParams, { replace: true });
  }

  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => api.billing(),
  });

  if (isLoading || !data) {
    return <div className="admin-card animate-pulse p-8 h-32" />;
  }

  const sub = data.subscription as {
    status: string;
    plan: { name: string; slug: string; priceMonthly: number; currency: string } | null;
    trialEndsAt: string | null;
  };
  const plans = data.plans as {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
    currency: string;
    trialDays: number;
    isCurrent: boolean;
  }[];

  async function subscribe(planId: string) {
    setPending(true);
    setAlert({});
    try {
      const { url } = await api.billingCheckout(planId);
      window.location.href = url;
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Could not start checkout",
      });
      setPending(false);
    }
  }

  async function openPortal() {
    setPending(true);
    try {
      const { url } = await api.billingPortal();
      window.location.href = url;
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Portal unavailable",
      });
    } finally {
      setPending(false);
    }
  }

  const statusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Canceled",
    none: "Free / not subscribed",
  };

  return (
    <div className="space-y-8">
    <SettingsPanelShell
      title="Platform subscription"
      description="Pay Tescommerce for your store plan. Card payments for customers are separate (Payments tab)."
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      {!data.configured ? (
        <p className="text-sm text-zinc-600">
          Billing is not configured on this environment (STRIPE_SECRET_KEY).
        </p>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-medium uppercase text-violet-600">Current plan</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">
              {sub.plan?.name ?? "Starter (default)"}
            </p>
            <p className="text-sm text-zinc-600">
              Status: {statusLabel[sub.status] ?? sub.status}
              {sub.trialEndsAt
                ? ` · trial ends ${new Date(sub.trialEndsAt).toLocaleDateString()}`
                : null}
            </p>
            {sub.plan && sub.plan.priceMonthly > 0 ? (
              <p className="mt-1 text-sm text-zinc-500">
                {formatMoney(sub.plan.priceMonthly, sub.plan.currency)}/month
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-4 ${p.isCurrent ? "border-violet-300 bg-violet-50/30" : "border-zinc-200"}`}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-2xl font-bold">
                  {p.priceMonthly === 0
                    ? "Free"
                    : formatMoney(p.priceMonthly, p.currency)}
                  {p.priceMonthly > 0 ? (
                    <span className="text-sm font-normal text-zinc-500">/mo</span>
                  ) : null}
                </p>
                {p.trialDays > 0 && p.priceMonthly > 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">{p.trialDays}-day trial</p>
                ) : null}
                {p.isCurrent ? (
                  <span className="mt-3 inline-block text-xs font-semibold text-violet-700">
                    Current plan
                  </span>
                ) : p.priceMonthly > 0 ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => subscribe(p.id)}
                    className="ugclab-btn ugclab-btn-primary mt-3 text-sm"
                  >
                    {pending ? "Redirecting…" : "Upgrade"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {sub.status !== "none" &&
          (data.subscription as { stripeSubscriptionId?: string })?.stripeSubscriptionId ? (
            <button
              type="button"
              disabled={pending}
              onClick={openPortal}
              className="ugclab-btn mt-6 border border-zinc-200 bg-white text-sm"
            >
              Manage subscription in Stripe
            </button>
          ) : null}
        </>
      )}
    </SettingsPanelShell>
    <BillingInvoicesPanel />
    </div>
  );
}
