import { useState } from "react";
import { fill, landingIntlLocale } from "./content";
import { SectionHeading } from "./layout";
import { useLanding } from "./locale";

const SHOPIFY_BASIC = 39;
const SHOPIFY_THIRD_PARTY_FEE = 0.02;
const STARTER_FEE = 0.05;
const GROWTH_PRICE = 29;
const GROWTH_FEE = 0.04;

export function SavingsCalculator() {
  const { locale, content } = useLanding();
  const s = content.savings;
  const [sales, setSales] = useState(2000);
  const [apps, setApps] = useState<Set<string>>(() => new Set(s.apps.map((a) => a.id)));

  const money = (value: number, digits = 2) =>
    new Intl.NumberFormat(landingIntlLocale[locale], {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  const appsCost = s.apps.filter((a) => apps.has(a.id)).reduce((sum, a) => sum + a.price, 0);
  const shopifyFee = sales * SHOPIFY_THIRD_PARTY_FEE;
  const shopifyTotal = SHOPIFY_BASIC + appsCost + shopifyFee;
  const starterTotal = sales * STARTER_FEE;
  const growthTotal = GROWTH_PRICE + sales * GROWTH_FEE;
  const useGrowth = growthTotal < starterTotal;
  const tesTotal = Math.min(starterTotal, growthTotal);
  const saving = shopifyTotal - tesTotal;

  function toggleApp(id: string) {
    setApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section id="savings" className="scroll-mt-20 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={s.eyebrow} title={s.title} subtitle={s.subtitle} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-6 md:p-8">
            <label htmlFor="savings-sales" className="flex items-baseline justify-between gap-4">
              <span className="font-semibold text-zinc-900">{s.salesLabel}</span>
              <span className="text-2xl font-bold text-brand-700">{money(sales, 0)}</span>
            </label>
            <input
              id="savings-sales"
              type="range"
              min={0}
              max={10000}
              step={100}
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
              className="mt-4 w-full accent-brand-600"
            />
            <fieldset className="mt-8">
              <legend className="font-semibold text-zinc-900">{s.appsLabel}</legend>
              <div className="mt-3 space-y-2">
                {s.apps.map((app) => (
                  <label
                    key={app.id}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={apps.has(app.id)}
                        onChange={() => toggleApp(app.id)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {app.label}
                    </span>
                    <span className="text-zinc-500">{money(app.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                <p className="font-semibold text-zinc-900">{s.shopifyTitle}</p>
                <dl className="mt-4 space-y-2 text-sm text-zinc-600">
                  <div className="flex justify-between gap-3">
                    <dt>{s.shopifyPlan}</dt>
                    <dd>{money(SHOPIFY_BASIC)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{s.shopifyApps}</dt>
                    <dd>{money(appsCost)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{s.shopifyFee}</dt>
                    <dd>{money(shopifyFee)}</dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500">{s.total}</p>
                <p className="text-3xl font-bold text-zinc-900">{money(shopifyTotal)}</p>
              </div>
              <div className="rounded-3xl border border-brand-300 bg-white p-6 shadow-lg shadow-brand-500/10">
                <p className="font-semibold text-brand-700">{s.tesTitle}</p>
                <p className="mt-4 text-sm text-zinc-600">{useGrowth ? s.growth : s.starter}</p>
                <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500">{s.total}</p>
                <p className="text-3xl font-bold text-zinc-900">{money(tesTotal)}</p>
              </div>
            </div>
            <div
              className={`rounded-3xl p-6 text-center ${saving > 0 ? "bg-brand-700 text-white" : "bg-amber-50 text-amber-900"}`}
              aria-live="polite"
            >
              <p className="text-lg font-semibold">
                {saving > 0
                  ? fill(s.save, { month: money(saving), year: money(saving * 12, 0) })
                  : s.moreExpensive}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-500">{s.footnote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
