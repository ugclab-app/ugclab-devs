/**
 * Central error log + optional Sentry capture.
 * Set SENTRY_DSN to ship exceptions (see `./sentry.ts`).
 */
import { captureException } from "./sentry.js";

export function reportError(
  err: unknown,
  context?: Record<string, unknown>
): void {
  const dsnConfigured = Boolean(process.env.SENTRY_DSN?.trim());
  console.error(
    "[error-report]",
    dsnConfigured ? "(SENTRY_DSN)" : "",
    context ?? {},
    err
  );
  void captureException(err, context);
}
