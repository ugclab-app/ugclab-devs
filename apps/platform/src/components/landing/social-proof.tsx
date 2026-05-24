const stats = [
  { value: "50+", label: "Countries supported" },
  { value: "< 2 min", label: "Average store setup" },
  { value: "0%", label: "Platform fee on Growth" },
  { value: "24/7", label: "Stripe-powered checkout" },
];

const quotes = [
  {
    text: "We launched digital presets and merch in one weekend. The site builder felt familiar if you have used Shopify.",
    name: "Alex M.",
    role: "Creator · early access",
  },
  {
    text: "MoR payouts mean we focus on product, not tax wiring in every country. Dashboard export saved our accountant hours.",
    name: "Jordan K.",
    role: "Brand founder · beta",
  },
  {
    text: "Signed download links and inventory in one place — finally replaced Gumroad + a separate shop.",
    name: "Sam R.",
    role: "Course seller · beta",
  },
];

export function SocialProof() {
  return (
    <section id="social-proof" className="bg-zinc-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Trusted by sellers
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Built for creators going global
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-500">
            Early access merchants · quotes reflect beta experience
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-6 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-violet-600 md:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-600">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {quotes.map((q) => (
            <blockquote
              key={q.name}
              className="card-hover flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
            >
              <p className="flex-1 text-sm leading-relaxed text-zinc-700">&ldquo;{q.text}&rdquo;</p>
              <footer className="mt-4 border-t border-zinc-100 pt-4">
                <p className="font-semibold text-zinc-900">{q.name}</p>
                <p className="text-xs text-zinc-500">{q.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
