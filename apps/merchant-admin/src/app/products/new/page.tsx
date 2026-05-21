import { AdminShell } from "@/components/admin-shell";
import { ProductForm } from "@/components/product-form";
import { createProduct } from "@/app/actions/products";
import { ProductStatus, ProductType } from "@ugclab/database";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function NewProductPage() {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const currency = tenant.settings?.currency ?? "USD";

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="New product"
      description="Draft or publish — active products appear on your storefront."
    >
      <ProductForm
        action={createProduct}
        currency={currency}
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
        }}
      />
    </AdminShell>
  );
}
