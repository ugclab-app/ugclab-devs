export function CheckoutSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Cart" },
    { n: 2, label: "Details" },
    { n: 3, label: "Payment" },
  ] as const;

  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center justify-center gap-2 text-sm sm:gap-4">
        {steps.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <li key={s.n} className="flex items-center gap-2 sm:gap-4">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[var(--store-primary)] text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {done ? "✓" : s.n}
              </span>
              <span
                className={
                  active ? "font-semibold text-zinc-900" : done ? "text-zinc-700" : "text-zinc-500"
                }
              >
                {s.label}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={`hidden h-px w-8 sm:block ${done ? "bg-emerald-200" : "bg-zinc-200"}`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
