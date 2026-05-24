const faqs = [
  {
    q: "What fees does Tescommerce charge?",
    a: "Starter is free with a small platform fee on sales. Growth removes the platform fee on subscription plans. Payment processing is handled by Stripe at standard card rates.",
  },
  {
    q: "What is Merchant of Record (MoR)?",
    a: "On supported plans, Tescommerce can act as Merchant of Record: we handle tax collection and remittance in many regions so you receive net payouts instead of wiring taxes country by country yourself.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Connect a custom domain on Growth and Pro. Until then, your store is available on a branded subdomain instantly after signup.",
  },
  {
    q: "Do you support digital downloads?",
    a: "Yes — sell files, courses, and presets with secure signed download links, expiry, and download limits. Physical products and shipping zones are supported too.",
  },
  {
    q: "How does Stripe fit in?",
    a: "Checkout runs on Stripe (cards, Apple Pay, Google Pay where available). You connect payouts through the merchant dashboard; we never store raw card numbers.",
  },
  {
    q: "When and how do I get paid?",
    a: "Paid orders accumulate in your merchant balance. Request payouts from the dashboard according to your plan and MoR schedule. Accounting export is built in.",
  },
  {
    q: "Is Tescommerce GDPR-ready?",
    a: "We provide privacy controls, consent-friendly checkout, and data export patterns suitable for EU buyers. You remain responsible for your store policies and lawful basis.",
  },
  {
    q: "How is this different from Shopify?",
    a: "Shopify is a full ecosystem with apps and themes. Tescommerce focuses on faster launch, built-in digital delivery, MoR options, and a native site builder — ideal for creators who do not need a large app store on day one.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-zinc-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Common questions
          </h2>
        </div>
        <div className="mt-12 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-zinc-200/80 bg-white shadow-sm open:shadow-md"
            >
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-violet-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-5 pb-4 pt-2 text-sm leading-relaxed text-zinc-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
