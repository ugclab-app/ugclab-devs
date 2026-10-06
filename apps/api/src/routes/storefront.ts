import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  OrderStatus,
  prisma,
  ProductStatus,
  ProductType,
  PromotionType,
} from "@ugclab/database";
import { getMessages, localizeStoreTheme } from "@ugclab/i18n";
import { hash, compare } from "bcryptjs";
import { validateDiscountCode } from "../lib/checkout.js";
import { validateGiftCard } from "../lib/gift-card.js";
import {
  parseIntegrations,
  parsePostCheckoutUpsell,
  publicIntegrations,
} from "../lib/growth-settings.js";
import { getCollectionProducts } from "../lib/store-collections.js";
import { getUploadRoot } from "../lib/uploads.js";
import {
  cartKey,
  CUSTOMER_COOKIE,
  getCart,
  resolveTenantBySlug,
  setCart,
} from "../lib/store-cart.js";
import {
  addCartItem,
  placeStoreOrder,
  removeCartItem,
  updateCartItem,
} from "../lib/store-place-order.js";
import { syncAbandonedCart } from "../lib/abandoned-cart.js";
import {
  ensureDefaultAutomations,
  triggerWelcomeEmail,
} from "../lib/email-automations.js";
import { isAnnouncementActive, parseStoreTheme } from "../lib/store-theme.js";
import { resolveStorefrontThemeRaw } from "../lib/storefront-theme-resolve.js";
import { buildProductSearchWhere } from "../lib/product-search.js";
import { displayCurrencyMeta, priceForDisplay } from "../lib/store-display-currency.js";
import { filterCatalog, paginate, parseMajorToCents } from "../lib/catalog-list.js";
import { priceForCountry } from "../lib/country-price.js";
import { parseStoreMarkets } from "../lib/store-markets.js";
import { registerBuyerRoutes } from "./storefront-buyer.js";
import { resolveTenantFromHost } from "@ugclab/tenant";
import { isMorPaymentModel } from "../lib/payment-model.js";
import {
  isGoPayConfigured,
  shouldUseGoPayCheckout,
} from "../lib/gopay/config.js";
import {
  isFinikConfigured,
  shouldUseFinikCheckout,
} from "../lib/finik/config.js";
import { isStripeConfigured } from "../lib/stripe.js";
import {
  buildPageSeo,
  storePagePublicWhere,
} from "../lib/store-page.js";
import {
  getAffiliateProgramSettings,
  normalizeAffiliateCode,
  resolveAffiliatePartner,
  setAffiliateAttributionCookie,
} from "../lib/affiliate.js";

const store = new Hono();

function tenantSlug(c: { req: { query: (k: string) => string | undefined } }) {
  return String(c.req.query("tenant") ?? "demo").toLowerCase();
}

function pickLocale(settings: { defaultLocale: string; enabledLocales: string[] } | null, q?: string) {
  const enabled = settings?.enabledLocales?.length ? settings.enabledLocales : ["en"];
  const locale = q ?? settings?.defaultLocale ?? "en";
  return enabled.includes(locale) ? locale : settings?.defaultLocale ?? "en";
}

function mapProduct(p: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ProductType;
  priceAmount: number;
  compareAt?: number | null;
  inventory?: number | null;
  translations?: unknown;
  images?: { storageKey: string }[];
  variants?: { id: string }[];
}) {
  const variantCount = p.variants?.length ?? 0;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    type: p.type,
    priceAmount: p.priceAmount,
    compareAt: p.compareAt ?? null,
    translations: p.translations,
    imageKey: p.images?.[0]?.storageKey ?? null,
    inventory: p.inventory ?? null,
    variantCount,
    defaultVariantId: p.variants?.[0]?.id ?? null,
    quickAdd:
      variantCount <= 1 &&
      !(p.type === "PHYSICAL" && p.inventory != null && p.inventory <= 0),
  };
}

const STORE_GATE_COOKIE = "ugclab_store_gate";

function storeGateToken(hash: string) {
  return createHash("sha256").update(`store-gate:${hash}`).digest("hex");
}

function storeGateOpen(
  cookie: string | undefined,
  tenantId: string,
  passwordHash: string | null | undefined
) {
  if (!passwordHash) return true;
  const raw = cookie ?? "";
  const dot = raw.indexOf(".");
  if (dot < 0) return false;
  return raw.slice(0, dot) === tenantId && raw.slice(dot + 1) === storeGateToken(passwordHash);
}

function localize<T extends { title: string; description: string | null; translations?: unknown }>(
  product: T,
  locale: string
): T {
  const tr = product.translations as Record<string, { title?: string; description?: string }> | null;
  const loc = tr?.[locale];
  if (!loc) return product;
  return {
    ...product,
    title: loc.title?.trim() || product.title,
    description: loc.description?.trim() || product.description,
  };
}

store.get("/context", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const [collections, storePages, promotions] = await Promise.all([
    prisma.collection.findMany({
      where: { tenantId: tenant.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, description: true },
    }),
    prisma.storePage.findMany({
      where: storePagePublicWhere(tenant.id, { pageType: "PAGE" }),
      orderBy: { title: "asc" },
      select: { title: true, slug: true },
    }),
    prisma.storePromotion.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cart = getCart(c).filter((i) => i.tenantId === tenant.id);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const currency = tenant.settings?.currency ?? "USD";
  const requestedCurrency = c.req.query("currency");
  const { displayCurrency, baseCurrency, showConversion, currencies } = displayCurrencyMeta(
    locale,
    tenant.settings,
    requestedCurrency
  );
  const sf = getMessages(locale).storefront;

  const preview = c.req.query("preview") === "1";
  const themePreviewId = c.req.query("themePreview")?.trim() || "";
  let themeRaw = resolveStorefrontThemeRaw(c, tenant.settings, preview);

  let primaryColor = tenant.settings?.primaryColor ?? "#7c3aed";
  let themeDemoLabel: string | null = null;

  if (themePreviewId) {
    const { getThemeDemoOverlay } = await import("../data/theme-demo-overlays.js");
    const overlay = getThemeDemoOverlay(themePreviewId);
    if (overlay) {
      const base =
        themeRaw && typeof themeRaw === "object"
          ? (themeRaw as Record<string, unknown>)
          : {};
      themeRaw = { ...base, ...overlay.themePatch };
      primaryColor = overlay.primaryColor;
      themeDemoLabel = overlay.label;
    }
  }

  const theme = localizeStoreTheme(parseStoreTheme(themeRaw), locale);
  const now = new Date();
  const activePromotions = promotions.filter(
    (p) =>
      (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now)
  );
  const promoAnnouncements = activePromotions
    .map((p) => {
      if (p.type === PromotionType.CART_PERCENT && p.value > 0) {
        const min =
          p.minOrderAmount != null
            ? sf.promo.percentOffMin
                .replace("{{amount}}", String((p.minOrderAmount / 100).toFixed(0)))
                .replace("{{currency}}", currency)
            : "";
        return sf.promo.percentOff.replace("{{value}}", String(p.value)).replace("{{min}}", min);
      }
      if (p.type === PromotionType.FREE_SHIPPING) {
        const min =
          p.minOrderAmount != null
            ? sf.promo.freeShippingMin
                .replace("{{amount}}", String((p.minOrderAmount / 100).toFixed(0)))
                .replace("{{currency}}", currency)
            : "";
        return sf.promo.freeShipping.replace("{{min}}", min);
      }
      return null;
    })
    .filter(Boolean) as string[];

  const announcements = [...promoAnnouncements];
  if (isAnnouncementActive(theme)) {
    announcements.unshift(theme.announcementText!);
  }

  const featuredCollection = theme.heroCollectionSlug
    ? collections.find((c) => c.slug === theme.heroCollectionSlug) ?? null
    : null;

  const { activeAddonIds, getGiftWrapOffer } = await import("../lib/marketplace.js");
  const installedApps = [...(await activeAddonIds(tenant.id, "APP"))];
  const giftWrap = await getGiftWrapOffer(tenant.id);

  const passwordHash = tenant.settings?.storefrontPasswordHash ?? null;
  const previewing = Boolean(c.req.query("themePreview"));
  return c.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    addons: installedApps,
    giftWrap,
    passwordLocked:
      Boolean(passwordHash) &&
      !previewing &&
      !storeGateOpen(getCookie(c, STORE_GATE_COOKIE), tenant.id, passwordHash),
    locale,
    currency: displayCurrency,
    baseCurrency,
    displayCurrencies: currencies,
    marketCountries: [
      ...new Set(
        parseStoreMarkets(tenant.settings?.markets).flatMap((m) => m.countries)
      ),
    ],
    showCurrencyConversion: showConversion,
    primaryColor,
    themeDemoLabel,
    logoUrl: tenant.settings?.logoUrl,
    enabledLocales: tenant.settings?.enabledLocales ?? ["en"],
    collections,
    storePages,
    announcements,
    theme,
    featuredCollection,
    cartCount,
    cartLabel: sf.cart,
    settings: tenant.settings,
    integrations: publicIntegrations(tenant.settings?.integrations),
    postCheckoutUpsell: parsePostCheckoutUpsell(
      tenant.settings?.postCheckoutUpsell
    ),
    checkoutGuestLookup: tenant.settings?.checkoutGuestLookup !== false,
    checkoutFooterText: tenant.settings?.checkoutFooterText ?? null,
    payments: {
      stripeLive: isMorPaymentModel()
        ? isStripeConfigured()
        : Boolean(
            process.env.STRIPE_SECRET_KEY &&
              tenant.stripeAccountId &&
              tenant.stripeChargesEnabled
          ),
      finikLive: shouldUseFinikCheckout(tenant.settings?.currency ?? "USD"),
      gopayLive:
        !shouldUseFinikCheckout(tenant.settings?.currency ?? "USD") &&
        isGoPayConfigured() &&
        shouldUseGoPayCheckout(tenant.settings?.currency ?? "USD"),
      paymentModel: isMorPaymentModel() ? "mor" : "connect",
      demoMode:
        !isFinikConfigured() &&
        !isGoPayConfigured() &&
        !process.env.STRIPE_SECRET_KEY &&
        !(isMorPaymentModel() && isStripeConfigured()),
    },
  });
});

