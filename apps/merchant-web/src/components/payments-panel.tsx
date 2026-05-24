import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { StripePayoutsPanel } from "@/components/stripe-payouts-panel";
import { MerchantMorPayoutsPanel } from "@/components/merchant-mor-payouts-panel";
import { PaymentPayoutSettings } from "@/components/payment-payout-settings";

function StatusBadge({
  ready,
  configured,
  mor,
}: {
  ready: boolean;
  configured: boolean;
  mor?: boolean;
}) {
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {mor ? "Payments active" : "Payments connected"}
      </span>
    );
  }
  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Setup required
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
      Unavailable
    </span>
  );
}

export function PaymentsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => api.stripeStatus(),
  });

  const stripeReturn = searchParams.get("stripe");
  if (stripeReturn === "return" || stripeReturn === "refresh") {
    void refetch();
    searchParams.delete("stripe");
    setSearchParams(searchParams, { replace: true });
  }

  if (isLoading || !data) {
    return (
      <div className="admin-card animate-pulse p-8">
        <div className="h-5 w-40 rounded bg-zinc-100" />
        <div className="mt-4 h-4 w-full max-w-md rounded bg-zinc-100" />
      </div>
    );
  }

  const mor = data.paymentModel === "mor";
  const ready = data.paymentsReady;
  const feePct =
    data.platformFeeBps > 0 ? (data.platformFeeBps / 100).toFixed(2) : null;
  const stripeFeePct = import.meta.env.VITE_STRIPE_PROCESSING_FEE_PCT ?? "3";

  async function connect() {
    setPending(true);
    setAlert({});
    try {
      const { url } = await api.stripeConnect();
      window.location.href = url;
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Could not start onboarding",
      });
      setPending(false);
    }
  }

  async function openDashboard() {
    setPending(true);
    try {
      const { url } = await api.stripeDashboardLink();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Could not open Stripe",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
    <SettingsPanelShell
      title="Accept card payments"
      description={
        mor
          ? "Shoppers pay Tescommerce (platform). You receive your share after our fee — no Stripe account required."
          : "Connect Stripe to charge customers. Orders stay pending until payment succeeds."
      }
      badge={
        <StatusBadge ready={ready} configured={data.configured} mor={mor} />
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Platform fee
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {feePct != null ? `${feePct}%` : "—"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Per successful order</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Stripe fee
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900">+{stripeFeePct}%</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Card processing (charged by Stripe)
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Model
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {mor ? "Platform MoR" : "Stripe Connect"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {mor ? "Tescommerce collects payments" : "Per-merchant Stripe"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Checkout
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {ready ? "Active" : "—"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Card & Link via Stripe</p>
        </div>
      </div>

      {!data.configured ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-6 text-center">
          <p className="text-sm font-medium text-zinc-800">Payments not enabled yet</p>
          <p className="mt-2 text-sm text-zinc-500">
            Add STRIPE_SECRET_KEY to the platform environment, then restart the API.
          </p>
        </div>
      ) : mor ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            When a customer pays, funds go to the platform Stripe account. Your balance
            below is what we owe you (sales minus platform fee). Request a payout when
            you want to withdraw — we process manually per your contract.
          </p>
          <MerchantMorPayoutsPanel />
        </div>
      ) : data.connected ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Shoppers pay on Stripe Checkout. You receive the order total minus the platform
            fee; Stripe processing fees apply separately in your Stripe Dashboard.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="ugclab-btn border border-zinc-200 bg-white text-sm"
            >
              Refresh status
            </button>
            <button
              type="button"
              onClick={openDashboard}
              disabled={pending}
              className="ugclab-btn ugclab-btn-primary text-sm"
            >
              Open Stripe Dashboard
            </button>
          </div>
          <StripePayoutsPanel connected={data.connected} />
        </div>
      ) : (
        <div className="space-y-5">
          <ol className="space-y-3 text-sm text-zinc-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                1
              </span>
              <span>Connect your Stripe Express account (business & bank details).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                2
              </span>
              <span>Return here — status should show Payments connected.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                3
              </span>
              <span>Run a test order on your storefront.</span>
            </li>
          </ol>
          <button
            type="button"
            onClick={connect}
            disabled={pending}
            className="ugclab-btn ugclab-btn-primary px-6 py-2.5"
          >
            {pending ? "Redirecting to Stripe…" : "Connect with Stripe"}
          </button>
        </div>
      )}
    </SettingsPanelShell>
    <PaymentPayoutSettings mor={mor} />
    </div>
  );
}
