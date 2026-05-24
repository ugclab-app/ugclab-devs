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
import { getMessages } from "@ugclab/i18n";
import { hash, compare } from "bcryptjs";
import { validateDiscountCode } from "../lib/checkout.js";
import { validateGiftCard } from "../lib/gift-card.js";
import {
  parseIntegrations,
  parsePostCheckoutUpsell,
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
import { buildProductSearchWhere } from "../lib/product-search.js";
import { displayCurrencyMeta, priceForDisplay } from "../lib/store-display-currency.js";
import { resolveTenantFromHost } from "@ugclab/tenant";
import { isMorPaymentModel } from "../lib/payment-model.js";
import { isStripeConfigured } from "../lib/stripe.js";
import {
  buildPageSeo,
  storePagePublicWhere,
} from "../lib/store-page.js";

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
  const { displayCurrency, baseCurrency, showConversion } = displayCurrencyMeta(
    locale,
    tenant.settings
  );
  const sf = getMessages().storefront;

  const preview = c.req.query("preview") === "1";
  const themeRaw =
    preview && tenant.settings?.themeDraft
      ? tenant.settings.themeDraft
      : tenant.settings?.theme;
  const theme = parseStoreTheme(themeRaw);
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
            ? ` on orders over ${(p.minOrderAmount / 100).toFixed(0)} ${currency}`
            : "";
        return `${p.value}% off your order${min}`;
      }
      if (p.type === PromotionType.FREE_SHIPPING) {
        const min =
          p.minOrderAmount != null
            ? ` on orders over ${(p.minOrderAmount / 100).toFixed(0)} ${currency}`
            : "";
        return `Free shipping${min}`;
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

  return c.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    locale,
    currency: displayCurrency,
    baseCurrency,
    showCurrencyConversion: showConversion,
    primaryColor: tenant.settings?.primaryColor ?? "#7c3aed",
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
    integrations: parseIntegrations(tenant.settings?.integrations),
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
      paymentModel: isMorPaymentModel() ? "mor" : "connect",
      demoMode: !process.env.STRIPE_SECRET_KEY,
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

store.get("/products", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const q = c.req.query("q")?.trim();
  const sort = c.req.query("sort");
  const typeFilter = c.req.query("type");
  const tag = c.req.query("tag");
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);

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
  return c.json({
    currency: displayCurrency,
    baseCurrency,
    products: products.map((p) =>
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
    ),
    tags: allTags,
  });
});

