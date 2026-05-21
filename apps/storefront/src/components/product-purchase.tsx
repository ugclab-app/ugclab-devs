import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

type Variant = {
  id: string;
  title: string;
  inventory: number | null;
};

export function ProductPurchase({
  productId,
  priceLabel,
  variants,
  productInventory,
  type,
}: {
  productId: string;
  priceLabel: string;
  variants: Variant[];
  productInventory: number | null;
  type: string;
}) {
  const { tenant } = useStoreParams();
  const qc = useQueryClient();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  const isPhysical = type === "PHYSICAL";
  const soldOut = isPhysical && productInventory != null && productInventory <= 0;

  const add = useMutation({
    mutationFn: () =>
      storeApi.addToCart(tenant, {
        productId,
        variantId: variantId || undefined,
        quantity: 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-context"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  return (
    <div className="mt-8 space-y-4">
      <p className="text-2xl font-bold">{priceLabel}</p>
      {isPhysical && productInventory != null && productInventory <= 5 && productInventory > 0 ? (
        <p className="text-sm text-amber-700">Only {productInventory} left in stock</p>
      ) : null}
      <div className="space-y-3">
        {variants.length > 0 ? (
          <div>
            <label className="text-sm font-medium text-zinc-700">Option</label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.inventory != null ? ` (${v.inventory} left)` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button
          type="button"
          disabled={soldOut || pending}
          className="store-btn-primary w-full disabled:opacity-50"
          onClick={async () => {
            setPending(true);
            try {
              await add.mutateAsync();
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Adding…" : soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
