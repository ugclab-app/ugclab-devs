import { PrismaClient as PrismaClientNode } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientNode | undefined;
};

function usesAccelerate(url: string | undefined): boolean {
  return Boolean(
    url?.startsWith("prisma://") || url?.startsWith("prisma+postgres://")
  );
}

function isPostgresUrl(url: string | undefined): boolean {
  return Boolean(
    url?.startsWith("postgres://") || url?.startsWith("postgresql://")
  );
}

function createPrismaClient(): PrismaClientNode {
  const accelerateOrDb = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  const log: ("query" | "error" | "warn")[] =
    process.env.PRISMA_LOG_QUERIES === "1"
      ? ["query", "error", "warn"]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"];

  // Vercel (or explicit flag): Accelerate HTTP path.
  const forceAccelerate =
    Boolean(process.env.VERCEL) ||
    process.env.PRISMA_FORCE_ACCELERATE === "1";

  if (
    forceAccelerate &&
    accelerateOrDb &&
    usesAccelerate(accelerateOrDb)
  ) {
    const client = new PrismaClientEdge({
      datasourceUrl: accelerateOrDb,
    }).$extends(withAccelerate());
    return client as unknown as PrismaClientNode;
  }

  // Local Node: always use a real postgres URL (never Accelerate-only).
  // Accelerate-generated clients reject postgres:// with P6001; prefer TCP.
  const pgUrl = isPostgresUrl(directUrl)
    ? directUrl!
    : isPostgresUrl(accelerateOrDb)
      ? accelerateOrDb!
      : null;

  if (!pgUrl) {
    if (accelerateOrDb && usesAccelerate(accelerateOrDb)) {
      // Last resort if DIRECT_URL missing: try Accelerate (may fail with P6008 offline).
      const client = new PrismaClientEdge({
        datasourceUrl: accelerateOrDb,
      }).$extends(withAccelerate());
      return client as unknown as PrismaClientNode;
    }
    throw new Error(
      "DATABASE_URL / DIRECT_URL missing. Set DIRECT_URL=postgres://... for local dev."
    );
  }

  return new PrismaClientNode({
    datasourceUrl: pgUrl,
    log,
  });
}

export const prisma: PrismaClientNode =
  globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export * from "@prisma/client";
