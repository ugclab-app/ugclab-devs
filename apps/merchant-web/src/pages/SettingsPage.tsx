import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { SettingsForm } from "@/components/settings-form";
import { StorefrontPreview } from "@/components/storefront-preview";
import { StoreQrCode } from "@/components/store-qr-code";
import { ProfileAvatarPanel, StaffPanel } from "@/components/staff-panel";
import { SecurityPanel } from "@/components/security-panel";
import { TeamActivityPreview } from "@/components/team-activity-preview";
import { usePermissions } from "@/hooks/use-permissions";
import { DomainsPanel } from "@/components/domains-panel";
import { PaymentsPanel } from "@/components/payments-panel";
import { BillingPanel } from "@/components/billing-panel";
import { SettingsPanelShell } from "@/components/settings-section";
import { SettingsTabs, type SettingsTabId } from "@/components/settings-tabs";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { getStorefrontUrl } from "@/lib/storefront";
import { AdminPageShell } from "@/components/admin-page-shell";
import { useAdminLocale } from "@/context/admin-locale";
import type { Locale } from "@ugclab/i18n";

export default function SettingsPage() {
  const { tenant } = useAuth();
  const { isOwner, can } = usePermissions();
  const { locale, setLocale, t } = useAdminLocale();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.settings() });
  const [params] = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab =
    tabParam === "billing" ||
    tabParam === "payments" ||
    tabParam === "domain" ||
    tabParam === "team" ||
    tabParam === "policies"
      ? tabParam
      : "general";
  const [tab, setTab] = useState<SettingsTabId>(initialTab as SettingsTabId);

  useEffect(() => {
    if (
      tabParam === "billing" ||
      tabParam === "payments" ||
      tabParam === "domain" ||
      tabParam === "team" ||
      tabParam === "policies"
    ) {
      setTab(tabParam);
    }
  }, [tabParam]);

  if (!tenant) return null;

  const s = tenant.settings;
  const storeUrl = getStorefrontUrl(tenant.slug);

  const formInitial = {
    name: tenant.name,
    slug: tenant.slug,
    currency: s?.currency ?? "USD",
    defaultLocale: s?.defaultLocale ?? "en",
    enabledLocales: s?.enabledLocales ?? ["en"],
    timezone: s?.timezone ?? "UTC",
    primaryColor: s?.primaryColor ?? "#7c3aed",
    logoUrl: s?.logoUrl ?? "",
    faviconUrl: (s as { faviconUrl?: string })?.faviconUrl ?? "",
    contactEmail: (s as { contactEmail?: string })?.contactEmail ?? "",
    contactPhone: (s as { contactPhone?: string })?.contactPhone ?? "",
    businessAddress: (s as { businessAddress?: string })?.businessAddress ?? "",
    emailFromName: (s as { emailFromName?: string })?.emailFromName ?? "",
    emailReplyTo: (s as { emailReplyTo?: string })?.emailReplyTo ?? "",
    privacyUrl: s?.privacyUrl ?? "",
    refundUrl: s?.refundUrl ?? "",
    privacyPolicy: (s as { privacyPolicy?: string })?.privacyPolicy ?? "",
    refundPolicy: (s as { refundPolicy?: string })?.refundPolicy ?? "",
    digitalLinkDays: (s as { digitalLinkDays?: number })?.digitalLinkDays ?? 30,
    notifyNewOrders: (s as { notifyNewOrders?: boolean })?.notifyNewOrders !== false,
    notifyLowStock: (s as { notifyLowStock?: boolean })?.notifyLowStock !== false,
    abandonedCartEnabled:
      (s as { abandonedCartEnabled?: boolean })?.abandonedCartEnabled !== false,
    taxRateBps: (s as { taxRateBps?: number })?.taxRateBps ?? 0,
    taxIncluded: (s as { taxIncluded?: boolean })?.taxIncluded ?? false,
    seoTitle: (s as { seoTitle?: string })?.seoTitle ?? tenant.name,
    seoDescription: (s as { seoDescription?: string })?.seoDescription ?? "",
    seoOgImageUrl: (s as { seoOgImageUrl?: string })?.seoOgImageUrl ?? "",
    lowStockThreshold: (s as { lowStockThreshold?: number })?.lowStockThreshold ?? 5,
  };

  return (
    <AdminPageShell
      wide
      crumbs={[{ label: "Settings" }]}
      title="Settings"
      description="Store identity, payments, domain, and policies."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <CopyStoreUrl url={storeUrl} />
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="ugclab-btn border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            Open store
          </a>
        </div>
      }
    >
      <p className="mb-4 truncate font-mono text-sm text-violet-700">{storeUrl}</p>
      <label className="mb-4 flex items-center gap-2 text-sm text-zinc-600">
        {t.language ?? "Language"}
        <select
          className="ugclab-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
      </label>
      <SettingsTabs
        active={tab}
        onChange={setTab}
        visibleIds={
          isOwner
            ? undefined
            : ["general", "team", "policies"]
        }
      />

      <div className="mt-6">
        {tab === "general" && (
          <SettingsForm storeUrl={storeUrl} initial={formInitial} mode="general" />
        )}
        {tab === "billing" && isOwner && <BillingPanel />}
        {tab === "payments" && (isOwner || can("payments")) && <PaymentsPanel />}
        {tab === "domain" && isOwner && (
          <div className="space-y-6">
            <DomainsPanel />
            <SettingsPanelShell
              title="Shipping zones"
              description="Rates by country for physical products at checkout."
            >
              <Link
                to="/shipping"
                className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                Manage shipping zones
                <span aria-hidden>→</span>
              </Link>
            </SettingsPanelShell>
            <div className="grid gap-6 sm:grid-cols-2">
              <SettingsPanelShell title="Store preview">
                <StorefrontPreview baseUrl={storeUrl} />
              </SettingsPanelShell>
              <SettingsPanelShell
                title="QR code"
                description="Share offline or on print materials."
              >
                <div className="flex justify-center py-2">
                  <StoreQrCode url={storeUrl} />
                </div>
              </SettingsPanelShell>
            </div>
          </div>
        )}
        {tab === "team" && (
          <div className="space-y-6">
            <ProfileAvatarPanel />
            <StaffPanel />
            <SecurityPanel />
            <TeamActivityPreview />
            {data ? (
              <p
                className={`rounded-lg px-4 py-3 text-sm ${
                  data.emailConfigured
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {data.emailConfigured
                  ? "Order notification emails are enabled."
                  : "Order emails require email provider configuration on the server."}
              </p>
            ) : null}
          </div>
        )}
        {tab === "policies" && (
          <SettingsForm storeUrl={storeUrl} initial={formInitial} mode="policies" />
        )}
      </div>
    </AdminPageShell>
  );
}
