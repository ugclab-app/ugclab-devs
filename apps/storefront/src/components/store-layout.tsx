import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { StoreProvider } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { AnnouncementBar } from "@/components/announcement-bar";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";
import { StoreThemeHead } from "@/components/store-theme-head";
import { StoreOrganizationJsonLd } from "@/components/store-json-ld";
import { StickyCartBar } from "@/components/sticky-cart-bar";
import { DiscountPopup } from "@/components/discount-popup";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { AnalyticsScripts } from "@/components/analytics-scripts";
import { CookieConsent } from "@/components/cookie-consent";
import { StoreHreflang } from "@/components/store-hreflang";
import { StoreClosedGate } from "@/components/store-closed-gate";
import {
  storeThemeCssVars,
  storeButtonClass,
  resolveHomeBlocks,
} from "@ugclab/tenant/store-theme";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { StickyCtaBar } from "@/components/builder-extra-blocks";

export function StoreLayout({
  mainClassName = "store-container flex-1 py-10",
}: {
  mainClassName?: string;
}) {
  const { tenant, locale, search } = useStoreParams();
  const preview = search.get("preview") === "1";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-context", tenant, locale, preview],
    queryFn: () => storeApi.context(tenant, locale, preview),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading store…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold">Store not found</h1>
          <p className="mt-2 text-zinc-600">
            Open{" "}
            <code className="rounded bg-zinc-100 px-1">?tenant=tescommerce&amp;locale=en</code>
          </p>
        </div>
      </div>
    );
  }

  const btnClass = storeButtonClass(data.theme);
  const homeBlocks = resolveHomeBlocks(data.theme);
  const globalBlocks = data.theme.globalBlocks ?? [];
  const discountBlock = [...globalBlocks, ...homeBlocks].find((b) => b.type === "discount_popup");
  const stickyCta = [...globalBlocks, ...homeBlocks].find((b) => b.type === "sticky_cta");
  const nav = { locale: data.locale, tenant: data.tenant.slug };
  const showStickyCart = !data.theme.storeClosed && data.cartCount > 0;
  const layoutGlobal = globalBlocks.filter(
    (b) => b.type !== "discount_popup" && b.type !== "sticky_cta"
  );

  return (
    <StoreProvider value={data}>
      <div
        className={`flex min-h-screen flex-col ${btnClass}${showStickyCart ? " store-has-sticky-cart" : ""}${stickyCta ? " store-has-sticky-cta" : ""}`}
        style={storeThemeCssVars(data.theme, data.primaryColor) as CSSProperties}
      >
        <StoreThemeHead />
        <AnalyticsScripts />
        <StoreHreflang />
        <StoreOrganizationJsonLd />
        <AnnouncementBar
          messages={data.announcements}
          primaryColor={data.primaryColor}
          barColor={data.theme.announcementColor}
        />
        {layoutGlobal.length > 0 ? (
          <div className="border-b border-zinc-100 bg-white">
            <StoreBlockRenderer blocks={layoutGlobal} theme={data.theme} scrollAnimation="none" />
          </div>
        ) : null}
        {data.showCurrencyConversion && data.baseCurrency ? (
          <p className="bg-zinc-50 py-1 text-center text-xs text-zinc-500">
            Prices shown in {data.currency}. Charged in {data.baseCurrency} at checkout.
          </p>
        ) : null}
        <StoreHeader />
        <main className={mainClassName}>
          <StoreClosedGate>
            <Outlet />
          </StoreClosedGate>
        </main>
        <StoreFooter />
        <StickyCartBar />
        {stickyCta ? <StickyCtaBar block={stickyCta} /> : null}
        {discountBlock ? (
          <DiscountPopup block={discountBlock} tenantId={data.tenant.id} nav={nav} />
        ) : null}
        <PwaInstallPrompt />
        <LiveChatWidget theme={data.theme} />
        <CookieConsent />
      </div>
    </StoreProvider>
  );
}
