import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { CURRENCIES } from "@/lib/constants";

const TAX_TYPES = [
  { value: "", label: "Not provided" },
  { value: "W9", label: "US — W-9 (TIN / EIN)" },
  { value: "EU_VAT", label: "EU — VAT ID" },
  { value: "OTHER", label: "Other tax ID" },
] as const;

export function PaymentPayoutSettings({ mor }: { mor: boolean }) {
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payout-profile"],
    queryFn: () => api.payoutProfile(),
  });

  if (isLoading || !data) {
    return (
      <SettingsPanelShell title="Payout preferences">
        <p className="text-sm text-zinc-500">Loading…</p>
      </SettingsPanelShell>
    );
  }

  const multiCurrency =
    mor &&
    data.payoutCurrency !== data.storefrontCurrency;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setAlert({});
    const fd = new FormData(e.currentTarget);
    const taxType = String(fd.get("taxFormType") ?? "");
    try {
      await api.updatePayoutProfile({
        payoutCurrency: mor ? String(fd.get("payoutCurrency") ?? "") : undefined,
        taxFormType: taxType || null,
        taxFormLegalName: taxType ? String(fd.get("taxFormLegalName") ?? "") : null,
        taxFormId: taxType ? String(fd.get("taxFormId") ?? "") : null,
        notifyPayoutFailed: fd.get("notifyPayoutFailed") === "on",
      });
      await qc.invalidateQueries({ queryKey: ["payout-profile"] });
      await qc.invalidateQueries({ queryKey: ["mor-balance"] });
      setAlert({ ok: true, message: "Payout settings saved" });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPanelShell
      title="Payout & tax details"
      description={
        mor
          ? "Storefront checkout uses your store currency. Payouts are sent in your preferred payout currency after platform review."
          : "Tax details for compliance. Connect payouts use your Stripe account currency."
      }
    >
      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase text-zinc-400">Storefront currency</p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {data.storefrontCurrency}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Prices & checkout</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
          <p className="text-xs font-medium uppercase text-zinc-400">
            {mor ? "Payout currency" : "Stripe payout currency"}
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {mor ? data.payoutCurrency : "Via Stripe account"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {mor ? "How we send your earnings" : "Set in Stripe Dashboard"}
          </p>
        </div>
      </div>

      {multiCurrency ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your storefront charges in <strong>{data.storefrontCurrency}</strong> but
          payouts are requested in <strong>{data.payoutCurrency}</strong>. Conversion
          fees may apply per your merchant agreement.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {mor ? (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Preferred payout currency
            </label>
            <select
              name="payoutCurrency"
              defaultValue={data.payoutCurrency}
              className="ugclab-select mt-1 max-w-xs"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-4 border-t border-zinc-100 pt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Tax form (payout compliance)</h3>
          <p className="text-sm text-zinc-500">
            Required before large payouts in some regions. Stored securely; only the last
            4 characters are shown after save.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Form type</label>
              <select
                name="taxFormType"
                defaultValue={data.taxFormType ?? ""}
                className="ugclab-select mt-1 w-full"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t.value || "none"} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Legal name</label>
              <input
                name="taxFormLegalName"
                defaultValue={data.taxFormLegalName ?? ""}
                className="ugclab-input mt-1 w-full"
                placeholder="Business or individual name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Tax ID {data.taxFormIdMasked ? `(saved ${data.taxFormIdMasked})` : ""}
              </label>
              <input
                name="taxFormId"
                className="ugclab-input mt-1 w-full max-w-md font-mono"
                placeholder={data.hasTaxForm ? "Enter new ID to replace" : "TIN / VAT number"}
                autoComplete="off"
              />
            </div>
          </div>
          {data.hasTaxForm ? (
            <p className="text-xs text-emerald-700">Tax details on file.</p>
          ) : (
            <p className="text-xs text-amber-700">No tax form on file yet.</p>
          )}
        </div>

        {mor ? (
          <div className="border-t border-zinc-100 pt-6">
            <label className="flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="notifyPayoutFailed"
                defaultChecked={data.notifyPayoutFailed}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                <span className="font-medium text-zinc-900">
                  Email me when a payout fails
                </span>
                <span className="mt-0.5 block text-zinc-500">
                  We will notify you if a payout cannot be completed and your balance is
                  returned to available earnings.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary text-sm"
        >
          {pending ? "Saving…" : "Save payout settings"}
        </button>
      </form>
    </SettingsPanelShell>
  );
}
