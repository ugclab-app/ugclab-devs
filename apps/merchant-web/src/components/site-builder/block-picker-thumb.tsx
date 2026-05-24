import type { CSSProperties } from "react";
import type { BlockThumbLayout } from "./block-variants";

const bar = (style: CSSProperties) => (
  <span className="block-picker-thumb-bar" style={style} />
);

export function BlockPickerThumb({ layout }: { layout: BlockThumbLayout }) {
  const primary = "var(--store-primary, #7c3aed)";

  switch (layout) {
    case "hero-centered":
      return (
        <div className="block-picker-thumb-inner">
          {bar({ width: "40%", height: 6, margin: "12px auto 4px", background: primary })}
          {bar({ width: "70%", height: 4, margin: "0 auto 8px", background: "#d4d4d8" })}
          {bar({
            width: 28,
            height: 8,
            margin: "0 auto",
            borderRadius: 4,
            background: primary,
          })}
        </div>
      );
    case "hero-left":
      return (
        <div className="block-picker-thumb-inner flex gap-2 px-2">
          <div className="flex flex-1 flex-col justify-center gap-1">
            {bar({ width: "80%", height: 5, background: primary })}
            {bar({ width: "60%", height: 3, background: "#d4d4d8" })}
            {bar({ width: 32, height: 7, borderRadius: 3, background: primary })}
          </div>
          <div className="w-[42%] rounded bg-zinc-200" />
        </div>
      );
    case "hero-minimal":
      return (
        <div className="block-picker-thumb-inner flex items-center justify-center px-3">
          {bar({ width: "75%", height: 4, background: "#a1a1aa" })}
        </div>
      );
    case "cta-centered":
      return (
        <div className="block-picker-thumb-inner flex flex-col items-center justify-center gap-1 bg-violet-100 px-2">
          {bar({ width: "65%", height: 4, background: primary })}
          {bar({ width: 36, height: 7, borderRadius: 4, background: primary })}
        </div>
      );
    case "cta-split":
    case "cta-banner":
      return (
        <div className="block-picker-thumb-inner flex items-center justify-between gap-2 px-2 bg-zinc-100">
          {bar({ width: "55%", height: 4, background: "#52525b" })}
          {bar({ width: 28, height: 7, borderRadius: 3, background: primary })}
        </div>
      );
    case "text-image-left":
      return (
        <div className="block-picker-thumb-inner flex gap-1.5 p-1.5">
          <div className="w-[38%] rounded-sm bg-zinc-300" />
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            {bar({ width: "90%", height: 3, background: "#71717a" })}
            {bar({ width: "70%", height: 2, background: "#d4d4d8" })}
          </div>
        </div>
      );
    case "text-image-right":
      return (
        <div className="block-picker-thumb-inner flex gap-1.5 p-1.5">
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            {bar({ width: "90%", height: 3, background: "#71717a" })}
            {bar({ width: "70%", height: 2, background: "#d4d4d8" })}
          </div>
          <div className="w-[38%] rounded-sm bg-zinc-300" />
        </div>
      );
    case "text-image-stacked":
      return (
        <div className="block-picker-thumb-inner flex flex-col gap-1 p-1.5">
          <div className="h-[55%] rounded-sm bg-zinc-300" />
          {bar({ width: "80%", height: 3, margin: "0 auto", background: "#a1a1aa" })}
        </div>
      );
    case "features-3":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-3 gap-1 p-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full"
                style={{ width: 8, height: 8, background: i === 1 ? primary : "#e4e4e7" }}
              />
              {bar({ width: "100%", height: 2, background: "#d4d4d8" })}
            </div>
          ))}
        </div>
      );
    case "features-4":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-4 gap-0.5 p-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-sm bg-zinc-200" style={{ height: 28 }} />
          ))}
        </div>
      );
    case "gallery-grid":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-3 gap-0.5 p-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-sm bg-zinc-200" />
          ))}
        </div>
      );
    case "gallery-masonry":
      return (
        <div className="block-picker-thumb-inner flex gap-0.5 p-1.5">
          <div className="flex-1 space-y-0.5">
            <div className="h-6 rounded-sm bg-zinc-300" />
            <div className="h-4 rounded-sm bg-zinc-200" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="h-4 rounded-sm bg-zinc-200" />
            <div className="h-6 rounded-sm bg-zinc-300" />
          </div>
        </div>
      );
    case "columns-2":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-2 gap-1 p-2">
          <div className="rounded bg-zinc-200" style={{ height: 32 }} />
          <div className="rounded bg-zinc-200" style={{ height: 32 }} />
        </div>
      );
    case "columns-3":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-3 gap-0.5 p-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-sm bg-zinc-200" style={{ height: 30 }} />
          ))}
        </div>
      );
    case "products-grid":
      return (
        <div className="block-picker-thumb-inner grid grid-cols-4 gap-0.5 p-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-0.5">
              <div className="aspect-[4/5] rounded-sm bg-zinc-200" />
              {bar({ width: "100%", height: 2, background: "#e4e4e7" })}
            </div>
          ))}
        </div>
      );
    case "products-carousel":
      return (
        <div className="block-picker-thumb-inner flex gap-1 overflow-hidden p-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-8 shrink-0 space-y-0.5">
              <div className="aspect-square rounded-sm bg-zinc-200" />
              {bar({ width: "100%", height: 2, background: "#e4e4e7" })}
            </div>
          ))}
        </div>
      );
    case "faq-list":
    case "faq-accordion":
      return (
        <div className="block-picker-thumb-inner space-y-1 p-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded border border-zinc-200 bg-white px-1 py-1">
              {bar({ width: `${70 - i * 10}%`, height: 2, background: "#a1a1aa" })}
            </div>
          ))}
        </div>
      );
    case "newsletter-card":
      return (
        <div className="block-picker-thumb-inner m-2 rounded border border-zinc-200 bg-zinc-50 p-1.5">
          {bar({ width: "60%", height: 3, margin: "0 auto 4px", background: "#71717a" })}
          <div className="flex gap-0.5">
            <div className="h-4 flex-1 rounded-sm bg-white border border-zinc-200" />
            <div className="h-4 w-6 rounded-sm" style={{ background: primary }} />
          </div>
        </div>
      );
    case "newsletter-inline":
      return (
        <div className="block-picker-thumb-inner flex items-center gap-1 px-2" style={{ background: primary }}>
          {bar({ width: "40%", height: 3, background: "rgba(255,255,255,.8)" })}
          <div className="h-3 flex-1 rounded-sm bg-white/90" />
        </div>
      );
    case "countdown-bold":
      return (
        <div className="block-picker-thumb-inner flex flex-col items-center justify-center gap-1" style={{ background: primary }}>
          {bar({ width: "50%", height: 3, background: "rgba(255,255,255,.9)" })}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rounded bg-white/30 px-1 text-[8px] font-bold text-white">
                0{i}
              </span>
            ))}
          </div>
        </div>
      );
    case "countdown-minimal":
      return (
        <div className="block-picker-thumb-inner flex items-center justify-center bg-amber-50">
          {bar({ width: "70%", height: 4, background: "#d97706" })}
        </div>
      );
    default:
      return (
        <div className="block-picker-thumb-inner flex items-center justify-center bg-zinc-100">
          {bar({ width: "60%", height: 4, background: "#d4d4d8" })}
        </div>
      );
  }
}
