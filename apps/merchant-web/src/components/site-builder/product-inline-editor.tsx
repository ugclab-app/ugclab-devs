import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { MediaPicker } from "@/components/media-picker";

type ProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priceAmount: number;
  compareAt: number | null;
  inventory: number | null;
  images?: { id: string; url: string; alt: string | null }[];
};

export function ProductInlineEditor({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.product(productId),
  });

  const product = data?.product as ProductDetail | undefined;
  const currency = data?.currency ?? "USD";

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">("ACTIVE");
  const [description, setDescription] = useState("");
  const [inventory, setInventory] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setPrice((product.priceAmount / 100).toFixed(2));
    setCompareAt(product.compareAt != null ? (product.compareAt / 100).toFixed(2) : "");
    setStatus(product.status);
    setDescription(product.description ?? "");
    setInventory(product.inventory != null ? String(product.inventory) : "");
    setMsg(null);
  }, [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setPending(true);
    setMsg(null);
    try {
      await api.updateProduct(product.id, {
        title: title.trim(),
        slug: product.slug,
        status,
        price,
        compareAt: compareAt.trim() || "",
        description,
        inventory: inventory.trim() === "" ? undefined : inventory,
      });
      await qc.invalidateQueries({ queryKey: ["product", productId] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      setMsg({ ok: true, text: "Saved — publish storefront draft if needed." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setPending(false);
    }
  }

  async function addImageFromUrl(url: string) {
    if (!product) return;
    setPending(true);
    try {
      await api.importProductImageFromUrl(product.id, url);
      await qc.invalidateQueries({ queryKey: ["product", productId] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      setMsg({ ok: true, text: "Image added." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Image failed",
      });
    } finally {
      setPending(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file || !product) return;
    setPending(true);
    try {
      await api.uploadProductImage(product.id, file);
      await qc.invalidateQueries({ queryKey: ["product", productId] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      setMsg({ ok: true, text: "Image uploaded." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setPending(false);
    }
  }

  async function removeImage(imageId: string) {
    if (!product) return;
    setPending(true);
    try {
      await api.deleteProductImage(product.id, imageId);
      await qc.invalidateQueries({ queryKey: ["product", productId] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-zinc-500">Loading product…</div>;
  }
  if (error || !product) {
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="text-red-600">Could not load product.</p>
        <button type="button" className="text-violet-600" onClick={onClose}>
          ← Back to section
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex max-h-[min(70vh,640px)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-medium text-violet-600 hover:underline"
          >
            ← Section
          </button>
          <h3 className="truncate text-sm font-semibold text-zinc-900">Edit product</h3>
        </div>
        <Link
          to={`/products/${product.id}/edit`}
          className="shrink-0 text-[11px] text-zinc-500 hover:text-violet-600"
        >
          Full editor ↗
        </Link>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(product.images ?? []).map((img) => (
            <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <img src={img.url} alt="" className="h-full w-full object-contain p-0.5" />
              <button
                type="button"
                disabled={pending}
                onClick={() => void removeImage(img.id)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[10px] text-white"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
          {(product.images ?? []).length === 0 ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-[10px] text-zinc-400">
              No image
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="ugclab-btn cursor-pointer border border-zinc-200 bg-white px-2.5 py-1 text-[11px]">
            Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={pending}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <MediaPicker onUploaded={(url) => void addImageFromUrl(url)} />
        </div>

        <label className="block text-xs">
          Title
          <input
            className="ugclab-input mt-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            Price ({currency})
            <input
              className="ugclab-input mt-1 text-sm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <label className="block text-xs">
            Compare-at
            <input
              className="ugclab-input mt-1 text-sm"
              value={compareAt}
              onChange={(e) => setCompareAt(e.target.value)}
              inputMode="decimal"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            Status
            <select
              className="ugclab-select mt-1 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="block text-xs">
            Inventory
            <input
              className="ugclab-input mt-1 text-sm"
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>

        <label className="block text-xs">
          Description
          <textarea
            className="ugclab-input mt-1 min-h-[88px] text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {msg ? (
          <p
            className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}
          >
            {msg.text}
          </p>
        ) : null}
      </div>

      <div className="border-t border-zinc-100 p-3">
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="ugclab-btn ugclab-btn-primary w-full py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}
