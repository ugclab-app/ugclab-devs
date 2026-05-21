"use client";

import { useState } from "react";

export function StorefrontPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Live preview</h2>
        <p className="text-xs text-zinc-500">Loads on demand — saves dev resources</p>
      </div>
      <div className="bg-zinc-100 p-3">
        {!loaded ? (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="flex h-[200px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-600 transition hover:border-violet-300 hover:text-violet-700"
          >
            <span className="text-2xl">↗</span>
            <span className="mt-2 font-medium">Load storefront preview</span>
          </button>
        ) : (
          <iframe
            src={url}
            title="Storefront preview"
            className="h-[420px] w-full rounded-lg border border-zinc-200 bg-white shadow-inner"
            loading="lazy"
          />
        )}
      </div>
    </section>
  );
}
