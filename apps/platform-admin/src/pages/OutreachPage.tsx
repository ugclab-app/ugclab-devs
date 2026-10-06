import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { QueryState } from "@/components/query-state";

type OutreachTemplate = {
  key: string;
  label: string;
  subject: string;
  html: string;
};

type OutreachMeta = {
  templates: OutreachTemplate[];
  defaultTemplateKey: string;
  signupUrl: string;
  platformName: string;
  limits: { daily: number; sentToday: number; remaining: number };
  recent: {
    id: string;
    actorEmail: string;
    email: string | null;
    templateKey: string | null;
    templateLabel: string | null;
    summary: string;
    createdAt: string;
  }[];
  emailConfigured: boolean;
};

export default function OutreachPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["outreach"], queryFn: () => api.outreach() });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const data = query.data as OutreachMeta | undefined;

  useEffect(() => {
    if (data?.defaultTemplateKey && !templateKey) {
      setTemplateKey(data.defaultTemplateKey);
    }
  }, [data?.defaultTemplateKey, templateKey]);

  const selected = useMemo(
    () => data?.templates.find((t) => t.key === templateKey) ?? data?.templates[0] ?? null,
    [data?.templates, templateKey]
  );

  const send = useMutation({
    mutationFn: () => api.sendOutreach(email, name || undefined, templateKey),
    onSuccess: (res) => {
      setMessage(`Sent to ${res.sentTo}. ${res.remaining} sends left today.`);
      setEmail("");
      setName("");
      qc.invalidateQueries({ queryKey: ["outreach"] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Outreach</h1>
      <p className="text-sm text-slate-500">
        Send a one-off acquisition email to a prospect. Only emails not yet registered are
        accepted. Edit copy in{" "}
        <Link to="/email-templates" className="text-sky-600">
          Email templates
        </Link>{" "}
        (keys starting with <code className="font-mono text-xs">outreach_</code>).
      </p>

      <QueryState query={query}>
        {(payload: OutreachMeta) => (
          <>
            {!payload.emailConfigured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Email provider is not configured. Add <code className="font-mono">RESEND_API_KEY</code> to{" "}
                <code className="font-mono">.env</code> at the repo root, then restart{" "}
                <code className="font-mono">npm run dev:platform-admin</code>.
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="platform-card space-y-4 p-6">
                <h2 className="font-semibold">Send email</h2>
                <p className="text-xs text-slate-500">
                  {payload.limits.sentToday} / {payload.limits.daily} sent today ·{" "}
                  {payload.limits.remaining} remaining
                </p>

                <label className="block text-sm">
                  Template
                  <select
                    className="ugclab-input mt-1 w-full"
                    value={templateKey || payload.defaultTemplateKey}
                    onChange={(e) => setTemplateKey(e.target.value)}
                  >
                    {payload.templates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block font-mono text-xs text-slate-400">
                    {templateKey || payload.defaultTemplateKey}
                  </span>
                </label>

                <label className="block text-sm">
                  Email
                  <input
                    type="email"
                    className="ugclab-input mt-1 w-full"
                    placeholder="creator@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  First name (optional)
                  <input
                    className="ugclab-input mt-1 w-full"
                    placeholder="Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="ugclab-btn ugclab-btn-primary w-full"
                  disabled={
                    !email.trim() ||
                    !templateKey ||
                    send.isPending ||
                    !payload.emailConfigured ||
                    payload.limits.remaining <= 0
                  }
                  onClick={() => {
                    setMessage(null);
                    send.mutate();
                  }}
                >
                  {send.isPending ? "Sending…" : "Send outreach email"}
                </button>
                {message ? (
                  <p
                    className={`text-sm ${message.startsWith("Sent") ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {message}
                  </p>
                ) : null}
              </section>

              <section className="platform-card p-6">
                <h2 className="font-semibold">Preview</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Signup link:{" "}
                  <a
                    href={payload.signupUrl}
                    className="text-sky-600"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {payload.signupUrl}
                  </a>
                </p>
                {selected ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">{selected.subject}</p>
                    <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-inner">
                      <iframe
                        title="Email preview"
                        className="h-[500px] w-full border-0"
                        sandbox=""
                        srcDoc={selected.html}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-red-600">
                    No outreach templates — restart API to seed{" "}
                    <code className="font-mono">outreach_*</code> templates.
                  </p>
                )}
              </section>
            </div>

            <section className="platform-card p-6">
              <h2 className="font-semibold">Recent sends</h2>
              {payload.recent.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No outreach emails sent yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {payload.recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        <span className="font-mono">{r.email ?? "—"}</span>
                        {r.templateLabel ? (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {r.templateLabel}
                          </span>
                        ) : null}
                        <span className="ml-2 text-slate-400">by {r.actorEmail}</span>
                      </span>
                      <time className="shrink-0 text-slate-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}
