import { Link, useNavigate } from "react-router-dom";
import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  bulkUpdateProductStatus,
  duplicateProduct,
} from "@/api/client";
import { ProductStatusBadge } from "@/components/status-badge";
import type { ProductStatus, ProductType } from "@/lib/database-types";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  type: ProductType;
  status: ProductStatus;
  priceLabel: string;
  compareLabel?: string;
  thumbUrl?: string | null;
  inventory?: number | null;
};

function storefrontProductUrl(base: string, slug: string) {
  try {
    const url = new URL(base);
    url.pathname = `/products/${slug}`;
    return url.toString();
  } catch {
    return null;
  }
}

export function ProductsTable({
  products,
  storefrontBase = "",
  collections = [],
}: {
  products: ProductRow[];
  storefrontBase?: string;
  collections?: { id: string; title: string }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    });
  }

  function runDuplicate(id: string) {
    startTransition(async () => {
      await duplicateProduct(id);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    });
  }

  function runBulkDelete() {
    const ids = [...selected];
    if (!ids.length || !confirm(`Delete ${ids.length} products?`)) return;
    startTransition(async () => {
      await api.bulkProductDelete(ids);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    });
  }

  function runBulkCollection() {
    const ids = [...selected];
    if (!ids.length || !collections.length) return;
    const pick = window.prompt(
      `Collection ID (one of):\n${collections.map((c) => `${c.id}: ${c.title}`).join("\n")}`
    );
    if (!pick) return;
    startTransition(async () => {
      await api.bulkProductCollections(ids, [pick.trim()], "add");
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["products"] });
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
          {collections.length > 0 ? (
            <button
              type="button"
              onClick={runBulkCollection}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Add to collection
            </button>
          ) : null}
          <button
            type="button"
            onClick={runBulkDelete}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            Delete
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
              <th className="w-28 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((p) => {
              const preview = storefrontBase
                ? storefrontProductUrl(storefrontBase, p.slug)
                : null;
              return (
                <tr
                  key={p.id}
                  className="hover:bg-violet-50/30 cursor-pointer"
                  onClick={() => navigate(`/products/${p.id}/edit`)}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`Select ${p.title}`}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {p.thumbUrl ? (
                        <img
                          src={p.thumbUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                          —
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">{p.title}</p>
                        <p className="text-zinc-500">{p.slug}</p>
                        {p.inventory != null && p.inventory <= 5 ? (
                          <p className="text-xs font-medium text-red-600">
                            {p.inventory} in stock
                          </p>
                        ) : null}
                      </div>
                    </div>
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
                  <td
                    className="relative px-4 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenu(openMenu === p.id ? null : p.id)
                      }
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      ···
                    </button>
                    {openMenu === p.id ? (
                      <div className="absolute right-4 top-12 z-20 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        <Link
                          to={`/products/${p.id}/edit`}
                          className="block px-3 py-2 text-left text-sm hover:bg-violet-50"
                          onClick={() => setOpenMenu(null)}
                        >
                          Edit
                        </Link>
                        {preview ? (
                          <a
                            href={preview}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-3 py-2 text-left text-sm hover:bg-violet-50"
                            onClick={() => setOpenMenu(null)}
                          >
                            View on store
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                          onClick={() => {
                            setOpenMenu(null);
                            runDuplicate(p.id);
                          }}
                        >
                          Duplicate
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
