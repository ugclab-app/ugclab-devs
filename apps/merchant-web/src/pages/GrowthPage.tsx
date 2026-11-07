import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type GrowthSettingsDto,
  type WebhookDeliveryDto,
  type WebhookTestResult,
} from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { AffiliatesPanel } from "@/components/affiliates-panel";
import { TelegramBotPanel } from "@/components/telegram-bot-panel";
import { useAuth } from "@/context/auth";
import { useAdminT } from "@/hooks/use-admin-t";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "affiliates", label: "Creators & affiliates" },
  { id: "gift-cards", label: "Gift cards" },
  { id: "bundles", label: "Bundles" },
  { id: "upsell", label: "Post-checkout upsell" },
  { id: "seo", label: "SEO hub" },
  { id: "tax", label: "Tax / VAT" },
  { id: "integrations", label: "Integrations" },
  { id: "webhooks", label: "Webhooks & API" },
  { id: "warehouses", label: "Warehouses" },
  { id: "subscriptions", label: "Subscriptions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type CheckoutFieldType = "text" | "date" | "textarea";
type CheckoutFieldRow = { label: string; type: CheckoutFieldType; required: boolean };
const MAX_CHECKOUT_FIELDS = 10;

function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function toCheckoutFieldRows(v: unknown): CheckoutFieldRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => {
      const f = (raw ?? {}) as { label?: unknown; type?: unknown; required?: unknown };
      const type: CheckoutFieldType =
        f.type === "date" || f.type === "textarea" ? f.type : "text";
      return { label: String(f.label ?? ""), type, required: f.required === true };
    })
    .slice(0, MAX_CHECKOUT_FIELDS);
}

function CheckoutOptionsForm({
  settings,
  pending,
  run,
}: {
  settings: GrowthSettingsDto;
  pending: boolean;
  run: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const [fields, setFields] = useState<CheckoutFieldRow[]>(() =>
    toCheckoutFieldRows(settings.checkoutFields)
  );
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(settings.turnstileSiteKey ?? "");
  const [turnstileSecretKey, setTurnstileSecretKey] = useState("");
  const turnstileSecretSet = settings.turnstileSecretSet === true;

  return (
    <form
      className="max-w-lg space-y-4 rounded-xl border border-zinc-200 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const secret = turnstileSecretKey.trim();
        void run(
          () =>
            api.patchGrowthSettings({
              bnplEnabled: fd.get("bnplEnabled") === "on",
              tipsEnabled: fd.get("tipsEnabled") === "on",
              tipPresets: String(fd.get("tipPresets") ?? ""),
              blockedCountries: String(fd.get("blockedCountries") ?? ""),
              checkoutFields: fields
                .filter((f) => f.label.trim())
                .map((f) => ({
                  label: f.label.trim(),
                  type: f.type,
                  required: f.required,
                })),
              invoicePrefix: String(fd.get("invoicePrefix") ?? "").trim(),
              invoiceNextNumber: Math.max(
                1,
                parseInt(String(fd.get("invoiceNextNumber") ?? "1"), 10) || 1
              ),
              turnstileSiteKey: turnstileSiteKey.trim(),
              // Empty secret field = leave the stored secret unchanged.
              ...(secret ? { turnstileSecretKey: secret } : {}),
            }),
          "Checkout options saved"
        ).then(() => setTurnstileSecretKey(""));
      }}
    >
      <h2 className="text-base font-semibold text-zinc-900">Checkout options</h2>

      <div className="space-y-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="bnplEnabled"
            defaultChecked={settings.bnplEnabled === true}
          />
          Buy now, pay later (Klarna / Afterpay / Affirm via Stripe)
        </label>
        <p className="pl-6 text-xs text-zinc-500">
          Shown automatically when the checkout currency supports it. Enable the methods in your
          Stripe Dashboard too.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="tipsEnabled"
            defaultChecked={settings.tipsEnabled === true}
          />
          Allow tips at checkout
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Tip presets (percent, comma-separated)
          <input
            name="tipPresets"
            defaultValue={toStringList(settings.tipPresets).join(", ")}
            placeholder="10, 15, 20"
            className="ugclab-input mt-1 w-full"
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-zinc-600">
        Do not sell to countries (ISO-2, comma-separated)
        <textarea
          name="blockedCountries"
          rows={2}
          defaultValue={toStringList(settings.blockedCountries).join(", ")}
          placeholder="RU, BY, IR"
          className="ugclab-input mt-1 w-full font-mono text-xs uppercase"
        />
      </label>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-zinc-600">Custom checkout fields</p>
          <p className="text-xs text-zinc-500">
            Ask buyers for extra information at checkout. Up to {MAX_CHECKOUT_FIELDS} fields;
            answers appear on the order.
          </p>
        </div>
        {fields.map((f, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <input
              value={f.label}
              onChange={(e) =>
                setFields((prev) =>
                  prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                )
              }
              placeholder="Label (e.g. Gift message)"
              className="ugclab-input min-w-0 flex-1"
            />
            <select
              value={f.type}
              onChange={(e) =>
                setFields((prev) =>
                  prev.map((r, i) =>
                    i === idx ? { ...r, type: e.target.value as CheckoutFieldType } : r
                  )
                )
              }
              className="ugclab-select w-28"
              aria-label="Field type"
            >
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="textarea">Long text</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) =>
                  setFields((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, required: e.target.checked } : r))
                  )
                }
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => setFields((prev) => prev.filter((_, i) => i !== idx))}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        {fields.length < MAX_CHECKOUT_FIELDS ? (
          <button
            type="button"
            onClick={() =>
              setFields((prev) => [...prev, { label: "", type: "text", required: false }])
            }
            className="ugclab-btn border border-zinc-200 bg-white text-xs"
          >
            Add field
          </button>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-600">Invoice numbering</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Invoice prefix
            <input
              name="invoicePrefix"
              defaultValue={settings.invoicePrefix ?? ""}
              placeholder="INV-"
              className="ugclab-input mt-1 w-full font-mono"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Next number
            <input
              name="invoiceNextNumber"
              type="number"
              min={1}
              step={1}
              defaultValue={Math.max(1, Number(settings.invoiceNextNumber ?? 1) || 1)}
              className="ugclab-input mt-1 w-full"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          Leave the prefix empty to use order numbers. Numbers are assigned when an order is paid.
        </p>
      </div>

      <div className="space-y-2 border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-600">Bot protection (Cloudflare Turnstile)</p>
        <label className="block text-xs font-medium text-zinc-600">
          Site key
          <input
            value={turnstileSiteKey}
            onChange={(e) => setTurnstileSiteKey(e.target.value)}
            placeholder="0x4AAAAAAA…"
            className="ugclab-input mt-1 w-full font-mono"
            autoComplete="off"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Secret key
          <input
            type="password"
            value={turnstileSecretKey}
            onChange={(e) => setTurnstileSecretKey(e.target.value)}
            placeholder={turnstileSecretSet ? "••••••• (saved)" : "0x4AAAAAAA…"}
            className="ugclab-input mt-1 w-full font-mono"
            autoComplete="new-password"
          />
        </label>
        <p className="text-xs text-zinc-500">
          Shows a captcha on checkout and customer login. Create keys at dash.cloudflare.com →
          Turnstile; add your storefront domain.
          {turnstileSecretSet || turnstileSiteKey ? (
            <>
              {" "}
              <button
                type="button"
                disabled={pending}
                className="text-red-600 hover:underline"
                onClick={() =>
                  void run(
                    () => api.patchGrowthSettings({ turnstileSecretKey: "", turnstileSiteKey: "" }),
                    "Turnstile keys removed"
                  ).then(() => {
                    setTurnstileSiteKey("");
                    setTurnstileSecretKey("");
                  })
                }
              >
                Remove
              </button>
            </>
          ) : null}
        </p>
      </div>

      <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
        Save checkout options
      </button>
    </form>
  );
}

