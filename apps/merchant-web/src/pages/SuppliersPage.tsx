import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";
import { FormAlert } from "@/components/form-alert";
import { useAdminT } from "@/hooks/use-admin-t";

type Hit = {
  externalProductId: string;
  externalVariantId: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  costCents: number | null;
  costCurrency: string;
  source: "shop" | "catalog";
  suggestedPriceCents: number | null;
};

type VariantOption = {
  externalVariantId: string;
  title: string;
  sku: string | null;
  costCents: number | null;
  inventory: number | null;
};

export default function SuppliersPage() {
  const { ta } = useAdminT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["suppliers"], queryFn: () => api.suppliers() });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["suppliers"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{ta("suppliersPage.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{ta("suppliersPage.description")}</p>
      </div>
      {error ? <FormAlert message={error} /> : null}
      {notice ? <FormAlert ok message={notice} /> : null}
      <button
        type="button"
        className="ugclab-btn border border-zinc-200 bg-white text-sm"
        onClick={async () => {
          setError(null);
          try {
            const res = await api.syncSupplierTracking();
            setNotice(`${ta("suppliersPage.sync")}: ${res.updated}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update tracking.");
          }
        }}
      >
        {ta("suppliersPage.sync")}
      </button>
      <button
        type="button"
        className="ugclab-btn border border-zinc-200 bg-white text-sm"
        onClick={async () => {
          setError(null);
          try {
            const res = await api.syncSupplierStock();
            setNotice(`Stock updated on ${res.updated} variants. Color and size names were shortened.`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update stock.");
          }
        }}
      >
        Update stock
      </button>
      {(q.data?.catalog ?? []).map((item) => {
        const account = q.data?.accounts.find((row) => row.provider === item.provider);
        return (
          <SupplierCard
            key={item.provider}
            provider={item.provider}
            available={item.available}
            note={item.note}
            account={account}
            currency={q.data?.currency ?? "USD"}
            onError={setError}
            onRefresh={refresh}
          />
        );
      })}
    </div>
  );
}

function SupplierCard({
  provider,
  available,
  note,
  account,
  currency,
  onError,
  onRefresh,
}: {
  provider: string;
  available: boolean;
  note: string;
    account?: { keyLast4: string; shopId: string | null; markupPercent?: number | null };
  currency: string;
  onError: (message: string | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const { ta } = useAdminT();
  const [apiKey, setApiKey] = useState("");
  const [markup, setMarkup] = useState(account?.markupPercent ? String(account.markupPercent) : "");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Record<string, VariantOption[]>>({});
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  async function connect() {
    setBusy(true);
    onError(null);
    try {
      await api.connectSupplier(provider, apiKey);
      setApiKey("");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{provider === "DSERS" ? ta("suppliersPage.dsers") : provider}</h2>
          <p className="mt-1 text-sm text-zinc-600">{note}</p>
        </div>
        {account ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {ta("suppliersPage.connected")} {account.keyLast4}
          </span>
        ) : null}
      </div>

      {available && !account ? (
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void connect();
          }}
        >
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={ta("suppliersPage.apiKey")}
            className="min-w-[16rem] flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button type="submit" disabled={busy} className="ugclab-btn ugclab-btn-primary text-sm">
            {ta("suppliersPage.connect")}
          </button>
        </form>
      ) : null}

      {account ? (
        <div className="mt-4 space-y-3">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              onError(null);
              try {
                const percent = markup.trim() === "" ? null : Number(markup);
                await api.setSupplierMarkup(provider, percent);
                await onRefresh();
              } catch (err) {
                onError(err instanceof Error ? err.message : "Could not save markup.");
              }
            }}
          >
            <label className="text-sm text-zinc-600">
              Markup %
              <input
                inputMode="numeric"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                placeholder="100"
                className="ml-2 w-24 rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <button type="submit" className="ugclab-btn border border-zinc-200 bg-white text-sm">
              Save markup
            </button>
            <span className="text-xs text-zinc-500">Selling price = supplier cost plus this percent.</span>
          </form>
          <button
            type="button"
            className="text-sm text-zinc-500 underline"
            onClick={async () => {
              await api.disconnectSupplier(provider);
              setHits([]);
              await onRefresh();
            }}
          >
            {ta("suppliersPage.disconnect")}
          </button>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              onError(null);
              try {
                const res = await api.searchSupplier(provider, query);
                setHits(res.products);
                setVariants({});
                setPicked({});
                setPrices((prev) => {
                  const next = { ...prev };
                  for (const hit of res.products) {
                    if (!next[hit.externalProductId] && hit.suggestedPriceCents != null) {
                      next[hit.externalProductId] = (hit.suggestedPriceCents / 100).toFixed(2);
                    }
                  }
                  return next;
                });
                if (res.products.length === 0) onError("No products found.");
              } catch (err) {
                onError(err instanceof Error ? err.message : "Search failed.");
              }
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={provider === "CJ" ? "hoodie" : "product name"}
              className="min-w-[16rem] flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button type="submit" className="ugclab-btn border border-zinc-200 bg-white text-sm">
              {ta("suppliersPage.search")}
            </button>
          </form>
          <ul className="space-y-3">
            {hits.map((hit) => (
              <li key={`${hit.source}-${hit.externalProductId}`} className="rounded-xl border border-zinc-100 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {hit.imageUrl ? (
                    <img src={hit.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-zinc-100" />
                  )}
                  <div className="min-w-[12rem] flex-1">
                    <p className="text-sm font-medium text-zinc-900">{hit.title}</p>
                    <p className="text-xs text-zinc-500">
                      <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                        {hit.source === "catalog" ? ta("suppliersPage.catalogBadge") : ta("suppliersPage.shopBadge")}
                      </span>
                      {ta("suppliersPage.cost")}:{" "}
                      {hit.costCents != null ? formatMoney(hit.costCents, hit.costCurrency) : "—"}
                      {currency !== "USD" && hit.suggestedPriceCents != null
                        ? ` · ${ta("suppliersPage.suggested")} ${formatMoney(hit.suggestedPriceCents, currency)}`
                        : ""}
                      {hit.sku ? ` · ${hit.sku}` : ""}
                    </p>
                    {hit.source === "catalog" && provider !== "CJ" ? (
                      <p className="mt-1 text-xs text-amber-700">{ta("suppliersPage.catalogHint")}</p>
                    ) : null}
                  </div>
                  <input
                    inputMode="decimal"
                    value={prices[hit.externalProductId] ?? ""}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, [hit.externalProductId]: e.target.value }))
                    }
                    placeholder={`${ta("suppliersPage.yourPrice")} (${currency})`}
                    className="w-36 rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    className="ugclab-btn border border-zinc-200 bg-white text-sm"
                    onClick={async () => {
                      onError(null);
                      try {
                        const res = await api.supplierVariants(provider, hit.externalProductId);
                        setVariants((prev) => ({ ...prev, [hit.externalProductId]: res.variants }));
                        setPicked((prev) => ({
                          ...prev,
                          [hit.externalProductId]: res.variants.map((variant) => variant.externalVariantId),
                        }));
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not load variants.");
                      }
                    }}
                  >
                    {ta("suppliersPage.showVariants")}
                  </button>
                  <button
                    type="button"
                    className="ugclab-btn ugclab-btn-primary text-sm"
                    onClick={async () => {
                      onError(null);
                      try {
                        const created = await api.importSupplierProduct(provider, {
                          externalProductId: hit.externalProductId,
                          externalVariantId: hit.externalVariantId,
                          title: hit.title,
                          imageUrl: hit.imageUrl,
                          sku: hit.sku,
                          costCents: hit.costCents,
                          price: Number(prices[hit.externalProductId]),
                          variantIds: picked[hit.externalProductId],
                        });
                        window.location.assign(`/products/${created.product.productId}/edit`);
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Import failed.");
                      }
                    }}
                  >
                    {ta("suppliersPage.import")}
                  </button>
                </div>
                {variants[hit.externalProductId]?.length ? (
                  <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
                    {variants[hit.externalProductId]!.map((variant) => {
                      const selected = (picked[hit.externalProductId] ?? []).includes(variant.externalVariantId);
                      return (
                        <li key={variant.externalVariantId} className="flex items-center gap-2 text-xs text-zinc-600">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              setPicked((prev) => {
                                const current = prev[hit.externalProductId] ?? [];
                                const next = e.target.checked
                                  ? [...current, variant.externalVariantId]
                                  : current.filter((id) => id !== variant.externalVariantId);
                                return { ...prev, [hit.externalProductId]: next };
                              });
                            }}
                          />
                          <span className="flex-1">{variant.title}</span>
                          <span>
                            {ta("suppliersPage.stock")}:{" "}
                            {variant.inventory == null ? ta("suppliersPage.madeToOrder") : variant.inventory}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
