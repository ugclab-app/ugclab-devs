import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMoney, moneyLocaleFor } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { trackAddToCart } from "@/lib/pixel-track";
import {
  buildVariantGroups,
  colorHex,
  matchVariant,
  splitVariantTitle,
  type VariantOption,
} from "@/lib/variant-options";
import { StockAlertForm } from "@/components/stock-alert-form";

type Variant = {
  id: string;
  title: string;
  inventory: number | null;
  priceAmount?: number;
};

export function ProductPurchase({
  productId,
  productTitle,
  priceAmount,
  currency,
  locale,
  variants,
  productInventory,
  type,
  subscriptionEnabled,
  subscriptionInterval,
}: {
  productId: string;
  productTitle?: string;
  priceAmount?: number;
  currency: string;
  locale: string;
  variants: Variant[];
  productInventory: number | null;
  type: string;
  subscriptionEnabled?: boolean;
  subscriptionInterval?: string | null;
}) {
  const { tenant } = useStoreParams();
  const ctx = useStore();
  const qc = useQueryClient();
  const options: VariantOption[] = variants.map((v) => ({
    id: v.id,
    title: v.title,
    priceAmount: v.priceAmount ?? priceAmount ?? 0,
    inventory: v.inventory,
    parts: splitVariantTitle(v.title),
  }));
  const groups = useMemo(() => buildVariantGroups(options), [options]);
  const [selected, setSelected] = useState<string[]>(
    groups.map((g) => g.values[0] ?? "")
  );
  const [variantId, setVariantId] = useState(options[0]?.id ?? "");
  const matched = groups.length
    ? matchVariant(options, selected) ?? options[0]
    : options.find((v) => v.id === variantId) ?? options[0];
  const [qty, setQty] = useState(1);
  const [subscribe, setSubscribe] = useState(false);
  const [pending, setPending] = useState(false);

  const isPhysical = type === "PHYSICAL";
  const stock = matched ? matched.inventory : productInventory;
  const soldOut = isPhysical && stock != null && stock <= 0;
  const unit = matched?.priceAmount ?? priceAmount ?? 0;
  const priceLabel = formatMoney(unit, currency, moneyLocaleFor(currency, locale));

  const add = useMutation({
    mutationFn: () =>
      storeApi.addToCart(tenant, {
        productId,
        variantId: matched?.id || undefined,
        quantity: qty,
        subscribe: subscriptionEnabled ? subscribe : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-context"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      trackAddToCart({
        id: productId,
        title: productTitle,
        priceAmount: unit,
        currency: ctx.currency,
        quantity: qty,
      });
    },
  });

  return (
    <div className="mt-8 space-y-4">
      <p className="text-2xl font-bold">{priceLabel}</p>
      {subscriptionEnabled ? (
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSubscribe(false)}
            className={`rounded-lg border px-3 py-2 ${
              !subscribe ? "border-[var(--store-primary)] bg-violet-50" : "border-zinc-200"
            }`}
          >
            Buy once
          </button>
          <button
            type="button"
            onClick={() => setSubscribe(true)}
            className={`rounded-lg border px-3 py-2 ${
              subscribe ? "border-[var(--store-primary)] bg-violet-50" : "border-zinc-200"
            }`}
          >
            Subscribe{subscriptionInterval ? ` · ${subscriptionInterval}` : ""}
          </button>
        </div>
      ) : null}
      {isPhysical && stock != null && stock <= 5 && stock > 0 ? (
        <p className="text-sm text-amber-700">Only {stock} left in stock</p>
      ) : null}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group, index) => (
            <div key={group.label}>
              <p className="text-sm font-medium text-zinc-700">
                {group.label}: <span className="font-normal">{selected[index]}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const active = selected[index] === value;
                  const hex = group.label === "Color" ? colorHex(value) : null;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = [...prev];
                          next[index] = value;
                          return next;
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                        active
                          ? "border-[var(--store-primary)] bg-violet-50"
                          : "border-zinc-200 bg-white"
                      }`}
                    >
                      {hex ? (
                        <span
                          className="h-4 w-4 rounded-full border border-zinc-300"
                          style={{ backgroundColor: hex }}
                        />
                      ) : null}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : options.length > 0 ? (
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Option</span>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
                {v.inventory != null ? ` (${v.inventory} left)` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {soldOut ? (
        <StockAlertForm
          tenant={tenant}
          productId={productId}
          variantId={matched?.id}
        />
      ) : (
        <div className="flex gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Qty</span>
            <input
              type="number"
              min={1}
              max={stock != null && stock > 0 ? stock : 99}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            className="store-btn-primary mt-6 flex-1 disabled:opacity-50"
            onClick={async () => {
              setPending(true);
              try {
                await add.mutateAsync();
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Adding…" : "Add to cart"}
          </button>
        </div>
      )}
    </div>
  );
}
