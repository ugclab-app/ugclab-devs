import { Link } from "react-router-dom";
import { SectionHeading } from "@/landing/layout";
import { localizedPath, useLanding } from "@/landing/locale";
import { seoHubCopy } from "@/landing/seo-expand";
import { FaqSection, FinalCta, PricingSection } from "@/landing/sections";

export function PricingPage() {
  const { locale, content } = useLanding();
  const hub = seoHubCopy[locale];

  return (
    <>
      <section className="mesh-hero pb-8 pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <Link to={localizedPath(locale, "/")} className="text-sm font-medium text-brand-700 hover:underline">
            {content.backHome}
          </Link>
          <div className="mt-8">
            <SectionHeading as="h1" eyebrow={content.pricing.eyebrow} title={hub.pricingHeading} subtitle={hub.pricingIntro} />
          </div>
        </div>
      </section>
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
