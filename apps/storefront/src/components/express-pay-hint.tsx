export function ExpressPayHint({
  stripeLive,
  linkEnabled = true,
}: {
  stripeLive?: boolean;
  linkEnabled?: boolean;
}) {
  if (!stripeLive) return null;
  return (
    <div
      className="rounded-xl border border-zinc-100 bg-white px-4 py-3"
      aria-label="Payment methods"
    >
      <p className="mb-2 text-center text-xs font-medium text-zinc-500">Express checkout</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {linkEnabled ? (
          <span className="rounded-md bg-[#00d66f] px-3 py-1.5 text-xs font-bold text-[#011e0f]">
            Link
          </span>
        ) : null}
        <span className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white">
          Apple Pay
        </span>
        <span className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">
          Google Pay
        </span>
        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700">
          Cards
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-400">
        {linkEnabled
          ? "Buyers with a Link account (link.com) can pay in one step on Stripe Checkout."
          : "Available on Stripe Checkout when enabled in your Stripe Dashboard."}
      </p>
    </div>
  );
}
