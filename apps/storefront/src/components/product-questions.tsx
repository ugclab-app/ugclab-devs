import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function ProductQuestions({
  productId,
  questions,
}: {
  productId: string;
  questions: {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    answeredAt: string | null;
    createdAt: string;
  }[];
}) {
  const { tenant } = useStoreParams();
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: (fd: FormData) =>
      storeApi.submitQuestion(tenant, {
        productId,
        authorName: String(fd.get("authorName")),
        authorEmail: String(fd.get("authorEmail") || "") || undefined,
        question: String(fd.get("question")),
      }),
    onSuccess: () => setDone(true),
  });

  const answered = questions.filter((q) => q.answer);
  const pending = questions.filter((q) => !q.answer);

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8">
      <h2 className="text-lg font-semibold">Questions & answers</h2>
      {answered.length === 0 && pending.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No questions yet. Ask the first one!</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {answered.map((q) => (
            <li key={q.id} className="rounded-lg border border-zinc-100 p-4">
              <p className="font-medium">{q.authorName}</p>
              <p className="mt-1 text-sm text-zinc-800">{q.question}</p>
              <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
                <span className="font-medium">Answer: </span>
                {q.answer}
              </p>
            </li>
          ))}
        </ul>
      )}
      {done ? (
        <p className="mt-8 text-sm text-emerald-700">
          Question submitted — we&apos;ll email you when it&apos;s answered.
        </p>
      ) : (
        <form
          className="mt-8 space-y-3 rounded-xl border border-zinc-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(new FormData(e.currentTarget));
          }}
        >
          <p className="text-sm font-medium">Ask a question</p>
          <input
            name="authorName"
            required
            placeholder="Your name"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="authorEmail"
            type="email"
            placeholder="Email (optional, for reply)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            name="question"
            required
            minLength={5}
            rows={3}
            placeholder="Is this available in size L?"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submit.isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submit.isPending ? "Sending…" : "Submit question"}
          </button>
        </form>
      )}
    </section>
  );
}