store.get("/products/:productSlug", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);

  const locale = pickLocale(tenant.settings, c.req.query("locale"));
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);
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
    orderBy: { createdAt: "desc" },
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

  return c.json({
    currency: displayCurrency,
    baseCurrency,
    product: {
      ...priceForDisplay(mapped, locale, tenant.settings),
      seoTitle: String(seoMeta.title ?? "").trim() || mapped.title,
      seoDescription: String(seoMeta.description ?? "").trim() || null,
      images: product.images.map((img) => ({
        storageKey: img.storageKey,
        alt: img.alt,
      })),
      variants: product.variants.map((v) =>
        priceForDisplay(
          { ...v, priceAmount: v.priceAmount, compareAt: null },
          locale,
          tenant.settings
        )
      ),
      inventory: product.inventory,
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
  const { displayCurrency, baseCurrency } = displayCurrencyMeta(locale, tenant.settings);
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
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
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
  const { displayCurrency } = displayCurrencyMeta(locale, tenant.settings);

  const collection = await prisma.collection.findFirst({
    where: { tenantId: tenant.id, slug: c.req.param("collectionSlug") },
    include: { products: true },
  });
  if (!collection) return c.json({ error: "Not found" }, 404);

  const products = await getCollectionProducts(tenant.id, collection);
  const themeRaw =
    c.req.query("preview") === "1" && tenant.settings?.themeDraft
      ? tenant.settings.themeDraft
      : tenant.settings?.theme;
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
    products: products.map((p) =>
      priceForDisplay(localize(mapProduct(p), locale), locale, tenant.settings)
    ),
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
  }>();
  const qty = Math.max(1, body.quantity ?? 1);
  addCartItem(c, {
    productId: body.productId,
    tenantId: tenant.id,
    quantity: qty,
    variantId: body.variantId,
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

  const flat = await resolveShipping(
    tenant.id,
    (body.country ?? "US").slice(0, 2).toUpperCase(),
    0,
    body.weightGrams ?? 500
  );

  const rates: {
    id: string;
    label: string;
    amountCents: number;
    provider: string;
  }[] = [
    {
      id: "flat",
      label: flat.label ?? "Standard shipping",
      amountCents: flat.amount,
      provider: "Store",
    },
  ];

  if (isShippoConfigured()) {
    const live = await getShippoRates({
      from: {
        name: tenant.name,
        street1: "1 Warehouse St",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
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
        label: `${r.provider} ${r.service}`,
        amountCents: r.amountCents,
        provider: r.provider,
      });
    }
  }

  return c.json({ rates });
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
    const result = await validateDiscountCode(
      tenant.id,
      body.code,
      body.subtotalAmount
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

store.post("/checkout/place", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
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
    },
  });
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.accessToken && order.accessToken !== token) {
    return c.json({ error: "Invalid token" }, 403);
  }
  return c.json({ order });
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
      },
    });
    return c.json({ customer });
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

store.get("/policies/:kind", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const kind = c.req.param("kind");
  const s = tenant.settings;
  const body =
    kind === "privacy" ? s?.privacyPolicy : kind === "refund" ? s?.refundPolicy : null;
  const externalUrl =
    kind === "privacy" ? s?.privacyUrl : kind === "refund" ? s?.refundUrl : null;
  if (!body && !externalUrl) return c.json({ error: "Not found" }, 404);
  return c.json({ body, externalUrl });
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
  const theme = parseStoreTheme(
    preview && settings?.themeDraft ? settings.themeDraft : settings?.theme
  );
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
  const limit = Math.min(parseInt(c.req.query("limit") ?? "8", 10) || 8, 20);
  const reviews = await prisma.productReview.findMany({
    where: { tenantId: tenant.id, approved: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      authorName: true,
      rating: true,
      body: true,
      createdAt: true,
      product: { select: { title: true, slug: true } },
    },
  });
  return c.json({ reviews });
});

store.post("/reviews", async (c) => {
  const slug = tenantSlug(c);
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return c.json({ error: "Store not found" }, 404);
  const body = await c.req.json<{
    productId: string;
    authorName: string;
    authorEmail?: string;
    rating: number;
    body?: string;
    photoUrls?: string[];
  }>();
  const authorName = String(body.authorName ?? "").trim();
  const rating = Number(body.rating);
  if (!authorName || rating < 1 || rating > 5) {
    return c.json({ error: "Invalid review" }, 400);
  }
  const product = await prisma.product.findFirst({
    where: { id: body.productId, tenantId: tenant.id },
  });
  if (!product) return c.json({ error: "Product not found" }, 404);
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.map((u) => String(u).trim()).filter((u) => u.startsWith("http")).slice(0, 4)
    : [];
  await prisma.productReview.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      authorName,
      authorEmail: body.authorEmail?.trim() || null,
      rating,
      body: body.body?.trim() || null,
      photoUrls,
      approved: false,
    },
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

  const body = await c.req.json<{ email?: string; name?: string }>();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }

  await prisma.emailSubscriber.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    create: {
      tenantId: tenant.id,
      email,
      name: body.name?.trim() || null,
      source: "newsletter",
    },
    update: { marketingOptOut: false, name: body.name?.trim() || undefined },
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

  const body = await c.req.json<{ name?: string; email?: string; message?: string }>();
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

export { store };
