import { prisma, ProductStatus } from "@ugclab/database";

export async function processScheduledProducts() {
  const now = new Date();
  await prisma.product.updateMany({
    where: {
      status: ProductStatus.DRAFT,
      publishAt: { lte: now },
      deletedAt: null,
    },
    data: {
      status: ProductStatus.ACTIVE,
      publishAt: null,
    },
  });

  const due = await prisma.product.findMany({
    where: {
      deletedAt: null,
      scheduledPriceAt: { lte: now },
      scheduledPriceAmount: { not: null },
    },
    select: {
      id: true,
      scheduledPriceAmount: true,
      scheduledCompareAt: true,
    },
    take: 200,
  });
  for (const p of due) {
    if (p.scheduledPriceAmount == null) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: {
        priceAmount: p.scheduledPriceAmount,
        compareAt: p.scheduledCompareAt,
        scheduledPriceAmount: null,
        scheduledCompareAt: null,
        scheduledPriceAt: null,
      },
    });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.product.deleteMany({
    where: { deletedAt: { lte: cutoff } },
  });
}
