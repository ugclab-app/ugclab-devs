import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { BLOCK_CATALOG } from "./block-catalog";
import { InlineEdit } from "./inline-edit";

export function BlockPreview({
  block,
  primaryColor,
  storeName,
  onPatch,
}: {
  block: HomeBlock;
  primaryColor: string;
  storeName: string;
  onPatch?: (patch: Partial<HomeBlock>) => void;
}) {
  const meta = BLOCK_CATALOG.find((b) => b.type === block.type);
  const bg = block.bgColor;
  const color = block.textColor;
  const edit = onPatch;

  if (block.type === "hero") {
    return (
      <div
        className="relative overflow-hidden rounded-lg text-white"
        style={{
          background: block.imageUrl
            ? `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)), url(${block.imageUrl}) center/cover`
            : `linear-gradient(135deg, ${primaryColor}, #1e1b4b)`,
          minHeight: 200,
        }}
      >
        <div className="p-8">
          <p className="text-xs uppercase tracking-widest text-white/70">Welcome</p>
          <InlineEdit
            tag="h2"
            className="mt-1 block text-2xl font-bold"
            value={block.title}
            placeholder={storeName}
            onChange={edit ? (title) => edit({ title }) : undefined}
          />
          <InlineEdit
            tag="p"
            className="mt-2 block text-sm text-white/85"
            value={block.subtitle}
            placeholder="Hero subtitle"
            onChange={edit ? (subtitle) => edit({ subtitle }) : undefined}
          />
          {block.ctaLabel || edit ? (
            <InlineEdit
              className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-xs font-semibold text-violet-800"
              value={block.ctaLabel}
              placeholder="Button label"
              onChange={edit ? (ctaLabel) => edit({ ctaLabel }) : undefined}
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === "cta") {
    return (
      <div
        className="rounded-lg px-8 py-10 text-center"
        style={{ background: bg ?? primaryColor, color: color ?? "#fff" }}
      >
        <InlineEdit
          tag="h2"
          className="block text-xl font-bold"
          value={block.title}
          placeholder="Call to action"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <InlineEdit
          tag="p"
          className="mt-2 block text-sm opacity-90"
          value={block.subtitle}
          onChange={edit ? (subtitle) => edit({ subtitle }) : undefined}
        />
        {block.ctaLabel || edit ? (
          <InlineEdit
            className="mt-4 inline-block rounded bg-white px-4 py-2 text-xs font-semibold text-violet-800"
            value={block.ctaLabel}
            placeholder="Button"
            onChange={edit ? (ctaLabel) => edit({ ctaLabel }) : undefined}
          />
        ) : null}
      </div>
    );
  }

  if (block.type === "image_text") {
    return (
      <div className="grid overflow-hidden rounded-lg border border-zinc-200 bg-white md:grid-cols-2">
        {block.imageUrl ? (
          <img src={block.imageUrl} alt="" className="h-32 w-full object-cover md:h-full" />
        ) : (
          <div className="flex h-32 items-center justify-center bg-zinc-100 text-xs text-zinc-400">
            Image
          </div>
        )}
        <div className="p-5">
          <InlineEdit
            tag="h3"
            className="block font-bold"
            value={block.title}
            placeholder="Title"
            onChange={edit ? (title) => edit({ title }) : undefined}
          />
          <InlineEdit
            tag="p"
            className="mt-1 block text-sm text-zinc-600"
            value={block.subtitle}
            onChange={edit ? (subtitle) => edit({ subtitle }) : undefined}
          />
        </div>
      </div>
    );
  }

  if (block.type === "newsletter") {
    return (
      <div
        className="rounded-lg px-8 py-10 text-center"
        style={{ background: bg ?? "#f4f4f5" }}
      >
        <InlineEdit
          tag="h2"
          className="block text-xl font-bold text-zinc-900"
          value={block.title}
          placeholder="Subscribe"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <InlineEdit
          tag="p"
          className="mt-2 block text-sm text-zinc-600"
          value={block.subtitle}
          onChange={edit ? (subtitle) => edit({ subtitle }) : undefined}
        />
        <div className="mx-auto mt-4 flex max-w-sm gap-2">
          <div className="ugclab-input flex-1 text-left text-sm text-zinc-400">your@email.com</div>
          <span className="rounded-lg bg-violet-600 px-4 py-2 text-xs text-white">Sign up</span>
        </div>
        <p className="mt-2 text-xs text-zinc-400">Demo — connect email provider later</p>
      </div>
    );
  }

  if (block.type === "countdown") {
    return (
      <div
        className="rounded-lg px-6 py-8 text-center"
        style={{ background: bg ?? primaryColor, color: color ?? "#fff" }}
      >
        <InlineEdit
          tag="h2"
          className="block text-lg font-bold"
          value={block.title}
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <p className="mt-4 font-mono text-3xl font-bold tracking-widest">03 : 12 : 45 : 08</p>
        <p className="mt-2 text-xs opacity-80">days · hrs · min · sec</p>
      </div>
    );
  }

  if (block.type === "discount_popup") {
    return (
      <div className="rounded-lg border-2 border-dashed border-violet-300 bg-violet-50 px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Discount popup</p>
        <p className="mt-2 text-sm font-bold text-zinc-900">{block.title ?? "Promo title"}</p>
        {block.discountCode ? (
          <p className="mt-2 font-mono text-lg font-bold text-violet-700">{block.discountCode}</p>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500">Shown site-wide · delay {block.popupDelaySec ?? 3}s</p>
      </div>
    );
  }

  if (block.type === "map") {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <p className="bg-zinc-50 px-4 py-2 text-sm font-semibold">{block.title || "Map"}</p>
        <div className="flex h-40 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
          Map embed
        </div>
      </div>
    );
  }

  if (block.type === "logos") {
    const urls = block.logoUrls ?? [];
    return (
      <div className="text-center">
        <InlineEdit
          tag="p"
          className="mb-4 block text-sm font-semibold text-zinc-600"
          value={block.title}
          placeholder="Trusted by"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <div className="flex flex-wrap justify-center gap-4">
          {urls.length
            ? urls.map((u, i) => (
                <img key={i} src={u} alt="" className="h-10 max-w-[100px] object-contain opacity-70" />
              ))
            : [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-20 rounded bg-zinc-100" />
              ))}
        </div>
      </div>
    );
  }

  if (block.type === "pricing") {
    const plans = block.pricingItems ?? [];
    return (
      <div>
        <InlineEdit
          tag="p"
          className="mb-4 block text-center font-bold"
          value={block.title}
          placeholder="Pricing"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {(plans.length ? plans : [{ name: "Plan", price: "$0" }]).map((p, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 text-center text-sm ${
                p.highlighted ? "border-violet-400 bg-violet-50" : "border-zinc-200"
              }`}
            >
              <p className="font-bold">{p.name}</p>
              <p className="text-2xl font-bold text-violet-700">{p.price}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "columns") {
    const cols = block.columns ?? [];
    const n = block.columnCount ?? 3;
    return (
      <div>
        <InlineEdit
          tag="p"
          className="mb-3 block text-center font-bold"
          value={block.title}
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {(cols.length ? cols : Array(n).fill({ title: "—", text: "—" })).slice(0, n).map((c, i) => (
            <div key={i} className="rounded border border-zinc-100 p-3 text-center text-xs">
              <p className="font-semibold">{c.title || "Title"}</p>
              <p className="text-zinc-500">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "gallery") {
    const urls = block.galleryUrls ?? [];
    return (
      <div>
        <InlineEdit
          tag="p"
          className="mb-2 block text-sm font-semibold"
          value={block.title}
          placeholder="Gallery"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <div className="grid grid-cols-3 gap-2">
          {urls.length > 0
            ? urls.slice(0, 3).map((u, i) => (
                <img key={i} src={u} alt="" className="aspect-square rounded object-cover" />
              ))
            : [1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded bg-zinc-100" />
              ))}
        </div>
      </div>
    );
  }

  if (block.type === "features") {
    const items = block.features ?? [];
    return (
      <div>
        <InlineEdit
          tag="p"
          className="mb-3 block text-center font-bold"
          value={block.title}
          placeholder="Features"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <div className="grid grid-cols-3 gap-2">
          {(items.length ? items : [{ title: "—", text: "—" }]).slice(0, 3).map((f, i) => (
            <div key={i} className="rounded border border-zinc-100 p-2 text-center text-xs">
              <p className="font-semibold">{f.title}</p>
              <p className="text-zinc-500">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "spacer") {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed border-zinc-200 text-xs text-zinc-400"
        style={{ height: Math.min(block.spacerHeight ?? 48, 120) }}
      >
        Spacer {block.spacerHeight ?? 48}px
      </div>
    );
  }

  if (block.type === "divider") {
    return <hr className="border-zinc-300" />;
  }

  if (block.type === "products" || block.type === "new_arrivals" || block.type === "sale") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm font-semibold text-zinc-700">{meta?.label ?? block.type}</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] rounded bg-white shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "faq") {
    return (
      <div className="rounded-lg border border-zinc-200 p-4">
        <InlineEdit
          tag="p"
          className="block font-semibold"
          value={block.title}
          placeholder="FAQ"
          onChange={edit ? (title) => edit({ title }) : undefined}
        />
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          {(block.faqItems ?? [{ question: "Question?", answer: "Answer." }]).slice(0, 2).map((q, i) => (
            <li key={i}>
              <strong>{q.question}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-zinc-900 text-sm text-white">
        ▶ Video
      </div>
    );
  }

  if (block.type === "html") {
    return (
      <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
        Custom HTML block
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
      {meta?.icon} {meta?.label ?? block.type}
    </div>
  );
}
