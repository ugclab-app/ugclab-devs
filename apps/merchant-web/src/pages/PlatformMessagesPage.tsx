import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { AdminPageShell } from "@/components/admin-page-shell";
import { EmptyState } from "@/components/empty-state";

type Msg = {
  id: string;
  subject: string;
  body: string;
  actorEmail: string;
  readAt: string | null;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  createdAt: string;
};

export default function PlatformMessagesPage() {
  const qc = useQueryClient();
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-messages"],
    queryFn: () => api.platformMessages(),
  });

  const messages = (data?.messages ?? []) as Msg[];
  const unread = data?.unreadCount ?? 0;

  if (isLoading) {
    return (
      <AdminPageShell crumbs={[{ label: "Messages" }]}>
        <p className="text-zinc-500">Loading…</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      crumbs={[{ label: "Messages" }]}
      title="Messages from platform"
      description={
        unread > 0
          ? `${unread} unread message${unread === 1 ? "" : "s"} from Tescommerce support.`
          : "Direct notes from the platform team about your store."
      }
    >
      {messages.length === 0 ? (
        <EmptyState
          title="No messages"
          description="When the platform team writes to your store, it will show up here."
        />
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`admin-card p-5 ${!m.readAt ? "border-violet-200 ring-1 ring-violet-100" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">
                    {!m.readAt ? (
                      <span className="mr-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">
                        New
                      </span>
                    ) : null}
                    {m.subject}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(m.createdAt).toLocaleString()} · platform
                  </p>
                </div>
                {!m.readAt ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600 hover:underline"
                    onClick={async () => {
                      await api.markPlatformMessageRead(m.id);
                      await qc.invalidateQueries({ queryKey: ["platform-messages"] });
                    }}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{m.body}</p>

              {m.merchantReply ? (
                <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Your reply</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.merchantReply}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <textarea
                    className="ugclab-input w-full text-sm"
                    rows={2}
                    placeholder="Reply to platform…"
                    value={replyDraft[m.id] ?? ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    onFocus={() => {
                      if (!m.readAt) {
                        void api.markPlatformMessageRead(m.id).then(() =>
                          qc.invalidateQueries({ queryKey: ["platform-messages"] })
                        );
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={pendingId === m.id || !(replyDraft[m.id] ?? "").trim()}
                    className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
                    onClick={async () => {
                      const text = (replyDraft[m.id] ?? "").trim();
                      if (!text) return;
                      setPendingId(m.id);
                      try {
                        await api.replyPlatformMessage(m.id, text);
                        setReplyDraft((prev) => ({ ...prev, [m.id]: "" }));
                        await qc.invalidateQueries({ queryKey: ["platform-messages"] });
                      } finally {
                        setPendingId(null);
                      }
                    }}
                  >
                    {pendingId === m.id ? "Sending…" : "Send reply"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
