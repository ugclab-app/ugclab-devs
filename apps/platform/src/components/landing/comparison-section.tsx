type Cell = boolean | string;

const platforms = ["Tescommerce", "Shopify", "Sellfy", "Gumroad"] as const;

const rows: { label: string; values: Cell[] }[] = [
  { label: "Starting price", values: ["Free", "$39/mo", "$29/mo", "10% fee"] },
  { label: "Visual site builder", values: [true, true, true, false] },
  { label: "Physical + digital products", values: [true, true, "Digital focus", "Digital only"] },
  { label: "Merchant of Record (MoR)", values: [true, false, false, true] },
  { label: "Custom domain", values: [true, true, true, false] },
  { label: "Staff accounts", values: [true, true, false, false] },
  { label: "Time to first sale", values: ["Minutes", "Hours–days", "Hours", "Minutes"] },
];

function CellContent({ value, highlight }: { value: Cell; highlight: boolean }) {
  if (value === true) {
    return (
      <span className={highlight ? "font-semibold text-violet-600" : "text-emerald-600"}>✓</span>
    );
  }
  if (value === false) {
    return <span className="text-zinc-300">—</span>;
  }
  return (
    <span className={highlight ? "font-medium text-zinc-900" : "text-zinc-600"}>{value}</span>
  );
}

export function ComparisonSection() {
  return (
    <section id="compare" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">Compare</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            How Tescommerce stacks up
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            One platform for storefront, checkout, digital delivery, and global selling — without
            stacking four tools.
          </p>
        </div>

        <div className="mt-12 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-4 font-semibold text-zinc-500" />
                {platforms.map((p, i) => (
                  <th
                    key={p}
                    className={`px-4 py-4 font-semibold ${i === 0 ? "text-violet-700" : "text-zinc-700"}`}
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3.5 font-medium text-zinc-700">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td
                      key={platforms[i]}
                      className={`px-4 py-3.5 ${i === 0 ? "bg-violet-50/50" : ""}`}
                    >
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
                Tescommerce vs {platform}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {rows.map((row) => (
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
