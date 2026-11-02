import type { HomeBlock } from "@ugclab/tenant/store-theme";

function othersHasIt(text: string | undefined) {
  return (text ?? "").trim().toLowerCase().startsWith("yes");
}

export function CompareTableSection({ block }: { block: HomeBlock }) {
  const rows = block.features ?? [];
  const others = block.subtitle?.trim() || "Others";
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      {block.title ? <h2 className="text-2xl font-bold">{block.title}</h2> : null}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2 font-medium" />
            <th className="py-2 font-medium">Us</th>
            <th className="py-2 font-medium">{others}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.title} className="border-t border-zinc-100">
              <td className="py-3 pr-4">{row.title}</td>
              <td className="py-3 text-lg" aria-label="Yes">✓</td>
              <td className="py-3 text-lg text-zinc-400" aria-label={othersHasIt(row.text) ? "Yes" : "No"}>
                {othersHasIt(row.text) ? "✓" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function OrderStepsSection({ block }: { block: HomeBlock }) {
  const steps = block.features ?? [];
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      {block.title ? <h2 className="text-2xl font-bold">{block.title}</h2> : null}
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="text-center">
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "var(--store-primary, #18181b)" }}
            >
              {i + 1}
            </div>
            <p className="mt-3 font-semibold">{step.title}</p>
            {step.text ? <p className="mt-1 text-sm text-zinc-500">{step.text}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PickupSection({ block }: { block: HomeBlock }) {
  const points = block.features ?? [];
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      {block.title ? <h2 className="text-xl font-bold">{block.title}</h2> : null}
      {block.subtitle ? <p className="mt-1 text-sm text-zinc-500">{block.subtitle}</p> : null}
      <ul className="mt-4 space-y-3">
        {points.map((point) => (
          <li key={point.title} className="rounded-xl border border-zinc-100 px-4 py-3">
            <p className="font-medium">{point.title}</p>
            {point.text ? <p className="text-sm text-zinc-500">{point.text}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IconAccordionSection({ block }: { block: HomeBlock }) {
  const items = block.faqItems ?? [];
  return (
    <section>
      {block.title ? <h2 className="mb-3 text-lg font-bold">{block.title}</h2> : null}
      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
        {items.map((item) => (
          <details key={item.question} className="group px-4 py-3">
            <summary className="cursor-pointer list-none font-medium">
              {item.question}
            </summary>
            <p className="mt-2 text-sm text-zinc-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
