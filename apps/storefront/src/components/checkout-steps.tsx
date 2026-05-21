export function CheckoutSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Cart" },
    { n: 2, label: "Details" },
    { n: 3, label: "Confirm" },
  ] as const;

  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-sm sm:gap-4">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-2 sm:gap-4">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold ${
              step >= s.n
                ? "bg-[var(--store-primary)] text-white"
                : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {s.n}
          </span>
          <span className={step >= s.n ? "font-medium text-zinc-900" : "text-zinc-500"}>
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span className="hidden h-px w-8 bg-zinc-200 sm:block" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
