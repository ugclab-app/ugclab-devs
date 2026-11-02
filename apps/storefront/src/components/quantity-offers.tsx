import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatMoney, moneyLocaleFor } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

type Offer = { qty: number; label: string; priceCents: number };
type Variant = { id: string; title: string };

export function QuantityOffers({
  productId,
  offers,
  variants,
  currency,
  locale,
}: {
  productId: string;
  offers: Offer[];
  variants: Variant[];
  currency: string;
  locale: string;
}) {
  const { tenant } = useStoreParams();
  const qc = useQueryClient();
  const [active, setActive] = useState(0);
  const offer = offers[active] ?? offers[0];
  const [picks, setPicks] = useState<string[]>(() =>
    Array.from({ length: offer?.qty ?? 1 }, () => variants[0]?.id ?? "")
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!offer) return null;

  const slots = Array.from({ length: offer.qty }, (_, index) => picks[index] ?? variants[0]?.id ?? "");

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 p-4">
      <p className="text-sm font-semibold text-zinc-800">Choose a set</p>
      <div className="grid gap-2">
        {offers.map((row, index) => (
          <button
            key={`${row.qty}-${row.priceCents}`}
            type="button"
            onClick={() => {
              setActive(index);
              setPicks((prev) =>
                Array.from({ length: row.qty }, (_, slot) => prev[slot] ?? variants[0]?.id ?? "")
              );
            }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
              index === active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
            }`}
          >
            <span className="font-medium">{row.label || `${row.qty}`}</span>
            <span>{formatMoney(row.priceCents, currency, moneyLocaleFor(currency, locale))}</span>
          </button>
        ))}
      </div>
      {variants.length > 0 ? (
        <div className="space-y-2">
          {slots.map((value, index) => (
            <label key={index} className="block text-sm">
              <span className="text-xs text-zinc-500">Item {index + 1}</span>
              <select
                value={value}
                onChange={(e) =>
                  setPicks((prev) => {
                    const next = [...slots];
                    next[index] = e.target.value;
                    return next;
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        className="store-btn-primary w-full disabled:opacity-50"
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await storeApi.addOffer(tenant, {
              productId,
              offerQty: offer.qty,
              picks: slots,
            });
            await qc.invalidateQueries({ queryKey: ["cart", tenant] });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add the set.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Adding…" : "Add set to cart"}
      </button>
    </div>
  );
}
