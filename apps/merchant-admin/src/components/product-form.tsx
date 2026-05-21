"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ProductActionState } from "@/app/actions/products";
import { FormAlert } from "@/components/form-alert";
import type { ProductStatus, ProductType } from "@ugclab/database";

export type ProductFormValues = {
  title: string;
  slug: string;
  description: string;
  type: ProductType;
  status: ProductStatus;
  price: string;
  compareAt: string;
  inventory: string;
  digitalFileName?: string | null;
  digitalFileSize?: number | null;
};

export function ProductForm({
  action,
  initial,
  submitLabel,
  currency,
}: {
  action: (
    prev: ProductActionState,
    formData: FormData
  ) => Promise<ProductActionState>;
  initial: ProductFormValues;
  submitLabel: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [type, setType] = useState<ProductType>(initial.type);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="admin-card mx-auto max-w-2xl space-y-6 p-6"
    >
      <FormAlert ok={state.ok} message={state.message} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Title</label>
          <input
            name="title"
            defaultValue={initial.title}
            required
            className="ugclab-input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">URL slug</label>
          <input
            name="slug"
            defaultValue={initial.slug}
            required
            className="ugclab-input mt-1.5 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Status</label>
          <select
            name="status"
            defaultValue={initial.status}
            className="ugclab-select mt-1.5"
          >
            <option value="DRAFT">Draft — hidden on storefront</option>
            <option value="ACTIVE">Active — visible to buyers</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea
            name="description"
            defaultValue={initial.description}
            rows={4}
            className="ugclab-input mt-1.5 resize-y"
            placeholder="Tell buyers what they get..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Type</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ProductType)}
            className="ugclab-select mt-1.5"
          >
            <option value="PHYSICAL">Physical</option>
            <option value="DIGITAL">Digital download</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Price ({currency})
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial.price}
            className="ugclab-input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Compare-at price ({currency})
          </label>
          <input
            name="compareAt"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial.compareAt}
            placeholder="Optional sale strikethrough"
            className="ugclab-input mt-1.5"
          />
        </div>
        {type === "PHYSICAL" ? (
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Inventory
            </label>
            <input
              name="inventory"
              type="number"
              min="0"
              defaultValue={initial.inventory}
              className="ugclab-input mt-1.5"
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700">
              Digital file
            </label>
            {initial.digitalFileName ? (
              <p className="mt-1 text-sm text-zinc-500">
                Current: {initial.digitalFileName}
                {initial.digitalFileSize
                  ? ` (${formatBytes(initial.digitalFileSize)})`
                  : ""}
              </p>
            ) : null}
            <input
              name="digitalFile"
              type="file"
              className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-violet-700"
            />
            <p className="mt-1 text-xs text-zinc-500">Max 50 MB. ZIP, PDF, etc.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-6">
        <Link href="/products" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
          ← Back to products
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="ugclab-btn ugclab-btn-primary px-8 py-3 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
