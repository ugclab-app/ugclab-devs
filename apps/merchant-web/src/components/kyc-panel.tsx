import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";

export function PassportKycPanel() {
  const { ta } = useAdminT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["merchant-kyc"], queryFn: () => api.merchantKyc() });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kyc = q.data?.kyc ?? null;
  const locked = kyc?.status === "PENDING" || kyc?.status === "APPROVED";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api.submitMerchantKyc(form);
      await qc.invalidateQueries({ queryKey: ["merchant-kyc"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the passport check.");
    } finally {
      setPending(false);
    }
  }

  const statusLabel =
    kyc?.status === "APPROVED"
      ? ta("paymentsPage.kycApproved")
      : kyc?.status === "REJECTED"
        ? ta("paymentsPage.kycRejected")
        : kyc?.status === "PENDING"
          ? ta("paymentsPage.kycPending")
          : null;

  return (
    <div id="passport-kyc">
    <SettingsPanelShell
      title={ta("paymentsPage.kycTitle")}
      description={ta("paymentsPage.kycDesc")}
      badge={
        kyc ? (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            {kyc.status}
          </span>
        ) : null
      }
    >
      {statusLabel ? <p className="mb-3 text-sm text-zinc-700">{statusLabel}</p> : null}
      {kyc?.rejectReason ? <p className="mb-3 text-sm text-red-700">{kyc.rejectReason}</p> : null}
      {kyc ? (
        <p className="mb-4 text-sm text-zinc-500">
          {kyc.legalName} · {kyc.country} · {kyc.passportLast4}
        </p>
      ) : null}
      {error ? <FormAlert message={error} /> : null}
      {locked ? null : (
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">{ta("paymentsPage.kycLegalName")}</span>
            <input name="legalName" required className="rounded-lg border px-3 py-2" defaultValue={kyc?.legalName ?? ""} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">{ta("paymentsPage.kycCountry")}</span>
              <input
                name="country"
                required
                maxLength={2}
                placeholder="KG"
                className="rounded-lg border px-3 py-2 uppercase"
                defaultValue={kyc?.country ?? ""}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-zinc-700">{ta("paymentsPage.kycNumber")}</span>
              <input name="passportNumber" required className="rounded-lg border px-3 py-2" autoComplete="off" />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">{ta("paymentsPage.kycPhoto")}</span>
            <input name="passport" type="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">{ta("paymentsPage.kycSelfie")}</span>
            <input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          </label>
          <p className="text-sm text-zinc-500">{ta("paymentsPage.kycNote")}</p>
          <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary w-fit px-6 py-2.5">
            {pending ? "…" : ta("paymentsPage.kycSubmit")}
          </button>
        </form>
      )}
    </SettingsPanelShell>
    </div>
  );
}
