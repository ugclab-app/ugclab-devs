import { useEffect } from "react";
import { useStore } from "@/context/store";

const ORG_SCRIPT_ID = "store-jsonld-organization";

export function StoreOrganizationJsonLd() {
  const ctx = useStore();

  useEffect(() => {
    const origin = window.location.origin;
    const path = window.location.pathname + window.location.search;
    const url = `${origin}${path}`;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: ctx.tenant.name,
      url,
      ...(ctx.logoUrl ? { logo: ctx.logoUrl } : {}),
      ...(ctx.settings?.seoDescription
        ? { description: ctx.settings.seoDescription }
        : {}),
      sameAs: [
        ctx.theme.socialLinks?.instagram,
        ctx.theme.socialLinks?.telegram,
        ctx.theme.socialLinks?.tiktok,
      ].filter(Boolean),
    };

    let el = document.getElementById(ORG_SCRIPT_ID) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = ORG_SCRIPT_ID;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);

    return () => {
      el?.remove();
    };
  }, [
    ctx.tenant.name,
    ctx.logoUrl,
    ctx.settings?.seoDescription,
    ctx.theme.socialLinks,
  ]);

  return null;
}

export function ProductJsonLd({
  name,
  description,
  imageUrls,
  priceAmount,
  currency,
  slug,
  inStock,
}: {
  name: string;
  description: string | null;
  imageUrls: string[];
  priceAmount: number;
  currency: string;
  slug: string;
  inStock: boolean;
}) {
  useEffect(() => {
    const id = "store-jsonld-product";
    const origin = window.location.origin;
    const url = `${origin}${window.location.pathname}${window.location.search}`;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: description ?? undefined,
      image: imageUrls.length > 0 ? imageUrls : undefined,
      offers: {
        "@type": "Offer",
        url: `${origin}/products/${slug}${window.location.search}`,
        priceCurrency: currency,
        price: (priceAmount / 100).toFixed(2),
        availability: inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    };

    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);

    return () => {
      el?.remove();
    };
  }, [name, description, imageUrls.join(","), priceAmount, currency, slug, inStock]);

  return null;
}
