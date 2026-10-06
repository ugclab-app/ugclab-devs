import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type Msg = {
  id: string;
  subject: string;
  body: string;
  actorEmail: string;
  notifyEmail: boolean;
  readAt: string | null;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  createdAt: string;
};

export function TenantMessagesPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["tenant-messages", tenantId],
    queryFn: () => api.tenantMessages(tenantId),
  });
  const messages = (data?.messages ?? []) as Msg[];

  return (
    <section className="platform-card space-y-4 p-6">
      <div>
        <h2 className="font-semibold">Message merchant</h2>
        <p className="mt-1 text-sm text-slate-500">
          Visible in their admin under Messages. Optionally emails the store owner.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <input
          className="ugclab-input w-full text-sm"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="ugclab-input w-full text-sm"
          rows={4}
          placeholder="Message to the merchant…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          Also email store owner
        </label>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="button"
          disabled={pending || !subject.trim() || !body.trim()}
          className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
          onClick={async () => {
            setPending(true);
            setErr(null);
            try {
              await api.sendTenantMessage(tenantId, {
                subject: subject.trim(),
                body: body.trim(),
                notifyEmail,
              });
              setSubject("");
              setBody("");
              await qc.invalidateQueries({ queryKey: ["tenant-messages", tenantId] });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Send failed");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>

      <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border border-slate-100 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium">{m.subject}</p>
              <span className="text-xs text-slate-400">
                {new Date(m.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{m.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              From {m.actorEmail}
              {m.readAt
                ? ` · Read ${new Date(m.readAt).toLocaleString()}`
                : " · Unread"}
            </p>
            {m.merchantReply ? (
              <div className="mt-2 rounded-md bg-sky-50 px-3 py-2 text-sky-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Merchant reply
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.merchantReply}</p>
                {m.merchantRepliedAt ? (
                  <p className="mt-1 text-xs text-sky-700/80">
                    {new Date(m.merchantRepliedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
        {messages.length === 0 ? (
          <li className="text-slate-500">No messages yet</li>
        ) : null}
      </ul>
    </section>
  );
}
