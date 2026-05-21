import { useEffect } from "react";

export type DocumentSeo = {
  title: string;
  description?: string | null;
  image?: string | null;
  type?: "website" | "product" | "article";
};

export function useDocumentSeo(seo: DocumentSeo) {
  useEffect(() => {
    document.title = seo.title;

    function setMeta(name: string, content: string, prop = false) {
      const attr = prop ? "property" : "name";
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    }

    if (seo.description) {
      setMeta("description", seo.description);
      setMeta("og:description", seo.description, true);
    }
    setMeta("og:title", seo.title, true);
    setMeta("og:type", seo.type ?? "website", true);
    if (seo.image) setMeta("og:image", seo.image, true);

    const canonical = window.location.href;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"][data-store]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      link.setAttribute("data-store", "1");
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [seo.title, seo.description, seo.image, seo.type]);
}

export function buildStoreTitle(storeName: string, page?: string) {
  if (!page) return storeName;
  return `${page} · ${storeName}`;
}
