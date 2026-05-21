import { Link } from "react-router-dom";

export function StickyFormBar({
  discardTo,
  submitLabel,
  pending,
}: {
  discardTo: string;
  submitLabel: string;
  pending?: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur-md lg:left-64">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          to={discardTo}
          className="ugclab-btn border border-zinc-300 bg-white text-sm text-zinc-700"
        >
          Discard
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary min-w-[140px] px-8 py-3"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
