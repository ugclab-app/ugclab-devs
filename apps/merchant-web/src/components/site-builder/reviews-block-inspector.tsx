import { useQuery } from "@tanstack/react-query";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { api } from "@/api/client";
import { Link } from "react-router-dom";

type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  approved: boolean;
  product?: { title: string };
};

export function ReviewsBlockInspector({
  block,
  onChange,
}: {
  block: HomeBlock;
  onChange: (patch: Partial<HomeBlock>) => void;
}) {
  const { data } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.reviews(),
  });
  const all = (data?.reviews ?? []) as ReviewRow[];
  const approved = all.filter((r) => r.approved);
  const pinned = new Set(block.reviewPinnedIds ?? []);

  function togglePin(id: string) {
    const next = new Set(pinned);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ reviewPinnedIds: [...next] });
  }

  return (
    <>
      <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">Reviews source</legend>
        <p className="text-[11px] leading-snug text-zinc-500">
          Shows approved product reviews. Manage them in{" "}
          <Link to="/reviews" className="font-medium text-violet-600 hover:underline">
            Growth → Reviews
          </Link>
          .
        </p>
        <label className="block text-xs">
          Max reviews
          <select
            className="ugclab-select mt-1 w-full text-sm"
            value={block.reviewLimit ?? 6}
            onChange={(e) => onChange({ reviewLimit: parseInt(e.target.value, 10) })}
          >
            <option value={3}>3</option>
            <option value={6}>6</option>
            <option value={12}>12</option>
          </select>
        </label>
        <label className="block text-xs">
          Minimum rating
          <select
            className="ugclab-select mt-1 w-full text-sm"
            value={block.reviewMinRating ?? 0}
            onChange={(e) => onChange({ reviewMinRating: parseInt(e.target.value, 10) })}
          >
            <option value={0}>All ratings</option>
            <option value={4}>4+ stars</option>
            <option value={5}>5 stars only</option>
          </select>
        </label>
        <label className="block text-xs">
          Sort by
          <select
            className="ugclab-select mt-1 w-full text-sm"
            value={block.reviewSort ?? "newest"}
            onChange={(e) =>
              onChange({ reviewSort: e.target.value as HomeBlock["reviewSort"] })
            }
          >
            <option value="newest">Newest first</option>
            <option value="rating">Best rating</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={block.reviewShowAggregate === true}
            onChange={(e) => onChange({ reviewShowAggregate: e.target.checked })}
          />
          Show average stars
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={block.reviewShowWhenEmpty !== false}
            onChange={(e) => onChange({ reviewShowWhenEmpty: e.target.checked })}
          />
          Show hint when empty (storefront)
        </label>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-zinc-100 p-3">
        <legend className="px-1 text-xs font-semibold text-zinc-500">External widget</legend>
        <label className="block text-xs">
          Embed URL (Trustpilot / Google)
          <input
            className="ugclab-input mt-1 w-full font-mono text-xs"
            placeholder="https://…"
            value={block.externalReviewsEmbedUrl ?? ""}
            onChange={(e) => onChange({ externalReviewsEmbedUrl: e.target.value || undefined })}
          />
        </label>
        <p className="text-[11px] text-zinc-500">
          Optional iframe above your reviews. Use the embed link from the platform.
        </p>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
        <legend className="px-1 text-xs font-semibold text-violet-700">Pin reviews</legend>
        <p className="text-[11px] text-zinc-500">
          Pinned reviews appear first (up to your limit). Preview last approved:
        </p>
        {approved.length === 0 ? (
          <p className="text-xs text-zinc-500">No approved reviews yet.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {approved.slice(0, 12).map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-2 rounded border border-zinc-200 bg-white p-2 text-xs"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={pinned.has(r.id)}
                  onChange={() => togglePin(r.id)}
                />
                <div className="min-w-0">
                  <span className="font-medium">{r.authorName}</span>
                  <span className="ml-1 text-amber-600">{"★".repeat(r.rating)}</span>
                  {r.body ? (
                    <p className="line-clamp-2 text-zinc-500">{r.body}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </>
  );
}
