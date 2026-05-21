import {
  CollectionRuleType,
  prisma,
  ProductStatus,
  ProductType,
} from "@ugclab/database";

export async function getCollectionProducts(
  tenantId: string,
  collection: {
    ruleType: CollectionRuleType;
    ruleTag: string | null;
    ruleProductType: ProductType | null;
    products: { productId: string; sortOrder?: number }[];
  }
) {
  if (collection.ruleType === CollectionRuleType.AUTO_TAG && collection.ruleTag) {
    return prisma.product.findMany({
      where: {
        tenantId,
        status: ProductStatus.ACTIVE,
        tags: { has: collection.ruleTag.toLowerCase() },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { id: true }, orderBy: { title: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  if (
    collection.ruleType === CollectionRuleType.AUTO_TYPE &&
    collection.ruleProductType
  ) {
    return prisma.product.findMany({
      where: {
        tenantId,
        status: ProductStatus.ACTIVE,
        type: collection.ruleProductType,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { id: true }, orderBy: { title: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  const ordered = [...collection.products].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  const ids = ordered.map((p) => p.productId);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { tenantId, status: ProductStatus.ACTIVE, id: { in: ids } },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { id: true }, orderBy: { title: "asc" } },
    },
  });
  const rank = new Map(ids.map((id, i) => [id, i]));
  return products.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}
