import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";

const STATUS_URL = import.meta.env.VITE_STATUS_PAGE_URL ?? "";

export default function HelpPage() {
  const { ta, t } = useAdminT();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  const docs = [
    { title: ta("helpPage.docPaymentsTitle"), desc: ta("helpPage.docPaymentsDesc") },
    { title: ta("helpPage.docGopayTitle"), desc: ta("helpPage.docGopayDesc") },
    { title: ta("helpPage.docShippingTitle"), desc: ta("helpPage.docShippingDesc") },
    { title: ta("helpPage.docEmailTitle"), desc: ta("helpPage.docEmailDesc") },
  ];

  return (
    <AdminPageShell
      crumbs={[{ label: t.help }]}
      title={ta("helpPage.title")}
      description={ta("helpPage.description")}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card space-y-4 p-6">
          <h2 className="font-semibold text-zinc-900">{ta("helpPage.helpCenter")}</h2>
          <ul className="space-y-3">
            {docs.map((d) => (
              <li key={d.title} className="rounded-lg border border-zinc-100 p-4">
                <p className="font-medium text-zinc-900">{d.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{d.desc}</p>
              </li>
            ))}
          </ul>
          {STATUS_URL ? (
            <a
              href={STATUS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-violet-600 hover:underline"
            >
              {ta("helpPage.statusLink")}
            </a>
          ) : (
            <p className="text-xs text-zinc-400">{ta("helpPage.statusMissing")}</p>
          )}
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold text-zinc-900">{ta("helpPage.contactSupport")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{ta("helpPage.contactHint")}</p>
          <div className="mt-4">
            <FormAlert ok={alert.ok} message={alert.message} />
          </div>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setAlert({});
              try {
                const r = await api.submitSupport({ subject, message });
                setAlert({ ok: true, message: r.message });
                setSubject("");
                setMessage("");
              } catch (err) {
                setAlert({
                  ok: false,
                  message: err instanceof Error ? err.message : "Failed",
                });
              } finally {
                setPending(false);
              }
            }}
          >
            <label className="block text-sm">
              {ta("helpPage.subject")}
              <input
                className="ugclab-input mt-1.5 w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              {ta("helpPage.message")}
              <textarea
                className="ugclab-input mt-1.5 w-full min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="ugclab-btn ugclab-btn-primary text-sm disabled:opacity-50"
            >
              {pending ? ta("helpPage.sending") : ta("helpPage.send")}
            </button>
          </form>
        </section>
      </div>
    </AdminPageShell>
  );
}
