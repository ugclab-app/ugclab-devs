"use client";

import { useEffect, useState } from "react";

export function ProductGallery({
  images,
}: {
  images: { url: string; alt: string }[];
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState({ x: 50, y: 50, on: false });

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive((i) => Math.min(images.length - 1, i + 1));
      if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, images.length]);

  if (images.length === 0) return null;

  const main = images[active] ?? images[0]!;
  const hasThumbs = images.length > 1;

  return (
    <div
      className={
        hasThumbs ? "grid gap-4 lg:grid-cols-[5rem_1fr]" : "grid gap-4"
      }
    >
      {hasThumbs ? (
        <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`block overflow-hidden rounded-lg border-2 transition ${
                  i === active
                    ? "border-[var(--store-primary)]"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-16 w-16 object-cover lg:h-20 lg:w-20"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="group relative overflow-hidden rounded-2xl bg-zinc-100 text-left"
        onClick={() => setLightbox(true)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          setZoom({ x, y, on: true });
        }}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
        aria-label="Enlarge image"
      >
        <img
          src={main.url}
          alt={main.alt}
          className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          style={
            zoom.on
              ? {
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  transform: "scale(1.45)",
                }
              : undefined
          }
        />
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          Zoom
        </span>
      </button>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
            onClick={() => setLightbox(false)}
          >
            Close
          </button>
          {hasThumbs ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => Math.max(0, i - 1));
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => Math.min(images.length - 1, i + 1));
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <img
            src={main.url}
            alt={main.alt}
            className="max-h-[90vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