store.get("/resolve-host", async (c) => {
  const host =
    c.req.query("host") ?? c.req.header("host") ?? "";
  const baseDomain = process.env.STORE_BASE_DOMAIN ?? process.env.STOREFRONT_BASE_DOMAIN;
  const resolved = await resolveTenantFromHost({
    host,
    baseDomain,
    queryTenant: null,
  });
  if (!resolved) return c.json({ error: "Store not found" }, 404);
  return c.json({ slug: resolved.slug, name: resolved.name });
});

/** MCP-style product feed for AI assistants when enabled in Growth → Integrations. */
store.get("/ai-catalog", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const integrations = parseIntegrations(tenant.settings?.integrations);
  if (!integrations.aiCatalogEnabled) {
    return c.json({ error: "AI catalog disabled" }, 403);
  }
  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const { displayCurrency } = displayCurrencyMeta(locale, tenant.settings);
  const rawProducts = await prisma.product.findMany({
    where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: { select: { id: true }, orderBy: { title: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const checkoutBaseUrl = `${base.replace(/\/$/, "")}/checkout?tenant=${encodeURIComponent(tenant.slug)}`;
  const storefrontBaseUrl = `${base.replace(/\/$/, "")}?tenant=${encodeURIComponent(tenant.slug)}`;
  return c.json({
    store: { name: tenant.name, slug: tenant.slug, currency: displayCurrency },
    checkoutBaseUrl,
    storefrontBaseUrl,
    products: rawProducts.map((p) => {
      const mapped = priceForDisplay(
        localize(mapProduct(p), locale),
        locale,
        tenant.settings
      );
      return {
        id: mapped.id,
        slug: mapped.slug,
        title: mapped.title,
        description: mapped.description,
        priceAmount: mapped.priceAmount,
        currency: displayCurrency,
        url: `${storefrontBaseUrl}&path=${encodeURIComponent(`/products/${mapped.slug}`)}`,
        inStock:
          p.type !== ProductType.PHYSICAL ||
          p.inventory == null ||
          p.inventory > 0,
      };
    }),
  });
});

store.get("/products", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const q = c.req.query("q")?.trim();
  const sort = c.req.query("sort");
  const typeFilter = c.req.query("type");
  const tag = c.req.query("tag");
  const requestedCurrency = c.req.query("currency");
  const country = c.req.query("country");
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(
    locale,
    tenant.settings,
    requestedCurrency
  );

  let orderBy: { createdAt?: "desc"; priceAmount?: "asc" | "desc" } = {
    createdAt: "desc",
  };
  if (sort === "price_asc") orderBy = { priceAmount: "asc" };
  if (sort === "price_desc") orderBy = { priceAmount: "desc" };

  const productType =
    typeFilter && Object.values(ProductType).includes(typeFilter as ProductType)
      ? (typeFilter as ProductType)
      : undefined;

  const featured = c.req.query("featured");
  const saleFilter = featured === "sale";
  const newArrivals = featured === "new_arrivals";

  const [rawProducts, tagRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        status: ProductStatus.ACTIVE,
        ...(productType ? { type: productType } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(saleFilter ? { compareAt: { not: null } } : {}),
        ...(q ? buildProductSearchWhere(q) : {}),
      },
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        variants: { select: { id: true }, orderBy: { title: "asc" } },
      },
      orderBy,
      ...(newArrivals || saleFilter ? { take: saleFilter ? 50 : 8 } : {}),
    }),
    prisma.product.findMany({
      where: { tenantId: tenant.id, status: ProductStatus.ACTIVE },
      select: { tags: true },
    }),
  ]);

  let products = rawProducts;
  if (saleFilter) {
    products = rawProducts
      .filter((p) => p.compareAt != null && p.compareAt > p.priceAmount)
      .slice(0, 8);
  }

  const allTags = [...new Set(tagRows.flatMap((p) => p.tags))].sort();
  const mapped = filterCatalog(
    products.map((p) =>
      priceForDisplay(
        {
          ...localize(mapProduct(p), locale),
          priceAmount: priceForCountry(p.priceAmount, p.translations, country),
        },
        locale,
        tenant.settings,
        requestedCurrency
      )
    ),
    {
      minCents: parseMajorToCents(c.req.query("min")),
      maxCents: parseMajorToCents(c.req.query("max")),
      inStock: c.req.query("inStock") === "1",
    }
  );
  const page = paginate(mapped, c.req.query("page"), c.req.query("pageSize"));
  return c.json({
    currency: displayCurrency,
    baseCurrency,
    products: page.items,
    tags: allTags,
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  });
});

