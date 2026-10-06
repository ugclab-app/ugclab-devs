import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { FormAlert } from "@/components/form-alert";
import { ImageUrlField } from "@/components/image-url-field";
import { SettingsSection } from "@/components/settings-section";
import { CURRENCIES, LOCALES, TIMEZONES } from "@/lib/constants";
import { useAdminT } from "@/hooks/use-admin-t";

type SettingsData = {
  name: string;
  slug: string;
  currency: string;
  defaultLocale: string;
  enabledLocales: string[];
  timezone: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: string;
  emailFromName: string;
  emailReplyTo: string;
  emailDoubleOptIn: boolean;
  privacyUrl: string;
  refundUrl: string;
  privacyPolicy: string;
  refundPolicy: string;
  termsOfService: string;
  termsUrl: string;
  shippingPolicy: string;
  shippingUrl: string;
  legalNotice: string;
  legalNoticeUrl: string;
  contactPolicy: string;
  returnRules: string;
  digitalLinkDays: number;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  abandonedCartEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  seoOgImageUrl: string;
  lowStockThreshold: number;
  emailTemplates?: Record<string, { subject?: string; html?: string }>;
};

const EDITABLE_TEMPLATES = [
  ["shipping", "Shipping"],
  ["pickupReady", "Pickup ready"],
  ["passwordReset", "Password reset"],
  ["abandonedCart", "Abandoned cart"],
  ["orderCancelled", "Order cancelled"],
  ["orderRefunded", "Refund"],
  ["returnRequested", "Return received"],
  ["returnUpdate", "Return status"],
  ["reviewRequest", "Review request"],
  ["subscriptionStarted", "Subscription started"],
  ["subscriptionRenewed", "Subscription renewed"],
  ["subscriptionCancelled", "Subscription cancelled"],
  ["subscriptionFailed", "Subscription payment failed"],
] as const;

