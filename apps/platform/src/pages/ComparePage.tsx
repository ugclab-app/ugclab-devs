import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { track } from "@/lib/analytics";
import type { CompareSlug } from "@/landing/content";
import { SectionHeading } from "@/landing/layout";
import { localizedPath, useLanding } from "@/landing/locale";
import { SavingsCalculator } from "@/landing/savings-calculator";
import { FinalCta, PricingSection, SecuritySection } from "@/landing/sections";
import { NotFoundPage } from "./NotFoundPage";

export function ComparePage() {
  const { locale, content } = useLanding();
  const { competitor } = useParams();
  if (!competitor || !(competitor in content.comparePages)) return <NotFoundPage />;
  const page = content.comparePages[competitor as CompareSlug];

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
              onClick={() => track(`cta_vs_${competitor}`)}
              className="ugclab-btn ugclab-btn-primary min-h-[3.25rem] px-8 text-base shadow-lg shadow-brand-500/20"
            >
              {content.nav.getStarted}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-4" />
                  <th className="px-4 py-4 font-semibold text-brand-700">Tescommerce</th>
                  <th className="px-4 py-4 font-semibold text-zinc-700">{page.name}</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-4 font-medium text-zinc-700">{row.label}</td>
                    <td className="bg-brand-50/50 px-4 py-4 font-medium text-zinc-900">{row.tes}</td>
                    <td className="px-4 py-4 text-zinc-600">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[page.chooseUs, page.chooseOther].map((block, i) => (
              <div
                key={block.title}
                className={`rounded-3xl border p-7 ${i === 0 ? "border-brand-300 bg-white shadow-sm" : "border-zinc-200 bg-zinc-50"}`}
              >
                <h2 className="text-xl font-semibold text-zinc-900">{block.title}</h2>
                <ul className="mt-4 space-y-3">
                  {block.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-base text-zinc-700">
                      <Check
                        className={`mt-0.5 h-5 w-5 shrink-0 ${i === 0 ? "text-brand-600" : "text-zinc-400"}`}
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {page.showSavings ? <SavingsCalculator /> : null}
      <SecuritySection />
      <PricingSection />
      <FinalCta />
    </>
  );
}
