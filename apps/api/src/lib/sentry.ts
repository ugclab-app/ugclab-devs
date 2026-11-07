/**
 * Lazy Sentry init for the API. No-ops when SENTRY_DSN is unset.
 */
let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment:
        process.env.SENTRY_ENVIRONMENT?.trim() ||
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "development",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
    });
    initialized = true;
  } catch (err) {
    console.error("[sentry] failed to init", err);
  }
}

export async function captureException(
  err: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    await initSentry();
    const Sentry = await import("@sentry/node");
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(err);
    });
  } catch {
    /* never throw from reporting */
  }
}
