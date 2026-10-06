import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function formatReviewDate(iso: string | undefined | null, locale: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale || "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  photoUrls?: string[];
  verifiedPurchase?: boolean;
  pinned?: boolean;
  helpfulCount?: number;
  merchantReply?: string | null;
  merchantRepliedAt?: string | null;
  createdAt?: string;
};

export function ProductReviews({
  productId,
  reviews: initialReviews,
}: {
  productId: string;
  reviews: ReviewItem[];
}) {
  const { tenant, locale } = useStoreParams();
  const [done, setDone] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [reviews, setReviews] = useState(initialReviews);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [votingId, setVotingId] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<string | null>(null);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [photos]);

  const submit = useMutation({
    mutationFn: (fd: FormData) =>
      storeApi.submitReview(tenant, {
        productId,
        authorName: String(fd.get("authorName")),
        authorEmail: String(fd.get("authorEmail") || "") || undefined,
        rating: parseInt(String(fd.get("rating")), 10),
        body: String(fd.get("body") || "") || undefined,
        photos,
      }),
    onSuccess: () => {
      setDone(true);
      setPhotos([]);
      setPhotoError(null);
    },
  });

  function onPickPhotos(list: FileList | null) {
    if (!list?.length) return;
    setPhotoError(null);
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) {
        setPhotoError("Only image files (JPG, PNG, WebP) are allowed");
        continue;
      }
      if (f.size > MAX_PHOTO_BYTES) {
        setPhotoError("Each photo must be 5 MB or smaller");
        continue;
      }
      if (next.length >= MAX_PHOTOS) {
        setPhotoError(`You can add up to ${MAX_PHOTOS} photos`);
        break;
      }
      next.push(f);
    }
    setPhotos(next.slice(0, MAX_PHOTOS));
  }

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8">
      <h2 className="text-lg font-semibold">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border p-4 ${
                r.pinned ? "border-amber-200 bg-amber-50/40" : "border-zinc-100"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="font-medium">{r.authorName}</p>
                  {r.verifiedPurchase ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Verified buyer
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-500/15">
                      Not verified
                    </span>
                  )}
                  {r.pinned ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                      Featured
                    </span>
                  ) : null}
                </div>
                {formatReviewDate(r.createdAt, locale) ? (
                  <time dateTime={r.createdAt} className="text-xs text-zinc-400">
                    {formatReviewDate(r.createdAt, locale)}
                  </time>
                ) : null}
              </div>
              <p className="text-amber-600 text-sm">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.body ? <p className="mt-2 text-sm text-zinc-600">{r.body}</p> : null}
              {r.photoUrls && r.photoUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photoUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              {r.merchantReply ? (
                <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <p className="text-xs font-semibold text-zinc-700">Store reply</p>
                  <p className="mt-1 text-sm text-zinc-600">{r.merchantReply}</p>
                  {formatReviewDate(r.merchantRepliedAt, locale) ? (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatReviewDate(r.merchantRepliedAt, locale)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <button
                  type="button"
                  disabled={voted[r.id] || votingId === r.id}
                  aria-pressed={voted[r.id] === true}
                  className={`review-helpful-btn ${
                    voted[r.id] ? "review-helpful-btn--done" : ""
                  } ${justVoted === r.id ? "review-helpful-btn--pop" : ""}`}
                  onClick={async () => {
                    if (voted[r.id] || votingId) return;
                    setVotingId(r.id);
                    try {
                      const res = await storeApi.markReviewHelpful(tenant, r.id);
                      setVoted((v) => ({ ...v, [r.id]: true }));
                      setJustVoted(r.id);
                      setReviews((list) =>
                        list.map((x) =>
                          x.id === r.id
                            ? { ...x, helpfulCount: res.helpfulCount }
                            : x
                        )
                      );
                      window.setTimeout(() => setJustVoted(null), 700);
                    } catch {
                      /* ignore */
                    } finally {
                      setVotingId(null);
                    }
                  }}
                >
                  <svg
                    className="review-helpful-btn__icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M7 11v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1Zm3.2-.2 2.1-5.3A1.8 1.8 0 0 1 14 4.3c.9 0 1.6.7 1.6 1.6V9h3.4a2 2 0 0 1 1.9 2.5l-1.3 5.2A2.5 2.5 0 0 1 17.2 19H10a1 1 0 0 1-1-1v-6.2c0-.3.1-.6.2-.9Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{voted[r.id] ? "Thanks!" : "Helpful"}</span>
                </button>
                {(r.helpfulCount ?? 0) > 0 ? (
                  <span>
                    {r.helpfulCount}{" "}
                    {r.helpfulCount === 1 ? "person" : "people"} found this helpful
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {done ? (
        <p className="mt-8 text-sm text-emerald-700">
          Thank you! Your review is pending moderation.
        </p>
      ) : (
        <form
          className="mt-8 space-y-3 rounded-xl border border-zinc-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(new FormData(e.currentTarget));
          }}
        >
          <p className="text-sm font-medium">Leave a review</p>
          <input
            name="authorName"
            required
            placeholder="Your name"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="authorEmail"
            type="email"
            placeholder="Email (needed for Verified buyer badge)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <p className="-mt-2 text-xs text-zinc-500">
            Use the same email as your order to show as a verified buyer
          </p>
          <select name="rating" required className="w-full rounded-lg border px-3 py-2 text-sm">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
          <textarea
            name="body"
            rows={3}
            placeholder="Your review"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-800">
              Photos{" "}
              <span className="font-normal text-zinc-500">
                (optional, up to {MAX_PHOTOS})
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-1 block w-full text-sm"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
            {photoError ? (
              <p className="mt-1 text-xs text-red-600">{photoError}</p>
            ) : null}
            {previews.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className="relative"
                    onClick={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    title="Remove"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg border object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submit.isPending}
            className="store-btn-primary text-sm disabled:opacity-50"
          >
            {submit.isPending ? "Sending…" : "Submit review"}
          </button>
        </form>
      )}
    </section>
  );
}
