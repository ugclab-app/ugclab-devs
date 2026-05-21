import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type ProductImage = {
  id: string;
  url: string;
  fileName: string;
  alt: string | null;
};

export function ProductMediaField({
  productId,
  images: initial = [],
  pendingFiles,
  onPendingChange,
}: {
  productId?: string;
  images?: ProductImage[];
  pendingFiles?: File[];
  onPendingChange?: (files: File[]) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initial);
  const [pending, setPending] = useState<File[]>(pendingFiles ?? []);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  async function uploadOne(file: File) {
    if (!productId) {
      const next = [...pending, file];
      setPending(next);
      onPendingChange?.(next);
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadProductImage(productId, file);
      setImages((prev) => [...prev, res.image as ProductImage]);
      await queryClient.invalidateQueries({ queryKey: ["product", productId] });
    } finally {
      setUploading(false);
    }
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    void (async () => {
      for (const f of Array.from(files)) {
        if (f.type.startsWith("image/")) await uploadOne(f);
      }
    })();
  }

  function removePending(i: number) {
    const next = pending.filter((_, idx) => idx !== i);
    setPending(next);
    onPendingChange?.(next);
  }

  async function onDelete(imageId: string) {
    if (!productId || !confirm("Remove this image?")) return;
    await api.deleteProductImage(productId, imageId);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  const previews = [
    ...images.map((img) => ({ key: img.id, url: img.url, id: img.id })),
    ...pending.map((f, i) => ({
      key: `pending-${i}`,
      url: URL.createObjectURL(f),
      pendingIndex: i,
    })),
  ];

  return (
    <section className="admin-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900">Media</h2>
        {!productId ? (
          <span className="text-xs text-zinc-500">Uploads apply when you save</span>
        ) : null}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          drag
            ? "border-violet-400 bg-violet-50"
            : "border-zinc-200 hover:border-violet-300"
        }`}
      >
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          {uploading ? "Uploading…" : "Add images"}
        </button>
        <p className="mt-1 text-xs text-zinc-500">PNG, JPG, WebP — drag and drop</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {previews.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {previews.map((p) => (
            <div key={p.key} className="relative group">
              <img
                src={p.url}
                alt=""
                className="h-20 w-20 rounded-lg border object-cover"
              />
              {"pendingIndex" in p && p.pendingIndex !== undefined ? (
                <button
                  type="button"
                  onClick={() => removePending(p.pendingIndex!)}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                >
                  ×
                </button>
              ) : "id" in p && p.id ? (
                <button
                  type="button"
                  onClick={() => onDelete(p.id!)}
                  className="absolute -right-1 -top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white group-hover:flex"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
