import type { HomeBlock } from "@ugclab/tenant/store-theme";

/** Preview how overlay blocks look to shoppers while editing in the builder. */
export function BuilderOverlayPreview({ block }: { block: HomeBlock }) {
  if (block.type === "sticky_cta") {
    return (
      <div className="pointer-events-none mt-3 rounded-lg border border-dashed border-violet-300 bg-violet-50/80 p-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          Mobile sticky bar preview
        </p>
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 shadow-md"
          style={{
            background: block.bgColor ?? "#fff",
            color: block.textColor ?? "#18181b",
          }}
        >
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold">{block.title ?? "Sticky offer"}</p>
            {block.subtitle ? <p className="truncate opacity-80">{block.subtitle}</p> : null}
          </div>
          {block.ctaLabel ? (
            <span className="shrink-0 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-medium text-white">
              {block.ctaLabel}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === "discount_popup") {
    return (
      <div className="pointer-events-none relative mt-3 min-h-[140px] rounded-lg border border-dashed border-violet-300 bg-zinc-900/5 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          Popup preview (shows after {block.popupDelaySec ?? 3}s on live store)
        </p>
        <div className="mx-auto max-w-xs rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
          <p className="text-center text-sm font-bold text-zinc-900">
            {block.title ?? "10% off your first order"}
          </p>
          {block.subtitle ? (
            <p className="mt-1 text-center text-xs text-zinc-600">{block.subtitle}</p>
          ) : null}
          {block.discountCode ? (
            <p className="mt-3 text-center font-mono text-xs text-violet-700">{block.discountCode}</p>
          ) : null}
          {block.ctaLabel ? (
            <p className="mt-3 text-center text-xs font-medium text-violet-600">{block.ctaLabel}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