store.get("/products/:productSlug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const requestedCurrency = c.req.query("currency");
  const country = c.req.query("country");
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(
    locale,
    tenant.settings,
    requestedCurrency
  );
  const product = await prisma.product.findFirst({
    where: {
      tenantId: tenant.id,
      slug: c.req.param("productSlug"),
      status: ProductStatus.ACTIVE,
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { title: "asc" } },
    },
  });
  if (!product) return c.json({ error: "Not found" }, 404);

  const reviews = await prisma.productReview.findMany({
    where: { productId: product.id, approved: true },
    orderBy: [{ pinned: "desc" }, { helpfulCount: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const questions = await prisma.productQuestion.findMany({
    where: { productId: product.id, approved: true, answer: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const mapped = localize(
    {
      ...mapProduct({ ...product, images: product.images }),
      description: product.description,
    },
    locale
  );

  const translations = product.translations as Record<string, unknown> | null;
  const seoMeta = (translations?._seo as { title?: string; description?: string }) ?? {};
  const sizeChart = String(translations?._sizeChart ?? "").trim() || null;

  return c.json({
    currency: displayCurrency,
    baseCurrency,
    product: {
      ...priceForDisplay(
        {
          ...mapped,
          priceAmount: priceForCountry(product.priceAmount, product.translations, country),
        },
        locale,
        tenant.settings,
        requestedCurrency
      ),
      seoTitle: String(seoMeta.title ?? "").trim() || mapped.title,
      seoDescription: String(seoMeta.description ?? "").trim() || null,
      sizeChart,
      images: product.images.map((img) => ({
        storageKey: img.storageKey,
        alt: img.alt,
      })),
      variants: product.variants.map((v) =>
        priceForDisplay(
          { ...v, priceAmount: v.priceAmount, compareAt: null },
          locale,
          tenant.settings,
          requestedCurrency
        )
      ),
      inventory: product.inventory,
      preorderEnabled: product.preorderEnabled,
      preorderShipAt: product.preorderShipAt?.toISOString() ?? null,
      tryBeforeYouBuyEnabled: product.tryBeforeYouBuyEnabled,
      tryBeforeYouBuyDays: product.tryBeforeYouBuyDays,
      subscriptionEnabled: product.subscriptionEnabled,
      subscriptionInterval: product.subscriptionInterval,
      metafields: await prisma.metafield.findMany({
        where: {
          tenantId: tenant.id,
          ownerType: "PRODUCT",
          ownerId: product.id,
        },
        select: { namespace: true, key: true, type: true, value: true },
      }),
    },
    reviews,
    questions,
  });
});

store.get("/search/suggest", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return c.json({ suggestions: [] });

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      status: ProductStatus.ACTIVE,
      ...buildProductSearchWhere(q),
    },
    select: { id: true, title: true, slug: true, tags: true, barcode: true },
    take: 8,
    orderBy: { title: "asc" },
  });

  return c.json({
    suggestions: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      tags: p.tags,
      barcode: p.barcode,
    })),
  });
});

store.get("/products/recent", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const requestedCurrency = c.req.query("currency");
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(
    locale,
    tenant.settings,
    requestedCurrency
  );
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (ids.length === 0) return c.json({ currency: displayCurrency, products: [] });

  const raw = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, status: ProductStatus.ACTIVE },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: { select: { id: true }, orderBy: { title: "asc" } },
    },
  });
  const byId = new Map(raw.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof raw;

  return c.json({
    currency: displayCurrency,
    baseCurrency,
    products: ordered.map((p) =>
      priceForDisplay(
        localize(mapProduct(p), locale),
        locale,
        tenant.settings,
        requestedCurrency
      )
    ),
  });
});

store.post("/questions", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    authorName: string;
    authorEmail?: string;
    question: string;
  }>();
  const authorName = String(body.authorName ?? "").trim();
  const question = String(body.question ?? "").trim();
  if (!authorName || question.length < 5) {
    return c.json({ error: "Name and question (min 5 chars) required" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId: tenant.id, status: ProductStatus.ACTIVE },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  await prisma.productQuestion.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      authorName,
      authorEmail: body.authorEmail?.trim() || null,
      question,
    },
  });
  return c.json({ ok: true });
});

store.get("/collections", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const collections = await prisma.collection.findMany({
    where: { tenantId: tenant.id },
    orderBy: { title: "asc" },
  });
  return c.json({ collections });
});

store.get("/collections/:collectionSlug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const requestedCurrency = c.req.query("currency");
  const country = c.req.query("country");
  const { displayCurrency } = displayCurrencyMeta(
    locale,
    tenant.settings,
    requestedCurrency
  );

  const collection = await prisma.collection.findFirst({
    where: { tenantId: tenant.id, slug: c.req.param("collectionSlug") },
    include: { products: true },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);

  const sort = c.req.query("sort");
  let rawProducts = await getCollectionProducts(tenant.id, collection);
  if (sort === "price_asc") {
    rawProducts = [...rawProducts].sort((a, b) => a.priceAmount - b.priceAmount);
  } else if (sort === "price_desc") {
    rawProducts = [...rawProducts].sort((a, b) => b.priceAmount - a.priceAmount);
  } else if (sort === "title") {
    rawProducts = [...rawProducts].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "newest") {
    rawProducts = [...rawProducts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  const preview = c.req.query("preview") === "1";
  const themeRaw = resolveStorefrontThemeRaw(c, tenant.settings, preview);
  const theme = parseStoreTheme(themeRaw);
  const hero = theme.collectionHeroes?.[collection.slug] ?? null;
  const seo = theme.collectionSeo?.[collection.slug];
  return c.json({
    collection: {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      seoTitle: seo?.seoTitle ?? null,
      seoDescription: seo?.seoDescription ?? null,
    },
    currency: displayCurrency,
    hero,
    ...(() => {
      const mapped = filterCatalog(
        rawProducts.map((p) =>
          priceForDisplay(
            {
              ...localize(mapProduct(p), locale),
              priceAmount: priceForCountry(p.priceAmount, p.translations, country),
            },
            locale,
            tenant.settings,
            requestedCurrency
          )
        ),
        {
          minCents: parseMajorToCents(c.req.query("min")),
          maxCents: parseMajorToCents(c.req.query("max")),
          inStock: c.req.query("inStock") === "1",
        }
      );
      const page = paginate(
        mapped,
        c.req.query("page") ?? "1",
        c.req.query("pageSize")
      );
      return {
        products: page.items,
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
      };
    })(),
  });
});

store.get("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  let total = 0;
  const lines = items
    .map((item) => {
      const p = products.find((x) => x.id === item.productId);
      if (!p) return null;
      const variant = item.variantId
        ? p.variants.find((v) => v.id === item.variantId)
        : null;
      const unit = variant?.priceAmount ?? p.priceAmount;
      const title = variant ? `${p.title} — ${variant.title}` : p.title;
      const lineTotal = unit * item.quantity;
      total += lineTotal;
      return {
        productId: p.id,
        slug: p.slug,
        variantId: item.variantId,
        title,
        unit,
        lineTotal,
        quantity: item.quantity,
        imageKey: p.images[0]?.storageKey ?? null,
      };
    })
    .filter(Boolean);

  return c.json({
    currency: tenant.settings?.currency ?? "USD",
    lines,
    total,
  });
});

async function persistAbandonedCart(c: import("hono").Context, tenant: { id: string; slug: string; settings: { currency?: string } | null }) {
  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  if (items.length === 0) return;
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true },
  });
  let subtotal = 0;
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    const variant = item.variantId
      ? p.variants.find((v) => v.id === item.variantId)
      : null;
    subtotal += (variant?.priceAmount ?? p.priceAmount) * item.quantity;
  }
  await syncAbandonedCart({
    c,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.settings?.currency ?? "USD",
    items,
    subtotalAmount: subtotal,
  });
}

