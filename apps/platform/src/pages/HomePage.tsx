import { Link } from "react-router-dom";
import { getMessages } from "@ugclab/i18n";
import { Button } from "@ugclab/ui";
import {
  IconBox,
  IconCard,
  IconChart,
  IconDownload,
  IconGlobe,
  IconShield,
  IconSpark,
} from "@/components/icons";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { DemoStoreCta } from "@/components/landing/demo-store-cta";
import { FaqSection } from "@/components/landing/faq-section";
import { SiteBuilderShowcase } from "@/components/landing/site-builder-showcase";
import { SocialProof } from "@/components/landing/social-proof";
import { StorePreview } from "@/components/store-preview";
import { demoStoreUrl, merchantAdminUrl } from "@/lib/urls";

const t = getMessages().platform;
const c = getMessages().common;

const features = [
  {
    icon: IconGlobe,
    title: "Global storefront",
    desc: "Custom subdomain or your own domain. Multi-currency ready for buyers worldwide.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    icon: IconDownload,
    title: "Digital & physical",
    desc: "Sell presets, courses, and merch from one catalog — like Sellfy meets Shopify.",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    icon: IconCard,
    title: "Stripe checkout",
    desc: "Cards, Apple Pay, and Google Pay in supported countries. PCI-compliant by default.",
    color: "bg-sky-100 text-sky-700",
  },
  {
    icon: IconBox,
    title: "Shipping zones",
    desc: "Flat rates by country and region. Expand to carrier APIs when you scale.",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: IconChart,
    title: "Built-in analytics",
    desc: "Track GMV, orders, and conversion from your merchant dashboard.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: IconShield,
    title: "Secure delivery",
    desc: "Signed download links for digital goods with limits and expiry.",
    color: "bg-rose-100 text-rose-700",
  },
];

const steps = [
  { n: "01", title: "Create your store", desc: "Sign up, pick a name, get your subdomain in under 2 minutes." },
  { n: "02", title: "Add products", desc: "Upload digital files or list physical products with variants." },
  { n: "03", title: "Start selling", desc: "Share your link, accept payments, fulfill orders globally." },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    desc: "Perfect to validate your idea",
    features: ["Up to 50 products", "Subdomain store", "5% platform fee", "Email support"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$29",
    period: "/month",
    desc: "For growing brands",
    features: ["Unlimited products", "Custom domain", "0% platform fee", "Stripe Tax ready", "Priority support"],
    cta: "Start trial",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    desc: "Teams & power sellers",
    features: ["Everything in Growth", "Staff accounts", "API access", "Advanced analytics"],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-teal-500/30">
              T
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-900">{c.brand}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <a href="#features" className="transition hover:text-violet-600">
              Features
            </a>
            <a href="#how" className="transition hover:text-violet-600">
              How it works
            </a>
            <a href="#compare" className="transition hover:text-violet-600">
              Compare
            </a>
            <a href="#pricing" className="transition hover:text-violet-600">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-violet-600">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={`${merchantAdminUrl}/login`}
              className="hidden text-sm font-medium text-zinc-600 transition hover:text-zinc-900 sm:inline"
            >
              {c.signIn}
            </a>
            <Link to="/signup">
              <Button className="shadow-lg shadow-violet-500/25">{c.getStarted}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mesh-hero overflow-hidden pb-8 pt-16 md:pt-24">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-4 py-1.5 text-sm font-medium text-violet-700 shadow-sm backdrop-blur">
              <IconSpark className="h-4 w-4" />
              Global-first commerce platform
            </div>
            <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 md:text-6xl md:leading-[1.05]">
              {t.heroTitle.split(" ").slice(0, 2).join(" ")}{" "}
              <span className="text-gradient">{t.heroTitle.split(" ").slice(2).join(" ")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
              {t.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
              <Link to="/signup">
                <Button className="min-w-[200px] px-8 py-3.5 text-base shadow-xl shadow-violet-500/30">
                  {c.getStarted}
                </Button>
              </Link>
              <a
                href={demoStoreUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-[200px] items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-8 py-3.5 text-base font-medium text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-100"
              >
                Open demo store
              </a>
              <a
                href="#how"
                className="inline-flex min-w-[200px] items-center justify-center rounded-lg border border-zinc-300 bg-white px-8 py-3.5 text-base font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                See how it works
              </a>
            </div>
            <p className="mt-8 text-sm text-zinc-500">
              No credit card required · Setup in minutes · MoR payouts for merchants
            </p>
            <p className="mt-2 text-sm font-medium text-violet-600">
              New: merchant dashboard with first-sale metrics, accounting export & support hub
            </p>
            <StorePreview />
          </div>
        </section>

        <section className="border-y border-zinc-200/80 bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 text-sm font-medium text-zinc-400">
            {["Stripe", "Global shipping", "Digital delivery", "GDPR-ready"].map((label) => (
              <span key={label} className="tracking-wide uppercase">
                {label}
              </span>
            ))}
          </div>
        </section>

        <DemoStoreCta />
        <SiteBuilderShowcase />

        <section id="features" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
                {t.featuresTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
                Everything creators and small brands need to launch, sell, and scale — without hiring
                developers.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc, color }) => (
                <article
                  key={title}
                  className="card-hover rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
                >
                  <span className={`inline-flex rounded-xl p-3 ${color}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <SocialProof />

        <section id="how" className="bg-zinc-900 py-24 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-400">How it works</p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Launch your store in 3 steps</h2>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.n}
                  className="relative rounded-2xl border border-zinc-700/80 bg-zinc-800/50 p-8"
                >
                  <span className="text-4xl font-bold text-violet-500/40">{step.n}</span>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ComparisonSection />

        <section id="pricing" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{t.pricingTitle}</h2>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`card-hover flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "relative border-violet-500 bg-gradient-to-b from-violet-50 to-white shadow-xl shadow-violet-500/15 ring-2 ring-violet-500/20"
                      : "border-zinc-200 bg-white shadow-sm"
                  }`}
                >
                  {plan.highlighted ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{plan.desc}</p>
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-zinc-500">{plan.period}</span>
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-zinc-600">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="text-violet-600">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className="mt-8 block">
                    <Button
                      variant={plan.highlighted ? "primary" : "secondary"}
                      className="w-full py-3"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FaqSection />

        <section className="mx-6 mb-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-16 text-center shadow-2xl shadow-violet-500/30 md:px-16">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to sell globally?</h2>
            <p className="mx-auto mt-4 max-w-xl text-violet-100">
              Join creators and brands building on {c.brand}. Your storefront is one signup away.
            </p>
            <Link to="/signup" className="mt-8 inline-block">
              <span className="inline-flex rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-violet-700 shadow-lg transition hover:bg-violet-50">
                {c.getStarted}
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {c.brand}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-800">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-800">
              Terms
            </a>
            <a href={`${merchantAdminUrl}/login`} className="hover:text-zinc-800">
              Merchant login
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
