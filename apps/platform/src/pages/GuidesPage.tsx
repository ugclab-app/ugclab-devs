import { Link, useParams } from "react-router-dom";
import { track } from "@/lib/analytics";
import { SectionHeading } from "@/landing/layout";
import { localizedPath, useLanding } from "@/landing/locale";
import { guidePages, guideSlugs, seoHubCopy, type GuideSlug } from "@/landing/seo-expand";
import { FinalCta, PricingSection } from "@/landing/sections";
import { NotFoundPage } from "./NotFoundPage";

export function GuidesIndexPage() {
  const { locale, content } = useLanding();
  const hub = seoHubCopy[locale];

  return (
    <>
      <section className="mesh-hero pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <Link to={localizedPath(locale, "/")} className="text-sm font-medium text-brand-700 hover:underline">
            {content.backHome}
          </Link>
          <div className="mt-8">
            <SectionHeading as="h1" eyebrow={hub.guidesLabel} title={hub.guidesHeading} subtitle={hub.guidesIntro} />
          </div>
          <ul className="mx-auto mt-12 grid max-w-4xl gap-4">
            {guideSlugs.map((slug) => {
              const page = guidePages[slug][locale];
              return (
                <li key={slug}>
                  <Link
                    to={localizedPath(locale, `/guides/${slug}`)}
                    className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-brand-300"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{page.eyebrow}</p>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-900">{page.heading}</h2>
                    <p className="mt-2 text-sm text-zinc-600">{page.description}</p>
                    <span className="mt-3 inline-block text-sm font-medium text-brand-700">{hub.readMore} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function GuidePage() {
  const { locale, content } = useLanding();
  const { slug } = useParams();
  const hub = seoHubCopy[locale];
  if (!slug || !(slug in guidePages)) return <NotFoundPage />;
  const page = guidePages[slug as GuideSlug][locale];

  return (
    <>
      <article className="mesh-hero pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link to={localizedPath(locale, "/guides")} className="text-sm font-medium text-brand-700 hover:underline">
            ← {hub.guidesLabel}
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-brand-700">{page.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">{page.heading}</h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">{page.intro}</p>
          <div className="mt-8">
            <Link
              to={localizedPath(locale, "/signup")}
              onClick={() => track(`cta_guide_${slug}`)}
              className="ugclab-btn ugclab-btn-primary min-h-[3rem] px-6"
            >
              {content.nav.getStarted}
            </Link>
          </div>
          <div className="mt-12 space-y-10">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-zinc-900">{section.heading}</h2>
                <p className="mt-3 text-base leading-relaxed text-zinc-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
      <PricingSection />
      <FinalCta />
    </>
  );
}
