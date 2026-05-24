import { useState } from "react";
import { formatMoney } from "@ugclab/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { payoutStatusClass, payoutStatusLabel } from "@/lib/payout-status";

export function MerchantMorPayoutsPanel() {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["mor-balance"],
    queryFn: () => api.morBalance(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-zinc-500">Loading balance…</p>;
  }

  const currency = data.currency;
  const showCurrencyNote =
    data.storefrontCurrency &&
    data.payoutCurrency &&
    data.storefrontCurrency !== data.payoutCurrency;

  async function requestPayout() {
    setPending(true);
    setAlert({});
    try {
      await api.requestMorPayout();
      setAlert({
        ok: true,
        message: "Payout request submitted. The platform will send funds per your agreement.",
      });
      await qc.invalidateQueries({ queryKey: ["mor-balance"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-violet-100 bg-violet-50/40 p-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Your earnings (MoR)</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Buyers pay the platform. You receive order totals minus the platform fee. Payouts
          are sent by Tescommerce to your bank or wallet per your merchant agreement.
        </p>
        {data.payoutMinCents != null ? (
          <p className="mt-2 text-xs text-zinc-500">
            Minimum payout: {formatMoney(data.payoutMinCents, currency)}
            {data.payoutSchedule ? ` · ${data.payoutSchedule}` : null}
          </p>
        ) : null}
        {showCurrencyNote ? (
          <p className="mt-2 text-xs text-amber-800">
            Earnings tracked in {data.storefrontCurrency}; payouts sent in{" "}
            {data.payoutCurrency}.
          </p>
        ) : null}
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">Available</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {formatMoney(data.availableCents, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">Lifetime earned</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {formatMoney(data.earnedCents, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">Paid out</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {formatMoney(data.paidOutCents, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">Requested / processing</p>
          <p className="mt-1 text-xl font-bold text-amber-700">
            {formatMoney(data.pendingPayoutCents, currency)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            pending ||
            data.availableCents <= 0 ||
            (data.payoutMinCents != null && data.availableCents < data.payoutMinCents)
          }
          onClick={() => requestPayout()}
          className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Request payout (full available balance)"}
        </button>
        <button
          type="button"
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
          onClick={() => api.exportMorPayoutsCsv().catch((e) => setAlert({ ok: false, message: String(e) }))}
        >
          Export payouts CSV
        </button>
      </div>

      {data.payouts.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Payout history</p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-zinc-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4 text-zinc-700">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    {formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="py-2">
                    <span className={payoutStatusClass(p.status)}>
                      {payoutStatusLabel(p.status)}
                    </span>
                    {p.paidAt ? (
                      <p className="text-[10px] text-zinc-400">
                        Paid {new Date(p.paidAt).toLocaleDateString()}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
