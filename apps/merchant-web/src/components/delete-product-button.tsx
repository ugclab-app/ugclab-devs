import { useNavigate } from "react-router-dom";
import { deleteProduct } from "@/api/client";

export function DeleteProductButton({ productId }: { productId: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={async () => {
        if (
          !confirm(
            "Delete this product permanently? This cannot be undone."
          )
        ) {
          return;
        }
        await deleteProduct(productId);
        navigate("/products");
      }}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
    >
      Delete product
    </button>
  );
}
