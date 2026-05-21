import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function ProductReviews({
  productId,
  reviews,
}: {
  productId: string;
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    body: string | null;
    photoUrls?: string[];
    createdAt: string;
  }[];
}) {
  const { tenant } = useStoreParams();
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: (fd: FormData) =>
      storeApi.submitReview(tenant, {
        productId,
        authorName: String(fd.get("authorName")),
        authorEmail: String(fd.get("authorEmail") || "") || undefined,
        rating: parseInt(String(fd.get("rating")), 10),
        body: String(fd.get("body") || "") || undefined,
      }),
    onSuccess: () => setDone(true),
  });

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8">
      <h2 className="text-lg font-semibold">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-zinc-100 p-4">
              <p className="font-medium">{r.authorName}</p>
              <p className="text-amber-600 text-sm">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.body ? <p className="mt-2 text-sm text-zinc-600">{r.body}</p> : null}
              {r.photoUrls && r.photoUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photoUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="h-20 w-20 rounded-lg border object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {done ? (
        <p className="mt-8 text-sm text-emerald-700">Thank you! Your review is pending moderation.</p>
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
            placeholder="Email (optional)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
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
          <button
            type="submit"
            disabled={submit.isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submit.isPending ? "Sending…" : "Submit (moderated)"}
          </button>
        </form>
      )}
    </section>
  );
}
