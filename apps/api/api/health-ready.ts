/** DB health — rewrite: /api/health/ready → /api/health-ready */

const HANDLER_MS = 8_000;

function withSsl(url: string): string {
  return /[?&]sslmode=/i.test(url) ? url : `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ""
  );
}

function isAccelerateUrl(url: string): boolean {
  return url.startsWith("prisma://") || url.startsWith("prisma+postgres://");
}

async function handler(): Promise<Response> {
  const t0 = Date.now();
  const dbUrl = resolveDatabaseUrl();

  if (!dbUrl) {
    return Response.json(
      {
        ok: false,
        db: false,
        ms: Date.now() - t0,
        error: "DATABASE_URL not set on Vercel",
      },
      { status: 503 }
    );
  }

  if (isAccelerateUrl(dbUrl)) {
    return Response.json({
      ok: true,
      db: true,
      ms: Date.now() - t0,
      service: "tescommerce-api",
      via: "accelerate",
    });
  }

  const timeoutResponse = () =>
    Response.json(
      {
        ok: false,
        db: false,
        ms: Date.now() - t0,
        error: "DATABASE_TIMEOUT",
        hint: "See docs/SUPABASE-PRODUCTION.md",
      },
      { status: 503 }
    );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutP = new Promise<Response>((resolve) => {
    timer = setTimeout(() => resolve(timeoutResponse()), HANDLER_MS);
  });

  const checkP = (async (): Promise<Response> => {
    const { default: postgres } = await import("postgres");
    const sql = postgres(withSsl(dbUrl), {
      ssl: "require",
      prepare: false,
      max: 1,
      connect_timeout: 5,
      idle_timeout: 5,
    });
    try {
      await sql`SELECT 1`;
      return Response.json({
        ok: true,
        db: true,
        ms: Date.now() - t0,
        service: "tescommerce-api",
      });
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  })();

  try {
    return await Promise.race([checkP, timeoutP]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "db failed";
    console.error("[health-ready]", message);
    return Response.json(
      { ok: false, db: false, ms: Date.now() - t0, error: message },
      { status: 503 }
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const GET = handler;

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};
