import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
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

  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const integrations = (settings.integrations ?? {}) as Record<string, string | boolean>;
  const upsell = (settings.postCheckoutUpsell ?? {}) as {
    enabled?: boolean;
    headline?: string;
    productIds?: string[];
  };
  const giftCards = (data?.giftCards ?? []) as Array<Record<string, unknown>>;
  const bundles = (data?.bundles ?? []) as Array<Record<string, unknown>>;
  const warehouses = (data?.warehouses ?? []) as Array<Record<string, unknown>>;
  const webhooks = (data?.webhooks ?? []) as Array<Record<string, unknown>>;
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
            Per-product SEO: edit on each product, or use bulk in Products → edit.
          </p>
        </div>
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
            <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary">
              Save
            </button>
          </form>

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
              <code className="text-xs">GET /orders</code>.
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
              <li key={String(w.id)} className="px-4 py-2 flex justify-between gap-2">
                <span className="truncate">{String(w.url)}</span>
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() =>
                    void run(() => api.deleteMerchantWebhook(String(w.id)), "Deleted")
                  }
                >
                  Remove
                </button>
              </li>
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
