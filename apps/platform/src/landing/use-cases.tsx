import { useState } from "react";
import { Check } from "lucide-react";
import { SectionHeading } from "./layout";
import { useLanding } from "./locale";

export function UseCases() {
  const { content } = useLanding();
  const u = content.useCases;
  const [active, setActive] = useState(0);
  const tab = u.tabs[active]!;

  return (
    <section id="use-cases" className="bg-zinc-50 py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow={u.eyebrow} title={u.title} />
        <div role="tablist" aria-label={u.title} className="mx-auto mt-10 flex w-fit flex-wrap justify-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
          {u.tabs.map((t, i) => (
            <button
              key={t.label}
              id={`use-case-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls="use-case-panel"
              onClick={() => setActive(i)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                i === active ? "bg-brand-600 text-white shadow" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          id="use-case-panel"
          role="tabpanel"
          aria-labelledby={`use-case-tab-${active}`}
          className="mt-8 grid gap-8 rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-sm md:grid-cols-2 md:p-10"
        >
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">{tab.title}</h3>
            <p className="mt-3 text-lg leading-relaxed text-zinc-600">{tab.desc}</p>
          </div>
          <ul className="space-y-3">
            {tab.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-base text-zinc-700">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
