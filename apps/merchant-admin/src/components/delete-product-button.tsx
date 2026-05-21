"use client";

import { deleteProduct } from "@/app/actions/products";

export function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <form
      action={async () => {
        if (
          !confirm(
            "Delete this product permanently? This cannot be undone."
          )
        ) {
          return;
        }
        await deleteProduct(productId);
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Delete product
      </button>
    </form>
  );
}
