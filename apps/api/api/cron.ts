/** Vercel Cron → durable jobs, webhooks, dunning, etc. */

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isVercelCron = Boolean(request.headers.get("x-vercel-cron"));
  if (cronSecret) {
    if (auth !== `Bearer ${cronSecret}` && !isVercelCron) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const t0 = Date.now();
  try {
    const { runScheduledJobs } = await import("../src/jobs/scheduled.js");
    await runScheduledJobs();
    return Response.json({ ok: true, ms: Date.now() - t0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[cron]", message);
    return Response.json({ ok: false, error: message, ms: Date.now() - t0 }, { status: 500 });
  }
}
