import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function CustomerNotesPanel({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn: () => api.customerNotes(customerId),
  });
  const [body, setBody] = useState("");
  const add = useMutation({
    mutationFn: () => api.addCustomerNote(customerId, body),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["customer-notes", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-timeline", customerId] });
    },
  });

  return (
    <div className="admin-card space-y-3 p-4">
      <h3 className="font-semibold text-zinc-900">Internal notes</h3>
      <p className="text-xs text-zinc-500">Visible only to staff — not shown to the customer.</p>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
        {(data?.notes ?? []).map((n) => (
          <li key={n.id} className="rounded-lg bg-zinc-50 px-3 py-2">
            <p className="whitespace-pre-wrap text-zinc-800">{n.body}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              {n.authorEmail ?? "staff"} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {!data?.notes?.length ? (
          <li className="text-zinc-400">No notes yet</li>
        ) : null}
      </ul>
      <textarea
        className="ugclab-input min-h-[72px] w-full"
        placeholder="Add a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="button"
        className="ugclab-btn ugclab-btn-secondary text-sm"
        disabled={!body.trim() || add.isPending}
        onClick={() => add.mutate()}
      >
        Add note
      </button>
    </div>
  );
}

export function CustomerTimelinePanel({ customerId }: { customerId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-timeline", customerId],
    queryFn: () => api.customerTimeline(customerId),
  });
  if (isLoading) return <p className="text-sm text-zinc-500">Loading timeline…</p>;
  return (
    <div className="admin-card p-4">
      <h3 className="font-semibold text-zinc-900">Timeline</h3>
      <ol className="mt-3 space-y-3 border-l border-zinc-200 pl-4">
        {(data?.items ?? []).map((item, i) => (
          <li key={`${item.at}-${item.kind}-${i}`} className="relative text-sm">
            <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-violet-500" />
            <p className="font-medium text-zinc-800">{item.title}</p>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              {item.kind} · {new Date(item.at).toLocaleString()}
            </p>
          </li>
        ))}
        {!data?.items?.length ? (
          <li className="text-zinc-400">No activity yet</li>
        ) : null}
      </ol>
    </div>
  );
}