store.post("/cart/add", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    variantId?: string;
    quantity?: number;
    subscribe?: boolean;
  }>();
  const qty = Math.max(1, body.quantity ?? 1);
  addCartItem(c, {
    productId: body.productId,
    tenantId: tenant.id,
    quantity: qty,
    variantId: body.variantId,
    subscribe: body.subscribe === true,
  });
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.post("/cart/email", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email } = await c.req.json<{ email: string }>();
  await persistAbandonedCart(c, tenant);
  const items = getCart(c).filter((i) => i.tenantId === tenant.id);
  if (items.length === 0) return c.json({ ok: true });
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true },
  });
  let subtotal = 0;
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    const variant = item.variantId
      ? p.variants.find((v) => v.id === item.variantId)
      : null;
    subtotal += (variant?.priceAmount ?? p.priceAmount) * item.quantity;
  }
  await syncAbandonedCart({
    c,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.settings?.currency ?? "USD",
    items,
    email: String(email ?? "").trim().toLowerCase(),
    subtotalAmount: subtotal,
  });
  return c.json({ ok: true });
});

store.patch("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>();
  updateCartItem(
    c,
    tenant.id,
    {
      productId: body.productId,
      tenantId: tenant.id,
      variantId: body.variantId,
      quantity: 1,
    },
    body.quantity
  );
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.delete("/cart", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{ productId: string; variantId?: string }>();
  removeCartItem(c, {
    productId: body.productId,
    tenantId: tenant.id,
    variantId: body.variantId,
  });
  await persistAbandonedCart(c, tenant);
  return c.json({ ok: true });
});

store.get("/upsell-products", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const upsell = parsePostCheckoutUpsell(tenant.settings?.postCheckoutUpsell);
  if (!upsell.enabled || !upsell.productIds?.length) {
    return c.json({ products: [], headline: upsell.headline ?? null });
  }
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      id: { in: upsell.productIds },
      status: ProductStatus.ACTIVE,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      priceAmount: true,
      currency: true,
      compareAt: true,
    },
  });
  return c.json({
    headline: upsell.headline ?? "You might also like",
    products,
  });
});

store.get("/bundles", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const bundles = await prisma.productBundle.findMany({
    where: { tenantId: tenant.id, active: true },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { take: 1, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });
  return c.json({ bundles });
});

store.post("/checkout/shipping-rates", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    country: string;
    city?: string;
    postal?: string;
    weightGrams?: number;
  }>();
  const { getShippoRates, isShippoConfigured } = await import("../lib/shippo.js");
  const { resolveShipping } = await import("../lib/checkout.js");

  const rates: {
    id: string;
    label: string;
    amountCents: number;
    provider: string;
  }[] = [];

  const originWh =
    (await prisma.warehouse.findFirst({
      where: { tenantId: tenant.id, isDefault: true },
    })) ??
    (await prisma.warehouse.findFirst({ where: { tenantId: tenant.id } }));

  const destCountry = (body.country ?? "US").slice(0, 2).toUpperCase();
  const domesticKg = destCountry === "KG";

  if (isShippoConfigured() && !domesticKg) {
    const live = await getShippoRates({
      from: {
        name: tenant.name,
        street1: originWh?.address1 || "1 Warehouse St",
        street2: originWh?.address2 || undefined,
        city: originWh?.city || "New York",
        zip: originWh?.postal || "10001",
        country: (originWh?.country || "US").slice(0, 2).toUpperCase(),
      },
      to: {
        name: "Customer",
        street1: "100 Main St",
        city: body.city?.trim() || "New York",
        zip: body.postal?.trim() || "10001",
        country: (body.country ?? "US").slice(0, 2).toUpperCase(),
      },
      weightGrams: body.weightGrams ?? 500,
    });
    for (const r of live) {
      rates.push({
        id: r.id,
        label: `${r.provider} ${r.service}${
          r.estimatedDays != null ? ` (~${r.estimatedDays}d)` : ""
        }`,
        amountCents: r.amountCents,
        provider: r.provider,
      });
    }
  }

  // Always offer store flat zone as an option; use as sole rate when no carriers
  {
    const flat = await resolveShipping(
      tenant.id,
      (body.country ?? "US").slice(0, 2).toUpperCase(),
      0,
      body.weightGrams ?? 500
    );
    const flatRow = {
      id: "flat",
      label: domesticKg
        ? flat.label ?? "Курьер по Кыргызстану"
        : flat.label ?? "Standard shipping (store rate)",
      amountCents: flat.amount,
      provider: "Store",
    };
    if (domesticKg) rates.unshift(flatRow);
    else rates.push(flatRow);
  }

  return c.json({
    rates,
    primary: rates[0]?.provider === "Store" ? "flat" : "carrier",
    shippoConfigured: isShippoConfigured(),
  });
});

store.post("/checkout/validate-gift-card", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{ code: string; orderTotal: number }>();
  try {
    const result = await validateGiftCard(
      tenant.id,
      body.code,
      body.orderTotal
    );
    if (!result) return c.json({ giftCardAmount: 0 });
    return c.json({
      giftCardAmount: result.giftCardAmount,
      code: result.card.code,
      balanceRemaining: result.card.balanceCents - result.giftCardAmount,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Invalid gift card" },
      400
    );
  }
});

store.post("/checkout/validate-discount", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{ code: string; subtotalAmount: number }>();
  try {
    const productIds = getCart(c)
      .filter((i) => i.tenantId === tenant.id)
      .map((i) => i.productId);
    const result = await validateDiscountCode(
      tenant.id,
      body.code,
      body.subtotalAmount,
      productIds
    );
    if (!result) return c.json({ discountAmount: 0 });
    return c.json({
      discountAmount: result.discountAmount,
      code: result.discount.code,
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Invalid code" },
      400
    );
  }
});

store.post("/affiliate/attribution", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const body = (await c.req.json<{ code?: string }>().catch(() => ({}))) as {
    code?: string;
  };
  const code = normalizeAffiliateCode(String(body.code ?? ""));
  if (!code) return c.json({ error: "code required" }, 400);

  const partner = await resolveAffiliatePartner(tenant.id, code);
  if (!partner) return c.json({ valid: false }, 200);

  const settings = await getAffiliateProgramSettings(tenant.id);
  setAffiliateAttributionCookie(c, slug, partner.code, settings.cookieDays);

  return c.json({
    valid: true,
    code: partner.code,
    displayName: partner.displayName,
  });
});

store.get("/affiliate/resolve", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const code = normalizeAffiliateCode(String(c.req.query("code") ?? ""));
  if (!code) return c.json({ valid: false });

  const partner = await resolveAffiliatePartner(tenant.id, code);
  if (!partner) return c.json({ valid: false });

  return c.json({
    valid: true,
    code: partner.code,
    displayName: partner.displayName,
  });
});

store.post("/unlock", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const hash = tenant.settings?.storefrontPasswordHash;
  if (!hash) return c.json({ ok: true });
  const body = await c.req.json<{ password?: string }>();
  const ok = await compare(String(body.password ?? ""), hash);
  if (!ok) return c.json({ error: "Wrong password" }, 401);
  setCookie(c, STORE_GATE_COOKIE, `${tenant.id}.${storeGateToken(hash)}`, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return c.json({ ok: true });
});

