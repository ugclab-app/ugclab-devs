import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

type ProductImage = {
  id: string;
  url: string;
  fileName: string;
  alt: string | null;
};

export function ProductImagesPanel({
  productId,
  images: initial,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const queryClient = useQueryClient();
  const [images, setImages] = useState(initial);
  const [pending, setPending] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    try {
      const res = await api.uploadProductImage(productId, file);
      setImages((prev) => [...prev, res.image as ProductImage]);
      await queryClient.invalidateQueries({ queryKey: ["product", productId] });
    } finally {
      setPending(false);
      e.target.value = "";
    }
  }

  async function onDelete(imageId: string) {
    if (!confirm("Remove this image?")) return;
    await api.deleteProductImage(productId, imageId);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  return (
    <section className="admin-card p-6 space-y-4">
      <h2 className="font-semibold text-zinc-900">Images</h2>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img
              src={img.url}
              alt={img.alt ?? img.fileName}
              className="h-24 w-24 rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={() => onDelete(img.id)}
              className="absolute -right-1 -top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="block text-sm">
        <span className="font-medium text-zinc-700">Upload image</span>
        <input
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={onUpload}
          className="mt-2 block w-full text-sm"
        />
      </label>
    </section>
  );
}
