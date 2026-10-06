import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";

type ReviewRow = {
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
  approved: boolean;
  createdAt?: string;
  orderId?: string | null;
  product: { title: string; slug?: string };
  order?: { id: string; orderNumber: string } | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ChipTone = "neutral" | "success" | "warn" | "danger";

function ReviewActionChip({
  label,
  active,
  tone = "neutral",
  busy,
  flash,
  onClick,
}: {
  label: string;
  active?: boolean;
  tone?: ChipTone;
  busy?: boolean;
  flash?: boolean;
  onClick: () => void | Promise<void>;
}) {
  const toneClass = active
    ? tone === "success"
      ? "review-chip--on-success"
      : tone === "warn"
        ? "review-chip--on-warn"
        : tone === "danger"
          ? "review-chip--on-danger"
          : "review-chip--on"
    : tone === "danger"
      ? "review-chip--danger"
      : "review-chip--idle";

  return (
    <button
      type="button"
      disabled={busy}
      className={`review-chip ${toneClass}${flash ? " review-chip--flash" : ""}${
        busy ? " review-chip--busy" : ""
      }`}
      onClick={() => void onClick()}
    >
      {busy ? <span className="review-chip__spinner" aria-hidden /> : null}
      <span>{label}</span>
    </button>
  );
}

export default function ReviewsPage() {
  const { ta } = useAdminT();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"reviews" | "questions">("reviews");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyEditingId, setReplyEditingId] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionFlash, setActionFlash] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    authorName: string;
    rating: number;
    body: string;
  } | null>(null);

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

  const reviews = (reviewsData?.reviews ?? []) as ReviewRow[];

  const questions = (questionsData?.questions ?? []) as {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    product: { title: string };
  }[];

  const products = (productsData?.products ?? []) as { id: string; title: string }[];

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["reviews"] });
  }

  async function runReviewAction(
    key: string,
    fn: () => Promise<void>
  ) {
    setActionBusy(key);
    try {
      await fn();
      setActionFlash(key);
      window.setTimeout(() => {
        setActionFlash((cur) => (cur === key ? null : cur));
      }, 420);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{ta("reviewsPage.title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{ta("reviewsPage.description")}</p>
        </div>
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
                      await refresh();
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
              await refresh();
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
              <li key={r.id} className="space-y-3 px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {r.product.title} — {r.authorName}
                      {r.verifiedPurchase ? (
                        <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Verified buyer
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                          Not verified
                        </span>
                      )}
                      {r.pinned ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Pinned
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {formatDate(r.createdAt) ?? "—"}
                      {(r.helpfulCount ?? 0) > 0
                        ? ` · ${r.helpfulCount} found helpful`
                        : ""}
                      {r.order ? (
                        <>
                          {" · "}
                          <Link
                            to={`/orders/${r.order.id}`}
                            className="text-violet-600 hover:underline"
                          >
                            Order #{r.order.orderNumber}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-sm text-amber-600">{"★".repeat(r.rating)}</p>
                </div>

                {editingId === r.id && editDraft ? (
                  <div className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <input
                      className="ugclab-input text-sm"
                      value={editDraft.authorName}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, authorName: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="ugclab-input w-24 text-sm"
                      value={editDraft.rating}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          rating: parseInt(e.target.value, 10) || 5,
                        })
                      }
                    />
                    <textarea
                      className="ugclab-input text-sm"
                      rows={3}
                      value={editDraft.body}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, body: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="ugclab-btn ugclab-btn-primary text-xs"
                        onClick={async () => {
                          await api.updateReview(r.id, {
                            authorName: editDraft.authorName,
                            rating: editDraft.rating,
                            body: editDraft.body || null,
                          });
                          setEditingId(null);
                          setEditDraft(null);
                          await refresh();
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-xs text-zinc-500"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : r.body ? (
                  <p className="text-sm text-zinc-600">{r.body}</p>
                ) : null}

                {r.photoUrls && r.photoUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
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

                {r.merchantReply && replyEditingId !== r.id ? (
                  <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-violet-800">Store reply</p>
                      <div className="flex gap-3 text-xs">
                        <button
                          type="button"
                          className="text-violet-700 hover:underline"
                          onClick={() => {
                            setReplyEditingId(r.id);
                            setReplyDraft((prev) => ({
                              ...prev,
                              [r.id]: r.merchantReply ?? "",
                            }));
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline disabled:opacity-50"
                          disabled={replyBusy === r.id}
                          onClick={async () => {
                            if (!confirm("Delete store reply?")) return;
                            setReplyBusy(r.id);
                            try {
                              await api.updateReview(r.id, { merchantReply: null });
                              setReplyDraft((prev) => {
                                const next = { ...prev };
                                delete next[r.id];
                                return next;
                              });
                              setReplyEditingId(null);
                              await refresh();
                            } finally {
                              setReplyBusy(null);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-zinc-700">{r.merchantReply}</p>
                    {formatDate(r.merchantRepliedAt) ? (
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {formatDate(r.merchantRepliedAt)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-500">
                      {r.merchantReply ? "Edit store reply" : "Store reply"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <textarea
                        className="ugclab-input min-w-[16rem] flex-1 text-sm"
                        rows={2}
                        placeholder="Reply as store…"
                        value={replyDraft[r.id] ?? ""}
                        onChange={(e) =>
                          setReplyDraft((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="ugclab-btn ugclab-btn-primary text-xs disabled:opacity-50"
                          disabled={replyBusy === r.id}
                          onClick={async () => {
                            const reply = (replyDraft[r.id] ?? "").trim();
                            if (!reply) {
                              alert("Write a reply or use Delete to remove it.");
                              return;
                            }
                            setReplyBusy(r.id);
                            try {
                              await api.updateReview(r.id, { merchantReply: reply });
                              setReplyEditingId(null);
                              setReplyDraft((prev) => {
                                const next = { ...prev };
                                delete next[r.id];
                                return next;
                              });
                              await refresh();
                            } finally {
                              setReplyBusy(null);
                            }
                          }}
                        >
                          {r.merchantReply ? "Save reply" : "Post reply"}
                        </button>
                        {r.merchantReply ? (
                          <>
                            <button
                              type="button"
                              className="text-xs text-zinc-500 hover:underline"
                              onClick={() => {
                                setReplyEditingId(null);
                                setReplyDraft((prev) => {
                                  const next = { ...prev };
                                  delete next[r.id];
                                  return next;
                                });
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                              disabled={replyBusy === r.id}
                              onClick={async () => {
                                if (!confirm("Delete store reply?")) return;
                                setReplyBusy(r.id);
                                try {
                                  await api.updateReview(r.id, {
                                    merchantReply: null,
                                  });
                                  setReplyEditingId(null);
                                  setReplyDraft((prev) => {
                                    const next = { ...prev };
                                    delete next[r.id];
                                    return next;
                                  });
                                  await refresh();
                                } finally {
                                  setReplyBusy(null);
                                }
                              }}
                            >
                              Delete reply
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                <div className="review-chip-row">
                  <ReviewActionChip
                    label={r.approved ? "Published" : "Publish"}
                    active={r.approved}
                    tone="success"
                    busy={actionBusy === `${r.id}:approved`}
                    flash={actionFlash === `${r.id}:approved`}
                    onClick={() =>
                      runReviewAction(`${r.id}:approved`, async () => {
                        await api.updateReview(r.id, { approved: !r.approved });
                        await refresh();
                      })
                    }
                  />
                  <ReviewActionChip
                    label={r.verifiedPurchase ? "Verified" : "Mark verified"}
                    active={!!r.verifiedPurchase}
                    tone="success"
                    busy={actionBusy === `${r.id}:verified`}
                    flash={actionFlash === `${r.id}:verified`}
                    onClick={() =>
                      runReviewAction(`${r.id}:verified`, async () => {
                        await api.updateReview(r.id, {
                          verifiedPurchase: !r.verifiedPurchase,
                        });
                        await refresh();
                      })
                    }
                  />
                  <ReviewActionChip
                    label={r.pinned ? "Pinned" : "Pin on PDP"}
                    active={!!r.pinned}
                    tone="warn"
                    busy={actionBusy === `${r.id}:pinned`}
                    flash={actionFlash === `${r.id}:pinned`}
                    onClick={() =>
                      runReviewAction(`${r.id}:pinned`, async () => {
                        await api.updateReview(r.id, { pinned: !r.pinned });
                        await refresh();
                      })
                    }
                  />
                  <ReviewActionChip
                    label="Edit"
                    busy={actionBusy === `${r.id}:edit`}
                    flash={actionFlash === `${r.id}:edit`}
                    onClick={() => {
                      setActionFlash(`${r.id}:edit`);
                      window.setTimeout(() => setActionFlash(null), 420);
                      setEditingId(r.id);
                      setEditDraft({
                        authorName: r.authorName,
                        rating: r.rating,
                        body: r.body ?? "",
                      });
                    }}
                  />
                  <ReviewActionChip
                    label="Delete"
                    tone="danger"
                    busy={actionBusy === `${r.id}:delete`}
                    flash={actionFlash === `${r.id}:delete`}
                    onClick={async () => {
                      if (!confirm("Delete this review?")) return;
                      await runReviewAction(`${r.id}:delete`, async () => {
                        await api.deleteReview(r.id);
                        await refresh();
                      });
                    }}
                  />
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
