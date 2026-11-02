import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { track } from "@/lib/analytics";
import { checkerCountries, countryName, localPaymentMethods, payoutCurrencies } from "./countries";
import { SectionHeading } from "./layout";
import { localizedPath, useLanding } from "./locale";

const OTHER = "other";

export function CountryChecker({ initialCountry = "KG" }: { initialCountry?: string }) {
  const { locale, content } = useLanding();
  const c = content.checker;
  const [country, setCountry] = useState(initialCountry);

  const options = useMemo(
    () =>
      checkerCountries
        .map((code) => ({ code, name: countryName(code, locale) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale]
  );

  const selected = country === OTHER ? null : country;
  const local = localPaymentMethods(selected);
  const rows = [
    { label: c.payout, value: payoutCurrencies(selected).join(" / ") },
    { label: c.buyers, value: c.buyerMethods },
    { label: c.local, value: local.length ? local.join(", ") : c.noLocal },
    { label: c.mor, value: c.morValue },
    { label: c.shipping, value: c.shippingValue },
  ];

  return (
    <section id="check" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm md:p-10">
          <label htmlFor="checker-country" className="text-sm font-semibold text-zinc-900">
            {c.label}
          </label>
          <select
            id="checker-country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              track("country_check");
            }}
            className="ugclab-input mt-2 min-h-[3rem] !text-base"
          >
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
            <option value={OTHER}>{c.other}</option>
          </select>

          <dl className="mt-8 divide-y divide-zinc-100" aria-live="polite">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <dt className="text-zinc-500">{row.label}</dt>
                <dd className="flex items-center gap-2 font-semibold text-zinc-900 sm:text-right">
                  <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            to={localizedPath(locale, "/signup")}
            onClick={() => track("cta_checker")}
            className="ugclab-btn ugclab-btn-primary mt-6 w-full min-h-[3rem] text-base"
          >
            {c.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
