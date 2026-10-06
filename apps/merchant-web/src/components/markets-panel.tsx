import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { FormAlert } from "@/components/form-alert";
import { SettingsPanelShell } from "@/components/settings-section";
import { useAdminT } from "@/hooks/use-admin-t";
import { settingsPatchFromTenant } from "@/lib/settings-patch";

type MarketRow = {
  id: string;
  name: string;
  countries: string;
  taxPercent: string;
  checkoutCurrency: string;
};

function newId() {
  return `mkt_${Math.random().toString(36).slice(2, 10)}`;
}

function parseLocaleMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function parseMarkets(raw: unknown): MarketRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      id: typeof m.id === "string" ? m.id : newId(),
      name: typeof m.name === "string" ? m.name : "",
      countries: Array.isArray(m.countries)
        ? m.countries.filter((c): c is string => typeof c === "string").join(", ")
        : "",
      taxPercent:
        typeof m.taxRateBps === "number"
          ? (m.taxRateBps / 100).toFixed(1)
          : "",
      checkoutCurrency:
        typeof m.checkoutCurrency === "string" ? m.checkoutCurrency : "",
    }));
}

export function MarketsPanel() {
  const { ta, c } = useAdminT();
  const { tenant, refresh } = useAuth();
  const s = tenant?.settings as
    | {
        localeCurrencies?: unknown;
        markets?: unknown;
        enabledLocales?: string[];
        defaultLocale?: string;
        currency?: string;
      }
    | undefined;

  const locales = Array.from(
    new Set([
      ...(s?.enabledLocales ?? ["en"]),
      s?.defaultLocale ?? "en",
    ])
  );

  const [localeFx, setLocaleFx] = useState<Record<string, string>>(() => {
    const existing = parseLocaleMap(s?.localeCurrencies);
    const next: Record<string, string> = {};
    for (const loc of locales) {
      next[loc] = existing[loc] ?? s?.currency ?? "USD";
    }
    return next;
  });
  const [markets, setMarkets] = useState<MarketRow[]>(() => parseMarkets(s?.markets));
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setPending(true);
    try {
      const localeCurrencies: Record<string, string> = {};
      for (const [loc, cur] of Object.entries(localeFx)) {
        if (/^[A-Za-z]{3}$/.test(cur.trim())) {
          localeCurrencies[loc] = cur.trim().toUpperCase();
        }
      }
      const marketsPayload = markets
        .filter((m) => m.name.trim() && m.countries.trim())
        .map((m) => ({
          id: m.id || newId(),
          name: m.name.trim(),
          countries: m.countries
            .split(/[\s,]+/)
            .map((c) => c.trim().toUpperCase())
            .filter((c) => /^[A-Z]{2}$/.test(c)),
          taxRateBps:
            m.taxPercent.trim() === ""
              ? null
              : Math.round(parseFloat(m.taxPercent) * 100) || 0,
          checkoutCurrency:
            /^[A-Za-z]{3}$/.test(m.checkoutCurrency.trim())
              ? m.checkoutCurrency.trim().toUpperCase()
              : null,
        }))
        .filter((m) => m.countries.length > 0);

      await api.updateSettings(
        settingsPatchFromTenant(tenant, {
          localeCurrencies,
          markets: marketsPayload,
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
        title={ta("settingsPage.marketsDisplayFx")}
        description={ta("settingsPage.marketsDisplayFxDesc")}
      >
        <p className="mb-3 text-xs text-zinc-500">{ta("settingsPage.marketsCheckoutNote")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {locales.map((loc) => (
            <label key={loc} className="block text-sm">
              <span className="mb-1 block text-zinc-600">
                {ta("settingsPage.localeCurrency", { locale: loc })}
              </span>
              <input
                className="ugclab-input w-full uppercase"
                maxLength={3}
                value={localeFx[loc] ?? ""}
                onChange={(e) =>
                  setLocaleFx((prev) => ({ ...prev, [loc]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </SettingsPanelShell>

      <SettingsPanelShell
        title={ta("settingsPage.marketsList")}
        description={ta("settingsPage.marketsListDesc")}
      >
        <div className="space-y-4">
          {markets.map((m, idx) => (
            <div
              key={m.id}
              className="grid gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-2"
            >
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-zinc-600">{ta("settingsPage.marketName")}</span>
                <input
                  className="ugclab-input w-full"
                  value={m.name}
                  onChange={(e) =>
                    setMarkets((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, name: e.target.value } : r
                      )
                    )
                  }
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-zinc-600">
                  {ta("settingsPage.marketCountries")}
                </span>
                <input
                  className="ugclab-input w-full"
                  placeholder="KG, KZ, UZ"
                  value={m.countries}
                  onChange={(e) =>
                    setMarkets((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, countries: e.target.value } : r
                      )
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-600">
                  {ta("settingsPage.marketTaxRate")}
                </span>
                <input
                  className="ugclab-input w-full"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder={ta("settingsPage.marketTaxOptional")}
                  value={m.taxPercent}
                  onChange={(e) =>
                    setMarkets((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, taxPercent: e.target.value } : r
                      )
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-600">Checkout currency</span>
                <input
                  className="ugclab-input w-full uppercase"
                  maxLength={3}
                  placeholder={s?.currency ?? "USD"}
                  value={m.checkoutCurrency}
                  onChange={(e) =>
                    setMarkets((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, checkoutCurrency: e.target.value }
                          : r
                      )
                    )
                  }
                />
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  onClick={() =>
                    setMarkets((rows) => rows.filter((_, i) => i !== idx))
                  }
                >
                  {ta("settingsPage.removeMarket")}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            onClick={() =>
              setMarkets((rows) => [
                ...rows,
                { id: newId(), name: "", countries: "", taxPercent: "", checkoutCurrency: "" },
              ])
            }
          >
            {ta("settingsPage.addMarket")}
          </button>
        </div>
      </SettingsPanelShell>

      <p className="text-sm text-zinc-600">
        {ta("settingsPage.marketsTaxLink")}{" "}
        <Link to="/settings?tab=tax" className="font-medium text-violet-600 hover:underline">
          {ta("settingsPage.tabs.tax")}
        </Link>
      </p>

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
