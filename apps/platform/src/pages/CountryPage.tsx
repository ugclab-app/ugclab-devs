import { Link, useParams } from "react-router-dom";
import { track } from "@/lib/analytics";
import type { CountrySlug } from "@/landing/content";
import { CountryChecker } from "@/landing/country-checker";
import { SectionHeading } from "@/landing/layout";
import { localizedPath, useLanding } from "@/landing/locale";
import { FaqSection, FinalCta, PricingSection } from "@/landing/sections";
import { NotFoundPage } from "./NotFoundPage";

export function CountryPage() {
  const { locale, content } = useLanding();
  const { country } = useParams();
  if (!country || !(country in content.countryPages)) return <NotFoundPage />;
  const page = content.countryPages[country as CountrySlug];

  return (
    <>
      <section className="mesh-hero pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <Link to={localizedPath(locale, "/")} className="text-sm font-medium text-brand-700 hover:underline">
            {content.backHome}
          </Link>
          <div className="mt-8">
            <SectionHeading as="h1" eyebrow={page.eyebrow} title={page.heading} subtitle={page.intro} />
          </div>
          <div className="mt-10 text-center">
            <Link
              to={localizedPath(locale, "/signup")}
              onClick={() => track(`cta_country_${country}`)}
              className="ugclab-btn ugclab-btn-primary min-h-[3.25rem] px-8 text-base shadow-lg shadow-brand-500/20"
            >
              {content.nav.getStarted}
            </Link>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2">
            {page.points.map((point) => (
              <article key={point.title} className="rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">{point.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-zinc-600">{point.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CountryChecker initialCountry={page.code} />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
