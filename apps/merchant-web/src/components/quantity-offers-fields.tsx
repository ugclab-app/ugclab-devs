import { useState } from "react";

export type QuantityOfferDraft = { qty: string; label: string; price: string };

export function QuantityOffersFields({
  initial,
  currency,
}: {
  initial?: { qty: number; label?: string; priceCents: number }[] | null;
  currency: string;
}) {
  const [rows, setRows] = useState<QuantityOfferDraft[]>(() => {
    const saved = (initial ?? [])
      .filter((row) => row.qty > 0 && row.priceCents > 0)
      .map((row) => ({
        qty: String(row.qty),
        label: row.label ?? "",
        price: (row.priceCents / 100).toFixed(2),
      }));
    return saved.length ? saved : [
      { qty: "1", label: "1 item", price: "" },
      { qty: "2", label: "2 items", price: "" },
      { qty: "3", label: "3 items", price: "" },
    ];
  });

  const payload = rows
    .map((row) => ({
      qty: Number(row.qty),
      label: row.label.trim(),
      priceCents: Math.round(Number(row.price) * 100),
    }))
    .filter((row) => row.qty >= 1 && row.priceCents > 0);

  return (
    <div className="space-y-2">
      <input type="hidden" name="quantityOffers" value={JSON.stringify(payload)} />
      <div>
        <p className="text-xs font-medium text-zinc-600">Quantity offers</p>
        <p className="text-xs text-zinc-500">
          1, 2, or 3 items for one price. The buyer picks a color for each item.
        </p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <input
            inputMode="numeric"
            value={row.qty}
            onChange={(e) =>
              setRows((prev) => prev.map((item, i) => (i === index ? { ...item, qty: e.target.value } : item)))
            }
            className="ugclab-input w-16"
            aria-label="Quantity"
          />
          <input
            value={row.label}
            onChange={(e) =>
              setRows((prev) => prev.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))
            }
            className="ugclab-input flex-1"
            placeholder="Label"
          />
          <input
            inputMode="decimal"
            value={row.price}
            onChange={(e) =>
              setRows((prev) => prev.map((item, i) => (i === index ? { ...item, price: e.target.value } : item)))
            }
            className="ugclab-input w-28"
            placeholder={currency}
          />
        </div>
      ))}
    </div>
  );
}
