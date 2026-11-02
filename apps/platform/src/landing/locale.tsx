import { createContext, useContext, useEffect, type ReactNode } from "react";
import { landingContent, localePrefixRe, type LandingContent, type LandingLocale } from "./content";

type LandingContextValue = { locale: LandingLocale; content: LandingContent };

const LandingContext = createContext<LandingContextValue>({ locale: "en", content: landingContent.en });

export function LandingProvider({ locale, children }: { locale: LandingLocale; children: ReactNode }) {
  return (
    <LandingContext.Provider value={{ locale, content: landingContent[locale] }}>
      {children}
    </LandingContext.Provider>
  );
}

export function useLanding() {
  return useContext(LandingContext);
}

/** `/vs/shopify` → `/ru/vs/shopify` for Russian, `/tr/vs/shopify` for Turkish. */
export function localizedPath(locale: LandingLocale, path: string): string {
  if (locale === "en") return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Strip the locale prefix so the same page can be linked in another language. */
export function unlocalizedPath(pathname: string): string {
  const stripped = pathname.replace(localePrefixRe, "");
  return stripped || "/";
}

/** Client-side title/description; prerendered HTML already has them in <head>. */
export function useDocumentMeta(title: string, description: string, locale: LandingLocale) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description, locale]);
}
