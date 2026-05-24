import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { FormAlert } from "@/components/form-alert";
import { api } from "@/api/client";
import { useAdminLocale } from "@/context/admin-locale";

const DOCS = [
  {
    title: "Payments (MoR)",
    href: "https://github.com",
    desc: "Payouts, refunds, and Stripe checkout — see docs/PAYMENTS-MOR.md in the repo.",
  },
  {
    title: "Shipping & Shippo",
    href: "https://goshippo.com/docs",
    desc: "Set SHIPPO_API_KEY for labels. DHL/FedEx rates appear via Shippo carriers.",
  },
  {
    title: "Email marketing",
    href: "#",
    desc: "Campaigns, segments, automations. Requires RESEND_API_KEY or SENDGRID_API_KEY.",
  },
];

const STATUS_URL = import.meta.env.VITE_STATUS_PAGE_URL ?? "";

export default function HelpPage() {
  const { t } = useAdminLocale();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);

  return (
    <AdminPageShell
      crumbs={[{ label: t.help ?? "Help" }]}
      title={t.help ?? "Help & support"}
      description="Documentation links and contact platform support."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-card p-6 space-y-4">
          <h2 className="font-semibold text-zinc-900">Help center</h2>
          <ul className="space-y-3">
            {DOCS.map((d) => (
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
              Platform status page →
            </a>
          ) : (
            <p className="text-xs text-zinc-400">
              Set VITE_STATUS_PAGE_URL for a public status link.
            </p>
          )}
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold text-zinc-900">{t.support ?? "Contact support"}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            We reply by email. Urgent payout or payment issues — mention order #.
          </p>
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
              Subject
              <input
                className="ugclab-input mt-1.5 w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Message
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
              {pending ? "Sending…" : "Send to support"}
            </button>
          </form>
        </section>
      </div>
    </AdminPageShell>
  );
}