store.get("/cart-suggestions", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ products: [] });
  const cartIds = [
    ...new Set(
      getCart(c)
        .filter((i) => i.tenantId === tenant.id)
        .map((i) => i.productId)
    ),
  ];
  if (cartIds.length === 0) return c.json({ products: [] });

  const shared = await prisma.orderLineItem.findMany({
    where: { productId: { in: cartIds }, order: { tenantId: tenant.id } },
    select: { orderId: true },
    take: 80,
  });
  const orderIds = [...new Set(shared.map((r) => r.orderId))];
  let ids: string[] = [];
  if (orderIds.length > 0) {
    const grouped = await prisma.orderLineItem.groupBy({
      by: ["productId"],
      where: {
        orderId: { in: orderIds },
        AND: [{ productId: { notIn: cartIds } }, { productId: { not: null } }],
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 4,
    });
    ids = grouped.flatMap((g) => (g.productId ? [g.productId] : []));
  }
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      status: ProductStatus.ACTIVE,
      ...(ids.length > 0 ? { id: { in: ids } } : { id: { notIn: cartIds } }),
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      priceAmount: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { storageKey: true } },
    },
  });
  const currency = tenant.settings?.currency ?? "USD";
  return c.json({
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      priceAmount: p.priceAmount,
      currency,
      imageKey: p.images[0]?.storageKey ?? null,
    })),
  });
});

store.post("/checkout/place", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const closed = parseStoreTheme(tenant.settings?.theme).storeClosed === true;
  if (closed) return c.json({ error: "This store is not open yet" }, 403);
  const gateHash = tenant.settings?.storefrontPasswordHash;
  if (
    gateHash &&
    !storeGateOpen(getCookie(c, STORE_GATE_COOKIE), tenant.id, gateHash)
  ) {
    return c.json({ error: "Enter the store password first" }, 401);
  }
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const result = await placeStoreOrder(c, tenant.id, body);
    return c.json(result);
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      400
    );
  }
});

store.get("/orders/:orderId", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const token = c.req.query("token");
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("orderId"), tenantId: tenant.id },
    include: {
      items: true,
      digitalDownloads: { include: { product: { include: { digitalAsset: true } } } },
      pickupWarehouse: {
        select: {
          name: true,
          address1: true,
          address2: true,
          city: true,
          postal: true,
          country: true,
          phone: true,
          pickupInstructions: true,
        },
      },
      events: {
        select: { id: true, type: true, body: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      fulfillmentShipments: {
        select: {
          id: true,
          status: true,
          trackingNumber: true,
          shippedAt: true,
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.accessToken && order.accessToken !== token) {
    return c.json({ error: "Invalid token" }, 403);
  }

  if (
    order.status === OrderStatus.PENDING &&
    order.gopayOrderId &&
    isGoPayConfigured()
  ) {
    try {
      const { queryGoPayPayment } = await import("../lib/gopay/client.js");
      const { fulfillPaidOrder } = await import("../lib/fulfill-order.js");
      const gp = await queryGoPayPayment({ orderId: order.gopayOrderId });
      if (gp.status === "COMMITTED") {
        await fulfillPaidOrder(order.id, {
          platformFeeAmount: order.platformFeeAmount,
        });
        const updated = await prisma.order.findFirst({
          where: { id: order.id, tenantId: tenant.id },
          include: {
            items: true,
            digitalDownloads: {
              include: { product: { include: { digitalAsset: true } } },
            },
            pickupWarehouse: {
              select: {
                name: true,
                address1: true,
                address2: true,
                city: true,
                postal: true,
                country: true,
                phone: true,
                pickupInstructions: true,
              },
            },
            events: {
              select: { id: true, type: true, body: true, createdAt: true },
              orderBy: { createdAt: "asc" },
            },
            fulfillmentShipments: {
              select: {
                id: true,
                status: true,
                trackingNumber: true,
                shippedAt: true,
                warehouse: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        if (updated) return c.json({ order: updated });
      }
    } catch (e) {
      console.warn("[gopay] order sync", e);
    }
  }

  // Finik has no public payment-query API — client polls until webhook marks PAID.
  const awaitingFinikPayment =
    order.status === OrderStatus.PENDING &&
    Boolean(order.finikPaymentId) &&
    order.paymentProvider === "finik";

  return c.json({
    order,
    ...(awaitingFinikPayment ? { awaitingFinikPayment: true } : {}),
  });
});

store.post("/orders/:orderId/received", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const token = c.req.query("token");
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("orderId"), tenantId: tenant.id },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.accessToken && order.accessToken !== token) {
    return c.json({ error: "Invalid token" }, 403);
  }
  try {
    const { confirmBuyerReceived } = await import("../lib/buyer-protection.js");
    const updated = await confirmBuyerReceived(order.id);
    return c.json({ ok: true, buyerReceivedAt: updated.buyerReceivedAt });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Could not confirm" }, 400);
  }
});

store.get("/orders/:orderId/invoice", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const token = c.req.query("token");
  const order = await prisma.order.findFirst({
    where: { id: c.req.param("orderId"), tenantId: tenant.id },
    include: {
      customer: true,
      items: true,
      tenant: { include: { settings: true } },
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.accessToken && order.accessToken !== token) {
    return c.json({ error: "Invalid token" }, 403);
  }
  if (
    order.status !== OrderStatus.PAID &&
    order.status !== OrderStatus.FULFILLED &&
    order.status !== OrderStatus.PENDING
  ) {
    return c.json({ error: "Invoice not available for this order" }, 400);
  }
  const { orderToDoc, renderOrderHtml } = await import("../lib/order-document.js");
  const html = renderOrderHtml(orderToDoc(order), "invoice");
  return c.html(html);
});

store.get("/account/session", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ customer: null });
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return c.json({ customer: null });
  try {
    const { tenantId, customerId } = JSON.parse(raw) as {
      tenantId: string;
      customerId: string;
    };
    if (tenantId !== tenant.id) return c.json({ customer: null });
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
          orderBy: { createdAt: "desc" },
        },
        b2bBuyer: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                status: true,
                paymentTermsDays: true,
                catalogProductIds: true,
              },
            },
          },
        },
      },
    });
    if (!customer) return c.json({ customer: null });
    const b2b =
      customer.b2bBuyer?.company && customer.b2bCompanyId
        ? {
            companyId: customer.b2bBuyer.company.id,
            companyName: customer.b2bBuyer.company.name,
            status: customer.b2bBuyer.company.status,
            paymentTermsDays: customer.b2bBuyer.company.paymentTermsDays,
            catalogProductIds: customer.b2bBuyer.company.catalogProductIds ?? [],
            role: customer.b2bBuyer.role,
          }
        : null;
    return c.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        orders: customer.orders,
        b2bCompanyId: customer.b2bCompanyId,
      },
      b2b,
    });
  } catch {
    return c.json({ customer: null });
  }
});

store.post("/account/lookup", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email } = await c.req.json<{ email: string }>();
  const norm = String(email ?? "").trim().toLowerCase();
  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      OR: [{ guestEmail: norm }, { customer: { email: norm } }],
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      accessToken: true,
    },
  });
  return c.json({ orders });
});

store.post("/account/login", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const norm = String(email ?? "").trim().toLowerCase();
  const customer = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: norm } },
  });
  if (!customer?.passwordHash) {
    return c.json({ error: "Account not found" }, 400);
  }
  const ok = await compare(password, customer.passwordHash);
  if (!ok) return c.json({ error: "Invalid password" }, 400);
  setCookie(
    c,
    CUSTOMER_COOKIE,
    JSON.stringify({ tenantId: tenant.id, customerId: customer.id }),
    { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 90 }
  );
  return c.json({ ok: true });
});

store.get("/pickup-locations", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ locations: [] });
  const productIds = (c.req.query("productIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const locations = await prisma.warehouse.findMany({
    where: { tenantId: tenant.id, pickupEnabled: true },
    include: productIds.length
      ? { stock: { where: { productId: { in: productIds } } } }
      : { stock: false },
    orderBy: { name: "asc" },
  });
  return c.json({
    locations: locations.map((w) => ({
      id: w.id,
      name: w.name,
      address1: w.address1,
      address2: w.address2,
      city: w.city,
      postal: w.postal,
      country: w.country,
      phone: w.phone,
      pickupInstructions: w.pickupInstructions,
      pickupHours: w.pickupHours,
      inStock:
        productIds.length === 0
          ? true
          : productIds.every((pid) => {
              const s = "stock" in w && Array.isArray(w.stock)
                ? w.stock.find((x) => x.productId === pid)
                : null;
              return s ? s.quantity - s.reservedQty > 0 : false;
            }),
    })),
  });
});

