import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { useAdminT } from "@/hooks/use-admin-t";

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
  RECENT_30: "Paid order in the last 30 days",
  RFM_CHAMPIONS: "VIP who also ordered in the last 30 days",
};

const VARS = [
  "{{name}}",
  "{{store_name}}",
  "{{store_url}}",
  "{{discount_code}}",
  "{{unsubscribe_url}}",
  "{{last_order_date}}",
  "{{utm_campaign}}",
] as const;

type Tab = "campaigns" | "automations" | "subscribers";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    SCHEDULED: "bg-sky-50 text-sky-800",
    SENDING: "bg-amber-50 text-amber-800",
    SENT: "bg-emerald-50 text-emerald-800",
    FAILED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        map[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function MarketingPage() {
  const { ta, c } = useAdminT();
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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reportId, setReportId] = useState<string | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [addAutomationOpen, setAddAutomationOpen] = useState(false);

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
  const filteredCampaigns =
    statusFilter === "ALL"
      ? campaigns
      : campaigns.filter((c) => c.status === statusFilter);
  const reportCampaign = reportId
    ? campaigns.find((c) => c.id === reportId) ?? null
    : null;

  const previewHtml = bodyHtml
    .replace(/\{\{name\}\}/gi, "Alex")
    .replace(/\{\{store_name\}\}/gi, "Your store")
    .replace(/\{\{store_url\}\}/gi, "#")
    .replace(/\{\{discount_code\}\}/gi, discountCode || "SAVE10")
    .replace(/\{\{unsubscribe_url\}\}/gi, "#")
    .replace(/\{\{last_order_date\}\}/gi, "Jan 12")
    .replace(/\{\{utm_campaign\}\}/gi, utmCampaign || "preview");

  function insertVar(v: string) {
    setBodyHtml((prev) => `${prev}${prev.endsWith(">") || prev.endsWith("\n") ? "" : " "}${v}`);
  }

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
        <h1 className="text-2xl font-bold">{ta("marketingPage.title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{ta("marketingPage.description")}</p>
        <p className="mt-2 text-sm text-zinc-500">
          From name / reply-to:{" "}
          <a href="/settings" className="text-violet-700 hover:underline">
            Settings → Email
          </a>
          . Unsubscribe footer is added automatically.
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {tab === "automations" ? (
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary text-sm"
            onClick={() => setAddAutomationOpen(true)}
          >
            Add automation
          </button>
        ) : null}
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
                recipients{" "}
                <button
                  type="button"
                  className="text-violet-700 hover:underline"
                  onClick={() => setShowRecipients((v) => !v)}
                >
                  {showRecipients ? "Hide list" : "Show emails"}
                </button>
              </span>
              {showRecipients && (preview?.preview?.length ?? 0) > 0 ? (
                <ul className="mt-2 max-h-32 overflow-auto rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  {preview!.preview.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                  {(preview?.count ?? 0) > (preview?.preview?.length ?? 0) ? (
                    <li className="text-zinc-400">
                      …and {(preview!.count ?? 0) - preview!.preview.length} more
                    </li>
                  ) : null}
                </ul>
              ) : null}
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
              {editId && scheduledAt ? "Reschedule" : "Schedule (optional)"}
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="ugclab-input mt-1.5"
              />
            </label>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Body (HTML)</p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["Heading", "<h1>Heading</h1>\n"],
                      ["Text", "<p>Write your message.</p>\n"],
                      [
                        "Button",
                        '<p><a href="{{storeUrl}}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Shop now</a></p>\n',
                      ],
                      [
                        "Image",
                        '<p><img src="https://" alt="" style="max-width:100%;height:auto" /></p>\n',
                      ],
                    ] as const
                  ).map(([label, html]) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800"
                      onClick={() => setBodyHtml((prev) => `${prev}${html}`)}
                    >
                      {label}
                    </button>
                  ))}
                  {VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 hover:border-violet-300 hover:text-violet-700"
                      onClick={() => insertVar(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={12}
                  className="ugclab-input font-mono text-xs"
                />
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <p className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Live preview
                  </p>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={`<!DOCTYPE html><html><head><base target="_blank"/><style>body{font-family:system-ui,sans-serif;padding:16px;color:#18181b;margin:0}a{color:#6d28d9}</style></head><body><p style="font-size:13px;font-weight:600;margin:0 0 12px">${(subject || "(no subject)").replace(/</g, "&lt;")}</p>${previewHtml}<p style="margin-top:24px;font-size:11px;color:#71717a"><a href="#">Unsubscribe</a></p></body></html>`}
                    className="h-[280px] w-full bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => saveCampaign(false)}
                className="ugclab-btn border border-zinc-200 bg-white text-sm"
              >
                {scheduledAt ? (editId ? "Save schedule" : "Schedule") : "Save draft"}
              </button>
              <button
                type="button"
                disabled={pending || !data?.emailConfigured}
                onClick={() => saveCampaign(true)}
                className="ugclab-btn ugclab-btn-primary text-sm"
              >
                Send now
              </button>
              <button
                type="button"
                disabled={pending || !data?.emailConfigured}
                className="ugclab-btn border border-zinc-200 bg-white text-sm"
                onClick={async () => {
                  try {
                    if (editId) {
                      await api.testMarketingCampaign(editId);
                    } else {
                      await api.testMarketingDraft({
                        subject,
                        bodyHtml,
                        discountCode: discountCode || undefined,
                        utmCampaign: utmCampaign || undefined,
                      });
                    }
                    setAlert({ ok: true, message: "Test email sent to your account" });
                  } catch (e) {
                    setAlert({
                      ok: false,
                      message: e instanceof Error ? e.message : "Test failed",
                    });
                  }
                }}
              >
                Test send
              </button>
            </div>
          </section>

          <div className="space-y-4">
            {reportCampaign ? (
              <CampaignReport
                campaign={reportCampaign}
                onClose={() => setReportId(null)}
              />
            ) : null}
            <CampaignList
              campaigns={filteredCampaigns}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
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
              onCancel={async (id) => {
                await api.cancelMarketingCampaign(id);
                setAlert({ ok: true, message: "Schedule cancelled — back to draft" });
                await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
              }}
              onReport={(id) => setReportId(id)}
              onDelete={async (id) => {
                if (!confirm("Delete this campaign?")) return;
                await api.deleteMarketingCampaign(id);
                if (editId === id) resetForm();
                await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
              }}
            />
          </div>
        </div>
      ) : null}

      {tab === "automations" ? (
        <AutomationsPanel
          automations={(data?.automations ?? []) as AutomationRow[]}
          segments={(data?.segments ?? []) as { id: string; label: string }[]}
          catalogOpen={addAutomationOpen}
          onCatalogOpenChange={setAddAutomationOpen}
          onSave={async (automation, body) => {
            if (automation.type === "CUSTOM") {
              await api.updateMarketingAutomationById(automation.id, body);
            } else {
              await api.updateMarketingAutomation(automation.type, body);
            }
            await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            setAlert({ ok: true, message: "Automation saved" });
          }}
          onCreate={async (body) => {
            const { automation } = await api.createMarketingAutomation(body);
            await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            setAlert({ ok: true, message: "Custom automation created" });
            return automation.id;
          }}
          onDelete={async (id) => {
            await api.deleteMarketingAutomation(id);
            await qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
            setAlert({ ok: true, message: "Automation deleted" });
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

function CampaignReport({
  campaign,
  onClose,
}: {
  campaign: CampaignRow;
  onClose: () => void;
}) {
  const { data: ab } = useQuery({
    queryKey: ["marketing-ab", campaign.id],
    queryFn: () => api.marketingAbReport(campaign.id),
    enabled: Boolean(campaign.subjectB && campaign.abTestPercent),
  });
  const sent = campaign.sentCount || 0;
  const openPct = sent > 0 ? Math.round((campaign.openCount / sent) * 1000) / 10 : 0;
  const clickPct = sent > 0 ? Math.round((campaign.clickCount / sent) * 1000) / 10 : 0;
  return (
    <section className="admin-card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Campaign report</h3>
          <p className="text-sm text-zinc-600">{campaign.name ?? campaign.subject}</p>
        </div>
        <button type="button" className="text-xs text-zinc-500 hover:underline" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Delivered", value: `${campaign.sentCount}/${campaign.recipientCount}` },
          { label: "Failed", value: String(campaign.failedCount) },
          { label: "Open rate", value: `${openPct}%` },
          { label: "Click rate", value: `${clickPct}%` },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-zinc-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{m.label}</p>
            <p className="mt-0.5 text-lg font-semibold">{m.value}</p>
          </div>
        ))}
      </div>
      {ab?.hasAbTest ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm">
          <p className="font-medium text-amber-900">A/B subject test</p>
          <p className="mt-1 text-xs text-amber-800">
            A: {ab.openRateAPct}% opens ({ab.openCountA}/{ab.sentA}) · B: {ab.openRateBPct}% opens
            ({ab.openCountB}/{ab.sentB})
            {ab.suggestedWinner ? (
              <>
                {" "}
                · Winner: <strong>{ab.suggestedWinner}</strong>
              </>
            ) : null}
          </p>
          {ab.note ? <p className="mt-1 text-[11px] text-amber-700">{ab.note}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function CampaignList({
  campaigns,
  statusFilter,
  onStatusFilter,
  emailConfigured,
  onEdit,
  onDuplicate,
  onSend,
  onCancel,
  onReport,
  onDelete,
}: {
  campaigns: CampaignRow[];
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  emailConfigured: boolean;
  onEdit: (c: CampaignRow) => void;
  onDuplicate: (id: string) => void;
  onSend: (id: string) => void;
  onCancel: (id: string) => void;
  onReport: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const filters = ["ALL", "DRAFT", "SCHEDULED", "SENT", "FAILED"];
  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4">
        <h2 className="font-semibold">Past campaigns</h2>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onStatusFilter(f)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                statusFilter === f
                  ? "bg-violet-100 text-violet-800"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {f === "ALL" ? "All" : f}
            </button>
          ))}
        </div>
      </div>
      {campaigns.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-zinc-800">No campaigns yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Pick a template on the left, then save draft or send.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {campaigns.map((c) => (
            <li key={c.id} className="space-y-2 px-6 py-4">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-medium hover:text-violet-600"
                  onClick={() => onEdit(c)}
                >
                  {c.name ?? c.subject}
                </button>
                {statusBadge(c.status)}
              </div>
              <p className="text-xs text-zinc-500">
                {c.segment} · {new Date(c.createdAt).toLocaleString()}
                {c.scheduledAt
                  ? ` · scheduled ${new Date(c.scheduledAt).toLocaleString()}`
                  : ""}
              </p>
              {(c.status === "SENT" || c.status === "FAILED") && (
                <p className="text-xs text-zinc-600">
                  Delivered {c.sentCount}/{c.recipientCount}
                  {c.sentCount > 0
                    ? ` · ${Math.round((c.openCount / c.sentCount) * 100)}% open · ${Math.round((c.clickCount / c.sentCount) * 100)}% click`
                    : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                  <>
                    <button type="button" className="text-violet-600" onClick={() => onEdit(c)}>
                      {c.status === "SCHEDULED" ? "Reschedule" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="text-violet-600 disabled:opacity-40"
                      disabled={!emailConfigured}
                      onClick={() => onSend(c.id)}
                    >
                      Send now
                    </button>
                  </>
                )}
                {c.status === "SCHEDULED" ? (
                  <button type="button" className="text-amber-700" onClick={() => onCancel(c.id)}>
                    Cancel schedule
                  </button>
                ) : null}
                {(c.status === "SENT" || c.status === "FAILED") && (
                  <button type="button" className="text-violet-700" onClick={() => onReport(c.id)}>
                    Report
                  </button>
                )}
                {c.status === "SENT" && c.subjectB && c.abTestPercent ? (
                  <button type="button" className="text-amber-700" onClick={() => onReport(c.id)}>
                    A/B report
                  </button>
                ) : null}
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
  id: string;
  type: string;
  name: string | null;
  segment: string | null;
  enabled: boolean;
  subject: string;
  bodyHtml: string;
  delayHours: number;
};

const AUTOMATION_CATALOG: {
  type: string;
  label: string;
  description: string;
}[] = [
  {
    type: "WELCOME",
    label: "Welcome (new customer)",
    description: "Sent when a customer creates an account or places their first order.",
  },
  {
    type: "POST_PURCHASE",
    label: "Thank you after purchase",
    description: "Follow-up after payment — optional delay in hours.",
  },
  {
    type: "WINBACK",
    label: "Win-back",
    description: "Weekly job for customers inactive 60+ days.",
  },
];

function AutomationsPanel({
  automations,
  segments,
  catalogOpen,
  onCatalogOpenChange,
  onSave,
  onCreate,
  onDelete,
}: {
  automations: AutomationRow[];
  segments: { id: string; label: string }[];
  catalogOpen: boolean;
  onCatalogOpenChange: (open: boolean) => void;
  onSave: (automation: AutomationRow, body: Record<string, unknown>) => Promise<void>;
  onCreate: (body: {
    name: string;
    subject: string;
    bodyHtml: string;
    segment: string;
    enabled?: boolean;
  }) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
}) {
  const systemByType = Object.fromEntries(
    automations.filter((a) => a.type !== "CUSTOM").map((a) => [a.type, a])
  );
  const customs = automations.filter((a) => a.type === "CUSTOM");
  const [installed, setInstalled] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"pick" | "scratch">("pick");
  const [scratchName, setScratchName] = useState("");
  const [scratchSegment, setScratchSegment] = useState("ALL");
  const [scratchSubject, setScratchSubject] = useState("News from {{store_name}}");
  const [scratchBody, setScratchBody] = useState(
    "<p>Hi {{name}},</p><p>Something new at {{store_name}}.</p><p><a href=\"{{store_url}}\">Visit store</a></p>"
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (hydrated || automations.length === 0) return;
    const system = automations.filter((a) => a.type !== "CUSTOM");
    const enabled = system.filter((a) => a.enabled).map((a) => a.type);
    setInstalled(enabled.length > 0 ? enabled : system.map((a) => a.type));
    setHydrated(true);
  }, [automations, hydrated]);

  useEffect(() => {
    if (catalogOpen) setMode("pick");
  }, [catalogOpen]);

  const visibleSystem = AUTOMATION_CATALOG.filter((c) => installed.includes(c.type))
    .map((c) => systemByType[c.type])
    .filter(Boolean) as AutomationRow[];

  const visible = [...visibleSystem, ...customs];

  async function addAutomation(type: string) {
    const row = systemByType[type];
    if (!row) return;
    if (!installed.includes(type)) {
      setInstalled((prev) => [...prev, type]);
    }
    onCatalogOpenChange(false);
    setFocusId(row.id);
    if (!row.enabled) {
      await onSave(row, {
        enabled: true,
        subject: row.subject,
        bodyHtml: row.bodyHtml,
        delayHours: row.delayHours,
      });
    }
    requestAnimationFrame(() => {
      document.getElementById(`automation-${row.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function createFromScratch() {
    setCreating(true);
    try {
      const id = await onCreate({
        name: scratchName.trim() || "Custom automation",
        subject: scratchSubject,
        bodyHtml: scratchBody,
        segment: scratchSegment,
        enabled: true,
      });
      onCatalogOpenChange(false);
      setFocusId(id);
      setScratchName("");
      setScratchSegment("ALL");
      setScratchSubject("News from {{store_name}}");
      setScratchBody(
        "<p>Hi {{name}},</p><p>Something new at {{store_name}}.</p><p><a href=\"{{store_url}}\">Visit store</a></p>"
      );
      requestAnimationFrame(() => {
        document.getElementById(`automation-${id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {visible.length === 0 ? (
        <section className="admin-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-800">No automations yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Start from a template or create a weekly email from scratch.
          </p>
          <button
            type="button"
            className="ugclab-btn ugclab-btn-primary mt-4 text-sm"
            onClick={() => onCatalogOpenChange(true)}
          >
            Add automation
          </button>
        </section>
      ) : (
        visible.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            label={
              a.type === "CUSTOM"
                ? a.name || "Custom automation"
                : AUTOMATION_CATALOG.find((c) => c.type === a.type)?.label ?? a.type
            }
            segments={segments}
            highlight={focusId === a.id}
            onSave={onSave}
            onRemove={async () => {
              if (a.type === "CUSTOM") {
                await onDelete(a.id);
              } else {
                setInstalled((prev) => prev.filter((t) => t !== a.type));
                await onSave(a, {
                  enabled: false,
                  subject: a.subject,
                  bodyHtml: a.bodyHtml,
                  delayHours: a.delayHours,
                });
              }
            }}
          />
        ))
      )}

      {catalogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-automation-title"
          onClick={() => onCatalogOpenChange(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="add-automation-title" className="text-lg font-semibold">
                  {mode === "scratch" ? "Create from scratch" : "Add automation"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {mode === "scratch"
                    ? "Weekly email to a segment. Edit anytime after creating."
                    : "Pick a trigger or build your own."}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-zinc-500 hover:underline"
                onClick={() => onCatalogOpenChange(false)}
              >
                Close
              </button>
            </div>

            {mode === "pick" ? (
              <ul className="mt-4 space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setMode("scratch")}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-left transition hover:border-violet-400"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        Create from scratch
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Name, audience segment, subject and HTML — runs weekly when enabled.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-violet-700">New</span>
                  </button>
                </li>
                {AUTOMATION_CATALOG.map((c) => {
                  const already = installed.includes(c.type);
                  return (
                    <li key={c.type}>
                      <button
                        type="button"
                        disabled={!systemByType[c.type]}
                        onClick={() => addAutomation(c.type)}
                        className="flex w-full items-start justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-40"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{c.label}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">{c.description}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-violet-700">
                          {already ? "Open" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  className="text-xs text-violet-700 hover:underline"
                  onClick={() => setMode("pick")}
                >
                  ← Back to templates
                </button>
                <label className="block text-sm">
                  Name
                  <input
                    value={scratchName}
                    onChange={(e) => setScratchName(e.target.value)}
                    placeholder="e.g. Monthly VIP newsletter"
                    className="ugclab-input mt-1.5"
                  />
                </label>
                <label className="block text-sm">
                  Audience
                  <select
                    value={scratchSegment}
                    onChange={(e) => setScratchSegment(e.target.value)}
                    className="ugclab-select mt-1.5 w-full"
                  >
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Sends about once a week while enabled.
                  </span>
                </label>
                <label className="block text-sm">
                  Subject
                  <input
                    value={scratchSubject}
                    onChange={(e) => setScratchSubject(e.target.value)}
                    className="ugclab-input mt-1.5"
                  />
                </label>
                <label className="block text-sm">
                  Body (HTML)
                  <textarea
                    value={scratchBody}
                    onChange={(e) => setScratchBody(e.target.value)}
                    rows={6}
                    className="ugclab-input mt-1.5 font-mono text-xs"
                  />
                </label>
                <button
                  type="button"
                  disabled={creating}
                  className="ugclab-btn ugclab-btn-primary text-sm"
                  onClick={() => createFromScratch()}
                >
                  {creating ? "Creating…" : "Create automation"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AutomationCard({
  automation,
  label,
  segments,
  highlight,
  onSave,
  onRemove,
}: {
  automation: AutomationRow;
  label: string;
  segments: { id: string; label: string }[];
  highlight?: boolean;
  onSave: (automation: AutomationRow, body: Record<string, unknown>) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(automation.enabled);
  const [name, setName] = useState(automation.name ?? "");
  const [segment, setSegment] = useState(automation.segment ?? "ALL");
  const [subject, setSubject] = useState(automation.subject);
  const [bodyHtml, setBodyHtml] = useState(automation.bodyHtml);
  const [delayHours, setDelayHours] = useState(automation.delayHours);
  const isCustom = automation.type === "CUSTOM";

  return (
    <section
      id={`automation-${automation.id}`}
      className={`admin-card space-y-3 p-6 ${
        highlight ? "ring-2 ring-violet-300" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled
          </label>
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-red-600"
            onClick={() => onRemove()}
          >
            {isCustom ? "Delete" : "Remove"}
          </button>
        </div>
      </div>
      {isCustom ? (
        <>
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ugclab-input mt-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            Audience
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="ugclab-select mt-1.5 w-full"
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-500">
              Weekly send to this segment while enabled.
            </span>
          </label>
        </>
      ) : null}
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
          onSave(automation, {
            enabled,
            subject,
            bodyHtml,
            delayHours,
            ...(isCustom ? { name, segment } : {}),
          })
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
    <section className="admin-card max-w-xl space-y-4 p-6">
      <h2 className="font-semibold">Import subscribers</h2>
      <p className="text-sm text-zinc-500">
        CSV with columns <code>email,name</code>. Included in ALL campaigns. Storefront
        newsletter block syncs here automatically. Enable{" "}
        <strong>double opt-in</strong> under Settings → Email so new signups confirm by email.
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
