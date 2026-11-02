import { Link } from "react-router-dom";
import {
  Download,
  Send,
  Gauge,
  Globe,
  KeyRound,
  QrCode,
  ShieldCheck,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@ugclab/ui";
import { track } from "@/lib/analytics";
import { demoStoreUrl } from "@/lib/urls";
import { integrationNames } from "./content";
import { SectionHeading } from "./layout";
import { localizedPath, useLanding } from "./locale";

const featureStyles = [
  { icon: ShieldCheck, color: "bg-brand-100 text-brand-700" },
  { icon: Wallet, color: "bg-emerald-100 text-emerald-700" },
  { icon: QrCode, color: "bg-sky-100 text-sky-700" },
  { icon: Globe, color: "bg-amber-100 text-amber-700" },
  { icon: Truck, color: "bg-lime-100 text-lime-700" },
  { icon: Download, color: "bg-rose-100 text-rose-700" },
];

const securityIcons = [Gauge, ShieldCheck, UserCheck, KeyRound];

export function IntegrationsStrip() {
  const { content } = useLanding();
  return (
    <section aria-label={content.integrations.title} className="border-y border-zinc-200/70 bg-white py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 md:flex-row md:gap-8">
        <p className="shrink-0 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {content.integrations.title}
        </p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
          {integrationNames.map((name) => (
            <li key={name} className="text-base font-semibold text-zinc-500">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PayoutsSection() {
  const { content } = useLanding();
  const p = content.payouts;
  return (
    <section id="payouts" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={p.eyebrow} title={p.title} subtitle={p.subtitle} />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {p.steps.map((step, i) => (
            <li key={step.title} className="rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-7 md:p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-700 shadow-sm">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const { content } = useLanding();
  const f = content.features;
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={f.eyebrow} title={f.title} subtitle={f.subtitle} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {f.items.map((item, i) => {
            const { icon: Icon, color } = featureStyles[i % featureStyles.length]!;
            return (
              <article key={item.title} className="card-hover rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm">
                <span className={`inline-flex rounded-2xl p-3 ${color}`}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-600">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function DemoStoreCta() {
  const { content } = useLanding();
  const d = content.demo;
  return (
    <section className="bg-zinc-50 py-16 md:py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center md:flex-row md:text-left">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{d.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 md:text-3xl">{d.title}</h2>
          <p className="mt-2 max-w-xl text-zinc-600">{d.desc}</p>
        </div>
        <a
          href={demoStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("demo_store")}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg shadow-brand-500/10 transition hover:border-brand-300 hover:bg-brand-50"
        >
          {d.cta}
        </a>
      </div>
    </section>
  );
}

export function SiteBuilderShowcase() {
  const { content } = useLanding();
  const b = content.builder;
  return (
    <section id="site-builder" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={b.eyebrow} title={b.title} subtitle={b.subtitle} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {b.cards.map((item) => (
            <article key={item.title} className="card-hover rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">{item.desc}</p>
            </article>
          ))}
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl" aria-hidden>
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500/15 to-emerald-500/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-zinc-500">{b.editor}</span>
              </div>
              <div className="flex gap-1 rounded-lg bg-white p-0.5 text-xs font-medium shadow-sm">
                {b.devices.map((device, i) => (
                  <span
                    key={device}
                    className={`rounded-md px-2.5 py-1 ${i === 0 ? "bg-brand-100 text-brand-700" : "text-zinc-500"}`}
                  >
                    {device}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-0 lg:grid-cols-12">
              <div className="hidden border-r border-zinc-100 bg-zinc-50/80 p-4 lg:col-span-3 lg:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{b.blocksTitle}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
                  {b.blocks.map((block, i) => (
                    <li
                      key={block}
                      className={`rounded-lg px-2 py-1.5 ${i === 0 ? "bg-brand-100 font-medium text-brand-800" : ""}`}
                    >
                      {block}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3 p-4 lg:col-span-9">
                <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center text-white">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-200">{b.blocks[0]}</p>
                  <p className="mt-2 text-2xl font-bold">{b.heroTitle}</p>
                  <span className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700">
                    {b.shopNow}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {b.products.map((product) => (
                    <div key={product} className="rounded-lg border border-zinc-200 p-2">
                      <div className="aspect-square rounded-md bg-brand-100" />
                      <p className="mt-2 truncate text-xs font-medium text-zinc-700">{product}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3 text-center text-sm text-brand-700">
                  {b.addBlock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FactsSection() {
  const { content } = useLanding();
  const f = content.facts;
  return (
    <section id="facts" className="bg-zinc-50 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={f.eyebrow} title={f.title} subtitle={f.subtitle} />
        <dl className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {f.items.map((fact) => (
            <div key={fact.label} className="rounded-3xl border border-zinc-200/80 bg-white p-7 text-center shadow-sm">
              <dt className="text-4xl font-extrabold tracking-tight text-brand-700">{fact.value}</dt>
              <dd className="mt-2 text-base leading-relaxed text-zinc-600">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const { content } = useLanding();
  const h = content.how;
  return (
    <section id="how" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={h.eyebrow} title={h.title} />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {h.steps.map((step, i) => (
            <li key={step.title} className="rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-7 md:p-8">
              <span className="text-sm font-semibold tracking-wide text-brand-600">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type Cell = boolean | string;
const platforms = ["Tescommerce", "Shopify", "Sellfy", "Gumroad"] as const;

function CellContent({ value, highlight }: { value: Cell; highlight: boolean }) {
  if (value === true) {
    return <span className={highlight ? "font-semibold text-brand-600" : "text-emerald-600"}>✓</span>;
  }
  if (value === false) return <span className="text-zinc-300">—</span>;
  return <span className={highlight ? "font-medium text-zinc-900" : "text-zinc-600"}>{value}</span>;
}

export function ComparisonSection() {
  const { content } = useLanding();
  const c = content.compare;
  return (
    <section id="compare" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />

        <div className="mt-12 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-4 font-semibold text-zinc-500" />
                {platforms.map((p, i) => (
                  <th key={p} className={`px-4 py-4 font-semibold ${i === 0 ? "text-brand-700" : "text-zinc-700"}`}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => (
                <tr key={row.label} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-4 font-medium text-zinc-700">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={platforms[i]} className={`px-4 py-3.5 ${i === 0 ? "bg-brand-50/50" : ""}`}>
                      <CellContent value={val} highlight={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-4 md:hidden">
          {platforms.slice(1).map((platform, pi) => (
            <div key={platform} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-zinc-900">
                Tescommerce {c.vs} {platform}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {c.rows.map((row) => (
                  <li key={row.label} className="flex justify-between gap-4 border-b border-zinc-50 py-2 last:border-0">
                    <span className="text-zinc-500">{row.label}</span>
                    <span className="text-right">
                      <CellContent value={row.values[0]!} highlight />{" "}
                      <span className="text-zinc-400">/</span>{" "}
                      <CellContent value={row.values[pi + 1]!} highlight={false} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SecuritySection() {
  const { content } = useLanding();
  const s = content.security;
  return (
    <section id="security" className="bg-zinc-900 py-20 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">{s.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{s.title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">{s.subtitle}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.items.map((item, i) => {
            const Icon = securityIcons[i % securityIcons.length]!;
            return (
              <article key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-7">
                <Icon className="h-6 w-6 text-brand-300" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-zinc-300">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  const { locale, content } = useLanding();
  const p = content.pricing;
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={p.eyebrow} title={p.title} />
        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {p.plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-3xl border p-8 ${
                plan.highlighted
                  ? "relative border-brand-300 bg-white shadow-lg shadow-brand-500/10"
                  : "border-zinc-200/80 bg-white shadow-sm"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
                  {p.mostPopular}
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{plan.desc}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-zinc-500">{plan.period}</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-base leading-relaxed text-zinc-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-brand-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={localizedPath(locale, "/signup")}
                className="mt-8 block"
                onClick={() => track(`cta_plan_${plan.name.toLowerCase()}`)}
              >
                <Button variant={plan.highlighted ? "primary" : "secondary"} className="w-full py-3">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-zinc-600">{p.breakEven}</p>
      </div>
    </section>
  );
}

export function FounderSection() {
  const { content } = useLanding();
  const f = content.founder;
  const telegram = import.meta.env.VITE_FOUNDER_TELEGRAM_URL?.trim();
  const photo = import.meta.env.VITE_FOUNDER_PHOTO_URL?.trim();
  const initials = f.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <section id="founder" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow={f.eyebrow} title={f.title} />
        <figure className="mt-12 flex flex-col items-center gap-8 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-8 md:flex-row md:items-start md:p-10">
          {photo ? (
            <img src={photo} alt={f.name} className="h-28 w-28 shrink-0 rounded-full object-cover shadow-md" />
          ) : (
            <span
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 text-3xl font-bold text-white shadow-md"
              aria-hidden
            >
              {initials}
            </span>
          )}
          <div className="text-center md:text-left">
            <blockquote className="text-xl leading-relaxed text-zinc-800">“{f.quote}”</blockquote>
            <figcaption className="mt-5">
              <p className="font-semibold text-zinc-900">{f.name}</p>
              <p className="text-sm text-zinc-500">{f.role}</p>
            </figcaption>
            {telegram ? (
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("founder_telegram")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                <Send className="h-4 w-4" aria-hidden />
                {f.telegram} →
              </a>
            ) : null}
          </div>
        </figure>
      </div>
    </section>
  );
}

export function FaqSection() {
  const { content } = useLanding();
  const f = content.faq;
  return (
    <section id="faq" className="bg-zinc-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow={f.eyebrow} title={f.title} />
        <div className="mt-12 space-y-3">
          {f.items.map((item) => (
            <details key={item.q} className="group rounded-xl border border-zinc-200/80 bg-white shadow-sm open:shadow-md">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-brand-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-5 pb-5 pt-3 text-base leading-relaxed text-zinc-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { locale, content } = useLanding();
  const f = content.finalCta;
  return (
    <section className="mx-6 my-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-16 text-center md:px-16 md:py-20">
        <h2 className="text-3xl font-bold text-white md:text-4xl">{f.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-brand-100">{f.desc}</p>
        <Link
          to={localizedPath(locale, "/signup")}
          className="mt-8 inline-block"
          onClick={() => track("cta_final")}
        >
          <span className="inline-flex rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50">
            {f.cta}
          </span>
        </Link>
      </div>
    </section>
  );
}
