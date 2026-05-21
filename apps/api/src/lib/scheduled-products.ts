import { prisma, ProductStatus } from "@ugclab/database";

export async function processScheduledProducts() {
  const now = new Date();
  await prisma.product.updateMany({
    where: {
      status: ProductStatus.DRAFT,
      publishAt: { lte: now },
    },
    data: {
      status: ProductStatus.ACTIVE,
      publishAt: null,
    },
  });
}
