export function SiteBuilderShowcase() {
  return (
    <section id="site-builder" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            Site builder
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Design your store like Shopify — without the complexity
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Drag-and-drop sections, preset themes, and a live preview. Publish when you are ready —
            no developers required.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Themes & presets",
              desc: "Start from curated layouts or save your own brand preset.",
            },
            {
              title: "Blocks library",
              desc: "Hero, products, FAQ, newsletter, pricing, tabs, contact — mix and match.",
            },
            {
              title: "Mobile & tablet",
              desc: "Preview every breakpoint before you publish to your live store.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="card-hover rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.desc}</p>
            </article>
          ))}
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-500/15 to-teal-500/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-zinc-500">Storefront editor</span>
              </div>
              <div className="flex gap-1 rounded-lg bg-white p-0.5 text-xs font-medium shadow-sm">
                <span className="rounded-md bg-violet-100 px-2.5 py-1 text-violet-700">Desktop</span>
                <span className="rounded-md px-2.5 py-1 text-zinc-500">Tablet</span>
                <span className="rounded-md px-2.5 py-1 text-zinc-500">Mobile</span>
              </div>
            </div>
            <div className="grid gap-0 lg:grid-cols-12">
              <aside className="hidden border-r border-zinc-100 bg-zinc-50/80 p-4 lg:col-span-3 lg:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Blocks</p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
                  {["Hero", "Featured products", "Trust strip", "Newsletter", "FAQ"].map((b, i) => (
                    <li
                      key={b}
                      className={`rounded-lg px-2 py-1.5 ${i === 0 ? "bg-violet-100 font-medium text-violet-800" : ""}`}
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="space-y-3 p-4 lg:col-span-9">
                <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-center text-white">
                  <p className="text-xs font-medium uppercase tracking-wider text-violet-200">Hero</p>
                  <p className="mt-2 text-2xl font-bold">Your brand, one store</p>
                  <span className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700">
                    Shop now
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Product A", "Product B", "Product C"].map((p) => (
                    <div key={p} className="rounded-lg border border-zinc-200 p-2">
                      <div className="aspect-square rounded-md bg-violet-100" />
                      <p className="mt-2 truncate text-xs font-medium text-zinc-700">{p}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-center text-sm text-violet-700">
                  + Add block
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
