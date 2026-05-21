"use client";

import { useState } from "react";

export function ProductGallery({
  images,
}: {
  images: { url: string; alt: string }[];
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  const main = images[active] ?? images[0]!;

  return (
    <div className="grid gap-4 lg:grid-cols-[5rem_1fr]">
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`block overflow-hidden rounded-lg border-2 transition ${
                  i === active ? "border-[var(--store-primary)]" : "border-transparent opacity-70 hover:opacity-100"
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
      <div className="overflow-hidden rounded-2xl bg-zinc-100">
        <img
          src={main.url}
          alt={main.alt}
          className="aspect-square w-full object-cover"
        />
      </div>
    </div>
  );
}