export function SettingsForm({
  storeUrl: _storeUrl,
  initial,
  mode,
}: {
  storeUrl: string;
  initial: SettingsData;
  mode: "general" | "policies";
}) {
  const { ta, c } = useAdminT();
  const { refresh } = useAuth();
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [slug, setSlug] = useState(initial.slug);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [pending, setPending] = useState(false);
  const [testEmailPending, setTestEmailPending] = useState(false);
  const [tplKey, setTplKey] = useState<(typeof EDITABLE_TEMPLATES)[number][0]>("shipping");
  const [templates, setTemplates] = useState(initial.emailTemplates ?? {});
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
        faviconUrl: fd.get("faviconUrl"),
        contactEmail: fd.get("contactEmail"),
        contactPhone: fd.get("contactPhone"),
        businessAddress: fd.get("businessAddress"),
        emailFromName: fd.get("emailFromName"),
        emailReplyTo: fd.get("emailReplyTo"),
        emailDoubleOptIn: fd.get("emailDoubleOptIn") === "on",
        privacyUrl: fd.get("privacyUrl"),
        refundUrl: fd.get("refundUrl"),
        privacyPolicy: fd.get("privacyPolicy"),
        refundPolicy: fd.get("refundPolicy"),
        termsOfService: fd.get("termsOfService"),
        termsUrl: fd.get("termsUrl"),
        shippingPolicy: fd.get("shippingPolicy"),
        shippingUrl: fd.get("shippingUrl"),
        legalNotice: fd.get("legalNotice"),
        legalNoticeUrl: fd.get("legalNoticeUrl"),
        contactPolicy: fd.get("contactPolicy"),
        returnRules: fd.get("returnRules"),
        digitalLinkDays: parseInt(String(fd.get("digitalLinkDays") ?? "30"), 10),
        notifyNewOrders: fd.get("notifyNewOrders") === "on",
        notifyLowStock: fd.get("notifyLowStock") === "on",
        abandonedCartEnabled: fd.get("abandonedCartEnabled") === "on",
        seoTitle: fd.get("seoTitle"),
        seoDescription: fd.get("seoDescription"),
        seoOgImageUrl: fd.get("seoOgImageUrl"),
        lowStockThreshold: parseInt(String(fd.get("lowStockThreshold") ?? "5"), 10) || 5,
        ...(fd.get("emailTemplatesPresent") === "1" ? { emailTemplates: templates } : {}),
      });
      await refresh();
      setAlert({ ok: true, message: c.settingsSaved });
    } catch (err) {
      setAlert({
        ok: false,
        message: err instanceof Error ? err.message : c.saveFailed,
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
            title={ta("settingsPage.storeIdentity")}
            description={ta("settingsPage.storeIdentityDesc")}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={ta("settingsPage.storeName")}>
                <input
                  name="name"
                  defaultValue={initial.name}
                  required
                  className="ugclab-input"
                />
              </Field>
              <Field label={ta("settingsPage.storeSlug")}>
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
                <span>{ta("settingsPage.slugConfirm")}</span>
              </label>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title={ta("settingsPage.region")}
            description={ta("settingsPage.regionDesc")}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={ta("settingsPage.currency")}>
                <select name="currency" defaultValue={initial.currency} className="ugclab-select">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={ta("settingsPage.defaultLocale")}>
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
              <Field label={ta("settingsPage.timezone")}>
                <select name="timezone" defaultValue={initial.timezone} className="ugclab-select">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={ta("settingsPage.storefrontLanguages")}>
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

          <SettingsSection title={ta("settingsPage.branding")} description={ta("settingsPage.brandingDesc")}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-11 w-11 cursor-pointer rounded-lg border border-zinc-200"
                  aria-label={ta("settingsPage.pickColor")}
                />
                <input
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="ugclab-input w-28 font-mono text-sm"
                />
              </div>
              <Field label={ta("settingsPage.logoUrl")} className="min-w-0 flex-1">
                <input name="logoUrl" defaultValue={initial.logoUrl} className="ugclab-input" />
              </Field>
            </div>
            <div className="mt-4">
              <ImageUrlField
                name="faviconUrl"
                label={ta("settingsPage.favicon")}
                defaultValue={initial.faviconUrl}
                placeholder={ta("settingsPage.faviconPlaceholder")}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={ta("settingsPage.contact")}
            description={ta("settingsPage.contactDesc")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={ta("settingsPage.contactEmail")}>
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={initial.contactEmail}
                  className="ugclab-input"
                  placeholder="hello@yourstore.com"
                />
              </Field>
              <Field label={ta("settingsPage.phoneOptional")}>
                <input
                  name="contactPhone"
                  defaultValue={initial.contactPhone}
                  className="ugclab-input"
                  placeholder="+1 555 0100"
                />
              </Field>
            </div>
            <Field label={ta("settingsPage.businessAddress")} className="mt-4">
              <textarea
                name="businessAddress"
                defaultValue={initial.businessAddress}
                rows={3}
                className="ugclab-input text-sm"
                placeholder={ta("settingsPage.addressPlaceholder")}
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            title={ta("settingsPage.transactionalEmail")}
            description={ta("settingsPage.transactionalEmailDesc")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={ta("settingsPage.fromName")}>
                <input
                  name="emailFromName"
                  defaultValue={initial.emailFromName}
                  className="ugclab-input"
                  placeholder={initial.name}
                />
              </Field>
              <Field label={ta("settingsPage.replyTo")}>
                <input
                  name="emailReplyTo"
                  type="email"
                  defaultValue={initial.emailReplyTo}
                  className="ugclab-input"
                  placeholder="support@yourstore.com"
                />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="emailDoubleOptIn"
                defaultChecked={initial.emailDoubleOptIn === true}
              />
              Require email confirmation for newsletter (double opt-in)
            </label>
            <p className="mt-2 text-xs text-zinc-500">{ta("settingsPage.emailPlatformNote")}</p>
            <SendingDomainPanel />
            <input type="hidden" name="emailTemplatesPresent" value="1" />
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-zinc-800">{ta("settingsPage.emailTemplates")}</p>
              <p className="text-xs text-zinc-500">{ta("settingsPage.emailTemplateHint")}</p>
              <select
                className="ugclab-input"
                value={tplKey}
                onChange={(e) =>
                  setTplKey(e.target.value as (typeof EDITABLE_TEMPLATES)[number][0])
                }
              >
                {EDITABLE_TEMPLATES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                className="ugclab-input"
                placeholder="Subject"
                value={templates[tplKey]?.subject ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [tplKey]: { ...prev[tplKey], subject: e.target.value, html: prev[tplKey]?.html ?? "" },
                  }))
                }
              />
              <textarea
                className="ugclab-input min-h-28 font-mono text-xs"
                placeholder="HTML"
                value={templates[tplKey]?.html ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [tplKey]: { ...prev[tplKey], html: e.target.value, subject: prev[tplKey]?.subject ?? "" },
                  }))
                }
              />
            </div>
            <button
              type="button"
              disabled={testEmailPending}
              className="ugclab-btn mt-4 border border-zinc-200 bg-white px-4 py-2 text-sm"
              onClick={async () => {
                setTestEmailPending(true);
                setAlert({});
                try {
                  const res = await api.sendTestStoreEmail();
                  setAlert({
                    ok: true,
                    message: ta("settingsPage.testEmailSent", { email: res.sentTo }),
                  });
                } catch (err) {
                  setAlert({
                    ok: false,
                    message: err instanceof Error ? err.message : ta("settingsPage.testEmailFailed"),
                  });
                } finally {
                  setTestEmailPending(false);
                }
              }}
            >
              {testEmailPending ? ta("settingsPage.sending") : ta("settingsPage.sendTestEmail")}
            </button>
          </SettingsSection>

          <SettingsSection
            title={ta("settingsPage.inventoryAlerts")}
            description={ta("settingsPage.inventoryAlertsDesc")}
          >
            <Field label={ta("settingsPage.lowStockThreshold")}>
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
                label={ta("settingsPage.notifyNewOrders")}
              />
              <Toggle
                name="notifyLowStock"
                defaultChecked={initial.notifyLowStock}
                label={ta("settingsPage.notifyLowStock")}
              />
              <Toggle
                name="abandonedCartEnabled"
                defaultChecked={initial.abandonedCartEnabled}
                label={ta("settingsPage.abandonedCartEmails")}
              />
            </div>
            <Field label={ta("settingsPage.digitalLinkDays")} className="mt-5">
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
            title={ta("settingsPage.legal")}
            description={ta("settingsPage.legalDesc")}
          >
            <div className="mb-6 space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
              <p className="text-sm font-medium text-zinc-800">
                {ta("settingsPage.writtenPolicies")}
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-600">
                {(
                  [
                    ["privacyPolicy", "privacy", ta("settingsPage.privacyPolicy")],
                    ["refundPolicy", "refund", ta("settingsPage.refundPolicy")],
                    ["termsOfService", "terms", ta("settingsPage.termsOfService")],
                    ["shippingPolicy", "shipping", ta("settingsPage.shippingPolicy")],
                    ["legalNotice", "legal", ta("settingsPage.legalNotice")],
                    ["contactPolicy", "contact", ta("settingsPage.contactPolicy")],
                    ["returnRules", "returns", ta("settingsPage.returnRules")],
                  ] as const
                ).map(([field, , label]) => {
                  const set = Boolean(String(initial[field] ?? "").trim());
                  return (
                    <li key={field} className="flex items-center justify-between gap-2">
                      <span>{label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          set
                            ? "bg-emerald-50 text-emerald-800"
                            : field === "contactPolicy"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {set
                          ? ta("settingsPage.policyPublished")
                          : field === "contactPolicy"
                            ? ta("settingsPage.policyRecommended")
                            : ta("settingsPage.policyUnset")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Field label={ta("settingsPage.returnRules")}>
              <textarea
                name="returnRules"
                defaultValue={initial.returnRules}
                rows={4}
                className="ugclab-input text-sm"
                placeholder={ta("settingsPage.returnRulesPlaceholder")}
              />
            </Field>

            <Field label={ta("settingsPage.privacyPolicy")} className="mt-4">
              <textarea
                name="privacyPolicy"
                defaultValue={initial.privacyPolicy}
                rows={4}
                className="ugclab-input text-sm"
                placeholder={ta("settingsPage.policyPlaceholder")}
              />
            </Field>
            <Field label={ta("settingsPage.refundPolicy")} className="mt-4">
              <textarea
                name="refundPolicy"
                defaultValue={initial.refundPolicy}
                rows={4}
                className="ugclab-input text-sm"
              />
            </Field>
            <Field label={ta("settingsPage.termsOfService")} className="mt-4">
              <textarea
                name="termsOfService"
                defaultValue={initial.termsOfService}
                rows={4}
                className="ugclab-input text-sm"
              />
            </Field>
            <Field label={ta("settingsPage.shippingPolicy")} className="mt-4">
              <textarea
                name="shippingPolicy"
                defaultValue={initial.shippingPolicy}
                rows={4}
                className="ugclab-input text-sm"
              />
            </Field>
            <Field label={ta("settingsPage.legalNotice")} className="mt-4">
              <textarea
                name="legalNotice"
                defaultValue={initial.legalNotice}
                rows={3}
                className="ugclab-input text-sm"
              />
            </Field>
            <Field label={ta("settingsPage.contactPolicy")} className="mt-4">
              <textarea
                name="contactPolicy"
                defaultValue={initial.contactPolicy}
                rows={3}
                className="ugclab-input text-sm"
                placeholder={ta("settingsPage.contactPolicyPlaceholder")}
              />
              <p className="mt-1 text-xs text-zinc-500">
                {ta("settingsPage.contactPolicyHint")}
              </p>
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={ta("settingsPage.privacyUrl")}>
                <input name="privacyUrl" defaultValue={initial.privacyUrl} className="ugclab-input" />
              </Field>
              <Field label={ta("settingsPage.refundUrl")}>
                <input name="refundUrl" defaultValue={initial.refundUrl} className="ugclab-input" />
              </Field>
              <Field label={ta("settingsPage.termsUrl")}>
                <input name="termsUrl" defaultValue={initial.termsUrl} className="ugclab-input" />
              </Field>
              <Field label={ta("settingsPage.shippingUrl")}>
                <input name="shippingUrl" defaultValue={initial.shippingUrl} className="ugclab-input" />
              </Field>
              <Field label={ta("settingsPage.legalNoticeUrl")}>
                <input
                  name="legalNoticeUrl"
                  defaultValue={initial.legalNoticeUrl}
                  className="ugclab-input"
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            title={ta("settingsPage.seo")}
            description={ta("settingsPage.seoDesc")}
          >
            <Field label={ta("settingsPage.metaTitle")}>
              <input name="seoTitle" defaultValue={initial.seoTitle} className="ugclab-input" />
            </Field>
            <Field label={ta("settingsPage.metaDescription")}>
              <textarea
                name="seoDescription"
                defaultValue={initial.seoDescription}
                rows={2}
                className="ugclab-input"
              />
            </Field>
            <Field label={ta("settingsPage.socialImage")}>
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
          <input type="hidden" name="faviconUrl" value={initial.faviconUrl} />
          <input type="hidden" name="contactEmail" value={initial.contactEmail} />
          <input type="hidden" name="contactPhone" value={initial.contactPhone} />
          <input type="hidden" name="businessAddress" value={initial.businessAddress} />
          <input type="hidden" name="emailFromName" value={initial.emailFromName} />
          <input type="hidden" name="emailReplyTo" value={initial.emailReplyTo} />
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
        </div>
      )}

      <div className="settings-form-footer">
        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary px-8 py-2.5">
          {pending ? c.saving : c.saveChanges}
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

function SendingDomainPanel() {
  const { ta } = useAdminT();
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [records, setRecords] = useState<Array<{ type?: string; name?: string; value?: string; record?: string }>>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .emailDomain()
      .then((res) => {
        if (!res.domain) return;
        setDomain(res.domain.domain);
        setStatus(res.domain.status ?? "");
        setFromAddress(res.domain.fromAddress ?? "");
        setRecords(res.domain.records ?? []);
      })
      .catch(() => {});
  }, []);

  async function addDomain() {
    setPending(true);
    setMessage("");
    try {
      const res = await api.saveEmailDomain(domain);
      setStatus(res.domain.status ?? "pending");
      setRecords((res.domain.records ?? []) as typeof records);
      setMessage(res.domain.status ?? "pending");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function checkDomain() {
    setPending(true);
    setMessage("");
    try {
      const res = await api.verifyEmailDomain();
      setStatus(res.domain.status ?? "");
      setFromAddress(res.domain.fromAddress ?? "");
      setRecords((res.domain.records ?? []) as typeof records);
      setMessage(res.domain.status ?? "");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-3">
      <p className="text-sm font-medium text-zinc-800">{ta("settingsPage.sendingDomain")}</p>
      <p className="mt-1 text-xs text-zinc-500">{ta("settingsPage.sendingDomainDesc")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={ta("settingsPage.domainPlaceholder")}
          className="ugclab-input min-w-[200px] flex-1 font-mono"
        />
        <button type="button" disabled={pending} className="ugclab-btn ugclab-btn-primary" onClick={() => void addDomain()}>
          {ta("settingsPage.addSendingDomain")}
        </button>
        <button type="button" disabled={pending} className="ugclab-btn border border-zinc-200 bg-white" onClick={() => void checkDomain()}>
          {ta("settingsPage.checkDomain")}
        </button>
      </div>
      {status ? (
        <p className="mt-2 text-xs text-zinc-600">
          {status}
          {fromAddress ? ` · ${fromAddress}` : ""}
        </p>
      ) : null}
      {message ? <p className="mt-1 text-xs text-zinc-500">{message}</p> : null}
      {records.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          {records.map((row, i) => (
            <li key={`${row.name}-${i}`} className="break-all font-mono">
              {(row.type || row.record || "DNS")} {row.name} → {row.value}
            </li>
          ))}
        </ul>
      ) : null}
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