store.get("/gift-cards/balance", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const code = String(c.req.query("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return c.json({ error: "code required" }, 400);
  const card = await prisma.giftCard.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code } },
  });
  if (!card || !card.active) return c.json({ error: "Not found" }, 404);
  return c.json({
    code: card.code,
    balanceCents: card.balanceCents,
    currency: card.currency,
    expiresAt: card.expiresAt?.toISOString() ?? null,
  });
});

store.post("/account/subscription-portal", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return c.json({ error: "Sign in required" }, 401);
  const { tenantId, customerId } = JSON.parse(raw) as {
    tenantId: string;
    customerId: string;
  };
  if (tenantId !== tenant.id) return c.json({ error: "Sign in required" }, 401);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer?.stripeCustomerId) {
    return c.json({ error: "No billing profile" }, 400);
  }
  const { getStripe, isStripeConfigured } = await import("../lib/stripe.js");
  if (!isStripeConfigured()) return c.json({ error: "Billing unavailable" }, 400);
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const session = await getStripe().billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${base}/account?tenant=${tenant.slug}`,
  });
  return c.json({ url: session.url });
});

store.get("/account/entitlements", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ entitlements: [] });
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return c.json({ entitlements: [] });
  try {
    const { tenantId, customerId } = JSON.parse(raw) as {
      tenantId: string;
      customerId: string;
    };
    if (tenantId !== tenant.id) return c.json({ entitlements: [] });
    const entitlements = await prisma.digitalEntitlement.findMany({
      where: { tenantId: tenant.id, customerId, active: true },
      orderBy: { createdAt: "desc" },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: entitlements.map((e) => e.productId) } },
      select: { id: true, title: true, slug: true },
    });
    return c.json({
      entitlements: entitlements.map((e) => ({
        ...e,
        product: products.find((p) => p.id === e.productId) ?? null,
      })),
    });
  } catch {
    return c.json({ entitlements: [] });
  }
});

store.get("/access/:token", async (c) => {
  const ent = await prisma.digitalEntitlement.findUnique({
    where: { accessToken: c.req.param("token") },
  });
  if (!ent || !ent.active) return c.json({ error: "Invalid or expired" }, 404);
  if (ent.expiresAt && ent.expiresAt < new Date()) {
    return c.json({ error: "Expired" }, 410);
  }
  const product = await prisma.product.findUnique({
    where: { id: ent.productId },
    select: { id: true, title: true, slug: true, type: true },
  });
  const download = await prisma.digitalDownload.findFirst({
    where: {
      productId: ent.productId,
      ...(ent.orderId ? { orderId: ent.orderId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({
    product,
    accessToken: ent.accessToken,
    expiresAt: ent.expiresAt?.toISOString() ?? null,
    downloadToken: download?.token ?? null,
  });
});

store.get("/orders/:id/return-eligible", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const token = c.req.query("token")?.trim();
  const order = await prisma.order.findFirst({
    where: {
      id: c.req.param("id"),
      tenantId: tenant.id,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      ...(token ? { accessToken: token } : {}),
    },
    include: { items: true, returnRequests: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  return c.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    items: order.items.map((i) => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      unitAmount: i.unitAmount,
    })),
    existingReturns: order.returnRequests.map((r) => ({
      id: r.id,
      rmaCode: r.rmaCode,
      status: r.status,
      isExchange: r.isExchange,
    })),
  });
});

store.post("/orders/:id/returns", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    token?: string;
    reason?: string;
    note?: string;
    isExchange?: boolean;
    exchangeProductId?: string;
    exchangeVariantId?: string;
    items?: { orderLineItemId: string; quantity: number; reason?: string }[];
  }>();
  const token = String(body.token ?? c.req.query("token") ?? "").trim();
  const order = await prisma.order.findFirst({
    where: {
      id: c.req.param("id"),
      tenantId: tenant.id,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
      ...(token ? { accessToken: token } : {}),
    },
    include: { items: true },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (!body.items?.length) return c.json({ error: "Items required" }, 400);

  for (const line of body.items) {
    const oi = order.items.find((i) => i.id === line.orderLineItemId);
    if (!oi || line.quantity < 1 || line.quantity > oi.quantity) {
      return c.json({ error: "Invalid return quantity" }, 400);
    }
  }

  const rmaCode = `RMA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const ret = await prisma.returnRequest.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      customerId: order.customerId,
      rmaCode,
      reason: body.reason?.trim() || null,
      note: body.note?.trim() || null,
      isExchange: !!body.isExchange,
      exchangeProductId: body.exchangeProductId || null,
      exchangeVariantId: body.exchangeVariantId || null,
      items: {
        create: body.items.map((i) => ({
          orderLineItemId: i.orderLineItemId,
          quantity: i.quantity,
          reason: i.reason || null,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.orderEvent.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      type: "NOTE",
      body: body.isExchange
        ? `Exchange requested (${rmaCode})`
        : `Return requested (${rmaCode})`,
    },
  });

  const { emailCustomerAboutOrder, emailMerchantAboutOrder } = await import(
    "../lib/transactional-email.js"
  );
  emailCustomerAboutOrder(order.id, "returnRequested", {
    rma: rmaCode,
    reason: body.reason?.trim() || "",
  }).catch(() => {});
  emailMerchantAboutOrder(order.id, "merchantReturn", {
    rma: rmaCode,
    reason: body.reason?.trim() || "",
  }).catch(() => {});

  return c.json({ return: ret }, 201);
});

store.get("/account/returns", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ returns: [] });
  const raw = getCookie(c, CUSTOMER_COOKIE);
  if (!raw) return c.json({ returns: [] });
  try {
    const { tenantId, customerId } = JSON.parse(raw) as {
      tenantId: string;
      customerId: string;
    };
    if (tenantId !== tenant.id) return c.json({ returns: [] });
    const returns = await prisma.returnRequest.findMany({
      where: { tenantId: tenant.id, customerId },
      include: {
        order: { select: { id: true, orderNumber: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return c.json({ returns });
  } catch {
    return c.json({ returns: [] });
  }
});

store.get("/policies/:kind", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const kind = c.req.param("kind");
  const s = tenant.settings;

  if (kind === "contact") {
    const lines = [
      s?.contactPolicy?.trim() || "",
      s?.contactEmail ? `Email: ${s.contactEmail}` : "",
      s?.contactPhone ? `Phone: ${s.contactPhone}` : "",
      s?.businessAddress ? `Address:\n${s.businessAddress}` : "",
    ].filter(Boolean);
    if (lines.length === 0) return c.json({ error: "Not found" }, 404);
    return c.json({ body: lines.join("\n\n"), externalUrl: null, title: "Contact information" });
  }

  const map: Record<string, { body?: string | null; url?: string | null; title: string }> = {
    privacy: { body: s?.privacyPolicy, url: s?.privacyUrl, title: "Privacy policy" },
    refund: { body: s?.refundPolicy, url: s?.refundUrl, title: "Return and refund policy" },
    terms: { body: s?.termsOfService, url: s?.termsUrl, title: "Terms of service" },
    shipping: { body: s?.shippingPolicy, url: s?.shippingUrl, title: "Shipping policy" },
    legal: { body: s?.legalNotice, url: s?.legalNoticeUrl, title: "Legal notice" },
    returns: { body: s?.returnRules, url: null, title: "Return and cancellation rules" },
  };
  const entry = map[kind];
  if (!entry) return c.json({ error: "Not found" }, 404);
  if (!entry.body && !entry.url) return c.json({ error: "Not found" }, 404);
  return c.json({ body: entry.body ?? null, externalUrl: entry.url ?? null, title: entry.title });
});

store.get("/wishlist", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ items: [] });
  const ids = (c.req.query("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ids.length === 0) return c.json({ items: [] });
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, status: ProductStatus.ACTIVE },
    select: { id: true, title: true, slug: true, priceAmount: true },
  });
  return c.json({
    items: products.map((p) => ({
      productId: p.id,
      title: p.title,
      slug: p.slug,
      priceAmount: p.priceAmount,
    })),
  });
});