type WebhookRecord = {
  id: string;
  url: string;
  events?: string[];
  active?: boolean;
  createdAt?: string;
};

function describeWebhookTest(r: WebhookTestResult): { ok: boolean; text: string } {
  if (r.status === "SUCCESS") {
    return { ok: true, text: `Delivered${r.statusCode ? ` (${r.statusCode})` : ""}` };
  }
  if (r.status === null) {
    return r.ok ? { ok: true, text: "Queued" } : { ok: false, text: r.error ?? "Failed" };
  }
  const reason = r.statusCode ? `HTTP ${r.statusCode}` : (r.error ?? "no response");
  return {
    ok: false,
    text: `Failed: ${reason}${r.status === "PENDING" ? " — will retry" : ""}`,
  };
}

const DELIVERY_STATUS_CLASS: Record<WebhookDeliveryDto["status"], string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};

function WebhookRow({
  webhook,
  pending,
  run,
}: {
  webhook: WebhookRecord;
  pending: boolean;
  run: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const active = webhook.active !== false;

  const deliveriesKey = ["webhook-deliveries", webhook.id];
  const { data, isLoading } = useQuery({
    queryKey: deliveriesKey,
    queryFn: () => api.webhookDeliveries(webhook.id),
    enabled: open,
  });
  const deliveries = data?.deliveries ?? [];
  const test = testResult ? describeWebhookTest(testResult) : null;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate font-mono text-xs ${active ? "" : "text-zinc-400 line-through"}`}>
            {webhook.url}
          </p>
          {webhook.events?.length ? (
            <p className="text-xs text-zinc-500">{webhook.events.join(", ")}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-zinc-700">
            <input
              type="checkbox"
              checked={active}
              disabled={pending}
              onChange={(e) =>
                void run(
                  () => api.patchMerchantWebhook(webhook.id, { active: e.target.checked }),
                  e.target.checked ? "Webhook enabled" : "Webhook disabled"
                )
              }
            />
            Enabled
          </label>
          <button
            type="button"
            disabled={pending}
            className="text-violet-700 hover:underline"
            onClick={() =>
              void run(async () => {
                setTestResult(await api.testMerchantWebhook(webhook.id));
                await qc.invalidateQueries({ queryKey: deliveriesKey });
              }, "Test event sent")
            }
          >
            Send test
          </button>
          <button
            type="button"
            className="text-zinc-700 hover:underline"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide deliveries" : "Deliveries"}
          </button>
          <button
            type="button"
            className="text-red-600 hover:underline"
            onClick={() => void run(() => api.deleteMerchantWebhook(webhook.id), "Deleted")}
          >
            Remove
          </button>
        </div>
      </div>

      {test ? (
        <p className={`text-xs ${test.ok ? "text-emerald-700" : "text-red-700"}`}>
          Test: {test.text}
        </p>
      ) : null}

      {open ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-100">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No deliveries yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 text-left text-[11px] uppercase text-zinc-500">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Attempts</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Next retry</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{d.event}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DELIVERY_STATUS_CLASS[d.status] ?? "bg-zinc-100 text-zinc-600"}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{d.attempts}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-zinc-600" title={d.lastError ?? undefined}>
                      {d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : (d.lastError ?? "—")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                      {d.status === "PENDING" && d.nextAttemptAt
                        ? new Date(d.nextAttemptAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        className="text-violet-700 hover:underline"
                        onClick={() =>
                          void run(async () => {
                            await api.redeliverWebhookDelivery(d.id);
                            await qc.invalidateQueries({ queryKey: deliveriesKey });
                          }, "Redelivery attempted")
                        }
                      >
                        Redeliver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </li>
  );
}

export default function GrowthPage() {
  const { ta, c } = useAdminT();
  const { tenant } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [alert, setAlert] = useState<{ ok?: boolean; message?: string }>({});
  const [pending, setPending] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [utmBase, setUtmBase] = useState("");
  const [utmSource, setUtmSource] = useState("newsletter");
  const [utmMedium, setUtmMedium] = useState("email");
  const [utmCampaign, setUtmCampaign] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["growth"],
    queryFn: () => api.growth(),
  });

  async function run(fn: () => Promise<unknown>, msg: string) {
    setPending(true);
    try {
      await fn();
      setAlert({ ok: true, message: msg });
      await qc.invalidateQueries({ queryKey: ["growth"] });
    } catch (e) {
      setAlert({
        ok: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <p className="text-zinc-500">{c.loading}</p>;

  const settings = (data?.settings ?? {}) as GrowthSettingsDto;
  const integrations = (settings.integrations ?? {}) as Record<string, unknown>;
  const upsell = (settings.postCheckoutUpsell ?? {}) as {
    enabled?: boolean;
    headline?: string;
    productIds?: string[];
  };
  const giftCards = (data?.giftCards ?? []) as Array<Record<string, unknown>>;
  const bundles = (data?.bundles ?? []) as Array<Record<string, unknown>>;
  const warehouses = (data?.warehouses ?? []) as Array<Record<string, unknown>>;
  const webhooks = (data?.webhooks ?? []) as WebhookRecord[];
  const apiKeys = (data?.apiKeys ?? []) as Array<Record<string, unknown>>;
  const products = (data?.products ?? []) as Array<{
    id: string;
    title: string;
    subscriptionEnabled?: boolean;
    subscriptionInterval?: string | null;
  }>;
  const seo = (data?.seo ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{ta("growthPage.title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{ta("growthPage.description")}</p>
        <p className="mt-1 text-sm text-zinc-500">
          Gift cards, bundles, SEO, tax, integrations, webhooks, warehouses, subscriptions.
        </p>
      </div>

      <FormAlert ok={alert.ok} message={alert.message} />

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "affiliates" && tenant ? (
        <AffiliatesPanel tenantSlug={tenant.slug} />
      ) : null}

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 p-5">
            <h2 className="font-semibold">Pop-ups & banners</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Exit-intent, promo banner, countdown — in the site builder (discount popup block).
            </p>
            <Link to="/storefront" className="mt-3 inline-block text-sm font-medium text-violet-700">
              Open storefront editor →
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-200 p-5">
            <h2 className="font-semibold">Live chat</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Crisp, Tawk.to, or custom snippet in theme settings.
            </p>
            <Link to="/storefront" className="mt-3 inline-block text-sm font-medium text-violet-700">
              Configure live chat →
            </Link>
          </div>
        </div>
      )}

      {tab === "gift-cards" && (
        <div className="space-y-6">
          <form
            className="rounded-xl border border-zinc-200 p-5 space-y-3 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(
                () =>
                  api.createGiftCard({
                    code: fd.get("code") || undefined,
                    balance: fd.get("balance"),
                    recipientEmail: fd.get("email") || undefined,
                    note: fd.get("note") || undefined,
                  }),
                "Gift card created"
              );
              (e.target as HTMLFormElement).reset();
            }}
          >
            <h2 className="font-semibold">New gift card</h2>
            <input name="code" placeholder="Code (auto if empty)" className="ugclab-input w-full" />
            <input name="balance" type="number" step="0.01" required placeholder="Balance" className="ugclab-input w-full" />
            <input name="email" type="email" placeholder="Recipient email" className="ugclab-input w-full" />
            <input name="note" placeholder="Note" className="ugclab-input w-full" />
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Create
            </button>
          </form>
          <ul className="divide-y rounded-xl border border-zinc-200">
            {giftCards.map((g) => (
              <li
                key={String(g.id)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="font-mono font-medium">{String(g.code)}</span>
                <span>
                  {(Number(g.balanceCents) / 100).toFixed(2)} {String(g.currency)}
                  {!g.active ? " · inactive" : ""}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  className="ugclab-btn border border-zinc-200 bg-white text-xs"
                  onClick={() => {
                    const raw = window.prompt("Reload amount (e.g. 25.00)");
                    if (raw == null || !raw.trim()) return;
                    const amountCents = Math.round(Number(raw) * 100);
                    if (!(amountCents > 0)) {
                      setAlert({ ok: false, message: "Enter a positive amount" });
                      return;
                    }
                    void run(
                      () => api.reloadGiftCard(String(g.id), amountCents),
                      "Gift card reloaded"
                    );
                  }}
                >
                  Reload
                </button>
              </li>
            ))}
            {!giftCards.length ? (
              <li className="px-4 py-6 text-zinc-500">No gift cards yet.</li>
            ) : null}
          </ul>
          <p className="text-xs text-zinc-500">
            To sell a product as a gift card, enable “Sell as gift card” under the
            product’s selling options.
          </p>
        </div>
      )}

      {tab === "bundles" && (
        <div className="space-y-6">
          <form
            className="rounded-xl border border-zinc-200 p-5 space-y-3 max-w-lg"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const productIds = String(fd.get("productIds") ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              void run(
                () =>
                  api.createBundle({
                    title: fd.get("title"),
                    slug: fd.get("slug"),
                    price: fd.get("price"),
                    description: fd.get("description"),
                    productIds,
                  }),
                "Bundle created"
              );
            }}
          >
            <h2 className="font-semibold">New bundle</h2>
            <input name="title" required placeholder="Title" className="ugclab-input w-full" />
            <input name="slug" placeholder="slug" className="ugclab-input w-full" />
            <input name="price" type="number" step="0.01" required className="ugclab-input w-full" />
            <textarea
              name="productIds"
              required
              placeholder="Product IDs, comma-separated"
              className="ugclab-input w-full min-h-[80px]"
            />
            <textarea name="description" placeholder="Description" className="ugclab-input w-full" />
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Create bundle
            </button>
          </form>
          <ul className="space-y-2">
            {bundles.map((b) => (
              <li key={String(b.id)} className="rounded-lg border border-zinc-200 px-4 py-3 text-sm">
                <span className="font-medium">{String(b.title)}</span>
                <span className="text-zinc-500"> · {(Number(b.priceAmount) / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "upsell" && (
        <form
          className="max-w-lg space-y-4 rounded-xl border border-zinc-200 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const productIds = String(fd.get("productIds") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            void run(
              () =>
                api.patchGrowthSettings({
                  postCheckoutUpsell: {
                    enabled: fd.get("enabled") === "on",
                    headline: fd.get("headline"),
                    productIds,
                  },
                }),
              "Upsell saved"
            );
          }}
        >
          <h2 className="font-semibold">After payment</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={upsell.enabled} />
            Show related products on thank-you page
          </label>
          <input
            name="headline"
            defaultValue={upsell.headline ?? ""}
            placeholder="Headline"
            className="ugclab-input w-full"
          />
          <textarea
            name="productIds"
            defaultValue={(upsell.productIds ?? []).join(", ")}
            placeholder="Product IDs (comma-separated)"
            className="ugclab-input w-full min-h-[80px]"
          />
          <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
            Save
          </button>
        </form>
      )}

      {tab === "seo" && (
        <SeoHub
          seo={seo}
          settings={settings}
          pending={pending}
          run={run}
        />
      )}

      {tab === "tax" && (
        <form
          className="max-w-md space-y-4 rounded-xl border border-zinc-200 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              () =>
                api.patchGrowthSettings({
                  taxRateBps: Math.round(parseFloat(String(fd.get("taxPercent") ?? "0")) * 100),
                  taxIncluded: fd.get("taxIncluded") === "on",
                  stripeTaxEnabled: fd.get("stripeTax") === "on",
                }),
              "Tax settings saved"
            );
          }}
        >
          <h2 className="font-semibold">Tax / VAT</h2>
          <p className="text-sm text-zinc-500">
            Prefer{" "}
            <a href="/settings?tab=tax" className="text-violet-600 underline">
              Settings → Tax
            </a>{" "}
            (and Markets for country rates). Changes here sync the same store settings.
          </p>
          <input
            name="taxPercent"
            type="number"
            step="0.01"
            defaultValue={Number(settings.taxRateBps ?? 0) / 100}
            className="ugclab-input w-full"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="taxIncluded" defaultChecked={!!settings.taxIncluded} />
            Prices include tax
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="stripeTax"
              defaultChecked={!!settings.stripeTaxEnabled}
            />
            Use Stripe Tax at checkout (when Stripe is connected)
          </label>
          <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
            Save
          </button>
        </form>
      )}

      {tab === "integrations" && (
        <div className="space-y-6">
          <form
            className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(
                () =>
                  api.patchGrowthSettings({
                    integrations: {
                      metaPixelId: fd.get("metaPixelId"),
                      metaCapiAccessToken: fd.get("metaCapiAccessToken"),
                      gaMeasurementId: fd.get("gaMeasurementId"),
                      tiktokPixelId: fd.get("tiktokPixelId"),
                      tiktokAccessToken: fd.get("tiktokAccessToken"),
                      gtmId: fd.get("gtmId"),
                      aiCatalogEnabled: fd.get("aiCatalogEnabled") === "on",
                      productFeedsEnabled: fd.get("productFeedsEnabled") === "on",
                    },
                  }),
                "Integrations saved"
              );
            }}
          >
            <h2 className="text-base font-semibold text-zinc-900">
              Tracking pixels
            </h2>
            <input
              name="metaPixelId"
              defaultValue={String(integrations.metaPixelId ?? "")}
              placeholder="Meta Pixel ID"
              className="ugclab-input w-full"
            />
            <input
              name="metaCapiAccessToken"
              type="password"
              autoComplete="off"
              defaultValue={String(integrations.metaCapiAccessToken ?? "")}
              placeholder="Meta Conversions API access token"
              className="ugclab-input w-full"
            />
            <input
              name="gaMeasurementId"
              defaultValue={String(integrations.gaMeasurementId ?? "")}
              placeholder="Google Analytics (G-…)"
              className="ugclab-input w-full"
            />
            <input
              name="tiktokPixelId"
              defaultValue={String(integrations.tiktokPixelId ?? "")}
              placeholder="TikTok Pixel ID"
              className="ugclab-input w-full"
            />
            <input
              name="tiktokAccessToken"
              type="password"
              autoComplete="off"
              defaultValue={String(integrations.tiktokAccessToken ?? "")}
              placeholder="TikTok Events API access token"
              className="ugclab-input w-full"
            />
            <input
              name="gtmId"
              defaultValue={String(integrations.gtmId ?? "")}
              placeholder="Google Tag Manager ID"
              className="ugclab-input w-full"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="aiCatalogEnabled"
                defaultChecked={integrations.aiCatalogEnabled === true}
              />
              Enable public AI catalog feed (
              <code className="text-xs">/api/store/ai-catalog</code>)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="productFeedsEnabled"
                defaultChecked={integrations.productFeedsEnabled === true}
              />
              Enable Google / Meta / TikTok product feeds
            </label>
            {integrations.productFeedsEnabled === true && tenant?.slug ? (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1.5 break-all">
                <p className="font-medium text-zinc-800">Feed URLs (add in ads manager)</p>
                <p>
                  Google:{" "}
                  <code>
                    /api/store/feeds/google-merchant.xml?tenant={tenant.slug}
                  </code>
                </p>
                <p>
                  Meta:{" "}
                  <code>
                    /api/store/feeds/meta-catalog.csv?tenant={tenant.slug}
                  </code>
                </p>
                <p>
                  TikTok:{" "}
                  <code>
                    /api/store/feeds/tiktok-catalog.csv?tenant={tenant.slug}
                  </code>
                </p>
              </div>
            ) : null}
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Save
            </button>
          </form>

          <form
            className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const prev = (integrations.twilio && typeof integrations.twilio === "object"
                ? integrations.twilio
                : {}) as Record<string, unknown>;
              void run(
                () =>
                  api.patchGrowthSettings({
                    integrations: {
                      ...integrations,
                      twilio: {
                        ...prev,
                        accountSid: String(fd.get("twilioSid") ?? ""),
                        authToken: String(fd.get("twilioToken") ?? "") || prev.authToken,
                        fromSms: String(fd.get("fromSms") ?? ""),
                        fromWhatsapp: String(fd.get("fromWhatsapp") ?? ""),
                        merchantPhone: String(fd.get("merchantPhone") ?? ""),
                        notifyOrders: fd.get("twilioNotify") === "on",
                      },
                    },
                  }),
                "SMS / WhatsApp saved"
              );
            }}
          >
            <h2 className="text-base font-semibold text-zinc-900">SMS / WhatsApp (Twilio)</h2>
            <p className="text-sm text-zinc-500">
              Order alerts to your phone. Leave token blank to keep the current secret.
            </p>
            <input name="twilioSid" placeholder="Account SID" defaultValue={String((integrations.twilio as { accountSid?: string } | undefined)?.accountSid ?? "")} className="ugclab-input w-full" />
            <input name="twilioToken" type="password" autoComplete="off" placeholder="Auth token" className="ugclab-input w-full" />
            <input name="fromSms" placeholder="From SMS (+…)" defaultValue={String((integrations.twilio as { fromSms?: string } | undefined)?.fromSms ?? "")} className="ugclab-input w-full" />
            <input name="fromWhatsapp" placeholder="From WhatsApp (+…)" defaultValue={String((integrations.twilio as { fromWhatsapp?: string } | undefined)?.fromWhatsapp ?? "")} className="ugclab-input w-full" />
            <input name="merchantPhone" placeholder="Your phone (+…)" defaultValue={String((integrations.twilio as { merchantPhone?: string } | undefined)?.merchantPhone ?? "")} className="ugclab-input w-full" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="twilioNotify" defaultChecked={(integrations.twilio as { notifyOrders?: boolean } | undefined)?.notifyOrders === true} />
              Notify on new paid orders
            </label>
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Save messaging
            </button>
          </form>

          <form
            className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const prev = (integrations.wise && typeof integrations.wise === "object"
                ? integrations.wise
                : {}) as Record<string, unknown>;
              void run(
                () =>
                  api.patchGrowthSettings({
                    integrations: {
                      ...integrations,
                      wise: {
                        ...prev,
                        apiToken: String(fd.get("wiseToken") ?? "") || prev.apiToken,
                        profileId: String(fd.get("wiseProfile") ?? ""),
                        recipientEmail: String(fd.get("wiseEmail") ?? ""),
                        currency: String(fd.get("wiseCurrency") ?? "USD"),
                        autoPayout: fd.get("wiseAuto") === "on",
                      },
                    },
                  }),
                "Wise settings saved"
              );
            }}
          >
            <h2 className="text-base font-semibold text-zinc-900">Wise payouts</h2>
            <p className="text-sm text-zinc-500">
              Used when platform ops approve a MoR payout. Requires a Wise API token.
            </p>
            <input name="wiseToken" type="password" autoComplete="off" placeholder="API token" className="ugclab-input w-full" />
            <input name="wiseProfile" placeholder="Profile ID" defaultValue={String((integrations.wise as { profileId?: string } | undefined)?.profileId ?? "")} className="ugclab-input w-full" />
            <input name="wiseEmail" type="email" placeholder="Recipient email" defaultValue={String((integrations.wise as { recipientEmail?: string } | undefined)?.recipientEmail ?? "")} className="ugclab-input w-full" />
            <input name="wiseCurrency" placeholder="Currency" defaultValue={String((integrations.wise as { currency?: string } | undefined)?.currency ?? "USD")} className="ugclab-input w-full" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="wiseAuto" defaultChecked={(integrations.wise as { autoPayout?: boolean } | undefined)?.autoPayout === true} />
              Try auto-transfer when payout is approved
            </label>
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Save Wise
            </button>
          </form>

          <form
            className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(
                () =>
                  api.patchGrowthSettings({
                    loyaltyEnabled: fd.get("loyaltyEnabled") === "on",
                    loyaltyEarnPerMajor: Number(fd.get("earn") ?? 1) || 1,
                    loyaltyRedeemCentsPerPoint: Number(fd.get("redeem") ?? 1) || 1,
                  }),
                "Loyalty saved"
              );
            }}
          >
            <h2 className="text-base font-semibold text-zinc-900">Loyalty points</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="loyaltyEnabled" defaultChecked={Boolean(settings.loyaltyEnabled)} />
              Enable loyalty program
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Points earned per 1.00 spent
              <input name="earn" type="number" min={0} defaultValue={Number(settings.loyaltyEarnPerMajor ?? 1)} className="ugclab-input mt-1 w-full" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Cents value per redeemed point
              <input name="redeem" type="number" min={0} defaultValue={Number(settings.loyaltyRedeemCentsPerPoint ?? 1)} className="ugclab-input mt-1 w-full" />
            </label>
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Save loyalty
            </button>
          </form>

          <CheckoutOptionsForm settings={settings} pending={pending} run={run} />

          <div className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5">
            <h2 className="text-base font-semibold text-zinc-900">UTM link generator</h2>
            <p className="text-sm text-zinc-500">
              Build campaign URLs with standard UTM parameters for ads and email.
            </p>
            <input
              value={utmBase}
              onChange={(e) => setUtmBase(e.target.value)}
              placeholder="Base URL (e.g. https://yourstore.com/?tenant=slug)"
              className="ugclab-input w-full"
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="utm_source"
                className="ugclab-input w-full"
              />
              <input
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="utm_medium"
                className="ugclab-input w-full"
              />
              <input
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="utm_campaign"
                className="ugclab-input w-full"
              />
            </div>
            {(() => {
              let url = "";
              try {
                if (utmBase.trim()) {
                  const u = new URL(utmBase.trim());
                  if (utmSource.trim()) u.searchParams.set("utm_source", utmSource.trim());
                  if (utmMedium.trim()) u.searchParams.set("utm_medium", utmMedium.trim());
                  if (utmCampaign.trim()) u.searchParams.set("utm_campaign", utmCampaign.trim());
                  url = u.toString();
                }
              } catch {
                url = "";
              }
              return (
                <>
                  <input
                    readOnly
                    value={url}
                    placeholder="Generated URL"
                    className="ugclab-input w-full font-mono text-xs"
                  />
                  <button
                    type="button"
                    disabled={!url}
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(url);
                      setAlert({ ok: true, message: "UTM link copied" });
                    }}
                  >
                    Copy URL
                  </button>
                </>
              );
            })()}
          </div>

          <TelegramBotPanel />
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-6 max-w-xl">
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-950">
            <p className="font-semibold">Public Admin API</p>
            <p className="mt-1 text-violet-900/90">
              Use a key as <code className="text-xs">Authorization: Bearer ugc_…</code> against{" "}
              <code className="text-xs">/api/v1</code> —{" "}
              <code className="text-xs">GET /products</code>,{" "}
              <code className="text-xs">GET /orders</code>. OpenAPI:{" "}
              <code className="text-xs">/api/v1/openapi.json</code>.
            </p>
          </div>
          <form
            className="rounded-xl border border-zinc-200 p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(async () => {
                const res = (await api.createMerchantWebhook({
                  url: fd.get("url"),
                  events: ["order.paid", "product.updated"],
                })) as { webhook?: { secret?: string } };
                if (res.webhook?.secret) setWebhookSecret(res.webhook.secret);
              }, "Webhook created");
            }}
          >
            <input name="url" required placeholder="https://…" className="ugclab-input w-full" />
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Add webhook
            </button>
            <p className="text-xs text-zinc-500">
              Retries: 1m, 5m, 30m, 2h, 12h. Signature header{" "}
              <code className="text-[11px]">X-UGCLab-Signature: sha256=HMAC(body, secret)</code>.
            </p>
          </form>
          {webhookSecret ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm font-mono break-all">
              Secret (copy now): {webhookSecret}
            </p>
          ) : null}
          <form
            className="rounded-xl border border-zinc-200 p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(async () => {
                const res = await api.createMerchantApiKey(String(fd.get("name") ?? "API"));
                setApiSecret(res.secret);
              }, "API key created");
            }}
          >
            <input name="name" placeholder="Key name" className="ugclab-input w-full" />
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Create API key
            </button>
          </form>
          {apiSecret ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm font-mono break-all">
              Key: {apiSecret}
            </p>
          ) : null}
          <ul className="text-sm divide-y rounded-xl border">
            {webhooks.map((w) => (
              <WebhookRow key={w.id} webhook={w} pending={pending} run={run} />
            ))}
            {apiKeys.map((k) => (
              <li key={String(k.id)} className="px-4 py-2 text-zinc-600">
                {String(k.name)} ({String(k.keyPrefix)}…)
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Events: order.paid, product.updated, order.created. Header: X-UGCLab-Signature (HMAC SHA256).
          </p>
        </div>
      )}

      {tab === "warehouses" && (
        <div className="space-y-4 max-w-lg">
          <form
            className="rounded-xl border border-zinc-200 p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(
                () =>
                  api.createWarehouse({
                    name: fd.get("name"),
                    isDefault: fd.get("isDefault") === "on",
                  }),
                "Warehouse created"
              );
            }}
          >
            <input name="name" required placeholder="Warehouse name" className="ugclab-input w-full" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" />
              Default warehouse (deduct stock on orders)
            </label>
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Add warehouse
            </button>
          </form>
          <ul className="space-y-4">
            {warehouses.map((w) => (
              <li key={String(w.id)} className="rounded-xl border border-zinc-200 p-4 space-y-3 text-sm">
                <p className="font-medium">
                  {String(w.name)}
                  {w.isDefault ? " (default)" : ""} ·{" "}
                  {Array.isArray(w.stock) ? w.stock.length : 0} SKUs
                  {w.pickupEnabled ? " · pickup on" : ""}
                </p>
                <form
                  className="grid gap-2 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    void run(
                      () =>
                        api.patchWarehousePickup(String(w.id), {
                          pickupEnabled: fd.get("pickupEnabled") === "on",
                          pickupInstructions:
                            String(fd.get("pickupInstructions") ?? "") || null,
                          address1: String(fd.get("address1") ?? "") || null,
                          address2: String(fd.get("address2") ?? "") || null,
                          city: String(fd.get("city") ?? "") || null,
                          postal: String(fd.get("postal") ?? "") || null,
                          country: String(fd.get("country") ?? "") || null,
                          phone: String(fd.get("phone") ?? "") || null,
                        }),
                      "Pickup settings saved"
                    );
                  }}
                >
                  <label className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      name="pickupEnabled"
                      defaultChecked={!!w.pickupEnabled}
                    />
                    Enable store pickup (BOPIS)
                  </label>
                  <input
                    name="address1"
                    placeholder="Address line 1"
                    defaultValue={String(w.address1 ?? "")}
                    className="ugclab-input"
                  />
                  <input
                    name="address2"
                    placeholder="Address line 2"
                    defaultValue={String(w.address2 ?? "")}
                    className="ugclab-input"
                  />
                  <input
                    name="city"
                    placeholder="City"
                    defaultValue={String(w.city ?? "")}
                    className="ugclab-input"
                  />
                  <input
                    name="postal"
                    placeholder="Postal"
                    defaultValue={String(w.postal ?? "")}
                    className="ugclab-input"
                  />
                  <input
                    name="country"
                    placeholder="Country (US)"
                    defaultValue={String(w.country ?? "")}
                    className="ugclab-input"
                    maxLength={2}
                  />
                  <input
                    name="phone"
                    placeholder="Phone"
                    defaultValue={String(w.phone ?? "")}
                    className="ugclab-input"
                  />
                  <textarea
                    name="pickupInstructions"
                    placeholder="Pickup instructions"
                    defaultValue={String(w.pickupInstructions ?? "")}
                    className="ugclab-input sm:col-span-2"
                    rows={2}
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="ugclab-btn border border-zinc-200 bg-white text-xs sm:col-span-2"
                  >
                    Save pickup
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm text-zinc-600">
            Mark products for recurring billing. Stripe subscription checkout is live.
          </p>
          <ul className="divide-y rounded-xl border text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>{p.title}</span>
                <select
                  className="ugclab-select text-xs"
                  defaultValue={
                    p.subscriptionEnabled ? p.subscriptionInterval ?? "month" : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    void run(
                      () =>
                        api.patchProductSubscription(p.id, {
                          subscriptionEnabled: !!v,
                          subscriptionInterval: v || null,
                        }),
                      "Updated"
                    );
                  }}
                >
                  <option value="">One-time</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SeoHub({
  seo,
  settings,
  pending,
  run,
}: {
  seo: Record<string, unknown>;
  settings: GrowthSettingsDto;
  pending: boolean;
  run: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const auditQ = useQuery({
    queryKey: ["growth-seo-audit"],
    queryFn: () => api.growthSeoAudit(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 p-5 text-sm">
        <p>
          <strong>Store:</strong> {String(seo.storeTitle ?? "")}
        </p>
        <p className="mt-1 text-zinc-600">
          Active products: {String(seo.activeProducts ?? 0)} · Sitemap:{" "}
          {String(seo.sitemapHint ?? "")}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">SEO check</h2>
          <button
            type="button"
            className="ugclab-btn border border-zinc-200 bg-white text-sm"
            disabled={auditQ.isFetching}
            onClick={() => void auditQ.refetch()}
          >
            {auditQ.isFetching ? "Checking…" : "Re-run check"}
          </button>
        </div>
        {auditQ.data ? (
          <>
            <p className="mt-3 text-3xl font-bold text-zinc-900">
              {auditQ.data.grade}{" "}
              <span className="text-base font-medium text-zinc-500">
                {auditQ.data.score}/{auditQ.data.maxScore}
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {auditQ.data.checks.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-lg px-3 py-2 ${c.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}
                >
                  {c.ok ? "✓" : "!"} {c.message}
                </li>
              ))}
            </ul>
          </>
        ) : auditQ.isError ? (
          <p className="mt-3 text-sm text-red-600">Could not load SEO audit.</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">Loading score…</p>
        )}
      </div>

      <form
        className="max-w-lg space-y-3 rounded-xl border border-zinc-200 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void run(
            () =>
              api.patchGrowthSettings({
                seoTitle: fd.get("seoTitle"),
                seoDescription: fd.get("seoDescription"),
              }),
            "Store SEO saved"
          );
        }}
      >
        <input
          name="seoTitle"
          defaultValue={String(settings.seoTitle ?? "")}
          placeholder="Default meta title"
          className="ugclab-input w-full"
        />
        <textarea
          name="seoDescription"
          defaultValue={String(settings.seoDescription ?? "")}
          placeholder="Default meta description"
          className="ugclab-input w-full min-h-[80px]"
        />
        <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
          Save store SEO
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        Per-product SEO: edit on each product. Webhooks for Zapier/Make: Growth → Webhooks
        (order.*, product.*, customer.created, subscription.updated).
      </p>
    </div>
  );
}
