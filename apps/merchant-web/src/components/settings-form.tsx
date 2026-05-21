import { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { FormAlert } from "@/components/form-alert";
import { SettingsSection } from "@/components/settings-section";
import { CURRENCIES, LOCALES, TIMEZONES } from "@/lib/constants";

type SettingsData = {
  name: string;
  slug: string;
  currency: string;
  defaultLocale: string;
  enabledLocales: string[];
  timezone: string;
  primaryColor: string;
  logoUrl: string;
  privacyUrl: string;
  refundUrl: string;
  privacyPolicy: string;
  refundPolicy: string;
  digitalLinkDays: number;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  abandonedCartEnabled: boolean;
  taxRateBps: number;
  taxIncluded: boolean;
  seoTitle: string;
  seoDescription: string;
  seoOgImageUrl: string;
  lowStockThreshold: number;
};

export function SettingsForm({
  storeUrl: _storeUrl,
  initial,
  mode,
}: {
  storeUrl: string;
  initial: SettingsData;
  mode: "general" | "policies";
}) {
  const { refresh } = useAuth();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [slug, setSlug] = useState(initial.slug);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [pending, setPending] = useState(false);
  const slugChanged = slug !== initial.slug;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.updateSettings({
        name: fd.get("name"),
        slug: fd.get("slug"),
        slugConfirm: fd.get("slugConfirm") === "on",
        currency: fd.get("currency"),
        defaultLocale: fd.get("defaultLocale"),
        enabledLocales: LOCALES.filter((l) => fd.get(`locale_${l.value}`) === "on").map(
          (l) => l.value
        ),
        timezone: fd.get("timezone"),
        primaryColor,
        logoUrl: fd.get("logoUrl"),
        privacyUrl: fd.get("privacyUrl"),
        refundUrl: fd.get("refundUrl"),
        privacyPolicy: fd.get("privacyPolicy"),
        refundPolicy: fd.get("refundPolicy"),
        digitalLinkDays: parseInt(String(fd.get("digitalLinkDays") ?? "30"), 10),
        notifyNewOrders: fd.get("notifyNewOrders") === "on",
        notifyLowStock: fd.get("notifyLowStock") === "on",
        abandonedCartEnabled: fd.get("abandonedCartEnabled") === "on",
        taxRateBps: Math.round(parseFloat(String(fd.get("taxRate") ?? "0")) * 100),
        taxIncluded: fd.get("taxIncluded") === "on",
        seoTitle: fd.get("seoTitle"),
        seoDescription: fd.get("seoDescription"),
        seoOgImageUrl: fd.get("seoOgImageUrl"),
        lowStockThreshold: parseInt(String(fd.get("lowStockThreshold") ?? "5"), 10) || 5,
      });
      await refresh();
      setAlert({ ok: true, message: "Settings saved" });
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
    <form onSubmit={onSubmit} className="settings-form">
      <FormAlert ok={alert.ok} message={alert.message} />

      {mode === "general" ? (
        <div className="admin-card settings-form-card">
          <SettingsSection
            title="Store identity"
            description="Name and URL slug shown to customers."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Store name">
                <input
                  name="name"
                  defaultValue={initial.name}
                  required
                  className="ugclab-input"
                />
              </Field>
              <Field label="Store slug">
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="ugclab-input font-mono"
                />
              </Field>
            </div>
            {slugChanged ? (
              <label className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <input type="checkbox" name="slugConfirm" className="mt-0.5" />
                <span>I understand — existing store links will change.</span>
              </label>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title="Region & languages"
            description="Currency and timezone for orders and reports."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Currency">
                <select name="currency" defaultValue={initial.currency} className="ugclab-select">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Default locale">
                <select
                  name="defaultLocale"
                  defaultValue={initial.defaultLocale}
                  className="ugclab-select"
                >
                  {LOCALES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Timezone">
                <select name="timezone" defaultValue={initial.timezone} className="ugclab-select">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Storefront languages">
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((l) => (
                  <label key={l.value} className="settings-chip">
                    <input
                      type="checkbox"
                      name={`locale_${l.value}`}
                      defaultChecked={initial.enabledLocales.includes(l.value)}
                      className="peer sr-only"
                    />
                    <span className="settings-chip-label">{l.label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </SettingsSection>

          <SettingsSection title="Branding" description="Logo and accent color on your storefront.">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-11 w-11 cursor-pointer rounded-lg border border-zinc-200"
                  aria-label="Pick color"
                />
                <input
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="ugclab-input w-28 font-mono text-sm"
                />
              </div>
              <Field label="Logo URL" className="min-w-0 flex-1">
                <input name="logoUrl" defaultValue={initial.logoUrl} className="ugclab-input" />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="Tax" description="Applied at checkout on subtotal and shipping.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tax rate (%)">
                <input
                  name="taxRate"
                  type="number"
                  step="0.1"
                  min={0}
                  defaultValue={(initial.taxRateBps / 100).toFixed(1)}
                  className="ugclab-input w-32"
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="taxIncluded"
                  defaultChecked={initial.taxIncluded}
                  className="rounded border-zinc-300"
                />
                Prices include tax
              </label>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Inventory & email alerts"
            description="Notifications to your merchant email."
          >
            <Field label="Low stock threshold (units)">
              <input
                name="lowStockThreshold"
                type="number"
                min={1}
                defaultValue={initial.lowStockThreshold}
                className="ugclab-input w-32"
              />
            </Field>
            <div className="mt-4 space-y-3">
              <Toggle
                name="notifyNewOrders"
                defaultChecked={initial.notifyNewOrders}
                label="Email me when a new order is paid"
              />
              <Toggle
                name="notifyLowStock"
                defaultChecked={initial.notifyLowStock}
                label="Email me when stock is low"
              />
              <Toggle
                name="abandonedCartEnabled"
                defaultChecked={initial.abandonedCartEnabled}
                label="Send abandoned cart recovery emails"
              />
            </div>
            <Field label="Digital download link validity (days)" className="mt-5">
              <input
                name="digitalLinkDays"
                type="number"
                min={1}
                defaultValue={initial.digitalLinkDays}
                className="ugclab-input w-32"
              />
            </Field>
          </SettingsSection>
        </div>
      ) : (
        <div className="admin-card settings-form-card">
          <SettingsSection
            title="Legal policies"
            description="Shown on your storefront and linked at checkout."
          >
            <Field label="Privacy policy">
              <textarea
                name="privacyPolicy"
                defaultValue={initial.privacyPolicy}
                rows={5}
                className="ugclab-input text-sm"
                placeholder="Plain text or HTML…"
              />
            </Field>
            <Field label="Refund policy">
              <textarea
                name="refundPolicy"
                defaultValue={initial.refundPolicy}
                rows={5}
                className="ugclab-input text-sm"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Privacy URL (optional fallback)">
                <input name="privacyUrl" defaultValue={initial.privacyUrl} className="ugclab-input" />
              </Field>
              <Field label="Refund URL (optional fallback)">
                <input name="refundUrl" defaultValue={initial.refundUrl} className="ugclab-input" />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            title="SEO"
            description="How your store appears in search and social previews. Sitemap: /api/store/sitemap.xml?tenant=YOUR_SLUG"
          >
            <Field label="Meta title">
              <input name="seoTitle" defaultValue={initial.seoTitle} className="ugclab-input" />
            </Field>
            <Field label="Meta description">
              <textarea
                name="seoDescription"
                defaultValue={initial.seoDescription}
                rows={2}
                className="ugclab-input"
              />
            </Field>
            <Field label="Social preview image URL">
              <input
                name="seoOgImageUrl"
                defaultValue={initial.seoOgImageUrl}
                className="ugclab-input"
                placeholder="https://…"
              />
            </Field>
          </SettingsSection>

          {/* Hidden fields so save keeps general settings */}
          <input type="hidden" name="name" value={initial.name} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="currency" value={initial.currency} />
          <input type="hidden" name="defaultLocale" value={initial.defaultLocale} />
          <input type="hidden" name="timezone" value={initial.timezone} />
          <input type="hidden" name="primaryColor" value={primaryColor} />
          <input type="hidden" name="logoUrl" value={initial.logoUrl} />
          <input type="hidden" name="taxRate" value={(initial.taxRateBps / 100).toFixed(1)} />
          <input type="hidden" name="lowStockThreshold" value={initial.lowStockThreshold} />
          <input type="hidden" name="digitalLinkDays" value={initial.digitalLinkDays} />
          {LOCALES.map((l) =>
            initial.enabledLocales.includes(l.value) ? (
              <input key={l.value} type="hidden" name={`locale_${l.value}`} value="on" />
            ) : null
          )}
          {initial.notifyNewOrders ? (
            <input type="hidden" name="notifyNewOrders" value="on" />
          ) : null}
          {initial.notifyLowStock ? (
            <input type="hidden" name="notifyLowStock" value="on" />
          ) : null}
          {initial.abandonedCartEnabled ? (
            <input type="hidden" name="abandonedCartEnabled" value="on" />
          ) : null}
          {initial.taxIncluded ? (
            <input type="hidden" name="taxIncluded" value="on" />
          ) : null}
        </div>
      )}

      <div className="settings-form-footer">
        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary px-8 py-2.5">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-800 transition hover:bg-zinc-50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-zinc-300 text-violet-600"
      />
      {label}
    </label>
  );
}
