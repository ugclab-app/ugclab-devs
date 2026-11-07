import * as Sentry from "@sentry/react";

let ready = false;

export function initClientSentry(): void {
  if (ready) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn?.trim()) return;
  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
  ready = true;
}

export { Sentry };
