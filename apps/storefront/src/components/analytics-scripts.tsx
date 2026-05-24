import { useEffect } from "react";
import { useStore } from "@/context/store";

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    ttq?: { load: (id: string) => void; page: () => void };
  }
}

export function AnalyticsScripts() {
  const { integrations } = useStore();

  useEffect(() => {
    if (!integrations) return;

    if (integrations.gtmId) {
      const id = integrations.gtmId;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
    }

    if (integrations.gaMeasurementId) {
      const id = integrations.gaMeasurementId;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer!.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", id);
    }

    if (integrations.metaPixelId) {
      const id = integrations.metaPixelId;
      const f = window;
      const n = (f.fbq = function (...args: unknown[]) {
        n.callMethod ? n.callMethod(...args) : n.queue.push(args);
      }) as typeof window.fbq & {
        callMethod?: (...args: unknown[]) => void;
        queue: unknown[];
        loaded?: boolean;
        version?: string;
      };
      if (!f._fbq) f._fbq = n;
      n.queue = [];
      n.loaded = true;
      n.version = "2.0";
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
      f.fbq!("init", id);
      f.fbq!("track", "PageView");
    }

    if (integrations.tiktokPixelId) {
      const id = integrations.tiktokPixelId;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      s.onload = () => {
        window.ttq?.load(id);
        window.ttq?.page();
      };
      document.head.appendChild(s);
    }
  }, [integrations]);

  return null;
}
