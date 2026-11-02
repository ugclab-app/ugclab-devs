import { demoStoreUrl } from "@/lib/urls";

export function StorePreview({ note }: { note: string }) {
  const demoUrl = demoStoreUrl();
  return (
    <div className="relative mx-auto mt-14 max-w-4xl px-4">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-200/80">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-4 flex-1 truncate rounded-md bg-white px-3 py-1 text-left text-xs text-zinc-400">
            {demoUrl}
          </span>
        </div>
        <iframe
          title="Tescommerce demo store"
          src={demoUrl}
          loading="lazy"
          className="h-[420px] w-full bg-white md:h-[520px]"
        />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{note}</p>
    </div>
  );
}
