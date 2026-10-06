/** Env ping — /api/health-ping (edge, no DB connect) */
export default function handler() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  const host = dbUrl?.match(/@([^/]+)/)?.[1] ?? null;
  return Response.json({
    ok: true,
    ping: true,
    hasDatabaseUrl: Boolean(dbUrl),
    host,
  });
}

export const config = {
  runtime: "edge",
};
