export type HomeSection =
  | "hero"
  | "products"
  | "new_arrivals"
  | "sale"
  | "text_banner"
  | "featured_collection"
  | "faq"
  | "reviews"
  | "html"
  | "video"
  | "cta"
  | "image_text"
  | "gallery"
  | "features"
  | "spacer"
  | "divider"
  | "newsletter"
  | "map"
  | "countdown"
  | "logos"
  | "pricing"
  | "columns"
  | "discount_popup";

export type FaqItem = { question: string; answer: string };
export type FeatureItem = { title: string; text: string };
export type ColumnItem = { title?: string; text?: string; imageUrl?: string };
export type PricingItem = {
  name: string;
  price: string;
  description?: string;
  features?: string[];
  ctaLabel?: string;
  highlighted?: boolean;
};
export type BlockAlign = "left" | "center" | "right";
export type BlockPadding = "none" | "sm" | "md" | "lg" | "xl";
export type BlockWidth = "full" | "boxed";
export type ScrollAnimation = "none" | "fade" | "slide";

export type HomeBlock = {
  id: string;
  type: HomeSection;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  htmlContent?: string;
  faqItems?: FaqItem[];
  features?: FeatureItem[];
  columns?: ColumnItem[];
  columnCount?: 2 | 3 | 4;
  galleryUrls?: string[];
  logoUrls?: string[];
  pricingItems?: PricingItem[];
  collectionSlug?: string;
  ctaLabel?: string;
  ctaPath?: string;
  align?: BlockAlign;
  bgColor?: string;
  textColor?: string;
  paddingY?: BlockPadding;
  contentWidth?: BlockWidth;
  imagePosition?: "left" | "right";
  spacerHeight?: number;
  mapEmbedUrl?: string;
  countdownEndsAt?: string;
  /** Discount popup: seconds before show (default 3) */
  popupDelaySec?: number;
  /** Discount popup: promo code shown to customer */
  discountCode?: string;
};

export function blockPaddingClass(padding?: BlockPadding): string {
  switch (padding) {
    case "none":
      return "py-0";
    case "sm":
      return "py-6";
    case "lg":
      return "py-16";
    case "xl":
      return "py-24";
    case "md":
    default:
      return "py-10";
  }
}

export function blockGapClass(gap?: BlockPadding): string {
  switch (gap) {
    case "none":
      return "store-home-gap-none";
    case "sm":
      return "store-home-gap-sm";
    case "lg":
      return "store-home-gap-lg";
    case "xl":
      return "store-home-gap-xl";
    case "md":
    default:
      return "store-home-gap-md";
  }
}

export type ButtonStyle = "rounded" | "pill" | "square";

export type NavLink = {
  label: string;
  path: string;
  header?: boolean;
  footer?: boolean;
};

export type SocialLinks = {
  instagram?: string;
  telegram?: string;
  tiktok?: string;
};

export type CustomThemePreset = {
  id: string;
  label: string;
  savedAt: string;
  primaryColor: string;
  homeBlocks: HomeBlock[];
  theme: Partial<
    Pick<
      StoreTheme,
      | "secondaryColor"
      | "fontFamily"
      | "buttonStyle"
      | "pageBgColor"
      | "blockGap"
      | "scrollAnimation"
    >
  >;
};

