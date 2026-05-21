import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";

const SEGMENT_HINTS: Record<string, string> = {
  ALL: "Everyone with a customer account + newsletter subscribers",
  VIP: "Spent $500+ (lifetime)",
  REPEAT: "2 or more paid orders",
  NEW: "Registered but never ordered",
  ACTIVE: "Exactly 1 order, not VIP",
  ABANDONED_CART: "Left email in cart (7 days), not purchased",
  INACTIVE_90: "Last order 90+ days ago",
  COLLECTION: "Bought from selected collection",
  PRODUCT: "Bought selected product",
};

const VARS_HELP =
  "{{name}}, {{store_name}}, {{store_url}}, {{discount_code}}, {{unsubscribe_url}}, {{last_order_date}}, {{utm_campaign}}";

type Tab = "campaigns" | "automations" | "subscribers";

export default function MarketingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("campaigns");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [segment, setSegment] = useState("ALL");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [productId, setProductId] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectB, setSubjectB] = useState("");
  const [abTestPercent, setAbTestPercent] = useState(10);
  const [bodyHtml, setBodyHtml] = useState(
    "<p>Hi {{name}},</p><p>We have something special for you at {{store_name}}.</p><p><a href=\"{{store_url}}\">Shop now</a></p>"
  );
  const [discountCode, setDiscountCode] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: () => api.marketingCampaigns(),
  });

  const { data: preview } = useQuery({
    queryKey: ["marketing-preview", segment, collectionSlug, productId],
    queryFn: () =>
      api.marketingPreviewRecipients(segment, {
        collectionSlug: segment === "COLLECTION" ? collectionSlug : undefined,
        productId: segment === "PRODUCT" ? productId : undefined,
      }),
  });

  const campaigns = (data?.campaigns ?? []) as CampaignRow[];

  function loadCampaign(c: CampaignRow) {
    setEditId(c.id);
    setSegment(c.segment);
    setCollectionSlug(c.collectionSlug ?? "");
    setProductId(c.productId ?? "");
    setSubject(c.subject);
    setSubjectB(c.subjectB ?? "");
    setAbTestPercent(c.abTestPercent ?? 0);
    setBodyHtml(c.bodyHtml);
    setDiscountCode(c.discountCode ?? "");
    setUtmCampaign(c.utmCampaign ?? "");
    setScheduledAt(
      c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : ""
    );
  }

  function resetForm() {
    setEditId(null);
    setSegment("ALL");
    setCollectionSlug("");
    setProductId("");
    setSubject("");
    setSubjectB("");
    setAbTestPercent(10);
    setDiscountCode("");
    setUtmCampaign("");
    setScheduledAt("");
  }

  async function saveCampaign(sendNow: boolean) {
    setPending(true);
    setAlert({});
    const payload = {
      segment,
      subject,
      subjectB: subjectB.trim() || undefined,
      abTestPercent,
      bodyHtml,
      discountCode: discountCode.trim() || undefined,
      utmCampaign: utmCampaign.trim() || undefined,
      collectionSlug: segment === "COLLECTION" ? collectionSlug : undefined,
      productId: segment === "PRODUCT" ? productId : undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      name: subject.slice(0, 60) || "Campaign",
    };
    try {
      let id = editId;
      if (editId) {
        await api.updateMarketingCampaign(editId, payload);
      } else {
        const { campaign } = await api.createMarketingCampaign(payload);
        id = campaign.id as string;
      }
      if (sendNow && id) {
        if (
          (preview?.count ?? 0) > (data?.bulkConfirmThreshold ?? 500) &&
          !confirm(`Send to ${preview?.count} recipients?`)
        ) {
          setPending(false);
          return;
        }
        const r = await api.sendMarketingCampaign(id);
        setAlert({
          ok: true,
          message: `Sent to ${r.result.sent} of ${r.result.total}`,
        });
        resetForm();
      } else {
        setAlert({
          ok: true,
          message: scheduledAt ? "Scheduled" : editId ? "Draft updated" : "Draft saved",
        });
      }
      await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    } catch (e) {
      setAlert({ ok: false, message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setPending(false);
    }
  }

  function applyTemplate(templateId: string) {
    const t = (data?.templates ?? []).find(
      (x: { id: string }) => x.id === templateId
    ) as { subject: string; bodyHtml: string } | undefined;
    if (!t) return;
    setSubject(t.subject);
    setBodyHtml(t.bodyHtml);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Email marketing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Campaigns, automations, and subscribers. Variables:{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">{VARS_HELP}</code>
        </p>
        {data && !data.emailConfigured ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Add <code>RESEND_API_KEY</code> or <code>SENDGRID_API_KEY</code> to send.
          </p>
        ) : null}
        {data ? (
          <p className="mt-2 text-xs text-zinc-500">
            Sent today: {data.sentToday} / {data.dailyCap} daily cap
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 text-sm">
        {(["campaigns", "automations", "subscribers"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 capitalize ${
              tab === t ? "bg-violet-100 text-violet-800" : "text-zinc-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      {tab === "campaigns" ? (
        <div className="grid gap-8 xl:grid-cols-2">
          <section className="admin-card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {editId ? "Edit campaign" : "New campaign"}
              </h2>
              {editId ? (
                <button type="button" className="text-sm text-zinc-500" onClick={resetForm}>
                  New instead
                </button>
              ) : null}
            </div>

            <label className="block text-sm">
              Template
              <select
                className="ugclab-select mt-1.5 w-full"
                defaultValue=""
                onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              >
                <option value="">Choose template…</option>
                {(data?.templates ?? []).map((t: { id: string; label: string }) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Audience
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="ugclab-select mt-1.5 w-full"
              >
                {(data?.segments ?? []).map((s: { id: string; label: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-zinc-500">
                {SEGMENT_HINTS[segment]} — <strong>{preview?.count ?? "…"}</strong>{" "}
                recipients
              </span>
            </label>

            {segment === "COLLECTION" ? (
              <label className="block text-sm">
                Collection slug
                <select
                  value={collectionSlug}
                  onChange={(e) => setCollectionSlug(e.target.value)}
                  className="ugclab-select mt-1.5 w-full"
                >
                  <option value="">Select…</option>
                  {(data?.collections ?? []).map((c: { slug: string; title: string }) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {segment === "PRODUCT" ? (
              <label className="block text-sm">
                Product
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="ugclab-select mt-1.5 w-full"
                >
                  <option value="">Select…</option>
                  {(data?.products ?? []).map((p: { id: string; title: string }) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block text-sm">
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="ugclab-input mt-1.5"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                A/B subject B (optional)
                <input
                  value={subjectB}
                  onChange={(e) => setSubjectB(e.target.value)}
                  className="ugclab-input mt-1.5"
                />
              </label>
              <label className="block text-sm">
                A/B % on B
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={abTestPercent}
                  onChange={(e) => setAbTestPercent(parseInt(e.target.value, 10) || 0)}
                  className="ugclab-input mt-1.5"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Discount code (optional)
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="ugclab-input mt-1.5 font-mono"
                />
              </label>
              <label className="block text-sm">
                UTM campaign
                <input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="summer_sale"
                  className="ugclab-input mt-1.5 font-mono"
                />
              </label>
            </div>

            <label className="block text-sm">
              Schedule (optional)
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="ugclab-input mt-1.5"
              />
            </label>

            <label className="block text-sm">
              Body (HTML)
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="ugclab-input mt-1.5 font-mono text-xs"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => saveCampaign(false)}
                className="ugclab-btn border border-zinc-200 bg-white text-sm"
              >
                {scheduledAt ? "Schedule" : "Save draft"}
              </button>
              <button
                type="button"
                disabled={pending || !data?.emailConfigured}
                onClick={() => saveCampaign(true)}
                className="ugclab-btn ugclab-btn-primary text-sm"
              >
                Send now
              </button>
              {editId ? (
                <button
                  type="button"
                  disabled={pending || !data?.emailConfigured}
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  onClick={async () => {
                    try {
                      await api.testMarketingCampaign(editId);
                      setAlert({ ok: true, message: "Test email sent to your address" });
                    } catch (e) {
                      setAlert({
                        ok: false,
                        message: e instanceof Error ? e.message : "Test failed",
                      });
                    }
                  }}
                >
                  Send test
                </button>
              ) : null}
            </div>
          </section>

          <CampaignList
            campaigns={campaigns}
            emailConfigured={!!data?.emailConfigured}
            onEdit={loadCampaign}
            onDuplicate={async (id) => {
              await api.duplicateMarketingCampaign(id);
              await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            }}
            onSend={async (id) => {
              setPending(true);
              try {
                const r = await api.sendMarketingCampaign(id);
                setAlert({
                  ok: true,
                  message: `Sent ${r.result.sent}/${r.result.total}`,
                });
                await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
              } catch (e) {
                setAlert({ ok: false, message: e instanceof Error ? e.message : "Failed" });
              } finally {
                setPending(false);
              }
            }}
            onDelete={async (id) => {
              await api.deleteMarketingCampaign(id);
              if (editId === id) resetForm();
              await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            }}
          />
        </div>
      ) : null}

      {tab === "automations" ? (
        <AutomationsPanel
          automations={(data?.automations ?? []) as AutomationRow[]}
          onSave={async (type, body) => {
            await api.updateMarketingAutomation(type, body);
            await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            setAlert({ ok: true, message: "Automation saved" });
          }}
        />
      ) : null}

      {tab === "subscribers" ? <SubscribersPanel /> : null}
    </div>
  );
}

type CampaignRow = {
  id: string;
  name: string | null;
  segment: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  collectionSlug?: string | null;
  productId?: string | null;
  subjectB?: string | null;
  abTestPercent?: number;
  bodyHtml: string;
  discountCode?: string | null;
  utmCampaign?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  sentAt: string | null;
};

function CampaignList({
  campaigns,
  emailConfigured,
  onEdit,
  onDuplicate,
  onSend,
  onDelete,
}: {
  campaigns: CampaignRow[];
  emailConfigured: boolean;
  onEdit: (c: CampaignRow) => void;
  onDuplicate: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="admin-card overflow-hidden">
      <h2 className="border-b border-zinc-100 px-6 py-4 font-semibold">Past campaigns</h2>
      {campaigns.length === 0 ? (
        <p className="px-6 py-8 text-sm text-zinc-500">No campaigns yet.</p>
      ) : (
        <ul className="divide-y">
          {campaigns.map((c) => (
            <li key={c.id} className="px-6 py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-medium hover:text-violet-600"
                  onClick={() => onEdit(c)}
                >
                  {c.name ?? c.subject}
                </button>
                <span className="text-xs text-zinc-500">{c.status}</span>
              </div>
              <p className="text-xs text-zinc-500">
                {c.segment} · {new Date(c.createdAt).toLocaleString()}
                {c.scheduledAt ? ` · scheduled ${new Date(c.scheduledAt).toLocaleString()}` : ""}
              </p>
              {(c.status === "SENT" || c.status === "FAILED") && (
                <p className="text-xs text-zinc-600">
                  Delivered {c.sentCount}/{c.recipientCount}
                  {c.sentCount > 0 && c.openCount > 0
                    ? ` · ${Math.round((c.openCount / c.sentCount) * 100)}% open`
                    : ""}
                  {c.sentCount > 0 && c.clickCount > 0
                    ? ` · ${Math.round((c.clickCount / c.sentCount) * 100)}% click`
                    : ""}
                  {c.subjectB && c.abTestPercent
                    ? ` · A/B ${c.abTestPercent}% to B`
                    : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                  <>
                    <button type="button" className="text-violet-600" onClick={() => onEdit(c)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-violet-600"
                      disabled={!emailConfigured}
                      onClick={() => onSend(c.id)}
                    >
                      Send
                    </button>
                  </>
                )}
                <button type="button" className="text-zinc-600" onClick={() => onDuplicate(c.id)}>
                  Duplicate
                </button>
                <button type="button" className="text-red-600" onClick={() => onDelete(c.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type AutomationRow = {
  type: string;
  enabled: boolean;
  subject: string;
  bodyHtml: string;
  delayHours: number;
};

function AutomationsPanel({
  automations,
  onSave,
}: {
  automations: AutomationRow[];
  onSave: (type: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const labels: Record<string, string> = {
    WELCOME: "Welcome (new customer)",
    POST_PURCHASE: "Thank you after purchase",
    WINBACK: "Win-back (60+ days inactive, weekly cron)",
  };

  return (
    <div className="space-y-4">
      {automations.map((a) => (
        <AutomationCard key={a.type} automation={a} label={labels[a.type] ?? a.type} onSave={onSave} />
      ))}
    </div>
  );
}

function AutomationCard({
  automation,
  label,
  onSave,
}: {
  automation: AutomationRow;
  label: string;
  onSave: (type: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(automation.enabled);
  const [subject, setSubject] = useState(automation.subject);
  const [bodyHtml, setBodyHtml] = useState(automation.bodyHtml);
  const [delayHours, setDelayHours] = useState(automation.delayHours);

  return (
    <section className="admin-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="ugclab-input text-sm"
      />
      <textarea
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        rows={4}
        className="ugclab-input font-mono text-xs"
      />
      {automation.type === "POST_PURCHASE" ? (
        <label className="block text-sm">
          Delay (hours after payment)
          <input
            type="number"
            min={0}
            value={delayHours}
            onChange={(e) => setDelayHours(parseInt(e.target.value, 10) || 0)}
            className="ugclab-input mt-1 w-24"
          />
        </label>
      ) : null}
      <button
        type="button"
        className="ugclab-btn ugclab-btn-primary text-sm"
        onClick={() =>
          onSave(automation.type, { enabled, subject, bodyHtml, delayHours })
        }
      >
        Save automation
      </button>
    </section>
  );
}

function SubscribersPanel() {
  const [csv, setCsv] = useState("email,name\n");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="admin-card p-6 space-y-4 max-w-xl">
      <h2 className="font-semibold">Import subscribers</h2>
      <p className="text-sm text-zinc-500">
        CSV with columns <code>email,name</code>. Included in ALL campaigns. Storefront
        newsletter block syncs here automatically.
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={8}
        className="ugclab-input font-mono text-xs"
      />
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      <button
        type="button"
        className="ugclab-btn ugclab-btn-primary text-sm"
        onClick={async () => {
          const r = await api.importMarketingSubscribers(csv);
          setMsg(`Imported ${r.imported} subscribers`);
        }}
      >
        Import CSV
      </button>
    </section>
  );
}
