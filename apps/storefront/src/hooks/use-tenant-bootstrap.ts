import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { storeApi } from "@/api/client";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function useTenantBootstrap() {
  const [params, setParams] = useSearchParams();
  const tenant = params.get("tenant");

  useEffect(() => {
    if (tenant) return;
    const host = window.location.hostname;
    if (LOCAL_HOSTS.has(host)) return;

    let cancelled = false;
    storeApi
      .resolveHost(host)
      .then((r) => {
        if (cancelled) return;
        const next = new URLSearchParams(params);
        next.set("tenant", r.slug);
        if (!next.get("locale")) next.set("locale", "en");
        setParams(next, { replace: true });
      })
      .catch(() => {
        /* unknown host */
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, params, setParams]);
}
