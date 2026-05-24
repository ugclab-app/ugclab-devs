import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type OrderEvent = {
  id: string;
  type: string;
  body: string | null;
  authorEmail: string | null;
  createdAt: string;
};

export function OrderTimeline({
  orderId,
  events: initial,
}: {
  orderId: string;
  events: OrderEvent[];
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPending(true);
    try {
      await api.addOrderNote(orderId, note.trim());
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card p-6">
      <h2 className="font-semibold text-zinc-900">Timeline</h2>
      <form onSubmit={addNote} className="mt-4 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="ugclab-input flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary px-4"
        >
          Add
        </button>
      </form>
      <ul className="mt-6 space-y-4">
        {initial.map((ev) => {
          const border =
            ev.type === "EMAIL"
              ? "border-blue-300"
              : ev.type === "EDIT"
                ? "border-amber-300"
                : ev.type === "STATUS_CHANGE"
                  ? "border-emerald-300"
                  : "border-violet-200";
          return (
          <li key={ev.id} className={`border-l-2 ${border} pl-4`}>
            <p className="text-xs font-medium uppercase text-zinc-400">
              {ev.type.replace(/_/g, " ")} ·{" "}
              {new Date(ev.createdAt).toLocaleString()}
            </p>
            {ev.body ? <p className="mt-1 text-sm text-zinc-800">{ev.body}</p> : null}
            {ev.authorEmail ? (
              <p className="mt-0.5 text-xs text-zinc-500">{ev.authorEmail}</p>
            ) : null}
          </li>
        );
        })}
        {initial.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : null}
      </ul>
    </section>
  );
}
