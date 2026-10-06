import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useAdminT } from "@/hooks/use-admin-t";
import { FormAlert } from "@/components/form-alert";
import { CA_REGION_PRESETS, type CaPresetId } from "@/lib/ca-region-presets";

export function CaRegionSetupBanner() {
  const { ta } = useAdminT();
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState<CaPresetId | null>(null);

  async function apply(id: CaPresetId) {
    const preset = CA_REGION_PRESETS[id];
    setPending(id);
    setAlert({});
    try {
      await api.updateSettings({
        currency: preset.currency,
        timezone: preset.timezone,
        defaultLocale: preset.defaultLocale,
        enabledLocales: preset.enabledLocales,
      });
      await refresh();
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setAlert({ ok: true, message: ta("caRegion.applied") });
      window.location.reload();
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : ta("caRegion.applyFail"),
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/80 p-4">
      <h3 className="text-sm font-semibold text-sky-950">{ta("caRegion.bannerTitle")}</h3>
      <p className="mt-1 text-sm text-sky-900/80">{ta("caRegion.bannerDesc")}</p>
      <div className="mt-3">
        <FormAlert ok={alert.ok} message={alert.message} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["kg", ta("caRegion.applyKg")],
            ["kz", ta("caRegion.applyKz")],
            ["uz", ta("caRegion.applyUz")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={pending !== null}
            onClick={() => void apply(id)}
            className="ugclab-btn border border-sky-300 bg-white text-sm text-sky-900 hover:bg-sky-100 disabled:opacity-50"
          >
            {pending === id ? ta("caRegion.applying") : label}
          </button>
        ))}
      </div>
    </div>
  );
}
