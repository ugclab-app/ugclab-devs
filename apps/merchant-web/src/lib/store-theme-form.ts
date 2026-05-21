import type { HomeSection, NavLink, SocialLinks, StoreTheme } from "@ugclab/tenant/store-theme";

function isoFromDatetimeLocal(v: FormDataEntryValue | null): string | undefined {
  const raw = String(v ?? "").trim();
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function parseNavLinksFromForm(fd: FormData): NavLink[] | undefined {
  const raw = String(fd.get("navLinksJson") ?? "").trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw) as NavLink[];
      if (!Array.isArray(arr)) return undefined;
      const links: NavLink[] = [];
      for (const l of arr) {
        const label = String(l.label ?? "").trim();
        let path = String(l.path ?? "").trim();
        if (!label || !path) continue;
        if (!path.startsWith("/")) path = `/${path}`;
        links.push({
          label,
          path,
          header: l.header !== false,
          footer: l.footer === true,
        });
      }
      return links.length > 0 ? links : undefined;
    } catch {
      /* fall through */
    }
  }
  const legacy: NavLink[] = [];
  for (let i = 0; i < 20; i++) {
    const label = String(fd.get(`nav_${i}_label`) ?? "").trim();
    const path = String(fd.get(`nav_${i}_path`) ?? "").trim();
    if (!label || !path) continue;
    legacy.push({
      label,
      path: path.startsWith("/") ? path : `/${path}`,
      header: fd.get(`nav_${i}_header`) === "on",
      footer: fd.get(`nav_${i}_footer`) === "on",
    });
  }
  return legacy.length > 0 ? legacy : undefined;
}

export function buildThemeFromForm(fd: FormData): StoreTheme {
  const sections: HomeSection[] = [];
  if (fd.get("section_hero") === "on") sections.push("hero");
  if (fd.get("section_new_arrivals") === "on") sections.push("new_arrivals");
  if (fd.get("section_sale") === "on") sections.push("sale");
  if (fd.get("section_products") === "on") sections.push("products");

  const social: SocialLinks = {
    instagram: String(fd.get("socialInstagram") ?? "").trim() || undefined,
    telegram: String(fd.get("socialTelegram") ?? "").trim() || undefined,
    tiktok: String(fd.get("socialTiktok") ?? "").trim() || undefined,
  };
  const hasSocial = Boolean(social.instagram || social.telegram || social.tiktok);

  return {
    announcementEnabled: fd.get("announcementEnabled") === "on",
    announcementText: String(fd.get("announcementText") ?? "").trim() || undefined,
    announcementColor: String(fd.get("announcementColor") ?? "").trim() || undefined,
    announcementStartsAt: isoFromDatetimeLocal(fd.get("announcementStartsAt")),
    announcementEndsAt: isoFromDatetimeLocal(fd.get("announcementEndsAt")),
    heroTitle: String(fd.get("heroTitle") ?? "").trim() || undefined,
    heroSubtitle: String(fd.get("heroSubtitle") ?? "").trim() || undefined,
    heroBannerUrl: String(fd.get("heroBannerUrl") ?? "").trim() || undefined,
    heroCollectionSlug: String(fd.get("heroCollectionSlug") ?? "").trim() || undefined,
    homeSections: sections.length > 0 ? sections : ["hero", "products"],
    secondaryColor: String(fd.get("secondaryColor") ?? "#6d28d9"),
    fontFamily: String(fd.get("fontFamily") ?? ""),
    buttonStyle: String(fd.get("buttonStyle") ?? "rounded") as StoreTheme["buttonStyle"],
    containerMaxPx: parseInt(String(fd.get("containerMaxPx") ?? "1440"), 10) || 1440,
    navLinks: parseNavLinksFromForm(fd),
    hideDefaultNav: fd.get("hideDefaultNav") === "on",
    faviconUrl: String(fd.get("faviconUrl") ?? "").trim() || undefined,
    socialLinks: hasSocial ? social : undefined,
    storeClosed: fd.get("storeClosed") === "on",
    storeClosedMessage: String(fd.get("storeClosedMessage") ?? "").trim() || undefined,
    customCss: String(fd.get("customCss") ?? "").trim() || undefined,
    trustBadgesEnabled: fd.get("trustBadgesEnabled") === "on",
    stripeTaxEnabled: fd.get("stripeTaxEnabled") === "on",
    stripeLinkEnabled: fd.get("stripeLinkEnabled") === "on",
    shippingCarrierLabel: String(fd.get("shippingCarrierLabel") ?? "").trim() || undefined,
    checkoutButtonText: String(fd.get("checkoutButtonText") ?? "").trim() || undefined,
    checkoutRequireName: fd.get("checkoutRequireName") === "on",
    checkoutRequirePhone: fd.get("checkoutRequirePhone") === "on",
    pageBgColor: String(fd.get("pageBgColor") ?? "").trim() || undefined,
    pageBgImage: String(fd.get("pageBgImage") ?? "").trim() || undefined,
    blockGap: (String(fd.get("blockGap") ?? "md") || "md") as StoreTheme["blockGap"],
    scrollAnimation: (String(fd.get("scrollAnimation") ?? "none") || "none") as StoreTheme["scrollAnimation"],
    liveChatProvider: (() => {
      const p = String(fd.get("liveChatProvider") ?? "none");
      return p === "crisp" || p === "intercom" || p === "custom" || p === "none"
        ? p
        : "none";
    })(),
    liveChatId: String(fd.get("liveChatId") ?? "").trim() || undefined,
    liveChatSnippet: String(fd.get("liveChatSnippet") ?? "").trim() || undefined,
    cookieConsentEnabled: fd.get("cookieConsentEnabled") !== "off",
    cookieConsentMessage:
      String(fd.get("cookieConsentMessage") ?? "").trim() || undefined,
  };
}
