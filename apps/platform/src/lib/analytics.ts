type Clarity = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: Clarity;
  }
}

/** Loads Microsoft Clarity when VITE_CLARITY_ID is set; otherwise analytics stays off. */
export function loadAnalytics() {
  const id = import.meta.env.VITE_CLARITY_ID?.trim();
  if (!id || window.clarity) return;
  const clarity: Clarity = (...args: unknown[]) => {
    (clarity.q = clarity.q ?? []).push(args);
  };
  window.clarity = clarity;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Custom event, e.g. track("cta_hero"). No-op without Clarity. */
export function track(event: string) {
  window.clarity?.("event", event);
}
