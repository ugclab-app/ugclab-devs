import { useState } from "react";

export type VariantRow = {
  title: string;
  sku: string;
  price: string;
  inventory: string;
};

export function ProductVariantsEditor({
  initial,
  onChange,
}: {
  initial: VariantRow[];
  onChange: (json: string) => void;
}) {
  const [rows, setRows] = useState<VariantRow[]>(
    initial.length ? initial : []
  );

  function update(next: VariantRow[]) {
    setRows(next);
    onChange(JSON.stringify(next));
  }

  return (
    <section className="admin-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Variants</h2>
        <button
          type="button"
          onClick={() =>
            update([
              ...rows,
              { title: "", sku: "", price: "", inventory: "" },
            ])
          }
          className="text-sm font-semibold text-violet-600"
        >
          + Add variant
        </button>
      </div>
      <input type="hidden" name="variants" value={JSON.stringify(rows)} readOnly />
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Optional — e.g. Size S/M/L or Color Red/Blue. Leave empty for a single SKU.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-5"
            >
              <input
                placeholder="Title (e.g. M / Red)"
                value={row.title}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, title: e.target.value };
                  update(next);
                }}
                className="ugclab-input sm:col-span-2"
              />
              <input
                placeholder="SKU"
                value={row.sku}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, sku: e.target.value };
                  update(next);
                }}
                className="ugclab-input"
              />
              <input
                placeholder="Price"
                type="number"
                step="0.01"
                value={row.price}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, price: e.target.value };
                  update(next);
                }}
                className="ugclab-input"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Stock"
                  type="number"
                  value={row.inventory}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, inventory: e.target.value };
                    update(next);
                  }}
                  className="ugclab-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => update(rows.filter((_, j) => j !== i))}
                  className="text-red-600 text-sm px-2"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
