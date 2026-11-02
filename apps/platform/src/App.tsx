import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ComparePage } from "@/pages/ComparePage";
import { CountryPage } from "@/pages/CountryPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SignupPage } from "@/pages/SignupPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { PrivacyPage, TermsPage } from "@/pages/LegalPages";
import { StatusPage } from "@/pages/StatusPage";
import { PricingPage } from "@/pages/PricingPage";
import { SavingsToolPage } from "@/pages/SavingsToolPage";
import { GuidePage, GuidesIndexPage } from "@/pages/GuidesPage";
import { GlossaryIndexPage, GlossaryTermPage } from "@/pages/GlossaryPage";
import { publicPartnerUrl } from "@/lib/api-public";
import { rememberPartnerRef } from "@/lib/partner-ref";
import type { LandingLocale } from "@/landing/content";
import { LandingLayout } from "@/landing/layout";
import { LandingProvider, useDocumentMeta } from "@/landing/locale";
import { resolveMeta } from "@/landing/seo";

const PitchDeckPage = lazy(() => import("@/pages/PitchDeckPage"));

function CapturePartnerRef() {
  const [params] = useSearchParams();
  const ref = params.get("ref")?.trim();
  useEffect(() => {
    if (!ref) return;
    rememberPartnerRef(ref);
    void fetch(publicPartnerUrl("/partners/click"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref, source: document.referrer || "direct" }),
    });
  }, [ref]);
  return null;
}

function PageMeta() {
  const { pathname } = useLocation();
  const meta = resolveMeta(pathname);
  useDocumentMeta(meta?.title ?? "Tescommerce", meta?.description ?? "", meta?.locale ?? "en");
  return null;
}

function Landing({ locale, children }: { locale: LandingLocale; children: ReactNode }) {
  return (
    <LandingProvider locale={locale}>
      <PageMeta />
      <LandingLayout>{children}</LandingLayout>
    </LandingProvider>
  );
}

function landingRoutes(locale: LandingLocale) {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return [
    <Route key={`${locale}-home`} path={prefix || "/"} element={<Landing locale={locale}><HomePage /></Landing>} />,
    <Route
      key={`${locale}-vs`}
      path={`${prefix}/vs/:competitor`}
      element={<Landing locale={locale}><ComparePage /></Landing>}
    />,
    <Route
      key={`${locale}-country`}
      path={`${prefix}/sell-from/:country`}
      element={<Landing locale={locale}><CountryPage /></Landing>}
    />,
    <Route
      key={`${locale}-pricing`}
      path={`${prefix}/pricing`}
      element={<Landing locale={locale}><PricingPage /></Landing>}
    />,
    <Route
      key={`${locale}-savings`}
      path={`${prefix}/tools/savings`}
      element={<Landing locale={locale}><SavingsToolPage /></Landing>}
    />,
    <Route
      key={`${locale}-guides`}
      path={`${prefix}/guides`}
      element={<Landing locale={locale}><GuidesIndexPage /></Landing>}
    />,
    <Route
      key={`${locale}-guide`}
      path={`${prefix}/guides/:slug`}
      element={<Landing locale={locale}><GuidePage /></Landing>}
    />,
    <Route
      key={`${locale}-glossary`}
      path={`${prefix}/glossary`}
      element={<Landing locale={locale}><GlossaryIndexPage /></Landing>}
    />,
    <Route
      key={`${locale}-glossary-term`}
      path={`${prefix}/glossary/:slug`}
      element={<Landing locale={locale}><GlossaryTermPage /></Landing>}
    />,
  ];
}

export default function App() {
  return (
    <>
      <CapturePartnerRef />
      <Suspense fallback={null}>
        <Routes>
          {landingRoutes("en")}
          {landingRoutes("ru")}
          {landingRoutes("tr")}
          <Route path="/signup" element={<SignupPage locale="en" />} />
          <Route path="/ru/signup" element={<SignupPage locale="ru" />} />
          <Route path="/tr/signup" element={<SignupPage locale="tr" />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/deck" element={<PitchDeckPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Landing locale="en"><NotFoundPage /></Landing>} />
        </Routes>
      </Suspense>
    </>
  );
}
