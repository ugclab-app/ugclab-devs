import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "@/context/store";

export function StoreHreflang() {
  const { enabledLocales, tenant } = useStore();
  const { pathname, search } = useLocation();

  useEffect(() => {
    document.querySelectorAll('link[rel="alternate"][data-hreflang]').forEach((el) => el.remove());

    if (!enabledLocales?.length || enabledLocales.length < 2) return;

    const params = new URLSearchParams(search);
    params.set("tenant", tenant.slug);

    for (const loc of enabledLocales) {
      const p = new URLSearchParams(params);
      if (loc === enabledLocales[0]) p.delete("locale");
      else p.set("locale", loc);
      const href = `${window.location.origin}${pathname}?${p.toString()}`;
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = loc;
      link.href = href;
      link.setAttribute("data-hreflang", "1");
      document.head.appendChild(link);
    }

    const def = new URLSearchParams(params);
    def.delete("locale");
    const defLink = document.createElement("link");
    defLink.rel = "alternate";
    defLink.hreflang = "x-default";
    defLink.href = `${window.location.origin}${pathname}?${def.toString()}`;
    defLink.setAttribute("data-hreflang", "1");
    document.head.appendChild(defLink);
  }, [enabledLocales, tenant.slug, pathname, search]);

  return null;
}
