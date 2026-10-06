import { useState } from "react";
import { formatMoney } from "@ugclab/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { useAdminLocale } from "@/context/admin-locale";
import { useAdminT } from "@/hooks/use-admin-t";
import { payoutStatusClass, payoutStatusLabel } from "@/lib/payout-status";

export function MerchantMorPayoutsPanel() {
  const { ta } = useAdminT();
  const { locale } = useAdminLocale();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["mor-balance"],
    queryFn: () => api.morBalance(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-zinc-500">{ta("morPayouts.loading")}</p>;
  }

  const currency = data.currency;
  const moneyLoc = locale === "ru" ? "ru-RU" : "en-US";
  const showCurrencyNote =
    data.storefrontCurrency &&
    data.payoutCurrency &&
    data.storefrontCurrency !== data.payoutCurrency;

  async function requestPayout() {
    setPending(true);
    setAlert({});
    try {
      await api.requestMorPayout();
      setAlert({ ok: true, message: ta("morPayouts.requestOk") });
      await qc.invalidateQueries({ queryKey: ["mor-balance"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : ta("morPayouts.requestFail"),
      });
    } finally {
      setPending(false);
    }
  }

  const currencyNote = showCurrencyNote
    ? ta("morPayouts.currencyNote")
        .replace("{{store}}", data.storefrontCurrency!)
        .replace("{{payout}}", data.payoutCurrency!)
    : null;

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-violet-100 bg-violet-50/40 p-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{ta("morPayouts.title")}</h3>
        <p className="mt-1 text-sm text-zinc-600">{ta("morPayouts.desc")}</p>
        {data.payoutMinCents != null ? (
          <p className="mt-2 text-xs text-zinc-500">
            {ta("morPayouts.minPayout")}: {formatMoney(data.payoutMinCents, currency, moneyLoc)}
            {data.payoutSchedule ? ` · ${data.payoutSchedule}` : null}
          </p>
        ) : null}
        {currencyNote ? (
          <p className="mt-2 text-xs text-amber-800">{currencyNote}</p>
        ) : null}
      </div>

      <div className="rounded-lg border border-violet-100 bg-white/80 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-800">
          {ta("morPayouts.methodsTitle")}
        </h4>
        <p className="mt-1 text-sm text-zinc-600">{ta("morPayouts.methodsIntro")}</p>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-700">
          <li>{ta("morPayouts.methodMbank")}</li>
          <li>{ta("morPayouts.methodOptima")}</li>
          <li>{ta("morPayouts.methodWise")}</li>
        </ul>
        <p className="mt-2 text-xs text-zinc-500">{ta("morPayouts.methodSla")}</p>
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">
            {ta("morPayouts.available")}
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {formatMoney(data.availableCents, currency, moneyLoc)}
          </p>
        </div>
        {(data.heldCents ?? 0) > 0 ? (
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">
              {ta("morPayouts.held")}
            </p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {formatMoney(data.heldCents ?? 0, currency, moneyLoc)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">{ta("morPayouts.heldHint")}</p>
          </div>
        ) : null}
        {(data.reserveCents ?? 0) > 0 ? (
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">
              {ta("morPayouts.reserve")}
            </p>
            <p className="mt-1 text-xl font-bold text-zinc-700">
              {formatMoney(data.reserveCents ?? 0, currency, moneyLoc)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">{ta("morPayouts.reserveHint")}</p>
          </div>
        ) : null}
        {"owedToCreatorsCents" in data && (data.owedToCreatorsCents ?? 0) > 0 ? (
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">
              {ta("morPayouts.owedCreators")}
            </p>
            <p className="mt-1 text-xl font-bold text-violet-700">
              {formatMoney(data.owedToCreatorsCents as number, currency, moneyLoc)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">{ta("morPayouts.creatorsHint")}</p>
          </div>
        ) : null}
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">
            {ta("morPayouts.lifetimeEarned")}
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {formatMoney(data.earnedCents, currency, moneyLoc)}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">{ta("morPayouts.paidOut")}</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">
            {formatMoney(data.paidOutCents, currency, moneyLoc)}
          </p>
        </div>
        <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-400">
            {ta("morPayouts.requestedProcessing")}
          </p>
          <p className="mt-1 text-xl font-bold text-amber-700">
            {formatMoney(data.pendingPayoutCents, currency, moneyLoc)}
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
          {pending ? ta("morPayouts.requesting") : ta("morPayouts.requestFull")}
        </button>
        <button
          type="button"
          className="ugclab-btn border border-zinc-200 bg-white text-sm"
          onClick={() =>
            api.exportMorPayoutsCsv().catch((e) =>
              setAlert({ ok: false, message: String(e) })
            )
          }
        >
          {ta("morPayouts.exportCsv")}
        </button>
      </div>

      {data.payouts.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
            {ta("morPayouts.history")}
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-zinc-500">
                <th className="py-2 pr-4">{ta("morPayouts.colDate")}</th>
                <th className="py-2 pr-4">{ta("morPayouts.colAmount")}</th>
                <th className="py-2">{ta("morPayouts.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4 text-zinc-700">
                    {new Date(p.createdAt).toLocaleDateString(moneyLoc)}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    {formatMoney(p.amount, p.currency, moneyLoc)}
                  </td>
                  <td className="py-2">
                    <span className={payoutStatusClass(p.status)}>
                      {payoutStatusLabel(p.status)}
                    </span>
                    {p.paidAt ? (
                      <p className="text-[10px] text-zinc-400">
                        {ta("morPayouts.paidOn").replace(
                          "{{date}}",
                          new Date(p.paidAt).toLocaleDateString(moneyLoc)
                        )}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{ta("morPayouts.noHistory")}</p>
      )}
    </section>
  );
}
