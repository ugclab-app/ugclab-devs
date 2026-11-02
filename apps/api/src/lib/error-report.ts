/**
 * Central error log for ops. Wire Sentry later:
 *   npm i @sentry/node  +  SENTRY_DSN=…  then captureException here.
 */

export function reportError(
  err: unknown,
  context?: Record<string, unknown>
): void {
  const dsnConfigured = Boolean(process.env.SENTRY_DSN?.trim());
  console.error(
    "[error-report]",
    dsnConfigured ? "(SENTRY_DSN set — install @sentry/node to ship)" : "",
    context ?? {},
    err
  );
}
