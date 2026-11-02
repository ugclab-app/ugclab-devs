import { Link, useParams } from "react-router-dom";
import { SectionHeading } from "@/landing/layout";
import { localizedPath, useLanding } from "@/landing/locale";
import { glossaryPages, glossarySlugs, seoHubCopy, type GlossarySlug } from "@/landing/seo-expand";
import { FinalCta } from "@/landing/sections";
import { NotFoundPage } from "./NotFoundPage";

export function GlossaryIndexPage() {
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
            <SectionHeading as="h1" eyebrow={hub.glossaryLabel} title={hub.glossaryHeading} subtitle={hub.glossaryIntro} />
          </div>
          <ul className="mx-auto mt-12 grid max-w-4xl gap-4">
            {glossarySlugs.map((slug) => {
              const page = glossaryPages[slug][locale];
              return (
                <li key={slug}>
                  <Link
                    to={localizedPath(locale, `/glossary/${slug}`)}
                    className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-brand-300"
                  >
                    <h2 className="text-lg font-semibold text-zinc-900">{page.term}</h2>
                    <p className="mt-2 text-sm text-zinc-600">{page.definition}</p>
                    <span className="mt-3 inline-block text-sm font-medium text-brand-700">{hub.openTerm} →</span>
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

export function GlossaryTermPage() {
  const { locale } = useLanding();
  const { slug } = useParams();
  const hub = seoHubCopy[locale];
  if (!slug || !(slug in glossaryPages)) return <NotFoundPage />;
  const page = glossaryPages[slug as GlossarySlug][locale];

  return (
    <>
      <article className="mesh-hero pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link to={localizedPath(locale, "/glossary")} className="text-sm font-medium text-brand-700 hover:underline">
            ← {hub.glossaryLabel}
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">{page.term}</h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">{page.definition}</p>
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
      <FinalCta />
    </>
  );
}
