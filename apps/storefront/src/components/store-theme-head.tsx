import { useEffect } from "react";
import { useStore } from "@/context/store";

export function StoreThemeHead() {
  const { theme, tenant, settings } = useStore();
  const faviconUrl = settings?.faviconUrl ?? theme.faviconUrl;

  useEffect(() => {
    const base = window.location.origin;
    const sitemap = `${base}/api/store/sitemap.xml?tenant=${encodeURIComponent(tenant.slug)}`;
    let sitemapLink = document.querySelector<HTMLLinkElement>('link[rel="sitemap"][data-store]');
    if (!sitemapLink) {
      sitemapLink = document.createElement("link");
      sitemapLink.rel = "sitemap";
      sitemapLink.type = "application/xml";
      sitemapLink.setAttribute("data-store", "1");
      document.head.appendChild(sitemapLink);
    }
    sitemapLink.href = sitemap;
  }, [tenant.slug]);

  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-store]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.setAttribute("data-store", "1");
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
    if (theme.customCss) {
      let style = document.getElementById("store-custom-css") as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = "store-custom-css";
        document.head.appendChild(style);
      }
      style.textContent = theme.customCss;
    }
  }, [faviconUrl, theme.customCss]);

  return null;
}
