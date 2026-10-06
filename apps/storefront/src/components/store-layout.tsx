import type { CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { getMessages } from "@ugclab/i18n";
import { StoreProvider } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { useAffiliateRef } from "@/hooks/use-affiliate-ref";
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
import { StorePasswordGate } from "@/components/store-password-gate";
import {
  storeThemeCssVars,
  storeButtonClass,
  resolveHomeBlocks,
} from "@ugclab/tenant/store-theme";
import { StoreBlockRenderer } from "@/components/store-block-renderer";
import { StickyCtaBar } from "@/components/builder-extra-blocks";
import { MerchantPreviewBar } from "@/components/merchant-preview-bar";
import { useLivePresence } from "@/hooks/use-live-presence";

export function StoreLayout({
  mainClassName,
}: {
  mainClassName?: string;
}) {
  const { tenant, locale, search } = useStoreParams();
  const currency = search.get("currency") ?? undefined;
  const country = search.get("country") ?? undefined;
  const location = useLocation();
  useAffiliateRef(tenant);
  useLivePresence();
  const preview = search.get("preview") === "1";
  const themePreview = search.get("themePreview")?.trim() || undefined;
  const path = location.pathname.replace(/\/$/, "") || "/";
  const isHome = path === "/" || path === "";
  const resolvedMainClass =
    mainClassName ??
    (isHome ? "w-full flex-1 py-0" : "store-container flex-1 py-10");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-context", tenant, locale, currency ?? "", country ?? "", preview, themePreview ?? ""],
    queryFn: () => storeApi.context(tenant, locale, preview, themePreview, currency),
  });

  const loadingSf = getMessages(locale).storefront;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        {loadingSf.loading.store}
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
  const productPageBlocks = data.theme.productPageBlocks ?? [];
  const discountBlock = [...globalBlocks, ...homeBlocks, ...productPageBlocks].find(
    (b) => b.type === "discount_popup"
  );
  const stickyCta = [...globalBlocks, ...homeBlocks, ...productPageBlocks].find(
    (b) => b.type === "sticky_cta"
  );
  const nav = { locale: data.locale, tenant: data.tenant.slug };
  const showStickyCart = !data.theme.storeClosed && data.cartCount > 0;
  const isProductPage = /\/products\//.test(path);
  const isCheckoutFlow =
    path.endsWith("/cart") || path.endsWith("/checkout") || path.includes("/checkout/");
  /** Global strip: overlays only — never full homepage sections (avoids doubles). */
  const GLOBAL_STRIP_TYPES = new Set([
    "logos",
    "sticky_cta",
    "discount_popup",
    "countdown",
    "text_banner",
  ]);
  const showLayoutGlobal = !isProductPage && !isCheckoutFlow && !isHome;
  const layoutGlobal = showLayoutGlobal
    ? globalBlocks.filter(
        (b) =>
          b.type !== "discount_popup" &&
          b.type !== "sticky_cta" &&
          GLOBAL_STRIP_TYPES.has(b.type)
      )
    : [];

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
        <MerchantPreviewBar />
        <AnnouncementBar
          messages={data.announcements}
          primaryColor={data.primaryColor}
          barColor={data.theme.announcementColor}
        />
        {data.themeDemoLabel ? (
          <p className="bg-violet-700 py-2 text-center text-xs font-medium text-white">
            Theme demo: {data.themeDemoLabel} — preview only, not applied to your store
          </p>
        ) : null}
        {layoutGlobal.length > 0 ? (
          <div className="border-b border-zinc-100 bg-white">
            <StoreBlockRenderer blocks={layoutGlobal} theme={data.theme} scrollAnimation="none" />
          </div>
        ) : null}
        {data.showCurrencyConversion && data.baseCurrency ? (
          <p className="bg-zinc-50 py-1 text-center text-xs text-zinc-500">
            {getMessages(data.locale).storefront.currency.pricesShown
              .replace("{{display}}", data.currency)
              .replace("{{base}}", data.baseCurrency)}
          </p>
        ) : null}
        <StoreHeader />
        <main className={resolvedMainClass}>
          <StorePasswordGate>
            <StoreClosedGate>
              <Outlet />
            </StoreClosedGate>
          </StorePasswordGate>
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
