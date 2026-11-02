import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileApi = {
  render: (el: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

function getTurnstile(): TurnstileApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

let loader: Promise<TurnstileApi> | null = null;

/** Injects the Turnstile script once and resolves when `window.turnstile` is ready. */
function loadTurnstile(): Promise<TurnstileApi> {
  const existing = getTurnstile();
  if (existing) return Promise.resolve(existing);
  if (loader) return loader;
  loader = new Promise<TurnstileApi>((resolve, reject) => {
    const onLoad = () => {
      const api = getTurnstile();
      if (api) resolve(api);
      else {
        loader = null;
        reject(new Error("Turnstile unavailable"));
      }
    };
    const onError = () => {
      loader = null;
      reject(new Error("Failed to load Turnstile"));
    };
    let script = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/"]'
    );
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
  return loader;
}

export type TurnstileWidgetHandle = {
  /** Clears the current challenge so the user can solve it again. */
  reset: () => void;
};

export type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  className?: string;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onToken, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          const api = getTurnstile();
          if (api && widgetIdRef.current != null) {
            try {
              api.reset(widgetIdRef.current);
            } catch {
              /* ignore */
            }
          }
          onTokenRef.current(null);
        },
      }),
      []
    );

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      let cancelled = false;
      loadTurnstile()
        .then((api) => {
          if (cancelled) return;
          widgetIdRef.current = api.render(el, {
            sitekey: siteKey,
            theme: "auto",
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          });
        })
        .catch(() => {
          /* widget stays empty; server will reject without a token */
        });
      return () => {
        cancelled = true;
        const api = getTurnstile();
        if (api && widgetIdRef.current != null) {
          try {
            api.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
        widgetIdRef.current = null;
        onTokenRef.current(null);
      };
    }, [siteKey]);

    return <div ref={containerRef} className={className} />;
  }
);