export type StoreTheme = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroBannerUrl?: string;
  heroCollectionSlug?: string;
  homeSections?: HomeSection[];
  homeBlocks?: HomeBlock[];
  pageBgColor?: string;
  pageBgImage?: string;
  blockGap?: BlockPadding;
  scrollAnimation?: ScrollAnimation;
  announcementText?: string;
  announcementEnabled?: boolean;
  announcementColor?: string;
  announcementStartsAt?: string;
  announcementEndsAt?: string;
  secondaryColor?: string;
  fontFamily?: string;
  buttonStyle?: ButtonStyle;
  containerMaxPx?: number;
  navLinks?: NavLink[];
  hideDefaultNav?: boolean;
  faviconUrl?: string;
  socialLinks?: SocialLinks;
  storeClosed?: boolean;
  storeClosedMessage?: string;
  customCss?: string;
  trustBadgesEnabled?: boolean;
  /** Visual blocks per CMS page slug (`/pages/about`) */
  pageBlocks?: Record<string, HomeBlock[]>;
  /** Hero block per collection slug */
  collectionHeroes?: Record<string, HomeBlock>;
  /** SEO overrides per collection slug */
  collectionSeo?: Record<string, { seoTitle?: string; seoDescription?: string }>;
  /** Merchant-saved theme presets */
  customThemePresets?: CustomThemePreset[];
  /** Use Stripe Checkout automatic tax (requires Stripe Tax on account) */
  stripeTaxEnabled?: boolean;
  /** Stripe Link (https://link.com) one-click at Checkout */
  stripeLinkEnabled?: boolean;
  /** Label shown at checkout, e.g. "Standard shipping (3–5 days)" */
  shippingCarrierLabel?: string;
  checkoutButtonText?: string;
  checkoutRequireName?: boolean;
  checkoutRequirePhone?: boolean;
  /** Live chat: crisp | intercom | custom script snippet */
  liveChatProvider?: "none" | "crisp" | "intercom" | "custom";
  /** Crisp website ID or Intercom app_id */
  liveChatId?: string;
  /** Custom: paste full script tag HTML from Crisp/Intercom/other */
  liveChatSnippet?: string;
  /** EU/UK cookie banner on storefront */
  cookieConsentEnabled?: boolean;
  cookieConsentMessage?: string;
};

export const DEFAULT_STORE_THEME: Required<
  Pick<
    StoreTheme,
    "homeSections" | "buttonStyle" | "containerMaxPx" | "fontFamily" | "secondaryColor"
  >
> = {
  homeSections: ["hero", "products"],
  buttonStyle: "rounded",
  containerMaxPx: 1440,
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  secondaryColor: "#6d28d9",
};

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 320 || n > 2400) return fallback;
  return n;
}

const HOME_SECTIONS = new Set<HomeSection>([
  "hero",
  "products",
  "new_arrivals",
  "sale",
  "text_banner",
  "featured_collection",
  "faq",
  "reviews",
  "html",
  "video",
  "cta",
  "image_text",
  "gallery",
  "features",
  "spacer",
  "divider",
  "newsletter",
  "map",
  "countdown",
  "logos",
  "pricing",
  "columns",
  "discount_popup",
]);

function parseAlign(v: unknown): BlockAlign | undefined {
  return v === "left" || v === "center" || v === "right" ? v : undefined;
}

function parsePadding(v: unknown): BlockPadding | undefined {
  return v === "none" || v === "sm" || v === "md" || v === "lg" || v === "xl" ? v : undefined;
}

function parseScrollAnimation(v: unknown): ScrollAnimation | undefined {
  return v === "fade" || v === "slide" || v === "none" ? v : undefined;
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const urls = (raw as unknown[]).map((x) => str(x)).filter(Boolean) as string[];
  return urls.length > 0 ? urls : undefined;
}

function parseFeatures(raw: unknown): FeatureItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FeatureItem[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    const title = str(row.title);
    const text = str(row.text) ?? str(row.description);
    if (title && text) items.push({ title, text });
  }
  return items.length > 0 ? items : undefined;
}

function parseColumns(raw: unknown): ColumnItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: ColumnItem[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    items.push({
      title: str(row.title),
      text: str(row.text),
      imageUrl: str(row.imageUrl),
    });
  }
  return items.length > 0 ? items : undefined;
}

function parsePricing(raw: unknown): PricingItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: PricingItem[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    const name = str(row.name);
    const price = str(row.price);
    if (!name || !price) continue;
    const features = Array.isArray(row.features)
      ? (row.features as unknown[]).map((f) => str(f)).filter(Boolean)
      : undefined;
    items.push({
      name,
      price,
      description: str(row.description),
      features: features?.length ? (features as string[]) : undefined,
      ctaLabel: str(row.ctaLabel),
      highlighted: row.highlighted === true,
    });
  }
  return items.length > 0 ? items : undefined;
}

