import {
  compareSlugs,
  countrySlugs,
  landingContent,
  landingLocales,
  landingOgLocale,
  localePrefixRe,
  type CompareSlug,
  type CountrySlug,
  type LandingLocale,
} from "./content";
import { localizedPath } from "./locale";
import {
  glossaryPages,
  guidePages,
  seoContentPaths,
  seoHubCopy,
  type GlossarySlug,
  type GuideSlug,
} from "./seo-expand";

export const SITE_URL = "https://tescommerce.com";
const OG_IMAGE = `${SITE_URL}/og.png`;

export type PageMeta = {
  locale: LandingLocale;
  /** Path without the locale prefix, e.g. `/vs/shopify`. */
  path: string;
  title: string;
  description: string;
  jsonLd: object[];
};

const unlocalizedPaths = [
  "/",
  ...compareSlugs.map((s) => `/vs/${s}`),
  ...countrySlugs.map((s) => `/sell-from/${s}`),
  ...seoContentPaths,
];

/** Every landing URL we prerender, in all languages. */
export const prerenderPaths = landingLocales.flatMap((l) => unlocalizedPaths.map((p) => localizedPath(l, p)));

function homeJsonLd(locale: LandingLocale): object[] {
  const content = landingContent[locale];
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tescommerce",
      url: SITE_URL,
      logo: `${SITE_URL}/tescommerce-logo.png`,
      founder: { "@type": "Person", name: landingContent.en.founder.name },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Tescommerce",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: content.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}

function articleJsonLd(locale: LandingLocale, path: string, title: string, description: string): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      inLanguage: locale,
      mainEntityOfPage: `${SITE_URL}${localizedPath(locale, path)}`,
      publisher: { "@type": "Organization", name: "Tescommerce", url: SITE_URL },
    },
  ];
}

function definedTermJsonLd(locale: LandingLocale, term: string, definition: string): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: term,
      description: definition,
      inDefinedTermSet: `${SITE_URL}${localizedPath(locale, "/glossary")}`,
    },
  ];
}

export function resolveMeta(pathname: string): PageMeta | null {
  const locale = (pathname.match(localePrefixRe)?.[1] ?? "en") as LandingLocale;
  const path = pathname.replace(localePrefixRe, "").replace(/\/+$/, "") || "/";
  const content = landingContent[locale];
  const hub = seoHubCopy[locale];

  if (path === "/") {
    return { locale, path, ...content.meta.home, jsonLd: homeJsonLd(locale) };
  }
  const vs = path.match(/^\/vs\/([a-z-]+)$/)?.[1] as CompareSlug | undefined;
  if (vs && vs in content.comparePages) {
    const page = content.comparePages[vs];
    return { locale, path, title: `${page.title}: ${page.eyebrow}`, description: page.description, jsonLd: [] };
  }
  const country = path.match(/^\/sell-from\/([a-z-]+)$/)?.[1] as CountrySlug | undefined;
  if (country && country in content.countryPages) {
    const page = content.countryPages[country];
    return { locale, path, title: `${page.title} | Tescommerce`, description: page.description, jsonLd: [] };
  }
  if (path === "/pricing") {
    return { locale, path, title: hub.pricingTitle, description: hub.pricingDescription, jsonLd: [] };
  }
  if (path === "/tools/savings") {
    return { locale, path, title: hub.savingsTitle, description: hub.savingsDescription, jsonLd: [] };
  }
  if (path === "/guides") {
    return { locale, path, title: hub.guidesTitle, description: hub.guidesDescription, jsonLd: [] };
  }
  const guide = path.match(/^\/guides\/([a-z0-9-]+)$/)?.[1] as GuideSlug | undefined;
  if (guide && guide in guidePages) {
    const page = guidePages[guide][locale];
    return {
      locale,
      path,
      title: `${page.title} | Tescommerce`,
      description: page.description,
      jsonLd: articleJsonLd(locale, path, page.title, page.description),
    };
  }
  if (path === "/glossary") {
    return { locale, path, title: hub.glossaryTitle, description: hub.glossaryDescription, jsonLd: [] };
  }
  const term = path.match(/^\/glossary\/([a-z0-9-]+)$/)?.[1] as GlossarySlug | undefined;
  if (term && term in glossaryPages) {
    const page = glossaryPages[term][locale];
    return {
      locale,
      path,
      title: `${page.title} | Tescommerce`,
      description: page.description,
      jsonLd: definedTermJsonLd(locale, page.term, page.definition),
    };
  }
  return null;
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `<head>` tags for a prerendered page. */
export function headTags(meta: PageMeta): string {
  const url = `${SITE_URL}${localizedPath(meta.locale, meta.path)}`;
  const alternates = landingLocales.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}${localizedPath(l, meta.path)}" />`
  );
  alternates.push(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}${meta.path}" />`);
  const tags = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...alternates,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Tescommerce" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="${landingOgLocale[meta.locale]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ...meta.jsonLd.map(
      (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
    ),
  ];
  return tags.join("\n    ");
}

export function sitemapXml(): string {
  const urls = unlocalizedPaths.map((p) => {
    const links = landingLocales
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${localizedPath(l, p)}" />`)
      .join("\n");
    return landingLocales
      .map((l) => `  <url>\n    <loc>${SITE_URL}${localizedPath(l, p)}</loc>\n${links}\n  </url>`)
      .join("\n");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}
