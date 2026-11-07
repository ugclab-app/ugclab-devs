"use client";

import { useState } from "react";

export function UgcPhotoGallery({
  photos,
}: {
  photos: { url: string; author?: string | null }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!photos.length) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight text-zinc-900">
        Customer photos
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Real photos from verified reviews
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((p) => (
          <li key={p.url}>
            <button
              type="button"
              className="block w-full overflow-hidden rounded-xl bg-zinc-100"
              onClick={() => setOpen(p.url)}
            >
              <img
                src={p.url}
                alt={p.author ? `Photo by ${p.author}` : "Customer photo"}
                className="aspect-square w-full object-cover transition hover:scale-105"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <img
            src={open}
            alt=""
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