function parseFaqItems(raw: unknown): FaqItem[] | undefined {
  if (Array.isArray(raw)) {
    const items: FaqItem[] = [];
    for (const row of raw as Record<string, unknown>[]) {
      const question = str(row.question);
      const answer = str(row.answer);
      if (question && answer) items.push({ question, answer });
    }
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function parseHomeBlocks(raw: unknown): HomeBlock[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks: HomeBlock[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    const type = row.type as HomeSection;
    if (!HOME_SECTIONS.has(type)) continue;
    const cc = row.columnCount;
    const columnCount =
      cc === 2 || cc === 3 || cc === 4 ? cc : parseInt(String(cc), 10);
    blocks.push({
      id: str(row.id) ?? `block_${Math.random().toString(36).slice(2, 9)}`,
      type,
      title: str(row.title),
      subtitle: str(row.subtitle),
      body: str(row.body),
      imageUrl: str(row.imageUrl),
      videoUrl: str(row.videoUrl),
      htmlContent: str(row.htmlContent),
      faqItems: parseFaqItems(row.faqItems),
      features: parseFeatures(row.features),
      columns: parseColumns(row.columns),
      columnCount:
        columnCount === 2 || columnCount === 3 || columnCount === 4
          ? columnCount
          : undefined,
      galleryUrls: parseStringArray(row.galleryUrls),
      logoUrls: parseStringArray(row.logoUrls),
      pricingItems: parsePricing(row.pricingItems),
      collectionSlug: str(row.collectionSlug),
      ctaLabel: str(row.ctaLabel),
      ctaPath: str(row.ctaPath),
      align: parseAlign(row.align),
      bgColor: str(row.bgColor),
      textColor: str(row.textColor),
      paddingY: parsePadding(row.paddingY),
      contentWidth:
        row.contentWidth === "full" ? "full" : row.contentWidth === "boxed" ? "boxed" : undefined,
      imagePosition:
        row.imagePosition === "right" ? "right" : row.imagePosition === "left" ? "left" : undefined,
      spacerHeight:
        typeof row.spacerHeight === "number" && row.spacerHeight > 0
          ? row.spacerHeight
          : parseInt(String(row.spacerHeight ?? ""), 10) || undefined,
      mapEmbedUrl: str(row.mapEmbedUrl),
      countdownEndsAt: str(row.countdownEndsAt),
      popupDelaySec:
        typeof row.popupDelaySec === "number" && row.popupDelaySec >= 0
          ? row.popupDelaySec
          : parseInt(String(row.popupDelaySec ?? ""), 10) || undefined,
      discountCode: str(row.discountCode),
    });
  }
  return blocks.length > 0 ? blocks : undefined;
}

function parsePageBlocks(raw: unknown): Record<string, HomeBlock[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, HomeBlock[]> = {};
  for (const [slug, val] of Object.entries(raw as Record<string, unknown>)) {
    const blocks = parseHomeBlocks(val);
    if (blocks?.length) out[slug] = blocks;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseCollectionHeroes(raw: unknown): Record<string, HomeBlock> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, HomeBlock> = {};
  for (const [slug, val] of Object.entries(raw as Record<string, unknown>)) {
    const blocks = parseHomeBlocks([val]);
    if (blocks?.[0]) out[slug] = blocks[0]!;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseCollectionSeo(
  raw: unknown
): Record<string, { seoTitle?: string; seoDescription?: string }> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, { seoTitle?: string; seoDescription?: string }> = {};
  for (const [slug, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const row = val as Record<string, unknown>;
    const seoTitle = str(row.seoTitle);
    const seoDescription = str(row.seoDescription);
    if (seoTitle || seoDescription) {
      out[slug] = { seoTitle, seoDescription };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseCustomThemePresets(raw: unknown): CustomThemePreset[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const presets: CustomThemePreset[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    const id = str(row.id);
    const label = str(row.label);
    const homeBlocks = parseHomeBlocks(row.homeBlocks);
    if (!id || !label || !homeBlocks?.length) continue;
    presets.push({
      id,
      label,
      savedAt: str(row.savedAt) ?? new Date().toISOString(),
      primaryColor: str(row.primaryColor) ?? "#7c3aed",
      homeBlocks,
      theme: {
        secondaryColor: str((row.theme as Record<string, unknown>)?.secondaryColor),
        fontFamily: str((row.theme as Record<string, unknown>)?.fontFamily),
        buttonStyle:
          (row.theme as Record<string, unknown>)?.buttonStyle === "pill" ||
          (row.theme as Record<string, unknown>)?.buttonStyle === "square" ||
          (row.theme as Record<string, unknown>)?.buttonStyle === "rounded"
            ? ((row.theme as Record<string, unknown>).buttonStyle as StoreTheme["buttonStyle"])
            : undefined,
        pageBgColor: str((row.theme as Record<string, unknown>)?.pageBgColor),
        blockGap: parsePadding((row.theme as Record<string, unknown>)?.blockGap),
        scrollAnimation: parseScrollAnimation(
          (row.theme as Record<string, unknown>)?.scrollAnimation
        ),
      },
    });
  }
  return presets.length > 0 ? presets : undefined;
}

function parseSocialLinks(raw: unknown): SocialLinks | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const links: SocialLinks = {
    instagram: str(s.instagram),
    telegram: str(s.telegram),
    tiktok: str(s.tiktok),
  };
  if (!links.instagram && !links.telegram && !links.tiktok) return undefined;
  return links;
}

export function resolveHomeBlocks(theme: StoreTheme): HomeBlock[] {
  if (theme.homeBlocks?.length) return theme.homeBlocks;
  const sections = theme.homeSections ?? DEFAULT_STORE_THEME.homeSections;
  return sections.map((type, i) => ({
    id: `legacy_${type}_${i}`,
    type,
    ...(type === "hero"
      ? {
          title: theme.heroTitle,
          subtitle: theme.heroSubtitle,
          imageUrl: theme.heroBannerUrl,
          collectionSlug: theme.heroCollectionSlug,
        }
      : {}),
  }));
}

export function cloneBlocks(blocks: HomeBlock[]): HomeBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as HomeBlock[];
}

export function reidBlocks(blocks: HomeBlock[]): HomeBlock[] {
  return blocks.map((b) => ({
    ...b,
    id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  }));
}

/** Custom announcement is active for the current instant (UTC ISO strings). */
export function isAnnouncementActive(theme: StoreTheme, at = new Date()): boolean {
  if (!theme.announcementEnabled || !theme.announcementText) return false;
  const start = theme.announcementStartsAt
    ? new Date(theme.announcementStartsAt)
    : null;
  const end = theme.announcementEndsAt ? new Date(theme.announcementEndsAt) : null;
  if (start && !Number.isNaN(start.getTime()) && at < start) return false;
  if (end && !Number.isNaN(end.getTime()) && at > end) return false;
  return true;
}

export function parseStoreTheme(raw: unknown): StoreTheme {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STORE_THEME };
  }
  const t = raw as Record<string, unknown>;
  const sections = Array.isArray(t.homeSections)
    ? (t.homeSections as string[]).filter((s): s is HomeSection =>
        HOME_SECTIONS.has(s as HomeSection)
      )
    : DEFAULT_STORE_THEME.homeSections;

  const buttonStyle =
    t.buttonStyle === "pill" || t.buttonStyle === "square" || t.buttonStyle === "rounded"
      ? t.buttonStyle
      : DEFAULT_STORE_THEME.buttonStyle;

  const navLinks = Array.isArray(t.navLinks)
    ? (t.navLinks as Record<string, unknown>[])
        .map((l) => ({
          label: str(l.label) ?? "",
          path: str(l.path) ?? "",
          header: l.header !== false,
          footer: l.footer === true,
        }))
        .filter((l) => l.label && l.path)
    : undefined;

  const homeBlocks = parseHomeBlocks(t.homeBlocks);

  return {
    heroTitle: str(t.heroTitle),
    heroSubtitle: str(t.heroSubtitle),
    heroBannerUrl: str(t.heroBannerUrl),
    heroCollectionSlug: str(t.heroCollectionSlug),
    homeSections: sections.length > 0 ? sections : DEFAULT_STORE_THEME.homeSections,
    homeBlocks,
    pageBgColor: str(t.pageBgColor),
    pageBgImage: str(t.pageBgImage),
    blockGap: parsePadding(t.blockGap),
    scrollAnimation: parseScrollAnimation(t.scrollAnimation),
    announcementText: str(t.announcementText),
    announcementEnabled: t.announcementEnabled === true,
    announcementColor: str(t.announcementColor),
    announcementStartsAt: str(t.announcementStartsAt),
    announcementEndsAt: str(t.announcementEndsAt),
    secondaryColor: str(t.secondaryColor) ?? DEFAULT_STORE_THEME.secondaryColor,
    fontFamily: str(t.fontFamily) ?? DEFAULT_STORE_THEME.fontFamily,
    buttonStyle,
    containerMaxPx: num(t.containerMaxPx, DEFAULT_STORE_THEME.containerMaxPx),
    navLinks,
    hideDefaultNav: t.hideDefaultNav === true,
    faviconUrl: str(t.faviconUrl),
    socialLinks: parseSocialLinks(t.socialLinks),
    storeClosed: t.storeClosed === true,
    storeClosedMessage: str(t.storeClosedMessage),
    customCss: str(t.customCss),
    trustBadgesEnabled: t.trustBadgesEnabled === true,
    pageBlocks: parsePageBlocks(t.pageBlocks),
    collectionHeroes: parseCollectionHeroes(t.collectionHeroes),
    collectionSeo: parseCollectionSeo(t.collectionSeo),
    customThemePresets: parseCustomThemePresets(t.customThemePresets),
    stripeTaxEnabled: t.stripeTaxEnabled === true,
    stripeLinkEnabled: t.stripeLinkEnabled !== false,
    shippingCarrierLabel: str(t.shippingCarrierLabel),
    checkoutButtonText: str(t.checkoutButtonText),
    checkoutRequireName: t.checkoutRequireName === true,
    checkoutRequirePhone: t.checkoutRequirePhone === true,
    liveChatProvider:
      t.liveChatProvider === "crisp" ||
      t.liveChatProvider === "intercom" ||
      t.liveChatProvider === "custom"
        ? t.liveChatProvider
        : t.liveChatProvider === "none"
          ? "none"
          : undefined,
    liveChatId: str(t.liveChatId),
    liveChatSnippet: str(t.liveChatSnippet),
    cookieConsentEnabled: t.cookieConsentEnabled !== false,
    cookieConsentMessage: str(t.cookieConsentMessage),
  };
}

export function storeThemeCssVars(
  theme: StoreTheme,
  primaryColor: string
): Record<string, string> {
  const secondary = theme.secondaryColor ?? DEFAULT_STORE_THEME.secondaryColor;
  return {
    "--store-primary": primaryColor,
    "--store-primary-hover": secondary,
    "--store-secondary": secondary,
    "--store-container-max": `${theme.containerMaxPx ?? DEFAULT_STORE_THEME.containerMaxPx}px`,
    fontFamily: theme.fontFamily ?? DEFAULT_STORE_THEME.fontFamily,
  };
}

export function storeButtonClass(theme: StoreTheme): string {
  if (theme.buttonStyle === "pill") return "store-btn-style-pill";
  if (theme.buttonStyle === "square") return "store-btn-style-square";
  return "store-btn-style-rounded";
}
