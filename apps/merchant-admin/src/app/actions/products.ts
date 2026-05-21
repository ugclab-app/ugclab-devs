"use server";

import {
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeSlug, requireTenant } from "@/lib/merchant";
import { saveDigitalFile } from "@/lib/uploads";

export type ProductActionState = {
  ok: boolean;
  message?: string;
};

function parseMoney(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? "0"));
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function parseOptionalMoney(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cents = parseMoney(value);
  return cents > 0 ? cents : null;
}

async function handleDigitalFile(
  tenantId: string,
  productId: string,
  formData: FormData,
  existing?: { id: string; storageKey: string } | null
) {
  const file = formData.get("digitalFile");
  if (!(file instanceof File) || file.size === 0) return existing;

  const meta = await saveDigitalFile(tenantId, productId, file);
  if (existing) {
    await prisma.digitalAsset.update({
      where: { id: existing.id },
      data: meta,
    });
  } else {
    await prisma.digitalAsset.create({
      data: { tenantId, productId, ...meta },
    });
  }
}

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  try {
    const { tenant } = await requireTenant();
    const title = String(formData.get("title") ?? "").trim();
    const slug =
      normalizeSlug(String(formData.get("slug") ?? "")) || "product";
    const description =
      String(formData.get("description") ?? "").trim() || null;
    const type =
      formData.get("type") === "DIGITAL"
        ? ProductType.DIGITAL
        : ProductType.PHYSICAL;
    const status =
      formData.get("status") === "DRAFT"
        ? ProductStatus.DRAFT
        : ProductStatus.ACTIVE;
    const priceAmount = parseMoney(formData.get("price"));
    const compareAt = parseOptionalMoney(formData.get("compareAt"));
    const currency = tenant.settings?.currency ?? "USD";
    const inventoryRaw = String(formData.get("inventory") ?? "").trim();
    const inventory =
      type === ProductType.PHYSICAL && inventoryRaw
        ? parseInt(inventoryRaw, 10)
        : type === ProductType.PHYSICAL
          ? 0
          : null;

    if (!title) return { ok: false, message: "Title is required" };

    const dup = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (dup) return { ok: false, message: "Slug already used by another product" };

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        title,
        slug,
        description,
        type,
        status,
        priceAmount,
        compareAt,
        currency,
        inventory,
      },
    });

    if (type === ProductType.DIGITAL) {
      await handleDigitalFile(tenant.id, product.id, formData);
    }

    revalidatePath("/products");
    redirect(`/products/${product.id}/edit?created=1`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to create product",
    };
  }
}

export async function updateProduct(
  productId: string,
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  try {
    const { tenant } = await requireTenant();
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
      include: { digitalAsset: true },
    });
    if (!product) return { ok: false, message: "Product not found" };

    const title = String(formData.get("title") ?? "").trim();
    const slug =
      normalizeSlug(String(formData.get("slug") ?? "")) || product.slug;
    const description =
      String(formData.get("description") ?? "").trim() || null;
    const type =
      formData.get("type") === "DIGITAL"
        ? ProductType.DIGITAL
        : ProductType.PHYSICAL;
    const status = String(formData.get("status")) as ProductStatus;
    const priceAmount = parseMoney(formData.get("price"));
    const compareAt = parseOptionalMoney(formData.get("compareAt"));
    const inventoryRaw = String(formData.get("inventory") ?? "").trim();
    const inventory =
      type === ProductType.PHYSICAL && inventoryRaw
        ? parseInt(inventoryRaw, 10)
        : type === ProductType.PHYSICAL
          ? product.inventory ?? 0
          : null;

    if (!title) return { ok: false, message: "Title is required" };
    if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      return { ok: false, message: "Invalid status" };
    }

    if (slug !== product.slug) {
      const dup = await prisma.product.findFirst({
        where: {
          tenantId: tenant.id,
          slug,
          NOT: { id: product.id },
        },
      });
      if (dup) return { ok: false, message: "Slug already in use" };
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        title,
        slug,
        description,
        type,
        status,
        priceAmount,
        compareAt,
        inventory,
      },
    });

    if (type === ProductType.DIGITAL) {
      await handleDigitalFile(
        tenant.id,
        product.id,
        formData,
        product.digitalAsset
      );
    } else if (product.digitalAsset) {
      await prisma.digitalAsset.delete({
        where: { id: product.digitalAsset.id },
      });
    }

    revalidatePath("/products");
    revalidatePath(`/products/${product.id}/edit`);
    return { ok: true, message: "Product saved" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to update product",
    };
  }
}

export async function deleteProduct(productId: string) {
  const { tenant } = await requireTenant();
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id },
  });
  if (!product) throw new Error("Product not found");

  await prisma.product.delete({ where: { id: product.id } });
  revalidatePath("/products");
  redirect("/products");
}

export async function bulkUpdateProductStatus(
  productIds: string[],
  status: ProductStatus
) {
  const { tenant } = await requireTenant();
  if (!["ACTIVE", "ARCHIVED", "DRAFT"].includes(status)) {
    throw new Error("Invalid status");
  }
  await prisma.product.updateMany({
    where: { tenantId: tenant.id, id: { in: productIds } },
    data: { status },
  });
  revalidatePath("/products");
}

export async function duplicateProduct(productId: string) {
  const { tenant } = await requireTenant();
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id },
    include: { digitalAsset: true },
  });
  if (!product) throw new Error("Product not found");

  let slug = `${product.slug}-copy`;
  let n = 2;
  while (
    await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    })
  ) {
    slug = `${product.slug}-copy-${n}`;
    n++;
  }

  const copy = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      title: `${product.title} (copy)`,
      slug,
      description: product.description,
      type: product.type,
      status: ProductStatus.DRAFT,
      priceAmount: product.priceAmount,
      compareAt: product.compareAt,
      currency: product.currency,
      inventory: product.inventory,
    },
  });

  if (product.digitalAsset) {
    await prisma.digitalAsset.create({
      data: {
        tenantId: tenant.id,
        productId: copy.id,
        storageKey: product.digitalAsset.storageKey,
        fileName: product.digitalAsset.fileName,
        mimeType: product.digitalAsset.mimeType,
        sizeBytes: product.digitalAsset.sizeBytes,
        downloadLimit: product.digitalAsset.downloadLimit,
      },
    });
  }

  revalidatePath("/products");
}
