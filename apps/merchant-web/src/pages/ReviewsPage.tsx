import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function ReviewsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"reviews" | "questions">("reviews");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const { data: reviewsData } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.reviews(),
  });
  const { data: questionsData } = useQuery({
    queryKey: ["questions"],
    queryFn: () => api.questions(),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products-list-reviews"],
    queryFn: () => api.products(new URLSearchParams({ limit: "200" })),
  });

  const reviews = (reviewsData?.reviews ?? []) as {
    id: string;
    authorName: string;
    rating: number;
    body: string | null;
    photoUrls?: string[];
    approved: boolean;
    product: { title: string };
  }[];

  const questions = (questionsData?.questions ?? []) as {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    product: { title: string };
  }[];

  const products = (productsData?.products ?? []) as { id: string; title: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Reviews & Q&A</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`rounded-lg px-3 py-1.5 ${tab === "reviews" ? "bg-violet-100 text-violet-800" : "text-zinc-600"}`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`rounded-lg px-3 py-1.5 ${tab === "questions" ? "bg-violet-100 text-violet-800" : "text-zinc-600"}`}
          >
            Questions ({questions.length})
          </button>
          {tab === "reviews" ? (
            <>
              <label className="ugclab-btn border border-zinc-200 bg-white cursor-pointer">
                Import CSV
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const csv = await file.text();
                    try {
                      const res = await api.importReviews(csv);
                      setImportMsg(
                        `Imported ${res.imported}${res.errors?.length ? ` · ${res.errors.length} errors` : ""}`
                      );
                      await qc.invalidateQueries({ queryKey: ["reviews"] });
                    } catch (err) {
                      setImportMsg(err instanceof Error ? err.message : "Import failed");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <a
                href="data:text/csv;charset=utf-8,authorName%2Crating%2Cbody%2CproductSlug%2CphotoUrls%0AJane%20Doe%2C5%2CGreat%20product%2Cmy-product%2Chttps%3A%2F%2Fexample.com%2Fphoto.jpg"
                download="reviews-template.csv"
                className="ugclab-btn border border-zinc-200 bg-white"
              >
                Template
              </a>
            </>
          ) : null}
        </div>
      </div>

      {importMsg ? (
        <p className="rounded-lg bg-violet-50 px-4 py-2 text-sm text-violet-900">{importMsg}</p>
      ) : null}

      {tab === "reviews" ? (
        <>
          <form
            className="admin-card space-y-3 p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await api.createReview({
                productId: String(fd.get("productId")),
                authorName: String(fd.get("authorName")),
                rating: parseInt(String(fd.get("rating")), 10),
                body: String(fd.get("body") || "") || undefined,
                photoUrls: String(fd.get("photoUrls") || "")
                  .split(/[|,]/)
                  .map((u) => u.trim())
                  .filter(Boolean),
                approved: fd.get("approved") === "on",
              });
              await qc.invalidateQueries({ queryKey: ["reviews"] });
              e.currentTarget.reset();
            }}
          >
            <h2 className="font-semibold text-sm">Add review (with photos)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="productId" required className="ugclab-select">
                <option value="">Product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <input
                name="authorName"
                placeholder="Author name"
                required
                className="ugclab-input"
              />
              <input
                name="rating"
                type="number"
                min={1}
                max={5}
                defaultValue={5}
                required
                className="ugclab-input"
              />
              <input
                name="photoUrls"
                placeholder="Photo URLs (comma-separated)"
                className="ugclab-input sm:col-span-2"
              />
              <textarea
                name="body"
                placeholder="Review text"
                rows={2}
                className="ugclab-input sm:col-span-2"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="approved" defaultChecked />
              Publish immediately
            </label>
            <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
              Add review
            </button>
          </form>

          <ul className="admin-card divide-y">
            {reviews.map((r) => (
              <li key={r.id} className="px-6 py-4">
                <p className="font-medium">
                  {r.product.title} — {r.authorName}
                </p>
                <p className="text-sm text-amber-600">{"★".repeat(r.rating)}</p>
                {r.body ? <p className="mt-1 text-sm text-zinc-600">{r.body}</p> : null}
                {r.photoUrls && r.photoUrls.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.photoUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-lg border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  {!r.approved ? (
                    <button
                      type="button"
                      className="text-sm text-emerald-600"
                      onClick={async () => {
                        await api.approveReview(r.id, true);
                        await qc.invalidateQueries({ queryKey: ["reviews"] });
                      }}
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700">Published</span>
                  )}
                  <button
                    type="button"
                    className="text-sm text-red-600"
                    onClick={async () => {
                      await api.deleteReview(r.id);
                      await qc.invalidateQueries({ queryKey: ["reviews"] });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="admin-card divide-y">
          {questions.map((q) => (
            <li key={q.id} className="px-6 py-4 space-y-3">
              <p className="font-medium">
                {q.product.title} — {q.authorName}
              </p>
              <p className="text-sm text-zinc-700">{q.question}</p>
              {q.answer ? (
                <p className="text-sm text-violet-800">Answer: {q.answer}</p>
              ) : (
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const answer = String(fd.get("answer") ?? "").trim();
                    if (!answer) return;
                    await api.answerQuestion(q.id, answer);
                    await qc.invalidateQueries({ queryKey: ["questions"] });
                  }}
                >
                  <input
                    name="answer"
                    placeholder="Write an answer…"
                    className="ugclab-input min-w-[240px] flex-1"
                    required
                  />
                  <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm">
                    Publish answer
                  </button>
                </form>
              )}
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  await api.deleteQuestion(q.id);
                  await qc.invalidateQueries({ queryKey: ["questions"] });
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
