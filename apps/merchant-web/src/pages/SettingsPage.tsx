import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/auth";
import { SettingsForm } from "@/components/settings-form";
import { StorefrontPreview } from "@/components/storefront-preview";
import { StoreQrCode } from "@/components/store-qr-code";
import { StaffPanel } from "@/components/staff-panel";
import { SecurityPanel } from "@/components/security-panel";
import { DomainsPanel } from "@/components/domains-panel";
import { PaymentsPanel } from "@/components/payments-panel";
import { BillingPanel } from "@/components/billing-panel";
import { SettingsPanelShell } from "@/components/settings-section";
import { SettingsTabs, type SettingsTabId } from "@/components/settings-tabs";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { getStorefrontUrl } from "@/lib/storefront";

export default function SettingsPage() {
  const { tenant } = useAuth();
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
    <div className="settings-page mx-auto max-w-4xl">
      <header className="settings-page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Store identity, payments, domain, and policies.
          </p>
        </div>
        <div className="settings-store-url-bar">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Store URL
            </p>
            <p className="mt-0.5 truncate font-mono text-sm text-violet-700">{storeUrl}</p>
          </div>
          <div className="flex shrink-0 gap-2">
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
        </div>
      </header>

      <SettingsTabs active={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === "general" && (
          <SettingsForm storeUrl={storeUrl} initial={formInitial} mode="general" />
        )}
        {tab === "billing" && <BillingPanel />}
        {tab === "payments" && <PaymentsPanel />}
        {tab === "domain" && (
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
            <StaffPanel />
            <SecurityPanel />
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
    </div>
  );
}
