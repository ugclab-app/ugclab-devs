import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type ProductImage = {
  id: string;
  url: string;
  fileName: string;
  alt: string | null;
};

function fileFromBase64(fileName: string, mimeType: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType });
}

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
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const initialKey = initial.map((i) => i.id).join(",");
  useEffect(() => {
    setImages(initial);
  }, [productId, initialKey, initial]);
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

  async function importFromUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlError(null);
    setUploading(true);
    try {
      if (productId) {
        const res = await api.importProductImageFromUrl(productId, url);
        setImages((prev) => [...prev, res.image as ProductImage]);
        await queryClient.invalidateQueries({ queryKey: ["product", productId] });
      } else {
        const res = await api.fetchMediaFromUrl(url);
        const file = fileFromBase64(res.fileName, res.mimeType, res.base64);
        const next = [...pending, file];
        setPending(next);
        onPendingChange?.(next);
      }
      setUrlInput("");
      setShowUrl(false);
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setUploading(false);
    }
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
        <span className="mx-2 text-zinc-300">·</span>
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setShowUrl((v) => !v);
            setUrlError(null);
          }}
          className="text-sm font-medium text-violet-600 hover:text-violet-700"
        >
          Import from URL
        </button>
        <p className="mt-1 text-xs text-zinc-500">PNG, JPG, WebP — drag and drop or paste a link</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {showUrl ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void importFromUrl();
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="ugclab-input flex-1"
              disabled={uploading}
            />
            <button
              type="button"
              disabled={uploading || !urlInput.trim()}
              onClick={() => void importFromUrl()}
              className="ugclab-btn ugclab-btn-primary shrink-0"
            >
              {uploading ? "Importing…" : "Add"}
            </button>
          </div>
          {urlError ? (
            <p className="text-xs text-red-600">{urlError}</p>
          ) : null}
        </div>
      ) : null}

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
