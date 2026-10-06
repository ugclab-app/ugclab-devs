import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

type Partner = {
  id: string;
  displayName: string;
  email: string | null;
};

function htmlToPlainPreview(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim().slice(0, 2000);
}

export function AffiliateCreatorEmailForm({
  partner,
  pending,
  onSend,
  onClose,
}: {
  partner: Partner;
  pending: boolean;
  onSend: (fn: () => Promise<unknown>) => void;
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>("welcome");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: tplData } = useQuery({
    queryKey: ["affiliate-email-templates"],
    queryFn: () => api.affiliateEmailTemplates(),
  });

  const templates = tplData?.templates ?? [];
  const emailConfigured = tplData?.emailConfigured ?? false;
  const hasEmail = Boolean(partner.email?.trim());

  useEffect(() => {
    if (!templateId || !hasEmail) return;
    let cancelled = false;
    setLoadingPreview(true);
    api
      .affiliateEmailPreview(partner.id, templateId)
      .then((p) => {
        if (cancelled) return;
        setSubject(p.subject);
        setMessage(htmlToPlainPreview(p.html));
      })
      .catch(() => {
        if (!cancelled) setSubject("");
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, partner.id, hasEmail]);

  function onTemplateChange(id: string) {
    setTemplateId(id);
    if (!id) {
      setSubject("");
      setMessage("");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-violet-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          Email to {partner.displayName}
        </h3>
        <button type="button" className="ugclab-btn ugclab-btn-ghost px-2 py-1 text-xs" onClick={onClose}>
          Close
        </button>
      </div>

      {!emailConfigured ? (
        <p className="text-sm text-amber-800">
          Email delivery is not configured on the server (Resend or SendGrid). Contact platform
          support.
        </p>
      ) : null}

      {!hasEmail ? (
        <p className="text-sm text-amber-800">
          Add an email in <strong>Edit</strong> before sending.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Sends from your store name (Settings → email from / reply-to). To:{" "}
          <span className="font-medium text-zinc-700">{partner.email}</span>
        </p>
      )}

      <div>
        <label className="text-xs font-medium text-zinc-500">Template</label>
        <select
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="ugclab-select mt-1 block w-full max-w-md"
          disabled={!hasEmail}
        >
          <option value="">Custom (no template)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {templateId ? (
          <p className="mt-1 text-xs text-zinc-500">
            {templates.find((t) => t.id === templateId)?.description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">
            Write your own subject and message. Line breaks become paragraphs.
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-500">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="ugclab-input mt-1 w-full"
          disabled={!hasEmail || (Boolean(templateId) && loadingPreview)}
          placeholder="Email subject"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-500">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className="ugclab-input mt-1 w-full font-sans"
          disabled={!hasEmail || (Boolean(templateId) && loadingPreview)}
          placeholder={
            templateId
              ? loadingPreview
                ? "Loading preview…"
                : "Preview of template text"
              : "Your message to the creator…"
          }
        />
        {templateId ? (
          <p className="mt-1 text-xs text-zinc-400">
            Preview is plain text; sent email uses the designed HTML template with your store
            branding.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !hasEmail || !emailConfigured || !subject.trim() || !message.trim()}
          className="ugclab-btn ugclab-btn-primary"
          onClick={() =>
            onSend(async () => {
              if (templateId) {
                await api.sendAffiliateCreatorEmail(partner.id, { templateId });
              } else {
                await api.sendAffiliateCreatorEmail(partner.id, {
                  templateId: null,
                  subject: subject.trim(),
                  html: message.trim(),
                  text: message.trim(),
                });
              }
            })
          }
        >
          {pending ? "Sending…" : "Send email"}
        </button>
        <button type="button" className="ugclab-btn ugclab-btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
