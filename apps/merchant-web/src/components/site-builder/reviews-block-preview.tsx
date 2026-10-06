import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { InlineEdit } from "./inline-edit";
import { resolveDesignVariantId } from "./block-variants";

const SAMPLES = [
  {
    id: "sample-1",
    authorName: "Alex M.",
    rating: 5,
    body: "Fast shipping and great quality. Exactly as described.",
    product: { title: "Sample product", slug: "sample" },
  },
  {
    id: "sample-2",
    authorName: "Jordan K.",
    rating: 5,
    body: "Will order again — packaging was perfect.",
    product: null,
  },
  {
    id: "sample-3",
    authorName: "Sam R.",
    rating: 4,
    body: "Good value for money.",
    product: null,
  },
];

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function ReviewsBlockPreview({
  block,
  onPatch,
}: {
  block: HomeBlock;
  onPatch?: (patch: Partial<HomeBlock>) => void;
}) {
  const variant = resolveDesignVariantId(block);
  const limit = Math.min(block.reviewLimit ?? 6, 3);
  const items = SAMPLES.slice(0, limit);
  const edit = onPatch;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <InlineEdit
        tag="p"
        className="mb-3 block font-bold text-zinc-900"
        value={block.title}
        placeholder="What customers say"
        onChange={edit ? (title) => edit({ title }) : undefined}
      />
      {block.reviewShowAggregate ? (
        <p className="mb-3 text-center text-sm text-amber-600">
          ★★★★★ <span className="text-zinc-500">5.0 · preview</span>
        </p>
      ) : null}
      {block.externalReviewsEmbedUrl ? (
        <div className="mb-3 rounded border border-dashed border-violet-200 bg-white p-4 text-center text-[10px] text-violet-600">
          External reviews embed
        </div>
      ) : null}

      {variant === "reviews-quote" ? (
        <blockquote className="rounded-xl border border-zinc-200 bg-white p-4 text-center text-sm">
          <p className="text-amber-500">{stars(items[0]!.rating)}</p>
          <p className="mt-2 font-medium text-zinc-800">&ldquo;{items[0]!.body}&rdquo;</p>
          <p className="mt-1 text-xs text-zinc-500">— {items[0]!.authorName}</p>
        </blockquote>
      ) : variant === "reviews-avatars" ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((r) => (
            <div key={r.id} className="rounded border border-zinc-100 bg-white p-2 text-center text-[10px]">
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">
                {r.authorName[0]}
              </div>
              <p className="text-amber-600">{stars(r.rating)}</p>
              <p className="line-clamp-2 text-zinc-600">{r.body}</p>
            </div>
          ))}
        </div>
      ) : variant === "reviews-carousel" ? (
        <div className="flex gap-2 overflow-hidden">
          {items.map((r) => (
            <div key={r.id} className="w-[45%] shrink-0 rounded border border-zinc-200 bg-white p-2 text-[10px]">
              <p className="font-semibold">{r.authorName}</p>
              <p className="text-amber-600">{stars(r.rating)}</p>
              <p className="line-clamp-2 text-zinc-600">{r.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 bg-white p-2 text-[10px]">
              <p className="font-semibold">{r.authorName}</p>
              <p className="text-amber-600">{stars(r.rating)}</p>
              <p className="line-clamp-2 text-zinc-600">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-center text-[10px] text-zinc-400">
        Preview sample data · live store uses approved reviews
      </p>
    </div>
  );
}
