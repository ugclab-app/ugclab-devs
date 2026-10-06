import { prisma } from "@ugclab/database";

const DEFAULT_MS = 12_000;

export async function assertDatabaseReady(
  timeoutMs: number = DEFAULT_MS
): Promise<void> {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (url.startsWith("prisma://") || url.startsWith("prisma+postgres://")) {
    return;
  }
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), timeoutMs);
  });
  await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
}

export function databaseTimeoutMessage(): string {
  return "Database is not responding. Check DATABASE_URL (Supabase pooler :6543, sslmode=require) on the API and try again.";
}
