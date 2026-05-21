export function TrustBadges() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-600"
      aria-label="Secure checkout"
    >
      <span className="flex items-center gap-1.5 font-medium text-zinc-700">
        <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V7H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Secure checkout
      </span>
      <span className="text-zinc-400">·</span>
      <span>SSL encrypted</span>
      <span className="text-zinc-400">·</span>
      <span className="font-semibold tracking-wide text-zinc-500">VISA</span>
      <span className="font-semibold tracking-wide text-zinc-500">MC</span>
      <span className="font-semibold tracking-wide text-zinc-500">AMEX</span>
    </div>
  );
}
