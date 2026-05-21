import { useNavigate } from "react-router-dom";
import { ProductStatus, ProductType } from "@/lib/database-types";
import { api } from "@/api/client";
import { ProductForm } from "@/components/product-form";
import { useAuth } from "@/context/auth";

export default function ProductNewPage() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const currency = tenant?.settings?.currency ?? "USD";

  return (
    <ProductForm
      mode="create"
      currency={currency}
      tenantSlug={tenant?.slug}
      enabledLocales={tenant?.settings?.enabledLocales ?? ["en"]}
      submitLabel="Create product"
      initial={{
        title: "",
        slug: "",
        description: "",
        type: ProductType.DIGITAL,
        status: ProductStatus.DRAFT,
        price: "",
        compareAt: "",
        inventory: "100",
        collectionIds: [],
        seoTitle: "",
        seoDescription: "",
      }}
      onSubmit={async (fd, { pendingImages }) => {
        const res = await api.createProduct(fd);
        const id = res.product.id;
        for (const file of pendingImages) {
          await api.uploadProductImage(id, file);
        }
        navigate(`/products/${id}/edit?created=1`);
        return { ok: true };
      }}
    />
  );
}
