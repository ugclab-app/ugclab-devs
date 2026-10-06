import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { useAdminT } from "@/hooks/use-admin-t";
import { settingsPatchFromTenant } from "@/lib/settings-patch";

export function TaxPanel() {
  const { ta, c } = useAdminT();
  const { tenant, refresh } = useAuth();
  const s = tenant?.settings as
    | {
        taxRateBps?: number;
        taxIncluded?: boolean;
        stripeTaxEnabled?: boolean;
        currency?: string;
        defaultLocale?: string;
        enabledLocales?: string[];
      }
    | undefined;

  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenant) return;
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.updateSettings(
        settingsPatchFromTenant(tenant, {
          taxRateBps: Math.round(parseFloat(String(fd.get("taxRate") ?? "0")) * 100),
          taxIncluded: fd.get("taxIncluded") === "on",
          stripeTaxEnabled: fd.get("stripeTaxEnabled") === "on",
        })
      );
      await refresh();
      setAlert({ ok: true, message: c.settingsSaved });
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
    <form onSubmit={onSave} className="space-y-6">
      <FormAlert ok={alert.ok} message={alert.message} />
      <SettingsPanelShell
        title={ta("settingsPage.tax")}
        description={ta("settingsPage.taxHubDesc")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600">{ta("settingsPage.taxRate")}</span>
            <input
              name="taxRate"
              type="number"
              step="0.1"
              min={0}
              defaultValue={((s?.taxRateBps ?? 0) / 100).toFixed(1)}
              className="ugclab-input w-32"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="taxIncluded"
              defaultChecked={!!s?.taxIncluded}
              className="rounded border-zinc-300"
            />
            {ta("settingsPage.pricesIncludeTax")}
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="stripeTaxEnabled"
            defaultChecked={!!s?.stripeTaxEnabled}
            className="rounded border-zinc-300"
          />
          {ta("settingsPage.stripeTax")}
        </label>
        <p className="mt-2 text-xs text-zinc-500">{ta("settingsPage.stripeTaxHint")}</p>
        <p className="mt-4 text-sm text-zinc-600">
          {ta("settingsPage.taxMarketsLink")}{" "}
          <Link
            to="/settings?tab=markets"
            className="font-medium text-violet-600 hover:underline"
          >
            {ta("settingsPage.tabs.markets")}
          </Link>
        </p>
      </SettingsPanelShell>

      <button
        type="submit"
        disabled={pending}
        className="ugclab-btn ugclab-btn-primary disabled:opacity-50"
      >
        {pending ? ta("settingsPage.saving") : c.save}
      </button>
    </form>
  );
}