store.get("/pages/:slug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const preview = c.req.query("preview") === "1";
  const page = await prisma.storePage.findFirst({
    where: storePagePublicWhere(
      tenant.id,
      { slug: c.req.param("slug"), pageType: "PAGE" },
      preview
    ),
  });
  if (!page) return c.json({ error: "Not found" }, 404);
  const settings = tenant.settings;
  const themeRaw = resolveStorefrontThemeRaw(c, settings, preview);
  const theme = parseStoreTheme(themeRaw);
  const pageBlocks = theme.pageBlocks?.[page.slug];
  const seo = buildPageSeo(page);
  return c.json({
    page: {
      title: page.title,
      slug: page.slug,
      body: page.body,
      excerpt: page.excerpt,
      featuredImageUrl: page.featuredImageUrl,
      authorName: page.authorName,
      tags: page.tags,
      createdAt: page.createdAt.toISOString(),
      ...seo,
      blocks: pageBlocks ?? null,
    },
  });
});

store.get("/blog", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const tag = c.req.query("tag")?.trim().toLowerCase();
  const sort = c.req.query("sort") ?? "newest";
  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "title"
        ? { title: "asc" as const }
        : { createdAt: "desc" as const };

  const posts = await prisma.storePage.findMany({
    where: {
      ...storePagePublicWhere(tenant.id, { pageType: "BLOG" }),
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy,
    select: {
      title: true,
      slug: true,
      body: true,
      excerpt: true,
      featuredImageUrl: true,
      authorName: true,
      tags: true,
      createdAt: true,
      publishAt: true,
    },
  });
  return c.json({
    posts: posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt:
        p.excerpt?.trim() ||
        p.body.replace(/<[^>]+>/g, "").trim().slice(0, 200),
      featuredImageUrl: p.featuredImageUrl,
      authorName: p.authorName,
      tags: p.tags,
      createdAt: p.createdAt.toISOString(),
      publishedAt: (p.publishAt ?? p.createdAt).toISOString(),
    })),
  });
});

store.get("/blog/:slug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const preview = c.req.query("preview") === "1";
  const post = await prisma.storePage.findFirst({
    where: storePagePublicWhere(
      tenant.id,
      { slug: c.req.param("slug"), pageType: "BLOG" },
      preview
    ),
  });
  if (!post) return c.json({ error: "Not found" }, 404);
  const seo = buildPageSeo(post);
  return c.json({
    post: {
      title: post.title,
      slug: post.slug,
      body: post.body,
      excerpt: post.excerpt,
      featuredImageUrl: post.featuredImageUrl,
      authorName: post.authorName,
      tags: post.tags,
      createdAt: post.createdAt.toISOString(),
      publishedAt: (post.publishAt ?? post.createdAt).toISOString(),
      ...seo,
    },
  });
});

store.get("/blog/rss.xml", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.text("Not found", 404);
  const posts = await prisma.storePage.findMany({
    where: storePagePublicWhere(tenant.id, { pageType: "BLOG", noindex: false }),
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      body: true,
      authorName: true,
      createdAt: true,
      publishAt: true,
    },
  });
  const base = c.req.url.split("/blog/rss.xml")[0];
  const feedUrl = `${base}/blog/rss.xml?tenant=${encodeURIComponent(slug)}`;
  const items = posts
    .map((p) => {
      const link = `${base}/blog/${p.slug}?tenant=${encodeURIComponent(slug)}`;
      const pub = (p.publishAt ?? p.createdAt).toUTCString();
      const desc = escapeXml(
        p.excerpt?.trim() || p.body.replace(/<[^>]+>/g, "").slice(0, 500)
      );
      return `<item>
  <title>${escapeXml(p.title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${pub}</pubDate>
  <description>${desc}</description>
  ${p.authorName ? `<author>${escapeXml(p.authorName)}</author>` : ""}
</item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(tenant.name)} Blog</title>
  <link>${feedUrl}</link>
  <description>${escapeXml(tenant.name)} blog posts</description>
  <language>en</language>
  ${items}
</channel>
</rss>`;
  return c.body(xml, 200, {
    "Content-Type": "application/rss+xml; charset=utf-8",
  });
});

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

store.get("/reviews", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const limit = parseInt(c.req.query("limit") ?? "8", 10) || 8;
  const minRating = parseInt(c.req.query("minRating") ?? "0", 10) || 0;
  const sort = c.req.query("sort") === "rating" ? "rating" : "newest";
  const pinned = (c.req.query("pinned") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { fetchStoreReviews } = await import("../lib/fetch-store-reviews.js");
  const rows = await fetchStoreReviews(tenant.id, {
    limit,
    minRating: minRating > 0 ? minRating : undefined,
    sort,
    pinnedIds: pinned,
  });
  return c.json({
    reviews: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      body: r.body,
      photoUrls: r.photoUrls,
      verifiedPurchase: r.verifiedPurchase,
      pinned: r.pinned,
      helpfulCount: r.helpfulCount,
      merchantReply: r.merchantReply,
      merchantRepliedAt: r.merchantRepliedAt,
      createdAt: r.createdAt,
      product: r.product,
    })),
  });
});

store.post("/reviews", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const contentType = c.req.header("content-type") ?? "";
  let productId = "";
  let authorName = "";
  let authorEmail: string | undefined;
  let rating = 0;
  let bodyText: string | undefined;
  let photoUrls: string[] = [];
  const files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.raw.formData();
    productId = String(formData.get("productId") ?? "").trim();
    authorName = String(formData.get("authorName") ?? "").trim();
    authorEmail = String(formData.get("authorEmail") ?? "").trim() || undefined;
    rating = Number(formData.get("rating"));
    bodyText = String(formData.get("body") ?? "").trim() || undefined;
    for (const entry of formData.getAll("photos")) {
      if (entry instanceof File && entry.size > 0 && entry.type.startsWith("image/")) {
        files.push(entry);
      }
    }
    // also accept single field name "photo"
    const single = formData.get("photo");
    if (single instanceof File && single.size > 0 && single.type.startsWith("image/")) {
      files.push(single);
    }
  } else {
    const body = await c.req.json<{
      productId: string;
      authorName: string;
      authorEmail?: string;
      rating: number;
      body?: string;
      photoUrls?: string[];
    }>();
    productId = String(body.productId ?? "").trim();
    authorName = String(body.authorName ?? "").trim();
    authorEmail = body.authorEmail?.trim() || undefined;
    rating = Number(body.rating);
    bodyText = body.body?.trim() || undefined;
    photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls
          .map((u) => String(u).trim())
          .filter(
            (u) =>
              u.startsWith("http://") ||
              u.startsWith("https://") ||
              u.startsWith("/api/files/")
          )
          .slice(0, 4)
      : [];
  }

  if (!authorName || rating < 1 || rating > 5) {
    return c.json({ error: "Invalid review" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);

  if (files.length > 0) {
    const { saveStoreMedia, uploadPublicUrl } = await import("../lib/uploads.js");
    for (const file of files.slice(0, 4)) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const saved = await saveStoreMedia(tenant.id, {
          name: file.name || `review-${Date.now()}.jpg`,
          type: file.type,
          size: file.size,
          buffer: buf,
        });
        photoUrls.push(uploadPublicUrl(saved.storageKey));
      } catch {
        /* skip bad files */
      }
    }
    photoUrls = photoUrls.slice(0, 4);
  }

  const { findVerifiedPurchaseOrder } = await import("../lib/review-verified.js");
  const verified = await findVerifiedPurchaseOrder(
    tenant.id,
    product.id,
    authorEmail
  );

  await prisma.productReview.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      orderId: verified?.orderId ?? null,
      authorName,
      authorEmail: authorEmail || null,
      rating,
      body: bodyText || null,
      photoUrls,
      approved: false,
      verifiedPurchase: Boolean(verified),
    },
  });
  return c.json({ ok: true, verifiedPurchase: Boolean(verified) });
});

