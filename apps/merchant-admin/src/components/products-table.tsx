"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  bulkUpdateProductStatus,
  duplicateProduct,
} from "@/app/actions/products";
import { ProductStatusBadge } from "@/components/status-badge";
import type { ProductStatus, ProductType } from "@ugclab/database";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  type: ProductType;
  status: ProductStatus;
  priceLabel: string;
  compareLabel?: string;
};

export function ProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const allIds = products.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function runBulk(status: "ACTIVE" | "ARCHIVED") {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkUpdateProductStatus(ids, status);
      setSelected(new Set());
      router.refresh();
    });
  }

  function runDuplicate(id: string) {
    startTransition(async () => {
      await duplicateProduct(id);
      router.refresh();
    });
  }

  return (
    <div className={pending ? "opacity-70" : ""}>
      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <span className="text-sm font-medium text-violet-900">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => runBulk("ACTIVE")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => runBulk("ARCHIVED")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-violet-600 hover:underline"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-violet-50/30">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.title}`}
                  />
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-zinc-900">{p.title}</p>
                  <p className="text-zinc-500">{p.slug}</p>
                </td>
                <td className="px-4 py-4 text-zinc-600">{p.type}</td>
                <td className="px-4 py-4">
                  <ProductStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="font-medium text-zinc-900">{p.priceLabel}</p>
                  {p.compareLabel ? (
                    <p className="text-xs text-zinc-400 line-through">
                      {p.compareLabel}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => runDuplicate(p.id)}
                      className="text-sm font-medium text-zinc-500 hover:text-violet-600"
                      title="Duplicate"
                    >
                      Copy
                    </button>
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
