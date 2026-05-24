import { prisma } from "@ugclab/database";

/** Publish pages scheduled with publishAt while still in draft. */
export async function processScheduledPages() {
  const now = new Date();
  await prisma.storePage.updateMany({
    where: {
      published: false,
      publishAt: { lte: now },
    },
    data: {
      published: true,
      publishAt: null,
    },
  });
}