store.post("/reviews/:id/helpful", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const review = await prisma.productReview.findFirst({
    where: {
      id: c.req.param("id"),
      tenantId: tenant.id,
      approved: true,
    },
  });
  if (!review) return c.json({ error: "Not found" }, 404);
  const updated = await prisma.productReview.update({
    where: { id: review.id },
    data: { helpfulCount: { increment: 1 } },
    select: { id: true, helpfulCount: true },
  });
  return c.json({ ok: true, helpfulCount: updated.helpfulCount });
});

store.post("/live-ping", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    sessionId?: string;
    country?: string;
    path?: string;
    stage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
  }>().catch(() => ({} as Record<string, string>));
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return c.json({ error: "sessionId required" }, 400);
  const { upsertLiveVisitor } = await import("../lib/live-view.js");
  await upsertLiveVisitor({
    tenantId: tenant.id,
    sessionId,
    country: body.country,
    path: body.path,
    stage: body.stage,
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    utmCampaign: body.utmCampaign,
    referrer: body.referrer,
  });
  return c.json({ ok: true });
});

store.get("/download/:token", async (c) => {
  const download = await prisma.digitalDownload.findUnique({
    where: { token: c.req.param("token") },
    include: {
      order: true,
      product: { include: { digitalAsset: true } },
    },
  });
  if (
    !download ||
    !download.product.digitalAsset ||
    (download.order.status !== OrderStatus.PAID &&
      download.order.status !== OrderStatus.FULFILLED)
  ) {
    return c.json({ error: "Not found" }, 404);
  }
  if (download.expiresAt && download.expiresAt < new Date()) {
    return c.json({ error: "Download link expired" }, 403);
  }
  const asset = download.product.digitalAsset;
  if (download.downloads >= asset.downloadLimit) {
    return c.json({ error: "Download limit reached" }, 403);
  }
  const filePath = path.join(getUploadRoot(), asset.storageKey);
  try {
    const buf = await readFile(filePath);
    await prisma.digitalDownload.update({
      where: { id: download.id },
      data: { downloads: { increment: 1 } },
    });
    return c.body(buf, 200, {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `attachment; filename="${asset.fileName}"`,
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

store.get("/sitemap.xml", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.text("Not found", 404);
  const { buildStoreSitemapXml } = await import("../lib/sitemap.js");
  const xml = await buildStoreSitemapXml(tenant.id, slug);
  return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

store.post("/newsletter/subscribe", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const body = await c.req.json<{ email?: string; name?: string; website?: string }>();
  const { checkFormRateLimit, isHoneypotFilled } = await import("../lib/form-spam-guard.js");
  if (isHoneypotFilled(body.website)) {
    return c.json({ ok: true });
  }
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkFormRateLimit(`newsletter:${tenant.id}:${ip}`);
  if (!limit.ok) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { tenantId: tenant.id },
    select: { emailDoubleOptIn: true },
  });
  const doubleOptIn = settings?.emailDoubleOptIn === true;

  if (doubleOptIn) {
    await prisma.emailSubscriber.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      create: {
        tenantId: tenant.id,
        email,
        name: body.name?.trim() || null,
        source: "newsletter_pending",
        confirmedAt: null,
        marketingOptOut: false,
      },
      update: {
        name: body.name?.trim() || undefined,
        source: "newsletter_pending",
        confirmedAt: null,
        marketingOptOut: false,
      },
    });
    const { createConfirmSubscribeToken } = await import("../lib/marketing-tokens.js");
    const { sendEmail } = await import("../lib/email.js");
    const token = createConfirmSubscribeToken(tenant.id, email);
    const apiBase =
      process.env.API_PUBLIC_URL ??
      process.env.API_URL ??
      `http://localhost:${process.env.API_PORT ?? 4000}`;
    const confirmUrl = `${apiBase.replace(/\/$/, "")}/api/marketing/confirm-subscribe?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: `Confirm subscription — ${tenant.name}`,
      html: `<p>Please confirm your subscription to ${tenant.name}.</p><p><a href="${confirmUrl}">Confirm email</a></p><p>This link expires in 48 hours.</p>`,
      text: `Confirm your subscription: ${confirmUrl}`,
    }).catch(console.error);
    return c.json({ ok: true, pendingConfirm: true });
  }

  await prisma.emailSubscriber.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    create: {
      tenantId: tenant.id,
      email,
      name: body.name?.trim() || null,
      source: "newsletter",
      confirmedAt: new Date(),
    },
    update: {
      marketingOptOut: false,
      name: body.name?.trim() || undefined,
      confirmedAt: new Date(),
    },
  });

  const existing = await prisma.customer.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!existing) {
    await prisma.customer.create({
      data: { tenantId: tenant.id, email, name: body.name?.trim() || null },
    });
    await ensureDefaultAutomations(tenant.id);
    triggerWelcomeEmail(tenant.id, email, body.name?.trim() || null).catch(
      console.error
    );
  }

  return c.json({ ok: true });
});

store.post("/contact", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const body = await c.req.json<{
    name?: string;
    email?: string;
    message?: string;
    website?: string;
  }>();
  const { checkFormRateLimit, isHoneypotFilled } = await import("../lib/form-spam-guard.js");
  if (isHoneypotFilled(body.website)) {
    return c.json({ ok: true });
  }
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkFormRateLimit(`contact:${tenant.id}:${ip}`);
  if (!limit.ok) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const message = String(body.message ?? "").trim();
  if (!name || !email.includes("@") || !message) {
    return c.json({ error: "Name, email, and message are required" }, 400);
  }

  const to =
    tenant.settings?.contactEmail?.trim() ??
    process.env.PLATFORM_OPS_EMAIL ??
    null;
  if (!to) return c.json({ error: "Store has no contact email configured" }, 503);

  const { sendStoreEmail } = await import("../lib/tenant-email.js");
  await sendStoreEmail(tenant.id, {
    to,
    subject: `Contact form — ${tenant.name}`,
    html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
    replyTo: email,
  });

  return c.json({ ok: true });
});

store.get("/robots.txt", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.text("Not found", 404);
  const { buildRobotsTxt } = await import("../lib/sitemap.js");
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
  const url = `${base}/api/store/sitemap.xml?tenant=${encodeURIComponent(slug)}`;
  return c.text(buildRobotsTxt(url), 200, { "Content-Type": "text/plain; charset=utf-8" });
});

registerBuyerRoutes(store);

export { store };
