import { notFound } from "next/navigation";
import { prisma } from "@ugclab/database";
import { AdminShell } from "@/components/admin-shell";
import { DeleteProductButton } from "@/components/delete-product-button";
import { ProductForm } from "@/components/product-form";
import { updateProduct } from "@/app/actions/products";
import { centsToInput } from "@/lib/money-input";
import { getMerchantTenant, requireMerchant } from "@/lib/session";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireMerchant();
  const tenant = await getMerchantTenant(session.user.id);
  if (!tenant) return null;

  const { id } = await params;
  const { created } = await searchParams;

  const product = await prisma.product.findFirst({
    where: { id, tenantId: tenant.id },
    include: { digitalAsset: true },
  });
  if (!product) notFound();

  const currency = tenant.settings?.currency ?? "USD";
  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <AdminShell
      tenant={{ name: tenant.name, slug: tenant.slug }}
      title="Edit product"
      description={product.title}
    >
      {created ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Product created. Upload a digital file or publish when ready.
        </p>
      ) : null}
      <ProductForm
        action={boundUpdate}
        currency={currency}
        submitLabel="Save changes"
        initial={{
          title: product.title,
          slug: product.slug,
          description: product.description ?? "",
          type: product.type,
          status: product.status,
          price: centsToInput(product.priceAmount) || "0",
          compareAt: centsToInput(product.compareAt),
          inventory: String(product.inventory ?? 0),
          digitalFileName: product.digitalAsset?.fileName,
          digitalFileSize: product.digitalAsset?.sizeBytes,
        }}
      />
      <div className="mx-auto mt-6 max-w-2xl">
        <DeleteProductButton productId={product.id} />
      </div>
    </AdminShell>
  );
}
