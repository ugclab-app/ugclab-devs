import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function PlatformNotes({
  entityType,
  entityId,
}: {
  entityType: "user" | "tenant";
  entityId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data } = useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () => api.notes(entityType, entityId),
  });

  const notes = (data?.notes ?? []) as {
    id: string;
    body: string;
    actorEmail: string;
    createdAt: string;
  }[];

  return (
    <section className="platform-card p-6 space-y-3">
      <h2 className="font-semibold">Internal notes</h2>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2">
            <p>{n.body}</p>
            <p className="mt-1 text-xs text-slate-500">
              {n.actorEmail} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {notes.length === 0 ? (
          <li className="text-slate-500">No notes yet</li>
        ) : null}
      </ul>
      <div className="flex gap-2">
        <input
          className="ugclab-input flex-1 text-sm"
          placeholder="Add a note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="ugclab-btn ugclab-btn-primary text-sm"
          onClick={async () => {
            if (!draft.trim()) return;
            await api.addNote({ entityType, entityId, body: draft });
            setDraft("");
            await qc.invalidateQueries({ queryKey: ["notes", entityType, entityId] });
          }}
        >
          Add
        </button>
      </div>
    </section>
  );
}
