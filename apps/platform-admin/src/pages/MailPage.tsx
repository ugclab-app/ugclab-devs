import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { PermissionGate } from "@/components/permission-gate";
import { QueryState } from "@/components/query-state";

type Thread = {
  id: string;
  subject: string;
  correspondentEmail: string;
  correspondentName: string | null;
  status: string;
  unread: boolean;
  lastMessageAt: string;
};

type Message = {
  id: string;
  direction: string;
  fromEmail: string;
  textBody: string;
  attachments: { id: string; filename: string }[];
  canDownload: boolean;
  actorEmail: string | null;
  createdAt: string;
};

type StoreCard = {
  id: string;
  name: string;
  slug: string;
  status: string;
  paidOrders: number;
  latestPayout: { amountCents: number; currency: string; status: string } | null;
};

type Note = { id: string; body: string; actorEmail: string; createdAt: string };

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  waiting: "Waiting",
  closed: "Closed",
};

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export default function MailPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const list = useQuery({
    queryKey: ["mailbox", query, showClosed],
    queryFn: () => api.mailbox({ q: query || undefined, closed: showClosed }),
  });
  const threadQ = useQuery({
    queryKey: ["mailbox", selectedId],
    queryFn: () => api.mailboxThread(selectedId!),
    enabled: Boolean(selectedId),
  });

  const refresh = async (threadId?: string) => {
    await qc.invalidateQueries({ queryKey: ["mailbox"] });
    if (threadId) await qc.invalidateQueries({ queryKey: ["mailbox", threadId] });
    await qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  const send = useMutation({
    mutationFn: () => api.sendMailbox({ to: composeTo, subject: composeSubject, body: composeBody }),
    onSuccess: async (res) => {
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setNotice("Sent.");
      setSelectedId(res.threadId);
      await refresh(res.threadId);
    },
    onError: (err: Error) => setNotice(err.message),
  });

  const reply = useMutation({
    mutationFn: () => api.replyMailbox(selectedId!, replyBody),
    onSuccess: async () => {
      setReplyBody("");
      setNotice("Reply sent.");
      await refresh(selectedId ?? undefined);
    },
    onError: (err: Error) => setNotice(err.message),
  });

  const status = useMutation({
    mutationFn: (next: string) => api.setMailboxStatus(selectedId!, next),
    onSuccess: async () => {
      await refresh(selectedId ?? undefined);
    },
    onError: (err: Error) => setNotice(err.message),
  });

  const note = useMutation({
    mutationFn: () => api.addMailboxNote(selectedId!, noteBody),
    onSuccess: async () => {
      setNoteBody("");
      await refresh(selectedId ?? undefined);
    },
    onError: (err: Error) => setNotice(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mail</h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform mailbox. Notes stay inside the team. Replies go to the sender.
        </p>
      </div>

      <QueryState query={list}>
        {(data) => (
          <>
            <div className="platform-card space-y-2 p-4 text-sm">
              <p>
                Address: <span className="font-medium">{data.address.from}</span>
                {data.aliases && data.aliases.length > 1 ? (
                  <span className="text-slate-500"> · also {data.aliases.slice(1).join(", ")}</span>
                ) : null}
                {data.forwardTo ? <span className="text-slate-500"> · forwards to {data.forwardTo}</span> : null}
              </p>
              {!data.emailConfigured ? (
                <p className="text-amber-800">
                  Sending is off until <code className="font-mono">RESEND_API_KEY</code> is set.
                </p>
              ) : null}
              {!data.receivingConfigured ? (
                <p className="text-amber-800">
                  Receiving needs Resend inbound and <code className="font-mono">RESEND_WEBHOOK_SECRET</code>.
                  Webhook: <code className="font-mono">/api/resend/webhook</code>.
                </p>
              ) : (
                <p className="text-slate-500">Inbound mail is connected.</p>
              )}
            </div>

            {notice ? <p className="text-sm text-slate-700">{notice}</p> : null}

            <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
              <section className="platform-card overflow-hidden">
                <div className="space-y-2 border-b px-4 py-3">
                  <input
                    className="ugclab-input w-full"
                    placeholder="Search address, subject, text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={showClosed}
                      onChange={(e) => setShowClosed(e.target.checked)}
                    />
                    Show closed
                  </label>
                </div>
                <ul className="max-h-[640px] divide-y overflow-y-auto">
                  {data.threads.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(thread.id);
                          setNotice(null);
                        }}
                        className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                          selectedId === thread.id ? "bg-sky-50" : ""
                        }`}
                      >
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {thread.unread ? <span className="h-2 w-2 rounded-full bg-sky-500" /> : null}
                          {thread.correspondentName || thread.correspondentEmail}
                        </p>
                        <p className="truncate text-sm text-slate-700">{thread.subject}</p>
                        <p className="text-xs text-slate-400">
                          {STATUS_LABEL[thread.status] ?? thread.status} · {thread.correspondentEmail}
                        </p>
                      </button>
                    </li>
                  ))}
                  {data.threads.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-slate-500">No mail yet</li>
                  ) : null}
                </ul>
              </section>

              <div className="space-y-6">
                {selectedId ? (
                  <QueryState query={threadQ}>
                    {(detail: { thread: Thread; messages: Message[]; notes: Note[]; stores: StoreCard[] }) => (
                      <section className="platform-card space-y-4 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="font-semibold">{detail.thread.subject}</h2>
                            <p className="text-sm text-slate-500">{detail.thread.correspondentEmail}</p>
                          </div>
                          <PermissionGate permission="mailbox:write">
                            <div className="flex gap-1">
                              {(["open", "waiting", "closed"] as const).map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-xs ${
                                    detail.thread.status === value
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                  onClick={() => status.mutate(value)}
                                >
                                  {STATUS_LABEL[value]}
                                </button>
                              ))}
                            </div>
                          </PermissionGate>
                        </div>

                        {detail.stores.length > 0 ? (
                          <ul className="space-y-2">
                            {detail.stores.map((store) => (
                              <li key={store.id} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                                <Link to={`/tenants/${store.id}`} className="font-medium text-sky-700">
                                  {store.name}
                                </Link>
                                <span className="text-slate-500"> · {store.slug} · {store.status}</span>
                                <p className="text-slate-600">
                                  {store.paidOrders} paid order{store.paidOrders === 1 ? "" : "s"}
                                  {store.latestPayout
                                    ? ` · last payout ${money(store.latestPayout.amountCents, store.latestPayout.currency)} (${store.latestPayout.status})`
                                    : " · no payout yet"}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400">No store on this email.</p>
                        )}

                        <ul className="space-y-3">
                          {detail.messages.map((message) => (
                            <li
                              key={message.id}
                              className={`rounded-lg border px-3 py-2 text-sm ${
                                message.direction === "out" ? "bg-slate-50" : "bg-white"
                              }`}
                            >
                              <p className="text-xs text-slate-500">
                                {message.direction === "out" ? "Sent" : "Received"} · {message.fromEmail}
                                {message.actorEmail ? ` · ${message.actorEmail}` : ""} ·{" "}
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-slate-800">{message.textBody}</p>
                              {message.attachments.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs">
                                  {message.attachments.map((file) => (
                                    <li key={`${message.id}-${file.filename}-${file.id}`}>
                                      {file.id && message.canDownload ? (
                                        <a
                                          className="text-sky-700 underline"
                                          href={`/api/platform/mailbox/messages/${message.id}/attachments/${file.id}`}
                                        >
                                          {file.filename}
                                        </a>
                                      ) : (
                                        <span className="text-slate-500">{file.filename}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ul>

                        <PermissionGate permission="mailbox:write">
                          <form
                            className="space-y-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              setNotice(null);
                              reply.mutate();
                            }}
                          >
                            <div className="flex flex-wrap gap-2">
                              {data.replies.map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                                  onClick={() =>
                                    setReplyBody((current) =>
                                      current.trim() ? `${current.trim()}\n\n${item.body}` : item.body
                                    )
                                  }
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                            <textarea
                              className="ugclab-input min-h-[7rem] w-full"
                              placeholder="Write a reply"
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                            />
                            <button
                              type="submit"
                              className="ugclab-btn ugclab-btn-primary text-sm"
                              disabled={reply.isPending || !replyBody.trim()}
                            >
                              {reply.isPending ? "Sending…" : "Send reply"}
                            </button>
                          </form>
                        </PermissionGate>

                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold">Team notes</h3>
                          <p className="text-xs text-slate-500">Not sent to the customer.</p>
                          <ul className="mt-2 space-y-2">
                            {detail.notes.map((item) => (
                              <li key={item.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
                                <p className="whitespace-pre-wrap">{item.body}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.actorEmail} · {new Date(item.createdAt).toLocaleString()}
                                </p>
                              </li>
                            ))}
                          </ul>
                          <PermissionGate permission="mailbox:write">
                            <form
                              className="mt-2 flex gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                note.mutate();
                              }}
                            >
                              <input
                                className="ugclab-input w-full"
                                placeholder="Internal note"
                                value={noteBody}
                                onChange={(e) => setNoteBody(e.target.value)}
                              />
                              <button
                                type="submit"
                                className="ugclab-btn text-sm"
                                disabled={note.isPending || !noteBody.trim()}
                              >
                                Save
                              </button>
                            </form>
                          </PermissionGate>
                        </div>
                      </section>
                    )}
                  </QueryState>
                ) : (
                  <p className="text-sm text-slate-500">Select a conversation or start a new one.</p>
                )}

                <PermissionGate permission="mailbox:write">
                  <form
                    className="platform-card space-y-3 p-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setNotice(null);
                      send.mutate();
                    }}
                  >
                    <h2 className="font-semibold">New message</h2>
                    <label className="block text-sm">
                      To
                      <input
                        type="email"
                        required
                        className="ugclab-input mt-1 w-full"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      Subject
                      <input
                        required
                        className="ugclab-input mt-1 w-full"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm">
                      Message
                      <textarea
                        required
                        className="ugclab-input mt-1 min-h-[7rem] w-full"
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="ugclab-btn ugclab-btn-primary text-sm" disabled={send.isPending}>
                      {send.isPending ? "Sending…" : "Send"}
                    </button>
                  </form>
                </PermissionGate>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
