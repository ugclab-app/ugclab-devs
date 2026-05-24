import { demoStoreUrl } from "@/lib/urls";

export function DemoStoreCta() {
  const url = demoStoreUrl();
  return (
    <section className="border-y border-violet-200/60 bg-gradient-to-r from-violet-50 to-indigo-50 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center md:flex-row md:text-left">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Live demo
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 md:text-3xl">
            See a real storefront — not just a mockup
          </h2>
          <p className="mt-2 max-w-xl text-zinc-600">
            Browse the Tescommerce demo shop: collections, product pages, and checkout — exactly what
            your buyers will see.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white px-8 py-3.5 text-base font-semibold text-violet-700 shadow-lg shadow-violet-500/10 transition hover:border-violet-300 hover:bg-violet-50"
        >
          Open demo store →
        </a>
      </div>
    </section>
  );
}
